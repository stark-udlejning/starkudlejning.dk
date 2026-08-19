import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const SESSION_SECRET = 'test-session-hemmelighed-mindst-16';

// Thenable query-builder-stub, ligesom @supabase/supabase-js's egen: kalderen kan
// enten kæde videre (.select/.eq/...) eller awaite direkte efter .update().eq().
function kaede(resultat) {
  const obj = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    insert: vi.fn(() => obj),
    update: vi.fn(() => obj),
    maybeSingle: vi.fn(async () => resultat),
    single: vi.fn(async () => resultat),
    then: (opfyldt, afvist) => Promise.resolve(resultat).then(opfyldt, afvist)
  };
  return obj;
}

let fraImplementering;
vi.mock('../netlify/functions/lib/supabase.js', () => ({
  supabase: () => ({ from: (...args) => fraImplementering(...args) })
}));

async function indlaes() {
  return import('../netlify/functions/lib/auth.js?v=' + Math.random());
}

describe('lib/auth', () => {
  const oprindeligSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET;
    fraImplementering = () => kaede({ data: null, error: null });
  });

  afterEach(() => {
    if (oprindeligSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = oprindeligSecret;
  });

  describe('parseCookies', () => {
    it('splitter flere cookies og trimmer navne', async () => {
      const { parseCookies } = await indlaes();
      expect(parseCookies('a=1; stark_session=abc123; b=2')).toEqual({
        a: '1',
        stark_session: 'abc123',
        b: '2'
      });
    });

    it('returnerer et tomt objekt for null/tom streng', async () => {
      const { parseCookies } = await indlaes();
      expect(parseCookies(null)).toEqual({});
      expect(parseCookies('')).toEqual({});
    });
  });

  describe('saetSessionCookie / ryddSessionCookie', () => {
    it('sætter HttpOnly, Secure, SameSite=Lax og intet Domain-attribut (host-only)', async () => {
      const { saetSessionCookie } = await indlaes();
      const cookie = saetSessionCookie('mit-token', 28800);
      expect(cookie).toContain('stark_session=mit-token');
      expect(cookie).toContain('Max-Age=28800');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Domain=');
    });

    it('rydder cookien med Max-Age=0', async () => {
      const { ryddSessionCookie } = await indlaes();
      expect(ryddSessionCookie()).toContain('Max-Age=0');
    });
  });

  describe('opdaterEllerOpretBruger', () => {
    it('opretter en ny bruger med rolle "bruger", hvis ingen findes', async () => {
      const kaldte = [];
      fraImplementering = (tabel) => {
        kaldte.push(tabel);
        if (tabel === 'brugere' && kaldte.filter((t) => t === 'brugere').length === 1) {
          return kaede({ data: null, error: null });
        }
        return kaede({ data: { id: 'ny-id', rolle: 'bruger', aktiv: true }, error: null });
      };
      const { opdaterEllerOpretBruger } = await indlaes();

      const bruger = await opdaterEllerOpretBruger('a'.repeat(64));

      expect(bruger).toEqual({ id: 'ny-id', rolle: 'bruger', aktiv: true });
    });

    it('opdaterer login-statistik på en eksisterende bruger uden at ændre rolle', async () => {
      fraImplementering = () =>
        kaede({
          data: { id: 'eksist-id', rolle: 'admin', aktiv: true, antal_logins: 4, foerste_login: '2026-01-01T00:00:00Z' },
          error: null
        });
      const { opdaterEllerOpretBruger } = await indlaes();

      const bruger = await opdaterEllerOpretBruger('b'.repeat(64));

      expect(bruger).toEqual({ id: 'eksist-id', rolle: 'admin', aktiv: true });
    });

    it('kaster, hvis opslaget fejler', async () => {
      fraImplementering = () => kaede({ data: null, error: { message: 'db nede' } });
      const { opdaterEllerOpretBruger } = await indlaes();

      await expect(opdaterEllerOpretBruger('c'.repeat(64))).rejects.toThrow('db nede');
    });
  });

  describe('opretSession', () => {
    it('genererer et 256-bit token og gemmer kun et HMAC af det', async () => {
      let indsat;
      fraImplementering = () => ({
        insert: vi.fn((row) => {
          indsat = row;
          return kaede({ error: null });
        })
      });
      const { opretSession } = await indlaes();

      const { token, ttl } = await opretSession('bruger-id', 'bruger');

      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(ttl).toBe(8 * 60 * 60);
      expect(indsat.token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(indsat.token_hash).not.toBe(token);
    });

    it('bruger 1 times TTL for admin', async () => {
      fraImplementering = () => ({ insert: () => kaede({ error: null }) });
      const { opretSession } = await indlaes();

      const { ttl } = await opretSession('bruger-id', 'admin');

      expect(ttl).toBe(60 * 60);
    });

    it('kaster AuthKonfigurationsfejl, hvis SESSION_SECRET mangler', async () => {
      delete process.env.SESSION_SECRET;
      fraImplementering = () => ({ insert: () => kaede({ error: null }) });
      const { opretSession, AuthKonfigurationsfejl } = await indlaes();

      await expect(opretSession('bruger-id', 'bruger')).rejects.toBeInstanceOf(AuthKonfigurationsfejl);
    });
  });

  describe('hentSessionFraRequest', () => {
    function req(cookieHeader) {
      return { headers: { get: () => cookieHeader } };
    }

    it('returnerer null, hvis der ingen cookie er', async () => {
      const { hentSessionFraRequest } = await indlaes();
      expect(await hentSessionFraRequest(req(null))).toBeNull();
    });

    it('returnerer null for en udløbet session', async () => {
      fraImplementering = () =>
        kaede({
          data: {
            bruger_id: 'id',
            udloeber: new Date(Date.now() - 1000).toISOString(),
            tilbagekaldt: null,
            brugere: { rolle: 'bruger', aktiv: true }
          },
          error: null
        });
      const { hentSessionFraRequest } = await indlaes();

      expect(await hentSessionFraRequest(req('stark_session=abc'))).toBeNull();
    });

    it('returnerer null for en tilbagekaldt session', async () => {
      fraImplementering = () =>
        kaede({
          data: {
            bruger_id: 'id',
            udloeber: new Date(Date.now() + 100000).toISOString(),
            tilbagekaldt: new Date().toISOString(),
            brugere: { rolle: 'bruger', aktiv: true }
          },
          error: null
        });
      const { hentSessionFraRequest } = await indlaes();

      expect(await hentSessionFraRequest(req('stark_session=abc'))).toBeNull();
    });

    it('returnerer null, hvis brugeren er inaktiv (§7: aktiv=false blokerer login)', async () => {
      fraImplementering = () =>
        kaede({
          data: {
            bruger_id: 'id',
            udloeber: new Date(Date.now() + 100000).toISOString(),
            tilbagekaldt: null,
            brugere: { rolle: 'bruger', aktiv: false }
          },
          error: null
        });
      const { hentSessionFraRequest } = await indlaes();

      expect(await hentSessionFraRequest(req('stark_session=abc'))).toBeNull();
    });

    it('returnerer bruger-id og rolle for en gyldig session', async () => {
      fraImplementering = () =>
        kaede({
          data: {
            bruger_id: 'bruger-42',
            udloeber: new Date(Date.now() + 100000).toISOString(),
            tilbagekaldt: null,
            brugere: { rolle: 'admin', aktiv: true }
          },
          error: null
        });
      const { hentSessionFraRequest } = await indlaes();

      const session = await hentSessionFraRequest(req('stark_session=abc'));

      expect(session).toEqual({ brugerId: 'bruger-42', rolle: 'admin', tokenHash: expect.any(String) });
    });
  });

  describe('tilbagekaldSession', () => {
    it('kaster, hvis opdateringen fejler', async () => {
      fraImplementering = () => ({ update: () => kaede({ error: { message: 'nede' } }) });
      const { tilbagekaldSession } = await indlaes();

      await expect(tilbagekaldSession('hash')).rejects.toThrow('nede');
    });
  });
});

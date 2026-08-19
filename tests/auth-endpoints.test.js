import { describe, it, expect, vi, beforeEach } from 'vitest';

const anmodOmKode = vi.fn();
const verificerKode = vi.fn();
vi.mock('../netlify/functions/lib/pa-otp.js', () => ({ anmodOmKode, verificerKode }));

const hashEmail = vi.fn((v) => `hash(${v})`);
vi.mock('../netlify/functions/lib/pseudonym.js', () => ({ hashEmail }));

const opdaterEllerOpretBruger = vi.fn();
const opretSession = vi.fn();
const saetSessionCookie = vi.fn(() => 'stark_session=token; HttpOnly');
const hentSessionFraRequest = vi.fn();
const tilbagekaldSession = vi.fn();
const ryddSessionCookie = vi.fn(() => 'stark_session=; Max-Age=0');
vi.mock('../netlify/functions/lib/auth.js', () => ({
  opdaterEllerOpretBruger,
  opretSession,
  saetSessionCookie,
  hentSessionFraRequest,
  tilbagekaldSession,
  ryddSessionCookie
}));

function jsonReq(method, body) {
  return { method, json: async () => body, headers: { get: () => null } };
}

describe('POST /api/auth-login', () => {
  let handler;
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: handler } = await import('../netlify/functions/auth-login.js?v=' + Math.random()));
  });

  it('afviser andre metoder end POST', async () => {
    const svar = await handler(jsonReq('GET', {}));
    expect(svar.status).toBe(405);
  });

  it('afviser manglende mail', async () => {
    const svar = await handler(jsonReq('POST', {}));
    expect(svar.status).toBe(400);
  });

  it('afviser mail uden for @stark.dk uden at kalde PA-flowet', async () => {
    const svar = await handler(jsonReq('POST', { email: 'jesper@gmail.com' }));
    expect(svar.status).toBe(400);
    expect(anmodOmKode).not.toHaveBeenCalled();
  });

  it('proxier en gyldig @stark.dk-mail til PA-flowet og returnerer dets status', async () => {
    anmodOmKode.mockResolvedValueOnce({ ok: true, status: 200, data: { message: 'Kode sendt.' } });

    const svar = await handler(jsonReq('POST', { email: '  Jesper@Stark.dk  ' }));
    const data = await svar.json();

    expect(anmodOmKode).toHaveBeenCalledWith('jesper@stark.dk');
    expect(svar.status).toBe(200);
    expect(data).toEqual({ ok: true, besked: 'Kode sendt.' });
  });

  it('returnerer 502, hvis PA-flowet fejler', async () => {
    anmodOmKode.mockRejectedValueOnce(new Error('nede'));
    const svar = await handler(jsonReq('POST', { email: 'jesper@stark.dk' }));
    expect(svar.status).toBe(502);
  });
});

describe('POST /api/auth-verificer', () => {
  let handler;
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: handler } = await import('../netlify/functions/auth-verificer.js?v=' + Math.random()));
  });

  it('afviser manglende felter', async () => {
    const svar = await handler(jsonReq('POST', { email: 'jesper@stark.dk' }));
    expect(svar.status).toBe(400);
  });

  it('returnerer 401 ved forkert kode uden at oprette session', async () => {
    verificerKode.mockResolvedValueOnce({ ok: false, data: {} });

    const svar = await handler(jsonReq('POST', { email: 'jesper@stark.dk', kode: '000000' }));

    expect(svar.status).toBe(401);
    expect(opretSession).not.toHaveBeenCalled();
  });

  it('afviser en inaktiv konto, selv med korrekt kode', async () => {
    verificerKode.mockResolvedValueOnce({ ok: true, data: {} });
    opdaterEllerOpretBruger.mockResolvedValueOnce({ id: 'x', rolle: 'bruger', aktiv: false });

    const svar = await handler(jsonReq('POST', { email: 'jesper@stark.dk', kode: '123456' }));

    expect(svar.status).toBe(401);
    expect(opretSession).not.toHaveBeenCalled();
  });

  it('opretter session og sætter cookie ved korrekt kode og aktiv bruger', async () => {
    verificerKode.mockResolvedValueOnce({ ok: true, data: {} });
    opdaterEllerOpretBruger.mockResolvedValueOnce({ id: 'bruger-1', rolle: 'admin', aktiv: true });
    opretSession.mockResolvedValueOnce({ token: 'tok', ttl: 3600 });

    const svar = await handler(jsonReq('POST', { email: 'jesper@stark.dk', kode: '123456' }));
    const data = await svar.json();

    expect(hashEmail).toHaveBeenCalledWith('jesper@stark.dk');
    expect(opretSession).toHaveBeenCalledWith('bruger-1', 'admin');
    expect(svar.status).toBe(200);
    expect(data).toEqual({ ok: true, rolle: 'admin' });
    expect(svar.headers.get('Set-Cookie')).toBe('stark_session=token; HttpOnly');
  });

  it('returnerer 502, hvis noget kaster undervejs', async () => {
    verificerKode.mockRejectedValueOnce(new Error('pa nede'));
    const svar = await handler(jsonReq('POST', { email: 'jesper@stark.dk', kode: '123456' }));
    expect(svar.status).toBe(502);
  });
});

describe('GET /api/auth-mig', () => {
  let handler;
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: handler } = await import('../netlify/functions/auth-mig.js?v=' + Math.random()));
  });

  it('returnerer 401, hvis ikke logget ind', async () => {
    hentSessionFraRequest.mockResolvedValueOnce(null);
    const svar = await handler({ method: 'GET', headers: { get: () => null } });
    expect(svar.status).toBe(401);
  });

  it('returnerer bruger_id og rolle, aldrig mail, når logget ind', async () => {
    hentSessionFraRequest.mockResolvedValueOnce({ brugerId: 'b1', rolle: 'bruger' });
    const svar = await handler({ method: 'GET', headers: { get: () => 'stark_session=abc' } });
    const data = await svar.json();
    expect(data).toEqual({ bruger_id: 'b1', rolle: 'bruger' });
    expect(JSON.stringify(data)).not.toMatch(/@/);
  });
});

describe('POST /api/auth-logud', () => {
  let handler;
  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: handler } = await import('../netlify/functions/auth-logud.js?v=' + Math.random()));
  });

  it('tilbagekalder sessionen og rydder cookien, når der er en aktiv session', async () => {
    hentSessionFraRequest.mockResolvedValueOnce({ brugerId: 'b1', rolle: 'bruger', tokenHash: 'th' });

    const svar = await handler({ method: 'POST', headers: { get: () => 'stark_session=abc' } });

    expect(tilbagekaldSession).toHaveBeenCalledWith('th');
    expect(svar.status).toBe(200);
    expect(svar.headers.get('Set-Cookie')).toBe('stark_session=; Max-Age=0');
  });

  it('rydder stadig cookien, selvom tilbagekaldelsen fejler', async () => {
    hentSessionFraRequest.mockResolvedValueOnce({ brugerId: 'b1', rolle: 'bruger', tokenHash: 'th' });
    tilbagekaldSession.mockRejectedValueOnce(new Error('db nede'));

    const svar = await handler({ method: 'POST', headers: { get: () => 'stark_session=abc' } });

    expect(svar.status).toBe(200);
    expect(svar.headers.get('Set-Cookie')).toBe('stark_session=; Max-Age=0');
  });

  it('rydder cookien uden at kalde tilbagekaldSession, hvis der ingen session er', async () => {
    hentSessionFraRequest.mockResolvedValueOnce(null);
    const svar = await handler({ method: 'POST', headers: { get: () => null } });
    expect(tilbagekaldSession).not.toHaveBeenCalled();
    expect(svar.status).toBe(200);
  });
});

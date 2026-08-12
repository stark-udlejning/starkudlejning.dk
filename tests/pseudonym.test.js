import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const SECRET = 'test-hemmelighed-mindst-16-tegn';

// Modulet læser process.env på hvert kald, men cacher intet — importeres derfor
// friskt pr. test, så en manglende secret kan afprøves isoleret.
async function indlaes() {
  return import('../netlify/functions/lib/pseudonym.js?v=' + Math.random());
}

describe('hashEmail', () => {
  let hashEmail, hashKunde, hashErEns, PseudonymKonfigurationsfejl;
  const oprindelig = process.env.PSEUDONYM_SECRET;

  beforeEach(async () => {
    process.env.PSEUDONYM_SECRET = SECRET;
    ({ hashEmail, hashKunde, hashErEns, PseudonymKonfigurationsfejl } = await indlaes());
  });

  afterEach(() => {
    if (oprindelig === undefined) delete process.env.PSEUDONYM_SECRET;
    else process.env.PSEUDONYM_SECRET = oprindelig;
  });

  it('giver samme hash for samme mail', () => {
    expect(hashEmail('jesper@stark.dk')).toBe(hashEmail('jesper@stark.dk'));
  });

  it('er ufølsom over for store og små bogstaver', () => {
    expect(hashEmail('Jesper@Stark.DK')).toBe(hashEmail('jesper@stark.dk'));
  });

  it('er ufølsom over for mellemrum i begge ender', () => {
    expect(hashEmail('  jesper@stark.dk  ')).toBe(hashEmail('jesper@stark.dk'));
  });

  it('kombinerer trim og lowercase', () => {
    expect(hashEmail('\t  JESPER@STARK.DK \n')).toBe(hashEmail('jesper@stark.dk'));
  });

  it('giver forskellige hashes for forskellige mails', () => {
    expect(hashEmail('a@stark.dk')).not.toBe(hashEmail('b@stark.dk'));
  });

  it('returnerer 64 hex-tegn — samme format som databasens check-constraint', () => {
    expect(hashEmail('jesper@stark.dk')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('afslører ikke inputtet', () => {
    expect(hashEmail('jesper@stark.dk')).not.toContain('jesper');
    expect(hashEmail('jesper@stark.dk')).not.toContain('stark');
  });

  it('afviser tom værdi', () => {
    expect(() => hashEmail('')).toThrow(TypeError);
    expect(() => hashEmail('   ')).toThrow(TypeError);
  });

  it('afviser null og undefined', () => {
    expect(() => hashEmail(null)).toThrow(TypeError);
    expect(() => hashEmail(undefined)).toThrow(TypeError);
  });

  it('afhænger af hemmeligheden', async () => {
    const medEn = hashEmail('jesper@stark.dk');
    process.env.PSEUDONYM_SECRET = 'en-helt-anden-hemmelighed-16';
    const { hashEmail: hash2 } = await indlaes();
    expect(hash2('jesper@stark.dk')).not.toBe(medEn);
  });

  describe('hashKunde', () => {
    it('normaliserer som hashEmail', () => {
      expect(hashKunde(' 10002152 ')).toBe(hashKunde('10002152'));
    });

    it('accepterer tal såvel som streng', () => {
      expect(hashKunde(10002152)).toBe(hashKunde('10002152'));
    });

    it('deler nøglerum med hashEmail — dokumenteret, ikke utilsigtet', () => {
      // CLAUDE.md §4 definerer begge som samme HMAC. Testen fastholder den
      // egenskab, så et fremtidigt skift til domæneadskilte hashes bliver et
      // bevidst valg med en migration, ikke en tilfældig ændring.
      expect(hashKunde('10002152')).toBe(hashEmail('10002152'));
    });
  });

  describe('hashErEns', () => {
    it('genkender ens hashes', () => {
      const h = hashEmail('jesper@stark.dk');
      expect(hashErEns(h, h)).toBe(true);
    });

    it('afviser forskellige hashes', () => {
      expect(hashErEns(hashEmail('a@stark.dk'), hashEmail('b@stark.dk'))).toBe(false);
    });

    it('afviser forskellig længde uden at kaste', () => {
      expect(hashErEns('abc', 'abcdef')).toBe(false);
    });

    it('afviser ikke-strenge', () => {
      expect(hashErEns(null, 'abc')).toBe(false);
      expect(hashErEns(undefined, undefined)).toBe(false);
    });
  });
});

describe('manglende PSEUDONYM_SECRET', () => {
  const oprindelig = process.env.PSEUDONYM_SECRET;
  afterEach(() => {
    if (oprindelig === undefined) delete process.env.PSEUDONYM_SECRET;
    else process.env.PSEUDONYM_SECRET = oprindelig;
  });

  it('fejler hårdt — der findes ingen stille fallback', async () => {
    delete process.env.PSEUDONYM_SECRET;
    const { hashEmail, PseudonymKonfigurationsfejl } = await indlaes();
    expect(() => hashEmail('jesper@stark.dk')).toThrow(PseudonymKonfigurationsfejl);
  });

  it('fejler også på en tom streng', async () => {
    process.env.PSEUDONYM_SECRET = '';
    const { hashEmail, PseudonymKonfigurationsfejl } = await indlaes();
    expect(() => hashEmail('jesper@stark.dk')).toThrow(PseudonymKonfigurationsfejl);
  });

  it('afviser en for kort hemmelighed', async () => {
    process.env.PSEUDONYM_SECRET = 'kort';
    const { hashEmail, PseudonymKonfigurationsfejl } = await indlaes();
    expect(() => hashEmail('jesper@stark.dk')).toThrow(PseudonymKonfigurationsfejl);
  });
});

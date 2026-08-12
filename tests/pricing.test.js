import { describe, it, expect } from 'vitest';
import {
  beregnListepris,
  beregnKundepris,
  beregnLinje,
  beregnTilbud,
  BEREGNING_VERSION,
  AFRUNDING
} from '../netlify/functions/lib/pricing.js';

// Satserne kommer altid udefra. Ingen af dem er defaults i pricing.js — det er hele
// pointen efter docs/kortlaegning.md §4.1, hvor otte sæt hardkodede tal gav to
// forskellige svar på samme tilbud.
const SATSER = { risikoPct: 6.5, miljoePct: 3.5 };

describe('beregnListepris', () => {
  it('lægger stigningen til basisprisen', () => {
    expect(beregnListepris(1000, 10)).toBe(1100);
  });

  it('0 % stigning giver listepris = basispris', () => {
    expect(beregnListepris(1000, 0)).toBe(1000);
  });

  it('manglende stigning behandles som 0', () => {
    expect(beregnListepris(1000, undefined)).toBe(1000);
    expect(beregnListepris(1000, null)).toBe(1000);
  });
});

describe('beregnKundepris', () => {
  it('trækker rabatten fra listeprisen', () => {
    expect(beregnKundepris(1000, 20)).toBe(800);
  });

  it('0 % rabat giver kundepris = listepris', () => {
    expect(beregnKundepris(1000, 0)).toBe(1000);
  });
});

describe('beregnLinje — hele kæden', () => {
  it('regner listepris, netto, risiko og miljø som CLAUDE.md §5.5', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);

    expect(r.listepris).toBe(1000);
    expect(r.enhedspris).toBe(800);        // 1000 × (1 − 0,20)
    expect(r.nettobeloeb).toBe(800);       // 800 × 1
    expect(r.risikotillaeg).toBe(65);      // 1000 × 6,5 %
    // Miljø af (netto + risiko) = 865 × 3,5 % = 30,275 → 30,28
    expect(r.miljoebidrag).toBeCloseTo(30.28, 2);
    expect(r.total).toBeCloseTo(895.28, 2);
  });

  it('regner miljø af netto PLUS risiko, ikke af netto alene', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER);
    const afNettoAlene = 800 * 0.035;      // 28 — den gamle, forkerte regel
    expect(r.miljoebidrag).not.toBeCloseTo(afNettoAlene, 2);
    expect(r.miljoebidrag).toBeCloseTo((800 + 65) * 0.035, 2);
  });

  it('udleder listeprisen fra basispris og stigning når listepris ikke er sat', () => {
    const r = beregnLinje({ basispris: 1000, stigningPct: 10, rabatPct: 0 }, SATSER);
    expect(r.listepris).toBe(1100);
    expect(r.enhedspris).toBe(1100);
  });

  it('risikofri linje får intet risikotillæg, men stadig miljøbidrag', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0, risikofri: true }, SATSER);
    expect(r.risikotillaeg).toBe(0);
    expect(r.miljoebidrag).toBeCloseTo(1000 * 0.035, 2);
  });
});

describe('antal', () => {
  it('ganger både nettobeløb og risikotillæg med antal', () => {
    const en = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);
    const tre = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 3 }, SATSER);

    expect(tre.nettobeloeb).toBe(en.nettobeloeb * 3);
    expect(tre.risikotillaeg).toBe(en.risikotillaeg * 3);
    // Miljøbidraget regnes af linjens samlede grundlag: (2400 + 195) × 3,5 %.
    expect(tre.miljoebidrag).toBeCloseTo((2400 + 195) * 0.035, 2);
  });

  it('afrunder én gang pr. linje, ikke pr. enhed', () => {
    // Reelt fund fra testkørslen, ikke en teoretisk finesse:
    //   1 stk. → (800 + 65)   × 3,5 % = 30,275  → 30,28
    //   3 stk. → (2400 + 195) × 3,5 % = 90,825  → 90,83
    // 3 × 30,28 = 90,84. De to tal er IKKE ens, og linjeafrundingen er den rigtige:
    // rundes der pr. enhed og ganges bagefter, akkumulerer fejlen med antallet.
    // Testen fastholder valget, så en fremtidig omskrivning ikke ubemærket flytter
    // afrundingspunktet og ændrer beløb på tværs af alle tilbud.
    const en = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);
    const tre = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 3 }, SATSER);

    expect(en.miljoebidrag).toBeCloseTo(30.28, 2);
    expect(tre.miljoebidrag).toBeCloseTo(90.83, 2);
    expect(tre.miljoebidrag).not.toBeCloseTo(en.miljoebidrag * 3, 2);
  });

  it('enhedsprisen er uændret af antal', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 5 }, SATSER);
    expect(r.enhedspris).toBe(800);
    expect(r.nettobeloeb).toBe(4000);
  });

  it('manglende antal behandles som 1', () => {
    const uden = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER);
    const med = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);
    expect(uden).toEqual(med);
  });

  it('regressionstest: antal 2 må aldrig give samme total som antal 1', () => {
    // Præcis den fejl, der i dag giver forskellige tal i tilbudshistorik og
    // dashboard (docs/kortlaegning.md §4.1).
    const en = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);
    const to = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 2 }, SATSER);
    expect(to.total).not.toBe(en.total);
  });
});

describe('falsy-zero — CLAUDE.md §5.4', () => {
  it('0 % rabat giver ingen rabat, ikke en default', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0 }, SATSER);
    expect(r.enhedspris).toBe(1000);
  });

  it('0 % risiko giver 0 kr., ikke 6,5 %', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0 }, { risikoPct: 0, miljoePct: 3.5 });
    expect(r.risikotillaeg).toBe(0);
    expect(r.miljoebidrag).toBeCloseTo(1000 * 0.035, 2);
  });

  it('0 % miljø giver 0 kr., ikke 3,5 %', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0 }, { risikoPct: 6.5, miljoePct: 0 });
    expect(r.miljoebidrag).toBe(0);
    expect(r.total).toBe(1065);
  });

  it('begge satser 0 giver total = nettobeløb', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0 }, { risikoPct: 0, miljoePct: 0 });
    expect(r.total).toBe(1000);
  });

  it('antal 0 respekteres og giver 0 kr.', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0, antal: 0 }, SATSER);
    expect(r.nettobeloeb).toBe(0);
    expect(r.risikotillaeg).toBe(0);
    expect(r.total).toBe(0);
  });

  it('manglende satser kaster i stedet for at gætte', () => {
    expect(() => beregnLinje({ listepris: 1000 }, {})).toThrow(TypeError);
    expect(() => beregnLinje({ listepris: 1000 }, { risikoPct: 6.5 })).toThrow(TypeError);
  });
});

describe('beregningsversion', () => {
  const linje = { listepris: 1000, rabatPct: 20, antal: 3 };

  it('version 2 er standard', () => {
    expect(BEREGNING_VERSION).toBe(2);
    expect(beregnLinje(linje, SATSER)).toEqual(
      beregnLinje(linje, SATSER, { version: 2 })
    );
  });

  it('version 1 og 2 giver forskelligt resultat på samme input', () => {
    const v1 = beregnLinje(linje, SATSER, { version: 1 });
    const v2 = beregnLinje(linje, SATSER, { version: 2 });
    expect(v1.total).not.toBe(v2.total);
  });

  it('version 1 ganger ikke med antal', () => {
    const v1 = beregnLinje(linje, SATSER, { version: 1 });
    expect(v1.nettobeloeb).toBe(800);      // ikke 2400
    expect(v1.risikotillaeg).toBe(65);     // ikke 195
    expect(v1.antal).toBe(3);              // antallet rapporteres stadig
  });

  it('version 1 regner miljø af nettopris alene', () => {
    const v1 = beregnLinje(linje, SATSER, { version: 1 });
    expect(v1.miljoebidrag).toBeCloseTo(800 * 0.035, 2);
  });

  it('afviser en ukendt version i stedet for at gætte', () => {
    expect(() => beregnLinje(linje, SATSER, { version: 3 })).toThrow(RangeError);
    expect(() => beregnLinje(linje, SATSER, { version: 0 })).toThrow(RangeError);
  });
});

describe('afrunding', () => {
  it('runder til øre som standard', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER);
    expect(r.miljoebidrag).toBeCloseTo(30.28, 2);
  });

  it('kan runde til hele kroner som det gamle system gør', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER,
      { afrunding: AFRUNDING.KRONE });
    expect(r.miljoebidrag).toBe(30);
    expect(Number.isInteger(r.total)).toBe(true);
  });
});

describe('beregnTilbud', () => {
  const tilbud = {
    linjer: [
      { listepris: 1000, rabatPct: 20, antal: 2 },
      { listepris: 500, rabatPct: 10, antal: 1 }
    ],
    udtransport: 900,
    hjemtransport: 900
  };

  it('lægger linjerne sammen og stempler versionen', () => {
    const r = beregnTilbud(tilbud, SATSER);
    expect(r.beregning_version).toBe(2);
    expect(r.linjer).toHaveLength(2);
    expect(r.subtotal).toBe(800 * 2 + 450);          // 2050
    expect(r.risikotillaeg).toBeCloseTo(65 * 2 + 32.5, 2);
    expect(r.transport).toBe(1800);
  });

  it('transport har intet risikotillæg', () => {
    const uden = beregnTilbud({ ...tilbud, udtransport: 0, hjemtransport: 0 }, SATSER);
    const med = beregnTilbud(tilbud, SATSER);
    expect(med.risikotillaeg).toBe(uden.risikotillaeg);
  });

  it('version 2 lægger miljøbidrag på transporten', () => {
    const uden = beregnTilbud({ ...tilbud, udtransport: 0, hjemtransport: 0 }, SATSER);
    const med = beregnTilbud(tilbud, SATSER);
    expect(med.miljoebidrag).toBeCloseTo(uden.miljoebidrag + 1800 * 0.035, 2);
  });

  it('version 1 lægger ikke miljøbidrag på transporten', () => {
    const v1 = beregnTilbud(tilbud, SATSER, { version: 1 });
    const udenTransport = beregnTilbud(
      { ...tilbud, udtransport: 0, hjemtransport: 0 }, SATSER, { version: 1 }
    );
    expect(v1.miljoebidrag).toBeCloseTo(udenTransport.miljoebidrag, 2);
  });

  it('totalen er summen af alle dele', () => {
    const r = beregnTilbud(tilbud, SATSER);
    expect(r.total).toBeCloseTo(
      r.subtotal + r.transport + r.risikotillaeg + r.miljoebidrag, 2
    );
  });

  it('et tilbud uden linjer giver nul hele vejen', () => {
    const r = beregnTilbud({ linjer: [] }, SATSER);
    expect(r.subtotal).toBe(0);
    expect(r.total).toBe(0);
  });

  it('returnerer tal der kan gemmes direkte på tilbuddet', () => {
    // CLAUDE.md §5.5: historik gemmes som tal, ikke som formel.
    const r = beregnTilbud(tilbud, SATSER);
    for (const n of [r.subtotal, r.transport, r.risikotillaeg, r.miljoebidrag, r.total]) {
      expect(Number.isFinite(n)).toBe(true);
    }
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});

import { describe, it, expect } from 'vitest';
import {
  beregnListepris,
  beregnKundepris,
  beregnLinje,
  beregnTilbud,
  BEREGNING_VERSION
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
    expect(r.enhedspris).toBe(800);      // 1000 − 20 %
    expect(r.nettobeloeb).toBe(800);     // 800 × 1
    expect(r.risikotillaeg).toBe(65);    // 1000 × 6,5 %
    expect(r.miljoebidrag).toBe(30);     // (800 + 65) × 3,5 % = 30,275 → 30
    expect(r.total).toBe(895);           // 800 + 65 + 30
  });

  it('regner miljø af netto PLUS risiko, ikke af netto alene', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER);
    expect(r.miljoebidrag).toBe(30);     // af 865
    expect(r.miljoebidrag).not.toBe(28); // 800 × 3,5 % — den gamle, forkerte regel
  });

  it('udleder listeprisen fra basispris og stigning når listepris ikke er sat', () => {
    const r = beregnLinje({ basispris: 1000, stigningPct: 10, rabatPct: 0 }, SATSER);
    expect(r.listepris).toBe(1100);
    expect(r.enhedspris).toBe(1100);
  });

  it('risikofri linje får intet risikotillæg, men stadig miljøbidrag', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 0, risikofri: true }, SATSER);
    expect(r.risikotillaeg).toBe(0);
    expect(r.miljoebidrag).toBe(35);     // 1000 × 3,5 %
  });
});

describe('afrunding — CLAUDE.md §5.5', () => {
  it('runder hver komponent til hele kroner', () => {
    const r = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER);
    for (const n of [r.nettobeloeb, r.risikotillaeg, r.miljoebidrag, r.total]) {
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('totalen er summen af de afrundede komponenter, ikke en afrundet sum', () => {
    // Uafrundet ville linjen give 800 + 65 + 30,275 = 895,275 → 895.
    // Her er det 800 + 65 + 30 = 895. De to falder tilfældigvis sammen, så testen
    // asserterer identiteten frem for tallet: totalen må aldrig regnes forfra.
    const r = beregnLinje({ listepris: 1000, rabatPct: 20 }, SATSER);
    expect(r.total).toBe(r.nettobeloeb + r.risikotillaeg + r.miljoebidrag);
  });

  it('afrunder én gang pr. linje, aldrig pr. enhed', () => {
    //   1 stk. → (800 + 65)   × 3,5 % = 30,275 → 30
    //   3 stk. → (2400 + 195) × 3,5 % = 90,825 → 91
    // Rundes der pr. enhed og ganges bagefter, giver 3 stk. 3 × 30 = 90 kr.
    // Forskellen er en krone på denne linje og vokser med antallet.
    const en = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);
    const tre = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 3 }, SATSER);

    expect(en.miljoebidrag).toBe(30);
    expect(tre.miljoebidrag).toBe(91);
    expect(tre.miljoebidrag).not.toBe(en.miljoebidrag * 3);
  });

  it('rammer .5-grænsen korrekt trods flydendekomma', () => {
    // 500 × 6,5 % er præcis 32,50 og skal runde op til 33.
    // Regnes det som 500 × (6.5/100), giver flydendekomma 32,499999999999996,
    // som ville runde ned til 32. Derfor regnes procenter som (x × pct) / 100.
    const r = beregnLinje({ listepris: 500, rabatPct: 0 }, SATSER);
    expect(r.risikotillaeg).toBe(33);
  });

  it('enhedsprisen rapporteres uafrundet — den er en mellemregning', () => {
    // Rundes enhedsprisen og ganges bagefter, er det netop fejlen pr. enhed.
    // Det afrundede og autoritative beløb er nettobeloeb.
    const r = beregnLinje({ listepris: 1000, rabatPct: 33.33, antal: 3 }, SATSER);
    expect(r.enhedspris).toBeCloseTo(666.7, 4);
    expect(r.nettobeloeb).toBe(2000);    // round(666,7 × 3) = round(2000,1)
    expect(Number.isInteger(r.nettobeloeb)).toBe(true);
  });
});

describe('antal', () => {
  it('ganger både nettobeløb og risikotillæg med antal', () => {
    const en = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 1 }, SATSER);
    const tre = beregnLinje({ listepris: 1000, rabatPct: 20, antal: 3 }, SATSER);

    expect(tre.nettobeloeb).toBe(2400);
    expect(tre.risikotillaeg).toBe(195);
    expect(tre.nettobeloeb).toBe(en.nettobeloeb * 3);
    expect(tre.risikotillaeg).toBe(en.risikotillaeg * 3);
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
    expect(r.miljoebidrag).toBe(35);
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
    expect(v1.total).toBe(893);    // 800 + 65 + 28
    expect(v2.total).toBe(2686);   // 2400 + 195 + 91
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
    expect(v1.miljoebidrag).toBe(28);      // 800 × 3,5 %, ikke (800 + 65) × 3,5 %
  });

  it('afviser en ukendt version i stedet for at gætte', () => {
    expect(() => beregnLinje(linje, SATSER, { version: 3 })).toThrow(RangeError);
    expect(() => beregnLinje(linje, SATSER, { version: 0 })).toThrow(RangeError);
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
    expect(r.subtotal).toBe(2050);         // 1600 + 450
    expect(r.risikotillaeg).toBe(163);     // 130 + 33
    expect(r.transport).toBe(1800);
    expect(r.miljoebidrag).toBe(141);      // 61 + 17 + 63 (transport)
    expect(r.total).toBe(4154);
  });

  it('alle beløb er hele kroner', () => {
    const r = beregnTilbud(tilbud, SATSER);
    for (const n of [r.subtotal, r.transport, r.risikotillaeg, r.miljoebidrag, r.total]) {
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('transport har intet risikotillæg', () => {
    const uden = beregnTilbud({ ...tilbud, udtransport: 0, hjemtransport: 0 }, SATSER);
    const med = beregnTilbud(tilbud, SATSER);
    expect(med.risikotillaeg).toBe(uden.risikotillaeg);
  });

  it('version 2 lægger miljøbidrag på transporten', () => {
    const uden = beregnTilbud({ ...tilbud, udtransport: 0, hjemtransport: 0 }, SATSER);
    const med = beregnTilbud(tilbud, SATSER);
    expect(med.miljoebidrag).toBe(uden.miljoebidrag + 63);  // 1800 × 3,5 %
  });

  it('version 1 lægger ikke miljøbidrag på transporten', () => {
    const v1 = beregnTilbud(tilbud, SATSER, { version: 1 });
    const udenTransport = beregnTilbud(
      { ...tilbud, udtransport: 0, hjemtransport: 0 }, SATSER, { version: 1 }
    );
    expect(v1.miljoebidrag).toBe(udenTransport.miljoebidrag);
  });

  it('totalen er summen af de afrundede dele', () => {
    const r = beregnTilbud(tilbud, SATSER);
    expect(r.total).toBe(r.subtotal + r.transport + r.risikotillaeg + r.miljoebidrag);
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

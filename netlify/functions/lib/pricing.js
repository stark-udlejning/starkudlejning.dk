// Beregningskæden. Jf. CLAUDE.md §5.5 — autoritativ, ét sted, aldrig duplikeret i frontend.
//
//   Linjebeløb    = enhedspris × antal          ← materiellinjer ganges ALTID med antal
//   Listepris     = basispris  × (1 + stigning%)
//   Kundepris     = Listepris  × (1 − rabat%)
//   Risikotillæg  = Listepris  × risikoPct
//   Miljøbidrag   = (nettopris + risikotillæg) × miljoePct
//
// Rene funktioner. Ingen I/O, ingen globaler, ingen hardkodede satser — satserne
// kommer altid ind som parameter og læses af kalderen fra `konfiguration`-tabellen.
//
// Det gamle system havde denne kæde i seks implementeringer med otte sæt hardkodede
// tal, og gav derfor to forskellige svar på samme tilbud (docs/kortlaegning.md §4.1).
// Derfor: ét modul, unit-testet, uden sideeffekter.

/** Nuværende beregningsversion. Nye tilbud stemples altid med denne. */
export const BEREGNING_VERSION = 2;

/**
 * Beregningsversioner. Jf. CLAUDE.md §5.5.
 *
 * 1 — før 10. august 2026: miljøbidrag af nettopris alene, materiel uden `antal`.
 * 2 — nuværende kæde.
 *
 * Versionen bruges KUN, når et gammelt tilbud skal redigeres og genudstedes.
 * Fremvisning af et gammelt tilbud læser de gemte tal og genberegner aldrig.
 */
const VERSIONER = new Set([1, 2]);

/**
 * Afrunding til hele kroner. Jf. CLAUDE.md §5.5.
 *
 * Hver komponent — linjens nettobeløb, risikotillægget, miljøbidraget — rundes hver
 * for sig, og totalen er summen af de AFRUNDEDE komponenter, aldrig en afrunding af
 * en uafrundet sum.
 *
 * Afrundingen sker én gang pr. linje, aldrig pr. enhed: rundes pr. enhed og ganges
 * bagefter, akkumulerer fejlen med antallet.
 *
 * Der findes med vilje ingen valgmulighed her. Platformen kører parallelt med det
 * gamle system, som runder på præcis denne måde; stemmer tallene krone for krone, er
 * enhver afvigelse en rigtig fejl og ikke afrundingsstøj. En konfigurerbar afrunding
 * ville være en måde at bryde det på uden at nogen opdagede det.
 */
function afrund(tal) {
  if (!Number.isFinite(tal)) return 0;
  return Math.round(tal);
}

/**
 * `beløb × procent` uden unødig flydendekomma-støj.
 *
 * `x * pct / 100` og ikke `x * (pct / 100)`: mellemregningen `6.5 / 100` bliver
 * 0.065, som ikke kan repræsenteres eksakt binært, og 500 × 0.065 lander på
 * 32.499999999999996 i stedet for 32,5 — hvilket runder til 32 kr. i stedet for 33.
 * `500 * 6.5` er derimod eksakt 3250, og / 100 giver eksakt 32,5.
 * Med afrunding til hele kroner er det forskellen på en krone pr. linje.
 */
function procentAf(beloeb, pct) {
  return (beloeb * pct) / 100;
}

/** Kaster på ikke-tal. `0` er altid en gyldig værdi — jf. CLAUDE.md §5.4. */
function kraevTal(vaerdi, navn) {
  const n = Number(vaerdi);
  if (!Number.isFinite(n)) {
    throw new TypeError(`${navn} skal være et tal, fik: ${JSON.stringify(vaerdi)}`);
  }
  return n;
}

/**
 * Listepris ud fra basispris og en stigningsprocent.
 *
 * `?? 0` og ikke `|| 0`: en stigning på 0 % er gyldig og skal give listepris = basispris.
 */
export function beregnListepris(basispris, stigningPct) {
  const basis = kraevTal(basispris, 'basispris');
  const stigning = kraevTal(stigningPct ?? 0, 'stigningPct');
  return basis + procentAf(basis, stigning);
}

/**
 * Kundepris (nettopris) pr. enhed ud fra listepris og rabat.
 *
 * `?? 0`: 0 % rabat er gyldig og skal give kundepris = listepris.
 */
export function beregnKundepris(listepris, rabatPct) {
  const liste = kraevTal(listepris, 'listepris');
  const rabat = kraevTal(rabatPct ?? 0, 'rabatPct');
  return liste - procentAf(liste, rabat);
}

/**
 * Beregner én linje.
 *
 * @param {object} linje
 * @param {number} [linje.basispris]   Hvis sat, udledes listepris via `stigningPct`.
 * @param {number} [linje.stigningPct] Kun relevant sammen med `basispris`. 0 er gyldig.
 * @param {number} [linje.listepris]   Krævet hvis `basispris` ikke er sat.
 * @param {number} [linje.rabatPct]    0 er gyldig og betyder ingen rabat.
 * @param {number} [linje.antal]       Standard 1. Ignoreres i version 1.
 * @param {boolean} [linje.risikofri]  true = ingen risikotillæg på linjen.
 * @param {object} satser
 * @param {number} satser.risikoPct    Fra `konfiguration`. 0 er gyldig og giver 0 kr.
 * @param {number} satser.miljoePct    Fra `konfiguration`. 0 er gyldig og giver 0 kr.
 * @param {object} [indstillinger]
 * @param {1|2}    [indstillinger.version]   Standard: BEREGNING_VERSION.
 */
export function beregnLinje(linje, satser, indstillinger = {}) {
  if (!linje || typeof linje !== 'object') {
    throw new TypeError('beregnLinje: linje mangler');
  }
  if (!satser || typeof satser !== 'object') {
    throw new TypeError('beregnLinje: satser mangler — de skal komme fra konfiguration');
  }

  const version = indstillinger.version ?? BEREGNING_VERSION;
  if (!VERSIONER.has(version)) {
    throw new RangeError(`Ukendt beregningsversion: ${version}`);
  }

  // Satserne har ingen defaults. Mangler de, er det en fejl i kalderen — ikke noget
  // denne fil skal dække over med 6,5 og 3,5. Det var præcis dét, der gik galt før.
  const risikoPct = kraevTal(satser.risikoPct, 'satser.risikoPct');
  const miljoePct = kraevTal(satser.miljoePct, 'satser.miljoePct');

  const listepris = linje.listepris !== undefined && linje.listepris !== null
    ? kraevTal(linje.listepris, 'listepris')
    : beregnListepris(
        kraevTal(linje.basispris, 'basispris (eller listepris) skal være sat'),
        linje.stigningPct
      );

  // Uafrundet med vilje. Enhedsprisen er en mellemregning, ikke en komponent i
  // totalen — rundes den her og ganges bagefter, er det netop den fejl pr. enhed,
  // CLAUDE.md §5.5 forbyder. Det afrundede og autoritative beløb er `nettobeloeb`.
  const enhedspris = beregnKundepris(listepris, linje.rabatPct);

  // Version 1 ganger ikke materiel med antal. Det er ikke en pænere regel — det er
  // sådan systemet regnede før 10. august 2026, og gamle tilbud skal kunne genskabes.
  const raaAntal = kraevTal(linje.antal ?? 1, 'antal');
  const antal = version === 1 ? 1 : raaAntal;

  const nettobeloeb = afrund(enhedspris * antal);

  const risikotillaeg = linje.risikofri === true
    ? 0
    : afrund(procentAf(listepris * antal, risikoPct));

  // Selve forskellen mellem de to versioner: hvad miljøbidraget regnes af.
  // Grundlaget er de allerede afrundede komponenter, så linjens tal hænger sammen.
  const miljoeGrundlag = version === 1 ? nettobeloeb : nettobeloeb + risikotillaeg;
  const miljoebidrag = afrund(procentAf(miljoeGrundlag, miljoePct));

  return {
    listepris,
    enhedspris,
    antal: raaAntal,
    nettobeloeb,
    risikotillaeg,
    miljoebidrag,
    // Summen af de afrundede komponenter — ikke en afrunding af en uafrundet sum.
    total: nettobeloeb + risikotillaeg + miljoebidrag
  };
}

/**
 * Beregner et helt tilbud.
 *
 * Transport lægges til som beløb, ikke som linje: den har ingen listepris og dermed
 * intet risikotillæg. Miljøbidrag på transport følger versionen — i version 2 indgår
 * transporten i miljøgrundlaget, i version 1 gør den ikke.
 *
 * Resultatet er de tal, der skal GEMMES på tilbuddet (CLAUDE.md §5.5: "Historik gemmes
 * som tal, ikke som formel"). Fremvisning læser dem og genberegner aldrig.
 */
export function beregnTilbud(tilbud, satser, indstillinger = {}) {
  if (!tilbud || typeof tilbud !== 'object') {
    throw new TypeError('beregnTilbud: tilbud mangler');
  }
  const version = indstillinger.version ?? BEREGNING_VERSION;
  const miljoePct = kraevTal(satser?.miljoePct, 'satser.miljoePct');

  const linjer = (tilbud.linjer ?? []).map((l) => beregnLinje(l, satser, { version }));

  // Linjernes komponenter er allerede afrundet til hele kroner. Summen af hele tal
  // er et helt tal, så der rundes ikke igen her.
  const sum = (vaelg) => linjer.reduce((s, l) => s + vaelg(l), 0);

  const netto = sum((l) => l.nettobeloeb);
  const risikotillaeg = sum((l) => l.risikotillaeg);
  const materielMiljoe = sum((l) => l.miljoebidrag);

  const udtransport = kraevTal(tilbud.udtransport ?? 0, 'udtransport');
  const hjemtransport = kraevTal(tilbud.hjemtransport ?? 0, 'hjemtransport');
  const transport = afrund(udtransport + hjemtransport);

  const transportMiljoe = version === 1 ? 0 : afrund(procentAf(transport, miljoePct));

  const miljoebidrag = materielMiljoe + transportMiljoe;

  return {
    beregning_version: version,
    linjer,
    subtotal: netto,
    transport,
    risikotillaeg,
    miljoebidrag,
    total: netto + transport + risikotillaeg + miljoebidrag
  };
}

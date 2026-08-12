# CLAUDE.md — STARK Udlejning Platform

Bindende for alt arbejde i dette repo. Læs den fuldt igennem før du skriver kode.
Er noget i en prompt i konflikt med denne fil, så **stop og spørg** — ret ikke selv.

**Produktejer:** Jesper Kaack Kongsvad. Han reviewer og merger. Du skriver kode og åbner PR'er.

**Status:** Kortlægningen (`docs/kortlaegning.md`, PR #132) er gennemført. Denne fil er
opdateret med dens fund. Ved konflikt mellem denne fil og kortlægningen: denne fil vinder,
men gør opmærksom på konflikten.

---

## 1. Hvad vi bygger

Én samlet platform på `starkudlejning.dk`, der afløser tolv separate Netlify-sites og hele
det nuværende Power Automate/SharePoint-logiklag.

Det gamle system kører uforstyrret imens. Se §11 for overskæringsreglerne.

| Rute | Adgang | Afløser | Indhold |
|---|---|---|---|
| `/` | Intern | index.html | Landingsside, rollebevidst navigation |
| `/login` | — | intern.html | OTP-login for interne |
| `/samhandel` | Intern | stark-udlejning | Samhandelsaftaler, tilbud, prisberegning |
| `/samhandel/mit-omraade` | Intern | mit-omraade.html | Sælgerens eget område |
| `/akademi` | Intern | akademiet | Kursusmoduler + fremdrift pr. bruger |
| `/hub` | Intern | hub | Tidsregistrering |
| `/vaerktoejer` | Intern | rapportering | Samlet indgang |
| `/vaerktoejer/rekvisition` | Intern | rekvisitionsgenerator | Rekvisitionsnumre |
| `/vaerktoejer/opmaaling` | Intern | opmaaling | Digitalt opmålingsværktøj |
| `/vaerktoejer/stickers` | Intern | stickers | Bestilling af mærkater |
| `/vaerktoejer/merchandise` | Intern | merchandise | Branded merchandise |
| `/rapportering` | Intern | rapportering | Samlet indgang |
| `/rapportering/afvigelse` | Intern | afvigelsesrapportering | Driftsafvigelser |
| `/rapportering/klage-js` | Intern | klage-johs-sorensen | Klager vedr. JS Transport |
| `/rapportering/maskinoensker` | Intern | oenskeliste-maskiner | Maskinønsker og udfasning |
| `/spinning` | **Offentlig** | spinning | Cycling for Cancer-tilmelding |
| `/kunde/login` | — | (nyt) | OTP-login for eksterne kunder |
| `/kunde/aftale` | **Kunde** | din-aftale.html | Kundens egen aftale og dokumenter |
| `/kunde/tilbud` | **Kunde** | vis-tilbud.html | Fremvisning af tilbud |
| `/admin` | `admin` | admin.html | Backend-forside |
| `/admin/dashboard` | `admin` | dashboard_v2.html | Nøgletal og overblik |
| `/admin/afvigelser` | `admin` | (i dag localStorage) | Alle indsendte afvigelser fra SP |
| `/admin/klager` | `admin` | (nyt) | Alle klagesager fra SP |
| `/admin/maskinoensker` | `admin` | (nyt) | Alle maskinønsker fra SP |
| `/admin/brugere` | `admin` | (nyt) | Brugere og roller |
| `/admin/priser` | `admin` | priser.json-UI | Produkter, priser, formler, konfiguration |

**Ikke med i platformen:** `ansogning`, `martin-kongsvad`. Begge sættes til privat på org'en.

**Adgangsniveauer:**

- **Offentlig** — ingen login. Kun `/spinning`.
- **Intern** — OTP mod `@stark.dk`. Giver adgang til **alt undtagen `/admin/*`**.
- **`admin`** — intern + rolle. Giver derudover adgang til `/admin/*`.
- **Kunde** — separat login-verden (§8). Kun `/kunde/*`. En kundesession giver aldrig
  adgang til interne ruter, og omvendt.

Der er altså kun **to interne roller**: `bruger` og `admin`. Ingen afdelingsfiltrering,
ingen sælgerfiltrering, ingen synlighedsregler mellem interne brugere. Det er et bevidst
valg (§9).

Rollen kontrolleres **serverside i hver function**, aldrig kun ved at skjule et menupunkt.

Ledelsesværktøjerne under `/admin` er en central gevinst ved samlingen: afvigelser og
maskinønsker findes i dag som mails og browser-lokale lister uden samlet overblik. På den nye
platform læses de fra SharePoint via adapteren og vises samlet med søgning og filtrering.

---

## 2. Arkitektur

```
Browser  ──  starkudlejning.dk (Netlify custom domain, ikke redirect)
  │
  ▼
Netlify (statisk frontend + serverless functions)
  │
  ├──► Supabase (Postgres, EU)      ── ikke-persondata + pseudonymiserede data
  │
  ├──► lib/sharepoint.js ──► PA-flow ──► SharePoint  ── alle identificerende persondata
  │
  └──► lib/sendMail.js   ──► PA-flow ──► Exchange    ── al udgående mail
```

Opdelingen er juridisk begrundet, ikke teknisk. **STARK Group er dataansvarlig.** Flyttes
personoplysninger til Supabase, bliver Supabase databehandler, og det kræver en
databehandleraftale (GDPR art. 28), som vi ikke kan indgå på STARK's vegne.

Vi **omgår ikke** en godkendelse — vi undgår den handling, der ville udløse den. At andre
systemer i forvejen håndterer data løst er ikke et argument for at gøre det samme.

De to PA-flows er **adaptere, ikke logik**: nul betingelser, nul expressions, nul beregninger.

---

## 3. Data — tre kategorier

Hvert felt hører til præcis én kategori. Er du i tvivl: **spørg, opret det ikke.**

### Kategori A — Ikke-persondata → Supabase, frit

Produkter, priser, prisformler, rabatsatser, risikoklasser, maskinstamdata, ydelser,
afdelingsliste (numre og adresser), kursusindhold, skabeloner, konfiguration.

### Kategori B — Pseudonymiserede persondata → Supabase, kun hashet nøgle

Data om interne medarbejdere og om kunder, hvor selve identiteten ikke er nødvendig for
funktionen: kursusfremdrift, tidsregistrering, sessioner, audit-log, brugerroller,
omsætningstal pr. kunde.

- Nøglen er altid `email_hash` eller `kunde_hash` — aldrig mail, navn eller kundenummer.
- Se §4 for mønstret.

Pseudonymiserede data er stadig persondata efter GDPR — det er ikke anonymisering. Men
risikoen ved et brud er materielt reduceret, og konstruktionen er til at forsvare.

### Kategori C — Identificerende persondata → aldrig i Supabase

Kundenavne, kontaktpersoner, kundemailadresser, telefonnumre, kundenumre, KAM-tilknytning på
navn, underskriverinformation, underskrevne aftaler, kundedokumenter, indsendte formularer
(afvigelser, klager, maskinønsker), tilmeldinger fra eksterne.

Læses og skrives udelukkende via `lib/sharepoint.js`.

**Fritekstfelter er den typiske lækagevej.** `fritekst` og `vilkaar` på tilbud er kategori C,
selvom feltnavnet er neutralt. Det samme gælder uddybningsfelter på afvigelser og klager.

---

## 4. Pseudonymisering

```js
// netlify/functions/lib/pseudonym.js
const hmac = (v) => crypto.createHmac('sha256', process.env.PSEUDONYM_SECRET)
                          .update(String(v).trim().toLowerCase()).digest('hex');

export const hashEmail = hmac;   // interne og eksterne mailadresser
export const hashKunde = hmac;   // kundenumre
```

**Login uden at gemme mailadresser:**

1. Brugeren indtaster sin mail
2. Functionen beregner `email_hash` og slår op i allowlisten
3. Findes hashet, sendes koden til den adresse, brugeren lige har indtastet
4. Adressen kastes væk efter afsendelse

Vi har aldrig brug for at *læse* en mailadresse fra databasen — kun at genkende den.

**`kunde_hash` gør omsætningstal mulige i Supabase.** `potentiel_omsaetning`,
`omsaetning_stark` og `realiseret_omsaetning` gemmes mod `kunde_hash`. Uden nøglen er de
meningsløse for en udenforstående; med den kan de bruges til beregning og aggregering.
Kundenummer, navn og kontakt bliver i SharePoint.

**Konsekvenser:**

- `PSEUDONYM_SECRET` må aldrig rotere uden en migration, der genberegner alle hashes.
- Hemmeligheden ligger i Netlify env vars, aldrig i repoet, aldrig i Supabase.
- Admin-UI kan ikke liste mailadresser fra Supabase. Den autoritative brugerliste ligger i
  SharePoint-listen `Platformsbrugere`. Kan adapteren ikke nås, vises pseudonyme id'er.

---

## 5. Ufravigelige regler

### 5.1 Ét adapterlag

- Al mail gennem `lib/sendMail.js`. Ingen anden fil må kende flowets URL.
- Al SharePoint-adgang gennem `lib/sharepoint.js`.
- PA skal kunne udskiftes ved at ændre én fil. Lækker flow-URL'er, SP-feltnavne eller
  `?.Value`-mønstre ud i øvrige filer, er lagdelingen brudt.

### 5.2 Hemmeligheder og adgangskontrol

- Service role keys, flow-URL'er, `PSEUDONYM_SECRET` og delte hemmeligheder findes kun i
  Netlify env vars, læst i functions.
- Browseren taler aldrig direkte med Supabase.
- **Ingen adgangskode i klientkode.** Nogensinde. Det nuværende system har `stark2026` og
  `Stark2026` hardkodet i to filer og en `authorization`-header med den literale streng
  `internal`. Ingen af delene reproduceres.
- Al autorisation sker serverside i den function, der leverer data. En skjult knap er ikke
  adgangskontrol.

### 5.3 Ingen localStorage som datalager

Fremdrift, registreringer, kladder, indsendelser og indstillinger gemmes **serverside**.
localStorage må kun bruges til rent kosmetisk UI-tilstand.

Dette er en af hovedårsagerne til migreringen. I dag gælder:

- `stark_tilbud` er eneste kilde til seks tilbudsfelter, heraf `fritekst`, `vilkaar`,
  `kontakt` og `tlf` i kategori C
- Akademiets fremdrift findes kun i den enkelte browser
- Afvigelsesformularen falder tilbage til localStorage ved afsendelsesfejl — med navn,
  mail og vedhæftninger

Det betyder, at kategori C-data i dag ligger spredt i browsere, ingen har overblik over.
Nye funktioner må ikke gøre det samme.

### 5.4 Falsy-zero

Brug **aldrig** `value || fallback` hvor `0` er gyldigt.

```js
const risiko = config.risikoPct || 6.5;   // FORKERT — 0 % bliver til 6,5 %
const risiko = config.risikoPct ?? 6.5;   // RIGTIGT
```

Gælder alle procenter, rabatter, tillæg, antal og fremdriftstal.

### 5.5 Beregningskæden

**Autoritativ. Ét sted: `lib/pricing.js`. Aldrig duplikeret i frontend.**

```
Linjebeløb    = enhedspris × antal          ← materiellinjer ganges ALTID med antal
Listepris     = basispris  × (1 + stigning%)
Kundepris     = Listepris  × (1 − rabat%)
Risikotillæg  = Listepris  × 6,5 %
Miljøbidrag   = (nettopris + risikotillæg) × 3,5 %      ← IKKE nettopris alene
```

Satserne læses fra `konfiguration`-tabellen. **Ingen hardkodede satser nogen steder.**
I dag findes beregningen i seks implementeringer med otte sæt hardkodede tal, og
`satser`-blokken i `priser.json` læses ikke af nogen fil. Det er årsagen til, at systemet
giver to forskellige svar. Det gentages ikke.

**Historik gemmes som tal, ikke som formel.** Hvert tilbud gemmer sine beregnede totaler
(`linjer[]`, `subtotal`, `risikotillaeg`, `miljoebidrag`, `total`) på selve tilbuddet ved
oprettelse. Fremvisning af et gammelt tilbud læser de gemte tal og genberegner aldrig.

Derudover stemples hvert tilbud med `beregning_version`:

- `1` — miljøbidrag af nettopris alene, materiel uden `antal` (før 10. august 2026)
- `2` — nuværende kæde ovenfor

Versionen bruges kun, hvis et gammelt tilbud skal redigeres og genudstedes. Nye tilbud er
altid `2`.

### 5.6 Du merger aldrig

Du åbner PR'er. Jesper merger. Ingen undtagelser.

### 5.7 Integritet i afrapportering

- Rapportér kun hvad du faktisk har gjort. Har du ikke kørt testene, så skriv det.
- Hævd aldrig at have verificeret noget, du ikke har.
- Angiv commit-SHA og filnavne, så påstande kan kontrolleres mod diffen.
- **Skeln mellem "jeg fandt det ikke" og "det findes ikke."** Kortlægningen konkluderede,
  at `afvigelsesrapportering` ikke fandtes, fordi filen ikke lå i deploy-listen under det
  navn. Siden er i drift og bruges dagligt. Konklusioner om fravær skal enten verificeres
  mod den kørende URL eller formuleres som usikkerhed.

---

## 6. Teknisk stak

- **Frontend:** statisk HTML/CSS/JS. Intet framework uden aftale.
- **Backend:** Netlify Functions (Node, ESM).
- **Database:** Supabase Postgres, EU-region. RLS på alle tabeller fra start.
- **Migrations:** SQL i `supabase/migrations/`, nummereret og committet. Aldrig
  schemaændringer i Supabase-UI'et.
- **Tests:** Vitest. Al beregningslogik, auth og pseudonymisering skal have tests.
- **Reference:** `spilmere`-repoet i samme org er en fungerende opsætning af
  Supabase + RLS + Netlify Functions. Brug den som forlæg, ikke som kopi.

```
/src
  /shared          komponenter, design tokens, layout
  /<rute>
/netlify/functions
  /lib             sendMail.js, sharepoint.js, supabase.js, auth.js,
                   pricing.js, pseudonym.js, dokumenter.js
/supabase/migrations
/legacy            arkivkopi af gamle sites — deployes aldrig
/tests
/docs
```

---

## 7. Auth — interne

Fungerer som `intern.html` gør i dag. Mønstret er i drift og ændres ikke.

- **Ingen allowlist.** Enhver gyldig `@stark.dk`-adresse kan anmode om en kode.
  Adgangskontrollen er, at koden kun kan modtages i en STARK-postkasse.
- Andre domæner afvises.
- 6 cifre, `crypto.randomInt`. Kun **hash** gemmes, aldrig koden i klartekst.
- TTL 10 min, engangsbrug. Maks 5 forsøg. Rate limit pr. adresse og pr. IP.
- Identisk svar uanset udfald.
- Session i signeret cookie: `httpOnly`, `Secure`, `SameSite=Lax`, host-only.
  8 timer for brugere, 1 time på `/admin`.

**Ved første succesfulde login oprettes automatisk en række** i `brugere` med
`email_hash`, `rolle = 'bruger'` og `aktiv = true`. Tabellen er altså et **register over
hvem der har været inde**, ikke en port man skal stå på for at komme ind.

`aktiv = false` blokerer login. Det er den eneste måde at lukke en enkelt person ude, og den
bruges kun undtagelsesvist — normalt lukkes adgangen ved, at postkassen spærres.

Konsekvens værd at kende: porten er "har en `@stark.dk`-postkasse", hvilket er hele
STARK Group og ikke kun Udlejning. Det svarer til nuværende praksis. Brugerlisten i
`/admin/brugere` er modvægten — den gør synligt, hvem der faktisk logger ind.

---

## 8. Auth — kunder

Samme flow, anden allowlist.

- Kunden indtaster sin mail på `/kunde/login`
- Functionen slår op i SharePoint-kontaktlisten **via adapteren** — kundemails ligger aldrig
  i Supabase
- Kode sendes til den indtastede adresse
- Sessionen er bundet til `kunde_hash` og giver **kun** adgang til den pågældende kundes
  aftale, tilbud og dokumenter

Token-i-URL bevares kun som supplement til engangsdeling: ét dokument, kort levetid,
revokerbart, aldrig som eneste adgangsmekanisme.

### 8.1 Dokumentadgang

Kundedokumenter serveres af `lib/dokumenter.js` bag en function, der kræver gyldig
kundesession og verificerer, at dokumentet tilhører den kunde. Ingen forudsigelige URL'er,
ingen offentlig mappe, ingen filnavne der kan gættes.

Al dokumentadgang logges i `audit_log` mod `kunde_hash`. Vi skal kunne besvare
"hvem har set denne aftale".

---

## 9. Roller, brugerstyring og login-statistik

### 9.1 Modellen

| Rolle | Ser |
|---|---|
| `bruger` | Alt undtagen `/admin/*`. Alle tilbud, alle kunder, alle værktøjer |
| `admin` | Alt ovenstående + `/admin/*` |
| `kunde` | Kun egen aftale, egne tilbud, egne dokumenter (separat login-verden) |

**Ingen filtrering mellem interne brugere.** Alle godkendte ser alle tilbud og alle kunder.
Det er en truffet beslutning, ikke en manglende funktion, og det skal fremgå af koden som et
eksplicit valg — ikke som et filter, der er glemt.

Jesper er eneste admin ved lancering og tilføjer selv flere fra `/admin/brugere`.

### 9.2 Låste kort, ikke skjulte

Forsiden viser **alle** kort til alle. `/admin` og `/admin/dashboard` vises for
ikke-admins i låst tilstand med lås-ikon, ikke skjult.

Begrundelsen er, at platformen skal se sammenhængende ud — en bruger skal kunne se, at der
findes en ledelsesdel, uden at kunne åbne den.

Det er et rent UI-valg. **Adgangskontrollen ligger serverside**, og en låst knap er ikke en
kontrol.

### 9.3 Hvor rollen bor

**Kun admin-rollen vedligeholdes manuelt.** Almindelige brugere skal ikke registreres af
nogen — de oprettes automatisk ved første login (§7).

- `brugere` i Supabase, nøglet på `email_hash`. Kolonnen `rolle` er `'bruger'` som standard.
- Jesper forfremmer og degraderer fra `/admin/brugere`. Ingen anden vej ind i rollen.
- En admin kan tilføjes, før vedkommende har logget ind: admin indtaster mailen, functionen
  hasher den og opretter rækken med `rolle = 'admin'`.
- Jesper er eneste admin ved lancering.

Rolleopslaget sker i Supabase, ikke i PA. Et login må aldrig afhænge af, at et Power
Automate-flow svarer — er flowet nede, skal folk stadig kunne komme ind. PA må gerne bruges
til at oprette eller berige en bruger, aldrig til at godkende et login.

Navne til visning hentes fra SharePoint-listen `Platformsbrugere` (kategori C) og joines på
`hashEmail(Email)`. Kan adapteren ikke nås, vises brugerne uden navn — det er acceptabelt og
må ikke blokere siden.

### 9.4 Login-statistik

Tælles i Supabase mod `email_hash` — kategori B, ingen mailadresse nødvendig:

`brugere`: `foerste_login`, `sidste_login`, `antal_logins`, `aktiv`

Opdateres ved hver succesfuld verifikation af engangskode. `/admin/brugere` viser:

- Samlet antal brugere, aktive seneste 7 og 30 dage
- Tabel med navn, mail (fra SP), rolle, første login, seneste login, antal logins
- Rolleskift direkte fra rækken
- Søgefelt og sortering

Start med tabellen. Grafer kan komme senere.

### 9.5 Ledelseslister

`/admin/afvigelser` og `/admin/maskinoensker` læser fra SharePoint via adapteren og viser:

- Fritekstsøgning på tværs af felter
- Kolonnefiltre: dato, afdeling, type, status
- Sortering på kolonner
- Klik på række → detaljevisning, inkl. vedhæftede filer
- Eksport til CSV

Samme komponent bruges til begge — de adskiller sig kun ved kolonner og datakilde.

### 9.6 Dashboard

`/admin/dashboard` bevares funktionelt som i dag. Layout og indhold ændres ikke ud over
designsystemet.

Undtagelse: den hardkodede adgangskode i `dashboard_v2.html:844` fjernes. Adgang styres
udelukkende af sessionen og rollen (§5.2). Det samme gælder `admin.html:1671`.

---

## 10. Domæne og design

`starkudlejning.dk` opsættes som **custom domain på Netlify** — ikke redirect. Under
udvikling peges `test.starkudlejning.dk` på sandkassen, password-beskyttet, så cookies og
login testes på det rigtige domæne fra dag ét. Cookien sættes host-only.

```css
--stark-orange: #E87722;
--stark-navy:   #1B3A6B;
--stark-white:  #FFFFFF;
```

Design tokens i `tokens.css`. Ingen hardkodede farver i komponenter. Ét designsystem for alle
ruter. Fonte selvhostes — ingen kald til Google Fonts, heller ikke i mailskabeloner.

Google Maps Autocomplete bevares, men kaldet flyttes bag en function og debounces, så
kundeadresser ikke sendes til Google ved hvert tastetryk.

---

## 11. Overskæring — nul driftsforstyrrelse

**Det gamle system er autoritativt indtil overskæringsdagen. Det nye læser kun.**

Ingen dobbeltskrivning. To systemer, der skriver til samme SharePoint-liste, er den klassiske
måde en parallel migrering går galt på.

- Ingen gammel side lukkes, før den nye har kørt fejlfrit i produktion i mindst en uge
- Overskæring er ét øjeblik: gammelt site får 301-redirect, ny app får skriverettighed
- `main` er beskyttet. Alt gennem PR med deploy preview
- Seed-brugere er `test1@starkudlejning.dk` osv. — aldrig rigtige kolleger
- Rigtige produkt- og prisdata: i orden. Rigtige persondata: ikke

**Rækkefølge:**

1. Fundament + `/akademi` — ingen kategori C, ingen PA, ingen beregning
2. `/kunde/*` + dokumentadgang — lukker den største eksisterende eksponering
3. `/rapportering/*` + `/admin`-ledelsesvisning — flytter formularer fra localStorage til SP
4. `/vaerktoejer/*` — fire simple sites, hurtig gevinst
5. `/hub` — første med kategori B i drift
6. `/samhandel` — sidst. Størst, mest kritisk, flest afhængigheder

---

## 12. Arbejdsgang

1. Én PR pr. lag/feature. Hellere små end store.
2. PR-beskrivelsen skal indeholde: hvad der er ændret, hvilke filer, hvad der er testet,
   og hvad der **ikke** er testet.
3. Nye funktioner får tests i samme PR.
4. Ændringer i beregningsformler, datamodel eller sikkerhedsregler kræver eksplicit
   godkendelse **før** kodning.

---

## 13. Ordliste

- **Samhandelsaftale** — rammeaftale om rabatter og priser med en kunde
- **KAM** — Key Account Manager
- **Nettopris** — kundens pris efter rabat · **Listepris** — pris før rabat
- **Risikotillæg** — 6,5 % af listepris · **Miljøbidrag** — 3,5 % af (nettopris + risikotillæg)
- **Afdeling** — fysisk lokation, identificeret ved nummer (fx 580 Køge)
- **Akademiet** — internt kursusmodul med fremdrift pr. medarbejder
- **HUB** — internt værktøj til tidsregistrering
- **CC** — Claude Code

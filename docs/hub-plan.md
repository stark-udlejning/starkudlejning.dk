# Midlertidig værktøjshub

`src/index.html` er indtil videre en hub, ikke den endelige landingsside. Den erstatter
placeholderen fra PR #1 med noget brugbart *nu*, uden at foregribe §9.2's rollebevidste
landingsside (søgning, akademiets fremdrift som statuspunkt m.m.).

## Hvad den gør

- Login mod `@stark.dk` — genbruger de eksisterende PA-flows bag `intern.html` (se
  afsnittet "Login" nedenfor). Bruger de eksisterende tabeller `brugere` og `sessioner`
  fra `001_fundament.sql` — ingen ny migration. `otp_koder` bruges IKKE af denne PR,
  fordi kodehåndteringen ligger i PA-flowet, ikke her.
- Ét kort pr. site, grupperet efter CLAUDE.md §1's rutegrupper: Samhandel, Akademi, HUB,
  Værktøjer, Rapportering, Admin.
- Admin-kort er synlige for alle, låst for ikke-admins (§9.2-mønsteret), men det er en
  UI-markering — de bagvedliggende sites (`admin.html`, `dashboard_v2.html`) har deres eget,
  uændrede login. Denne hub ændrer intet ved adgangen til de gamle sites.

## Hvad den ikke gør

- Rører ikke de eksisterende sites. Ingen kode, ingen deploys, ingen redirects ændret
  på dem.
- Erstatter ikke `/kunde/*`, som kræver en helt separat login-verden (§8).
- Løser ikke sikkerhedsfundene i `docs/kortlaegning.md` §8.1 (klartekst-adgangskoder i
  `admin.html`/`dashboard_v2.html`, ingen adgangskontrol på `index.html`/`vis-tilbud.html`).
  De findes stadig på de gamle sites, uændret.
- Linker ikke til `/spinning` (offentlig, intet login nødvendigt — giver ikke mening bag
  denne interne hubs login), `ansogning`, `martin-kongsvad` eller `spilmere` — samme
  begrundelse som CLAUDE.md §1: de hører ikke til platformen, og opgaven bad specifikt om
  de seks grupper Samhandel/Akademi/HUB/Værktøjer/Rapportering/Admin.

## Rapporteringssitets tre formularer — kun to bekræftede filnavne

`docs/kortlaegning.md` §0.3 bekræfter, via Netlifys deploy-metadata, at
`stark-udlejning-rapportering.netlify.app` indeholder `klage-johs-sorensen.html` og
`oenskeliste-maskiner.html`. Begge kort linker derfor direkte til disse filnavne
(**med** `.html` — sitet har ingen redirects, jf. kortlægningens §0.2 punkt 4, så en
"pæn" sti uden endelse ville 404).

Afvigelsesrapporteringens filnavn er **ikke** bekræftet — kortlægningen skriver
eksplicit "Det faktiske filnavn er ukendt herfra" (§0.3). `*.netlify.app` er blokeret af
denne sessions egress-proxy (samme 403 på CONNECT, afprøvet direkte og via WebFetch, som
kortlægningens §0 selv rapporterer), så filnavnet kunne heller ikke bekræftes her. Kortet
linker derfor til rapporteringssitets forside i stedet for at gætte en sti
(CLAUDE.md §5.7: "jeg fandt det ikke" ≠ "det findes ikke" — og en gættet sti, der viser
sig forkert, er værre end en ekstra klik via forsiden).

## Login — genbruger det gamle flow (produktejerens beslutning)

`CLAUDE.md` §7 beskriver en hærdet OTP-model, der skal bygges fra bunden. Produktejeren
har taget en informeret, bevidst beslutning om i stedet at genbruge det eksisterende
PA-flow bag `intern.html`, for at undgå at vedligeholde to OTP-mekanismer, mens
platformen stadig er under opbygning.

**Hvad det betyder konkret:**

- `netlify/functions/lib/pa-otp.js` proxier til de to eksisterende PA-flows
  `OTP Login - Intern` og `OTP Verify - Intern` — samme flows som `intern.html` kalder i
  dag. Der er ikke oprettet nye flows.
- Adgangen styres derfor stadig af den SharePoint-liste, det gamle flow slår op i — ikke
  af en åben "enhver @stark.dk"-regel. Det er en allowlist, ikke §7's model.
  `auth-login.js` afviser dog lokalt mailadresser uden for `@stark.dk`, før PA-flowet
  overhovedet kaldes — en billig sanitetstjek, ikke selve allowlisten.
- Svaret på "send kode" afslører, om mailen findes i listen (404 vs. 200) — det er
  flowets egen adfærd, ikke noget denne hub tilføjer.
- **Det, der IKKE er genbrugt:** rolle (`bruger`/`admin`) og session. De styres fortsat af
  `brugere`/`sessioner` i Supabase, jf. §9.3 — PA-flowet ved intet om roller, og
  `auth-verificer.js` opretter kun en session i den nye platform, efter PA har bekræftet
  koden.
- Sessionscookien er et tilfældigt 256-bit token; kun et HMAC af det (nøglet med
  `SESSION_SECRET`) gemmes i `sessioner`, så en session kan tilbagekaldes uden at afhænge
  af et JWT's udløbstid.

**Krævede env vars, som IKKE må gættes eller genereres:**

`PA_OTP_LOGIN_URL` og `PA_OTP_VERIFY_URL` skal sættes til nøjagtig de samme signerede
trigger-URL'er, som det gamle `stark-udlejning`-site allerede har i sine Netlify env vars.
Kopiér dem derfra — se `.env.example`.

**Til fremtidig reference:** hvis §7's hærdede model senere skal indføres for hele
platformen (fx ved det egentlige cutover), er `otp_koder`-tabellen i `001_fundament.sql`
allerede der og klar til det — den bruges bare ikke af denne PR.

## Sådan skiftes et kort til den nye rute

Når en rute i CLAUDE.md §1 går i luften (fx `/akademi`), ret kun det ene korts `href` i
`src/index.html` fra den gamle Netlify-URL til den nye interne sti. Resten af hub'en rører
du ikke. Når alle kort peger internt, er hub'en overflødig og kan fjernes til fordel for den
rigtige landingsside fra §9.2.

# STARK Udlejning Platform

Samlet intern platform på `starkudlejning.dk`. Afløser tolv separate Netlify-sites og
Power Automate/SharePoint-logiklaget.

**Læs `CLAUDE.md` før du skriver kode.** Den er bindende.
Kortlægningen af det gamle system ligger i `docs/kortlaegning.md`.

## Kom i gang

```bash
npm install
cp .env.example .env      # udfyld værdierne
npm test
npm run dev               # netlify dev
```

Designsystemet kan gennemgås uden opsætning: åbn `src/shared/demo.html` direkte i en browser.

## Struktur

```
src/
  index.html, hub.js        midlertidig forside (docs/hub-plan.md)
  login.html, login.js      login
  shared/          tokens.css, base.css, components.css, layout.js, demo.html
netlify/functions/
  auth-login.js, auth-verificer.js, auth-mig.js, auth-logud.js
  lib/             pseudonym.js, supabase.js, sendMail.js, sharepoint.js, pricing.js,
                   auth.js, pa-otp.js
supabase/migrations/
tests/
docs/
legacy/            arkivkopi af de gamle sites — deployes aldrig (endnu ikke hentet)
```

## Det du skal vide, før du rører noget

**Tre datakategorier** (`CLAUDE.md` §3). Hvert felt hører til præcis én:

- **A** — ikke-persondata → Supabase, frit
- **B** — pseudonymiserede persondata → Supabase, kun `email_hash` / `kunde_hash`
- **C** — identificerende persondata → **aldrig** i Supabase, kun gennem `lib/sharepoint.js`

Er du i tvivl: spørg, opret det ikke.

**Adapterlaget.** Al mail gennem `lib/sendMail.js`, al SharePoint-adgang gennem
`lib/sharepoint.js`. Ingen anden fil må kende en flow-URL. Formålet er, at Power Automate
kan udskiftes ved at ændre én fil.

**Beregning.** Kæden ligger i `lib/pricing.js` og intet andet sted. Satser kommer fra
`konfiguration`-tabellen, aldrig hardkodet. Det gamle system havde kæden seks steder med
otte sæt hardkodede tal og gav derfor to forskellige svar — se `docs/kortlaegning.md` §4.1.

**Afrunding: hele kroner, pr. komponent, én gang pr. linje.** Totalen er summen af de
afrundede komponenter, aldrig en afrunding af en uafrundet sum. Der findes med vilje ingen
valgmulighed. Platformen skal stemme krone for krone med det gamle system, så enhver
afvigelse er en rigtig fejl og ikke afrundingsstøj. Punktet er fastholdt af en test —
flyttes det, flytter samtlige beløb på tværs af alle tilbud.

**Hash-domæner.** `hashEmail` og `hashKunde` har hvert sit prefix (`email:` / `kunde:`), så
et kundenummer og en mailadresse med samme tekst aldrig giver samme hash. Nye hashtyper får
deres eget domæne. Prefixet må aldrig ændres uden en migration af alle eksisterende hashes.

**Falsy-zero.** Brug `??`, aldrig `||`, hvor `0` er gyldigt. `0 %` risikotillæg findes i
virkeligheden og må ikke blive til 6,5 %.

**Ingen localStorage som datalager.** Fremdrift, kladder og indsendelser gemmes serverside.

**Ingen hemmeligheder i klientkode.** Nogensinde. Al autorisation sker serverside i den
function, der leverer data. En skjult knap er ikke adgangskontrol.

## Miljøvariabler

Sættes i Netlify env vars, aldrig i repoet. Se `.env.example`.

| Variabel | Bruges af |
|---|---|
| `PSEUDONYM_SECRET` | `lib/pseudonym.js` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase.js` |
| `PA_SENDMAIL_URL`, `PA_SHARED_SECRET` | `lib/sendMail.js` |
| `SESSION_SECRET` | `lib/auth.js` — HMAC-nøgle til sessionscookiens token-hash |
| `PA_OTP_LOGIN_URL`, `PA_OTP_VERIFY_URL` | `lib/pa-otp.js` — samme PA-flows som `intern.html` bruger i dag. Bevidst genbrug, se `docs/hub-plan.md` |

⚠️ `PSEUDONYM_SECRET` må aldrig roteres uden en migration, der genberegner alle hashes.
Roteres den uden, mister alle brugere deres historik permanent.

## Migrations

SQL i `supabase/migrations/`, nummereret og committet. **Aldrig schemaændringer i
Supabase-UI'et** — schemaet skal kunne genskabes fra repoet.

## Arbejdsgang

Én PR pr. lag. Claude Code åbner PR'er; Jesper reviewer og merger. `main` er beskyttet.

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
  shared/          tokens.css, base.css, components.css, layout.js, demo.html
netlify/functions/
  lib/             pseudonym.js, supabase.js, sendMail.js, sharepoint.js, pricing.js
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
| `SESSION_SECRET` | `lib/auth.js` (PR 2) |

⚠️ `PSEUDONYM_SECRET` må aldrig roteres uden en migration, der genberegner alle hashes.
Roteres den uden, mister alle brugere deres historik permanent.

## Migrations

SQL i `supabase/migrations/`, nummereret og committet. **Aldrig schemaændringer i
Supabase-UI'et** — schemaet skal kunne genskabes fra repoet.

## Arbejdsgang

Én PR pr. lag. Claude Code åbner PR'er; Jesper reviewer og merger. `main` er beskyttet.

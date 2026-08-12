# Kortlægning

Grundlag for datamodel og ruter i den samlede platform. Skrevet efter CC-prompt 00.
Klassificeringen følger de tre datakategorier i platformens `CLAUDE.md` §3.

**Herkomst:** oprindeligt leveret i `stark-prisaftale` PR #132.

> ### ⚠️ Dokumentet er delvist overhalet — læs `docs/datagrundlag.md` ved siden af
>
> Kortlægningen blev skrevet **uden adgang til SharePoint-skemaerne og flow-definitionerne**.
> Kolonnenavne, rækketal og flow-adfærd er derfor udledt baglæns af frontend-kode. Da de
> faktiske skemaer siden kom til, viste flere af de udledninger sig forkerte.
>
> **`docs/datagrundlag.md` er autoritativ, hvor de to er uenige.**
>
> Rettelser indarbejdet i denne fil, alle markeret **RETTET** i teksten:
>
> | Sted | Hvad der var forkert |
> |---|---|
> | §0.3, §8.2 spm. 3 | `afvigelsesrapportering` blev antaget ikke at findes. Den er i drift |
> | §2.3 | Seks felter anført som "gemmes ikke i dag" findes alle som kolonner på `Tilbud` |
> | §3.1 | Mindst 11 kolonnenavne på `Samhandelsaftaler_Rabatter` gættet forkert |
> | §3.1 | Alle "Rækker: Ukendt" er nu kendte |
> | §3.1 | `Masterark_Priser`: afklaret, ingen flows rører den |
> | §3.1 | `Platformsbrugere` oprettes ikke; `Medarbejdere` bruges |
> | §3.1 | `TilbudImport` findes ikke blandt de 31 lister |
> | §4.3 | `Rabat_Lastvognslifte` bekræftet fraværende |
> | §6 | Hele akademiafsnittet — komplekset er dødt, og to konklusioner var forkerte |
>
> **Uændret og stadig gyldigt:** §1 (inventar), §4 (duplikeret logik), §5 (localStorage),
> §7 (eksterne afhængigheder) og §8.1 (sikkerhedsfund). De bygger på repokoden, ikke på
> gætværk om SharePoint.

**Status:** Ingen kode ændret. Ingen eksisterende repoer rørt. Ingen sites deployet eller
ændret.

**Læs §10 (Dækning) først, hvis du vil vide hvad der er verificeret, og hvad der ikke er.**
Dokumentet indeholder ét væsentligt hul: `legacy/`-hjemtagningen i §0 kunne **ikke**
gennemføres i dette miljø. Det er beskrevet i detaljer nedenfor, ikke skjult.

---

## 0. Hjemtagning af Netlify-only sites

### 0.1 Hjemtagningen blev ikke gennemført — hvorfor

Opgaven forudsatte adgang til Netlifys API med `NETLIFY_TOKEN` og download af deploy-filer.
Ingen af delene var mulige her:

| Forudsætning | Status i dette miljø |
|---|---|
| `NETLIFY_TOKEN` som env var | **Findes ikke.** Ingen Netlify-token i miljøet. |
| HTTP-adgang til `*.netlify.app` | **Blokeret.** Egress-proxyen svarer 403 på CONNECT til `stark-udlejning-rapportering.netlify.app`. Samme for øvrige sites. |
| Netlify-API via MCP | **Kun læsning af metadata.** MCP-serveren eksponerer `get-projects`, `get-project`, `get-deploy`, `get-forms-for-project`. Der er **ingen** operation der lister eller henter deploy-filer. |

`legacy/`-mappen er derfor **ikke oprettet**, og der er ingen separat `legacy/`-PR.
Det er den ene del af prompt 00 der ikke er leveret.

**Hvad der skal til:** kør hjemtagningen fra et miljø med udgående net til `netlify.app`
og `api.netlify.com`, med en Netlify PAT. Kommandoerne er
`GET /api/v1/sites` → `GET /api/v1/sites/:id/deploys` → `GET /api/v1/deploys/:id/files`
→ `GET /api/v1/deploys/:deploy_id/files/:path`. Filerne lægges uændret i `legacy/<sitenavn>/`.

### 0.2 Hvad der alligevel kunne fastslås via Netlify-API'et

Metadata på seneste deploy pr. site gav mere end forventet: deploy-kilde, ændrede filnavne,
funktioner, redirects, headers og formularer. Det er nok til at afgøre **om et site har kilde
et sted, og hvad der mangler** — bare ikke til at hente filerne.

| Site | Deploy-kilde | Repo | Funktioner | Redirects | Headers | Forms |
|---|---|---|---|---|---|---|
| `stark-udlejning` | `api` (CI fra GitHub) | `stark-udlejning/stark-prisaftale` | 19 | 19 | 0 | ikke aktiveret |
| `stark-udlejning-akademi` | `api` (CI fra GitHub) | `stark-udlejning/akademi` (public) | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-spinning` | `agent_runner` | **intet GitHub-repo** — kilde ligger i Netlifys source-zip | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-rapportering` | **`drop`** (manuel upload) | ingen | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-rekvisitionsgenerator` | **`drop`** | ingen | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-stickers` | **`drop`** | ingen | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-merchandise` | **`drop`** | ingen | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-opmaaling` | **`drop`** | ingen | 0 | 0 | 0 | ikke aktiveret |
| `stark-udlejning-hub` | **`drop`** | ingen | 0 | 0 | 0 | ikke aktiveret |
| `spilmere` | `api` | `stark-udlejning/spilmere` (private) | 3 | 8 | 1 | ikke aktiveret |
| `ansogning` | `api` | ingen synlig | 2 (`generate`, `ping`) | 0 | 1 | ikke aktiveret |
| `martin-kongsvad` | `api` | `stark-udlejning/martin-kongsvad` (public) | 0 | 0 | 0 | ikke aktiveret |

Fem konklusioner der betyder noget:

1. **Netlify Forms er ikke aktiveret på ét eneste site.** Der ligger altså *ingen*
   formulardata i Netlify, der skal migreres. Rapporteringsformularerne må sende deres data
   et andet sted hen — sandsynligvis Power Automate eller `mailto:` — det kan ikke afgøres
   uden sidernes kilde.
2. **Seks sites er rene `drop`-deploys.** De er trukket ind i Netlify manuelt fra en zip
   eller en mappe. Der er intet Git-repo, ingen build, ingen historik. Filerne på Netlify
   **er** kilden — de er ikke build-output. For disse seks er hjemtagning derfor 1:1 og
   uden tab: håndskrevet HTML, ikke genereret.
3. **`spinning` er kilde-løs på en anden måde.** Den er deployet af Netlifys `agent_runner`
   med en commit-ref (`75e69747…`) der ikke findes i noget GitHub-repo, vi har adgang til.
   `has_source_zip: true`, så kilden findes i Netlify, men kun via deres API.
4. **Ingen af de seks `drop`-sites har serverless functions, redirects eller headers.**
   Det er rene statiske HTML-filer. Der er derfor intet backend-lag at genskabe for dem.
   Til gengæld: hvad de så end gør ved data, sker i browseren eller mod et eksternt endpoint
   hardkodet i HTML'en.
5. **`ansogning` og `martin-kongsvad` ser ikke ud til at høre til platformen.**
   Se §1.4.

### 0.3 Filnavne set i deploy-metadata

Netlifys deploy-summary lister de filer, der **ændrede sig** i deployet — ikke hele
filtræet. Det er derfor en nedre grænse, ikke en komplet liste.

| Site | Filer navngivet i seneste deploy |
|---|---|
| `stark-udlejning-rapportering` | `index.html`, `klage-johs-sorensen.html`, `oenskeliste-maskiner.html` |
| `stark-udlejning-rekvisitionsgenerator` | `index.html` |
| `stark-udlejning-stickers` | `index.html` |
| `stark-udlejning-merchandise` | `index.html` |
| `stark-udlejning-opmaaling` | `index.html` |
| `stark-udlejning-hub` | *(”All files already uploaded” — ingen filnavne oplyst)* |

> **RETTET 2026-08-11.** Den oprindelige tekst her satte spørgsmålstegn ved, om
> `afvigelsesrapportering` overhovedet fandtes, fordi filen ikke stod i deploy-listen.
> **Den konklusion var forkert.** Siden er i drift og bruges dagligt.
> Deploy-summaryet lister kun de filer, der **ændrede sig** i det pågældende deploy — en
> uændret fil optræder ikke. Fraværet i listen var derfor aldrig bevis for noget.
> Fejlen er årsagen til `CLAUDE.md` §5.7's krav om at skelne mellem "jeg fandt det ikke"
> og "det findes ikke". Se også §8.2, spørgsmål 3.

`afvigelsesrapportering` findes og er i drift under `/rapportering`, men optræder ikke i
tabellen ovenfor, fordi filen ikke ændrede sig i sitets seneste deploy. Rapporteringssitet
har altså mindst fire sider: `index.html`, `klage-johs-sorensen.html`,
`oenskeliste-maskiner.html` og afvigelsesformularen. Det faktiske filnavn er ukendt herfra.

---

## 1. Inventar over filer og sider

### 1.1 Sites vs. repoer

| Netlify-site | GitHub-repo | Fund |
|---|---|---|
| `stark-udlejning` | `stark-prisaftale` | par |
| `stark-udlejning-akademi` | `akademi` | par |
| `spilmere` | `spilmere` | par — **hører ikke til platformen**, se §1.4 |
| `martin-kongsvad` | `martin-kongsvad` | par — **repo vises ikke i repo-listen**, se §1.4 |
| `stark-udlejning-spinning` | — | site uden repo |
| `stark-udlejning-rapportering` | — | site uden repo |
| `stark-udlejning-rekvisitionsgenerator` | — | site uden repo |
| `stark-udlejning-stickers` | — | site uden repo |
| `stark-udlejning-merchandise` | — | site uden repo |
| `stark-udlejning-opmaaling` | — | site uden repo |
| `stark-udlejning-hub` | — | site uden repo |
| `ansogning` | — | site uden repo |

**Ingen repoer uden site.** Alle tre tilgængelige repoer har et kørende site.

### 1.2 Sider i `stark-prisaftale` (site: `stark-udlejning`)

Alle filer i repo-roden. Ingen af dem er bygget — hver HTML-fil er selvstændig med inline
`<style>` og `<script>`. Eneste build-trin er en `sed` der substituerer `__GOOGLE_MAPS_KEY__`
i tre filer.

| Fil | Ny rute | Adgang i dag | Adgang bør være | Rolle | Status | Linjer |
|---|---|---|---|---|---|---|
| `index.html` | `/samhandel/ny` | **Ingen.** Offentlig, ingen login overhovedet | Login | Alle brugere | Aktiv | 2.243 |
| `intern.html` | `/samhandel` (+ underfaner) | OTP mod `@stark.dk`, session i localStorage | Login | Alle brugere | Aktiv — systemets tyngdepunkt | 6.577 |
| `intern-test.html` | — | Ingen | — | — | **Død kode.** Ældre kopi af `intern.html`, 3.031 diff-linjer, kun refereret fra `netlify.toml`s sed-kommando | 4.865 |
| `admin.html` | `/admin/*` | **Hardkodet `admin` / `stark2026` i klientkoden** | Rolle `admin`, serverside | Kun admin | Aktiv | 4.371 |
| `dashboard_v2.html` | `/admin/dashboard` | **Hardkodet `admin` / `Stark2026` i klientkoden** | Rolle `admin`, serverside | Kun admin | Aktiv | 2.186 |
| `mit-omraade.html` | `/samhandel/oversigt` | OTP, samme mønster som `intern.html` | Login | Alle brugere | Aktiv | 1.200 |
| `vis-tilbud.html` | `/samhandel/tilbud/:id` | **Ingen.** Titlen siger "(intern)", men siden er offentlig | Login | Alle brugere | Aktiv | 558 |
| `din-aftale.html` | `/aftale/:token` (kundevendt) | Token i URL. **Ingen OTP** trods repoets `CLAUDE.md` | Offentlig m. token — begrundet: eksterne kunder | Eksterne | Aktiv | 1.297 |
| `afvis-tilbud.html` | `/afvis/:token` (kundevendt) | Token i URL | Offentlig m. token — eksterne skal kunne afvise | Eksterne | Aktiv | 267 |
| `nettopriser_template.html` | (skabelon, ikke rute) | n/a | n/a | Eksterne (genereret output) | Aktiv skabelon — redigeres via `admin.html` | 931 |
| `pa-afvis-snippet.html` | (fragment til PA) | n/a | n/a | Eksterne | Aktiv fragment | 244 |
| `stark_prisaftale_v5.html` | — | Ingen | — | — | **Død kode.** Nul referencer fra nogen fil. Ældre version af `index.html` | 632 |
| `kundeaftaler/<KUNDENR>/` | (genereret output) | Offentlig på `stark-udlejning.netlify.app` | **Se §8** | Eksterne | Aktiv — 105 kunder × `nettoprisark.html` + `bilag3.html` = 210 filer | — |
| `kundeaftaler_kopi/<KUNDENR>/` | — | Offentlig | — | — | **Død kode.** 94 mapper, alle en ældre og afvigende version af `kundeaftaler/`. Strikt delmængde (0 mapper er unikke for kopien) | — |

`intern.html` har seks interne faner, som hver bliver til en rute eller en sektion:
`Priser & Opslag`, `Baglænsberegner`, `Rabatberegner`, `Rabat effekt`, `Transportpriser`,
`Letvogne kort`, `Tilbud` (med tilbudshistorik).

`admin.html` har 13 sider: `Dashboard`, `Status`, `Aktivitetslog`, `Listepris-editor`,
`Kategori-justering`, `Transportpriser`, `Maskinoversigt`, `Bulk Excel-import`, `Nyheder`,
`Kunder`, `Sælgere`, `Nethire-opslag`, `Realiseret omsætning`.

### 1.3 Sider i `akademi` (site: `stark-udlejning-akademi`)

| Fil | Ny rute | Adgang i dag | Rolle | Status | Linjer/omfang |
|---|---|---|---|---|---|
| `index.html` | `/akademi` | **Ingen login.** Helt offentligt | Alle brugere | Aktiv — hele appen, hash-routing | ~1.700 |
| `data/academy-data.json` | (indhold) | Offentlig | Alle brugere | Aktiv — 6 kategorier, 25 sider, 757 blokke | 347 KB |
| `images/` | (aktiver) | Offentlig | Alle | Aktiv — 109 filer | — |
| `support.js` | — | — | — | **Død kode.** Genereret `dc-runtime`-bundle, refereres ikke fra `index.html` | 69 KB |
| `Akademiet - nyt design.dc.html` | — | — | — | **Død kode.** Designmockup | 61 KB |
| `Akademiet - nuværende.dc.html` | — | — | — | **Død kode.** Genskabelse af gammelt design | 23 KB |
| `uploads/` | — | — | — | **Formentlig død.** 3 filer, heraf én ved navn `test` | — |
| `billed-tjekliste.md`, `github.md`, `README.md`, `.thumbnail` | — | — | — | Dokumentation/værktøjsspor | — |

### 1.4 Fund der ikke står i `CLAUDE.md` §1

Dette er efter min vurdering det vigtigste resultat af §1.

| Fund | Hvad det er | Konsekvens |
|---|---|---|
| **`ansogning.netlify.app`** | Selvstændigt site med 2 serverless functions (`generate`, `ping`, Node 22, runtimeAPIVersion 2) og en header-regel. Ikke nævnt noget sted. Intet tilgængeligt repo. | Ukendt formål. **Kræver afklaring fra Jesper** — det er det eneste site udover `stark-udlejning` og `spilmere` med backend-kode. |
| **`martin-kongsvad.netlify.app`** | Site bygget fra `github.com/stark-udlejning/martin-kongsvad` (public). Repoet fremgår **ikke** af den repo-liste, sessionen kan se, men commit-URL'en i deploy-metadata beviser at det findes. | Ser ud som personligt site, ikke platform. Bør bekræftes og formentlig holdes udenfor. |
| **`spilmere.dk`** | Fuldt separat produkt (holdkampe/matchmaking) med Supabase Postgres, RLS, PostGIS, Google OAuth, web-push og 3 Netlify-functions. Ligger i samme GitHub-org og Netlify-team. | Ikke en del af platformen. **Men det er en færdig reference-implementering af netop den stak, platformen skal bygges på** — se §9. |
| **`intern-test.html`** | 4.865 linjer død kopi af `intern.html` i produktionsrepoet, deployet og offentligt tilgængelig | Bør slettes, ikke migreres. |
| **`stark_prisaftale_v5.html`** | 632 linjer død kopi af `index.html`, nul referencer | Bør slettes. |
| **`kundeaftaler_kopi/`** | 188 filer, ældre snapshot af kundeaftalerne | Bør slettes. Indeholder kundedata, se §2. |
| **`mit-omraade.html`** | Selvstændig side med eget OTP-login, kopieret 1:1 fra `intern.html` | Reel side, mangler i ruteudkastet. |
| **`vis-tilbud.html`** | Intern tilbudsvisning — **uden nogen adgangskontrol** | Reel side, mangler i ruteudkastet. Se §8. |
| **`nettopriser_template.html`** | Skabelon der udfyldes med `{{PLACEHOLDER}}` og udrulles som kundens nettoprisark | Ikke en rute, men et byggeblok-artefakt der skal have en plads i den nye model. |
| **`/api/flow` og `/api/template-update`** | To PA-flows der kaldes **uden om** `netlify/functions/` — netlify.toml proxier direkte til Power Automate med signatur i URL'en | Bryder adapter-princippet allerede i dag. Se §3. |

---

## 2. Datafelter og klassificering

**Regel anvendt:** i tvivl → **C** + `TVIVL` + begrundelse.

### 2.1 Sammenfatning

| Kategori | Antal feltgrupper | Hvor de ligger i dag |
|---|---|---|
| A — ikke-persondata | Produkter, priser, transporttabeller, satser, rabatsatser, afdelingsstamdata, kursusindhold | `data/priser.json`, `data/afdelinger.json`, `academy-data.json` |
| B — medarbejderdata | Sessioner, sælgertilknytning på tilbud/aftaler, akademi-fremdrift | localStorage + SP-kolonner |
| C — identificerende persondata | Kunde- og kontaktdata, sælgerkatalog, al fritekst | `data/priser.json` (!), `data/c8f2a9/customers.json` (!), SharePoint, `kundeaftaler/` (!) |

### 2.2 Samhandelsaftale — `index.html` → `/api/flow` → SP `Samhandelsaftaler_Rabatter`

| Felt | App | Kilde i dag | Kat. | Fremtidig placering |
|---|---|---|---|---|
| `item_id` | index, mit-omraade | SP liste-ID | A | Supabase (nøgle mod SP-ID) |
| `afsender_navn` | index, mit-omraade, admin | Formular / `priser.json.saelgere` | **C** | SharePoint |
| `afsender_mail` | index, mit-omraade, admin | Formular / `priser.json.saelgere` | **C** | SharePoint |
| `afsender_tlf` | index | Formular / `priser.json.saelgere` | **C** | SharePoint |
| `support_cc` | index | Sammenfletning af mails | **C** | SharePoint |
| `vegne_navn`, `vegne_mail` | index, mit-omraade | Formular | **C** | SharePoint |
| `ovrige_saelgere_navn` / `-mail` | index | Formular, kommasepareret | **C** | SharePoint |
| `kunde_mail` | index, mit-omraade | Formular | **C** | SharePoint |
| `kunde_kontakt` | index, mit-omraade | Formular | **C** | SharePoint |
| `kunde_firma` | index | Formular | **C** | SharePoint |
| `kunde_cvr` | index, mit-omraade | Formular / Nethire | **C** | SharePoint |
| `kunde_nr` | index, alle | Formular / Nethire | **C** | SharePoint |
| `aftale_dato`, `gyldig_fra`, `gyldig_til` | index | Formular | A | Supabase (uden kundekobling) / SharePoint sammen med aftalen |
| `potentiel_omsaetning`, `omsaetning_stark` | index, dashboard | Formular | **C** `TVIVL` | SharePoint. **Begrundelse:** tallet er meningsløst uden kundenøglen, og gemt sammen med kundenr er det kommerciel kundedata |
| `realiseret_omsaetning`, `realiseret_opdateret` | admin, dashboard | PowerBI-upload → PA | **C** `TVIVL` | Samme begrundelse |
| `beregning` (1/2) | index, alle visninger | Konstant `2` fra frontend | A | Supabase — hører til prislogikken |
| `risikotillaeg` | index, alle | Formular, default 6,5 | A | Supabase |
| `risikotillaeg_nethire` | index | Afledt tekst | A | Genereres i `lib/pricing.js` |
| `rabatter{}` (7 nøgler) | index, dashboard | Formular | A | Supabase |
| `bilag[]` | index | Afkrydsning | A | Supabase |
| `transport` (standard/storkunde) | index, samhandel | Radioknap | A | Supabase |
| `er_kam` | index, alle | Afledt af afsendertype | **C** `TVIVL` | SharePoint. **Begrundelse:** KAM-tilknytning på navn er eksplicit kategori C i `CLAUDE.md` §3 |
| `bilag1_maskiner[]` | index | Maskinvalg | A | Supabase |
| `kam_navn_til_nethire` | index | Sælgernavn | **C** | SharePoint |
| **`besked`** | index, mit-omraade | **Fritekst til kunden** | **C** | SharePoint |
| **`nethire_note`** | index, mit-omraade | **Fritekst** | **C** | SharePoint |
| `transport_standard`, `transport_kam` | index | Kopi af `priser.json` sendt med i payload | A | Supabase — **bør ikke sendes med i payloaden overhovedet** |
| `status` (Kladde/Til gennemgang/Sendt) | index, mit-omraade, dashboard | Choice-kolonne | A | Supabase (tilstand), rækken selv i SP |
| `send_til_kunde` | index | Bool | A | — (ren styresignal) |

### 2.3 Tilbud — `intern.html` → `/api/send-tilbud` → SP `Tilbud`

| Felt | App | Kilde i dag | Kat. | Fremtidig placering |
|---|---|---|---|---|
| `id` / `TilbudId` | intern, vis-tilbud, accept | Genereret token `ta_…` | A | Supabase |
| `firma` / `Firma` | intern, mail, dashboard | Formular | **C** | SharePoint |
| `kundenr` / `Kundenr` | intern | Formular / Nethire | **C** | SharePoint |
| `sagsnr` / `Sagsnr` | intern | Formular | **C** `TVIVL` | SharePoint. **Begrundelse:** kundens eget sagsnummer kan indeholde navne |
| `to` / `Til` | intern, mail | Formular — kundemail | **C** | SharePoint |
| `cc` | intern | Formular | **C** | **RETTET** — findes som kolonne `Cc` |
| `from` / `Fra` | intern, dashboard | Formular, **frit redigerbar** | **C** | SharePoint |
| `saelger` / `Saelger` | intern, dashboard | Formular | **C** | SharePoint |
| `tlf` | intern, mail | Formular | **C** | **RETTET** — findes som kolonne `Tlf` |
| `kontakt` | intern, mail | Formular — kontaktpersonens navn | **C** | **RETTET** — findes som kolonne `Kontakt` |
| `udlob` / `Udlob`, `opfolgning` / `Opfolgning` | intern, dashboard | Formular | A | Supabase, koblet på tilbuds-ID |
| `periode` / `Periode`, `Lejeperiode` | intern | Dropdown/fritekst | A | Supabase |
| `risiko` / `Risiko` | intern, alle | Dropdown, default 6,5 | A | Supabase |
| `beregning` | intern, mail, vis-tilbud, dashboard | Konstant `2` | A | Supabase |
| **`fritekst`** | intern, mail | **Sælgerens frie besked til kunden** | **C** | **RETTET** — findes som kolonne `Fritekst` |
| **`vilkaar`** | intern, mail | **Fritekst, betingede omkostninger** | **C** | **RETTET** — findes som kolonne `Vilkaar` |
| `produkter[]` → `MaskinerJSON` | intern, vis-tilbud, mail, dashboard | Produktvalg | A | Supabase |
| `produkter[].{uid,name,spec,nettopris,listepris,rabatPct,antal,risikoNull,friVare,masternr,leje,unit,altPris,periodeStart,periodeEnd,chargeDays,totalDays,weekendDays,weekendFree}` | samme | Produktvalg | A | Supabase |
| `ydelser[]` | intern, mail | Ydelseslinjer | A | **RETTET** — findes som kolonne `YdelserJSON` |
| `tilvalg[]` | intern, mail | Ældre form af `ydelser` | A | **Gemmes ikke i dag** — dubleret felt, se §4 |
| `transporter[].{navn,fra,til,ud,hjem}` | intern, mail | Ruteberegning | **C** `TVIVL` | SharePoint. **Begrundelse:** `til` er kundens leveringsadresse |
| `udtransport` / `Udtransport`, `hjemtransport` / `Hjemtransport` | intern, alle | Afledt sum | A | Supabase |
| `dato` / `Dato` | intern | `utcNow()` fra PA | A | Supabase |
| `status` / `Status` | intern, accept, dashboard | Choice | A | Supabase |
| `Arkiveret` | intern, tilbud-arkiver | Yes/No | A | Supabase |
| `spItemId` | intern | PA-svar | A | Supabase |
| `sendtBekraeftet` | intern | Kun localStorage | A | Supabase |
| `accepteret_dato`, `afvist_dato` | accept-tilbud, tilbud-status | Genereret | A | Supabase — **gemmes ikke i dag** |
| **`note`** (kundens accept-note) | accept-tilbud | **Kundens fritekst** | **C** | SharePoint |
| **`afvist_note`** | tilbud-status, afvis-tilbud | **Kundens fritekst** | **C** | SharePoint |

### 2.4 Kundeportal — `din-aftale.html` → `/api/kunde` → SP `Kundeportaler`

| Felt (API) | SP-kolonne | Kat. | Fremtidig placering |
|---|---|---|---|
| `token` | `Token` | **C** `TVIVL` | SharePoint. **Begrundelse:** token er den eneste adgangsnøgle til en navngiven kundes dokumenter — det er en hemmelighed, ikke et ID |
| `id` | `KundeNr` | **C** | SharePoint |
| `name` | `Title` | **C** | SharePoint |
| `contact` | `Kontakt` | **C** | SharePoint |
| `senderName` | `SenderNavn` | **C** | SharePoint |
| `senderMail` | `SenderMail` | **C** | SharePoint |
| `senderTlf` | `SenderTlf` | **C** | SharePoint |
| `isKam` | `IsKam` | **C** `TVIVL` | SharePoint, jf. §2.2 |
| `nettopris_url`, `bilag3_url` | `NettoprisUrl`, `Bilag3Url` | **C** | SharePoint — URL'en peger på et navngivet kundedokument |
| `created` | `Created` | A | Supabase |
| `news[]` (`id`,`date`,`title`,`body`) | `data/c8f2a9/customers.json` | A | Supabase — redaktionelt indhold |

### 2.5 Data der ligger i Git i dag og ikke bør gøre det

Dette er efter min vurdering det alvorligste enkeltfund i hele kortlægningen.

| Placering | Indhold | Kat. | Bemærkning |
|---|---|---|---|
| `data/priser.json` → `saelgere[]` | **36 navngivne medarbejdere med navn, mailadresse og telefonnummer** | **C** | Version-kontrolleret i Git. Redigeres af `admin.html` → `github-proxy.js` → GitHub Contents API, dvs. **en admin-handling i UI'et commit'er personoplysninger til repoet.** |
| `data/c8f2a9/customers.json` → `customers[]` | **30 kunder med `name`, `contact`, `token`, `id`, dokument-URL'er** | **C** | Version-kontrolleret. Mappenavnet `c8f2a9` er sikkerhed gennem obskuritet — filen serveres offentligt fra `stark-udlejning.netlify.app` og hentes af `kunde.js` over almindelig HTTP uden autentifikation. |
| `kundeaftaler/<KUNDENR>/` | **105 kunders nettoprisark og bilag 3 som HTML** | **C** | Offentligt tilgængelige på forudsigelige URL'er baseret på kundenummer. |
| `kundeaftaler_kopi/<KUNDENR>/` | **94 kunders ældre dokumenter** | **C** | Samme, plus at det er død kode. |
| `data/afdelinger.json` | 28 afdelinger m. funktionspostkasse og telefon | A `TVIVL` | **Begrundelse:** `CLAUDE.md` §3 siger "afdelingsliste (numre og adresser, ikke kontaktpersoner)". `frederiksberg.udlejningen@stark.dk` er en funktionspostkasse, ikke en person — derfor A. Havde felterne heddet noget med navn, ville det være C. |

### 2.6 Kategori A — prisdata

| Felt | App | Kilde | Kat. | Fremtid |
|---|---|---|---|---|
| `products.<id>.{name,spec,listepris,kundepris,risiko,miljo,total,category,subcategory,unit,note,special}` | index, intern, admin, template | `data/priser.json` — 371 produkter | A | Supabase `produkter` |
| `transport_standard[]`, `transport_kam[]` | index, intern, admin, template | `priser.json` — 26 rækker × 5 kolonner hver | A | Supabase `transport_satser` |
| `satser.{risikotillaeg_pct, miljoebidrag_pct, moms_pct}` | (kun defineret, se §4.2) | `priser.json` | A | Supabase `konfiguration` |
| `all_products_raw` | admin, index | `priser.json` — **en JSON-streng inde i JSON'en** | A | Udgår helt — afledt data der ikke skal persisteres |
| `afdelinger[]` | din-aftale, template | `data/afdelinger.json` (28) | A | Supabase `afdelinger` |
| `academy-data.categories/pages/blocks` | akademi | `academy-data.json` | A | Supabase, se §6 |

### 2.7 Samme data, forskellige navne — skal konsolideres

| Betydning | Stavemåder fundet | Hvor |
|---|---|---|
| Kundens nettopris pr. enhed | `nettopris`, `nettoPris`, `kundepris`, `kp`, `n` | `dashboard_v2.js:961`, `priser.json`, `intern.html`, `nettopriser_template.html` |
| Listepris | `listepris`, `bruttopris`, `standardpris`, `lp`, `brutto` | `dashboard_v2.js:962`, `index.html` (`s.lp`), `priser.json` |
| Sælgerens mail | `afsender_mail`, `AfsenderMail`, `saelgermail`, `from`, `Fra`, `saelger` | `samhandel-data.js`, `accept-tilbud.js`, `send-tilbud`-payload |
| Sælgerens navn | `afsender_navn`, `saelger`, `Saelger`, `senderName`, `SenderNavn`, `kam_navn_til_nethire` | På tværs af alle tre datastrømme |
| Kundens firmanavn | `firma`, `Firma`, `kunde_firma`, `kunde`, `name`, `Title` | Tre forskellige lister, tre navne |
| Kundenummer | `kundenr`, `Kundenr`, `KundeNr`, `kunde_nr`, `id` | **Fire stavemåder.** `KundeNr` med stort N mod `Kundenr` med lille n har allerede kostet en produktionsfejl (`docs/pa-flows.md`, "NoResponse"-timeout) |
| Kundens CVR | `kunde_cvr`, `KundeCvr`, `KundeCVR` | `samhandel.js:—` tjekker alle tre defensivt |
| KAM-markering | `er_kam`, `erKam`, `ErKAM`, `isKam`, `IsKam` | Fem stavemåder på tværs af tre lister |
| Rabatkategori | Se §4.3 — **tre helt forskellige vokabularer** | |

`samhandel.js` og `samhandel-data.js` indeholder eksplicit defensiv dobbelt-casing-kode
(`item.kunde_mail \|\| item.KundeMail \|\| ''`) fordi PA-flowets faktiske Select-output
aldrig er set direkte. Det er ikke robusthed — det er et symptom.

---

## 3. SharePoint-lister og PA-flows

### 3.1 Lister

Ingen af listerne kunne inspiceres direkte — der er ingen SharePoint-adgang fra dette miljø.
Kolonnerne nedenfor er udledt af kaldende kode og af `docs/pa-flows.md`.

| Liste | Site | Kolonner (udledt) | Rækker | Apps | Kat. |
|---|---|---|---|---|---|
| `Tilbud` | `/sites/udlejning`, GUID `002cee28-969f-4c83-b7b3-e369e229c4ff` | **RETTET — se `docs/datagrundlag.md` §1.3 for de faktiske 27 felter.** Kolonnerne her var udledt af kaldende kode og manglede `Cc`, `Tlf`, `Kontakt`, `Fritekst`, `Vilkaar`, `YdelserJSON`, `KundeNote`, `Slettet` | **29** | intern, vis-tilbud, dashboard_v2, afvis-tilbud, accept-tilbud | **C** (blandet, indeholder kundenavn/mail) |
| `Samhandelsaftaler_Rabatter` | ukendt site | ⚠️ **RETTET — mindst 11 af navnene herunder var gættet forkert.** De faktiske står i `docs/datagrundlag.md` §1.3: `Rabat_JordOgAnlaeg`, `Rabat_Liftmateriel`, `Rabat_Trailerlifte`, `Rabat_ContainereOgLetvogne`, `Rabat_Bygningsmateriel`, `Rabat_Specialmaskiner`, `Forventet_Omsaetning`, `Forventet_Omsaetning_Stark`, `Saelger_Navn`, `Ovrige_saelgere_navn/-mail`, `KundeCVR` | **103** | index, mit-omraade, admin, dashboard_v2 | **C** |
| `Kundeportaler` | ukendt site | `Token, KundeNr, Title, Kontakt, SenderNavn, SenderMail, SenderTlf, IsKam, NettoprisUrl, Bilag3Url, Created` | **Ukendt** (30 findes også i Git) | din-aftale, admin, index, mit-omraade, vis-tilbud | **C** |
| `TilbudImport` | ⚠️ **Findes ikke blandt de 31 lister** (`docs/datagrundlag.md` §1.1) | `oprindelse, nethire_tilbudsnr, nethire_url, nethire_order_id, modtaget, modtaget_fra, filnavn, status, firma, kundenr, adresse, afdeling, udlob, risiko, produkter, totaler, advarsler` | **Ukendt** | intern (Nethire-import) | **C** |
| `Masterark_Priser` | `/sites/udlejning`, GUID `b803aafe-a1df-43ae-ba79-18a53c21406d` | 15 felter, alle `field_N` (regnearks-import) | **436** | **RETTET: intet af de 33 flows rører listen.** Efterladt | A |
| ~~`Platformsbrugere`~~ | — | — | **RETTET: oprettes ikke.** `Medarbejdere` (3.618 rækker) bruges i stedet — se `docs/datagrundlag.md` §3.3 | — | **C** |

`tilbud-status.js` refererer desuden `https://starkworkspace.sharepoint.com/sites/Koncepter-services`
i en konstant der aldrig bruges. Formentlig et rest fra en tidligere placering af `Tilbud`-listen.

### 3.2 Flows

| Flow | Portal-ID | Invoke-GUID | Trigger | Hvad det gør | Kaldes fra | Anbefaling |
|---|---|---|---|---|---|---|
| **Send tilbud** | `8ad20c85-…` | `bd08a3d5b70447…` | HTTP | Mailer tilbud til kunde + `Create item` i `Tilbud`. Trigger-schema validerer payloadet | `send-tilbud.js` | **Bliver adapter.** Mailen bygges allerede i `mail/tilbud-mail.js`; SP-skrivningen skal gennem `lib/sharepoint.js` |
| **tilbud-data** | `d9ee48a0-…` | `07b3b0e07335…` | HTTP | `Get items` **uden filter** på hele `Tilbud`-listen | `tilbud-data.js` | **Bliver adapter.** Filtrering skal ske serverside — i dag ser alle sælgere alle tilbud |
| **Accepter tilbud** | `46792a35-…` | `aed1ace7c882…` | HTTP | `Update item` på `TilbudId` — sætter `Status` | `accept-tilbud.js`, POST-grenen i `tilbud-status.js` | **Bliver adapter** |
| **tilbud-status** | `4716b410-…` | `f7d39b6e2110…` | HTTP | `Get items` filtreret på `Fra eq '<mail>'` | GET-grenen i `tilbud-status.js` — **ubrugt** | **Nedlægges.** Se advarsel nedenfor |
| **Arkiver tilbud** | ukendt | env `PA_ARKIVER_TILBUD_URL` | HTTP | `Update item` — sætter `Arkiveret` | `tilbud-arkiver.js` | **Bliver adapter** |
| **/api/flow** (samhandelsaftale) | ukendt | `9de02f465c40…` | HTTP | Opretter/opdaterer i `Samhandelsaftaler_Rabatter`, genererer nettoprisark, sender mail, opretter i Nethire | `index.html`, `mit-omraade.html` — **direkte, uden om functions** | **Bliver kode + adapter.** Det er systemets tungeste flow og det mindst kortlagte |
| **/api/template-update** | ukendt | `d208f836b5a2…` | HTTP | Opdaterer `nettopriser_template.html` på SharePoint | `admin.html` (8 kaldsteder) — **direkte** | **Bliver kode** |
| **samhandel-data** | ukendt | env `SP_SAMHANDEL_DATA_URL` | HTTP | `Get items` på hele `Samhandelsaftaler_Rabatter` | `samhandel-data.js` | **Bliver adapter** |
| **samhandel** (enkelt kunde) | ukendt | env `SP_SAMHANDEL_URL` | HTTP | `Get items` filtreret på `kunde_nr` | `samhandel.js` | **Bliver adapter** |
| **kundeliste** | ukendt | env `SP_KUNDELISTE_URL` | HTTP | `Get items` på `Kundeportaler` | `kundeliste.js` | **Bliver adapter** |
| **kunde** | ukendt | env `SP_KUNDE_URL` | HTTP | Opslag i `Kundeportaler` på token | `kunde.js` | **Bliver adapter** |
| **otp-login** | ukendt | `abe799a798e5…` | HTTP | Genererer og mailer OTP | `otp-login.js` | **Bliver kode.** OTP-logik hører i `lib/auth.js` jf. `CLAUDE.md` §7 |
| **otp-verify** | ukendt | `1b14a0296d6d…` | HTTP | Verificerer OTP | `otp-verify.js` | **Bliver kode** |
| **realiseret omsætning** | ukendt | env `SP_REALISERET_OMSAETNING_URL` | HTTP | Opdaterer `RealiseretOmsaetning` pr. kundenr | `realiseret-omsaetning.js` | **Bliver adapter** |
| **Nethire tilbud modtaget** | ukendt | — | **Mail-modtagelse** | Fanger BCC'et Nethire-tilbudsmail m. PDF, POSTer til `/api/nethire-import` | Ingen — PA er kalderen | **Bliver adapter.** Se §3.4 |
| **tilbud-import** (gem kladde) | ukendt | env `SP_TILBUD_IMPORT_URL` | HTTP | Gemmer/henter kladder i `TilbudImport` | `nethire-import.js` | **Bliver adapter** |
| **sp-patch** | ukendt | env `PA_SP_PATCH_URL` | HTTP | PATCH af listepris i `Masterark_Priser` | `sp-patch.js` | **Nedlægges.** Se §3.3 |
| **get-news-image** | ukendt | env `PA_GET_NEWS_IMAGE_URL` | HTTP | Streamer nyhedsbillede fra SP-drev | `get-news-image.js` | **Bliver adapter** |
| **upload-news-image** | ukendt | env `PA_UPLOAD_NEWS_IMAGE_URL` | HTTP | Uploader billede til SP-drev | `upload-news-image.js` | **Bliver adapter** |
| **Automatisk arkivering** | — | — | **Recurrence, dagligt** | Foreslået, ikke bygget. `Get items` + `Update item` i løkke | — | **Bliver kode** (planlagt kørsel, se §3.4) |

⚠️ **`netlify/functions/tilbud-status.js` må ikke slettes, selv om flowet er dødt.**
GET-grenen læser det døde flow, men POST-grenen er kundens **eneste** afvisningssti fra
`afvis-tilbud.html` og `pa-afvis-snippet.html`. Fjernes wrapperen, kan kunder ikke afvise.

### 3.3 Døde eller halvdøde stier

| Ting | Tilstand | Anbefaling |
|---|---|---|
| PA-flow **tilbud-status** | Filteret på `Fra` ramte forbi hver gang tilbuddet blev sendt fra en anden adresse end sælgerens. Efterladt urørt i portalen | Nedlæg i portalen — beslutning udestår, jf. `docs/pa-flows.md` |
| `sp-patch.js` | Funktionen indeholder tre udkommenterede løsningsforslag ("OPTION A/B/C") og fejler med 503 hvis `PA_SP_PATCH_URL` ikke er sat. Priser redigeres i dag via GitHub, ikke via SP | Slet funktionen og flowet |
| `Masterark_Priser` (SP-liste) | Kun refereret fra `sp-patch.js` | **AFKLARET: nej.** Intet af de 33 flows rører listen. Nedlægges efter eksport af de 436 rækker |
| `intern-test.html` | Deployet, offentlig, ubrugt | Slet |
| `stark_prisaftale_v5.html` | Deployet, offentlig, ubrugt | Slet |
| `kundeaftaler_kopi/` | Deployet, offentlig, ubrugt, indeholder kundedata | Slet |
| `all_products_raw` i `priser.json` | En JSON-streng inde i JSON'en, genopbygget ved hver prisændring | Udgår i den nye datamodel |
| `_note_kandidater` i `nethire-lookup.js` | Diagnostisk felt med kommentaren "fjernes når vi ved hvilket felt der bruges" — **returneres stadig til klienten** | Fjern ved migrering |

### 3.4 Hvad flowene gør, som ikke har en oplagt afløser

| Ting | Hvorfor det er svært |
|---|---|
| **Mail-modtagelse** | "Nethire tilbud modtaget" trigges af en mail med PDF-vedhæftning i en dedikeret postkasse. Netlify Functions kan ikke modtage mail. Kræver enten et blivende PA-flow som adapter, eller en tredjepart (mailhook). **Dette er den eneste PA-afhængighed der ikke kan reduceres til en simpel adapter.** |
| **Planlagt kørsel** | Den foreslåede automatiske arkivering er en `Recurrence`-trigger. Netlify har scheduled functions, så der *er* en afløser — men den skal bygges, ikke bare flyttes. |
| **Excel-læsning** | Sker allerede client-side med SheetJS i `admin.html` (bulk-import + realiseret omsætning). Ingen PA-afhængighed. |
| **Nethire SOAP** | `nethire-lookup.js` taler direkte SOAP mod `nhws-integration.nethire.dk` med `NETHIRE_USER`/`NETHIRE_PASS`. Ingen PA involveret — flytter uændret. |
| **Nethire-oprettelse** | `/api/flow` opretter aftalen i Nethire som del af kæden. Hvordan, vides ikke — flow-definitionen er ikke eksporteret. **Største ukendte i hele migreringen.** |
| **Adgang til tenanten** | `get-news-image`/`upload-news-image` læser og skriver i et SharePoint-dokumentbibliotek. Kræver blivende adapter eller Graph-adgang. |
| **Nettoprisark-generering** | `/api/flow` udfylder `nettopriser_template.html` og lægger resultatet i `kundeaftaler/<KUNDENR>/`. Generatoren findes ikke i repoet — kun skabelonen og outputtet. |

---

## 4. Duplikeret logik

### 4.1 Prisberegning — seks implementeringer, to forskellige svar

`CLAUDE.md` §5.5 fastlægger:

```
Miljøbidrag = (nettopris + risikotillæg) × 3,5 %
```

Der findes **to versioner** af den regel i produktion samtidig, styret af et felt `beregning`
på tilbuddet:

| Version | Formel | Hvem regner sådan |
|---|---|---|
| v1 (`beregning` mangler / < 2) | `miljø = nettopris × 3,5 %` | Alle visninger af tilbud gemt **før** juli 2026 |
| v2 (`beregning` ≥ 2) | `miljø = (nettopris + risikotillæg + transport) × 3,5 %` | Alt nyt. **Dette er reglen i `CLAUDE.md` §5.5** |

Nye tilbud og aftaler sætter altid `beregning: 2` hardkodet i frontend
(`index.html:1519`, `intern.html:4763` og `:4766`).

Implementeringerne:

| Fil | Linje(r) | Risiko-formel | Miljø-formel | Afviger? |
|---|---|---|---|---|
| `nettopriser_template.html` | 573–636 | `listepris × RISIKO_PCT`, `RISIKO_PCT` fra `{{RISIKOTILLAEG}}`, fallback `0.065` | `(kundepris + risiko) × 0.035` | **Nej** — matcher §5.5. Eneste sted med navngivne konstanter |
| `mail/tilbud-mail.js` | 106–129 | `(listepris \|\| nettopris) × risikoPct/100 × antal` | `(netto + (v2 ? risiko : 0)) × 0.035` | Kun via v1/v2-forgreningen |
| `vis-tilbud.html` | 364–407 | `bruttoEnhed × risikoPct/100 × antal` | `(netto + (v2 ? risiko : 0)) × 0.035` | Kun via v1/v2 |
| `dashboard_v2.html` | 957–1008 | `brutto × risikoPct/100` — **ingen `antal`** | `(netto + (v2 ? risiko : 0)) × 0.035` | **Ja.** Mangler `antal`, se nedenfor |
| `intern.html` | 1919-20, 2166, 2449-60, 3099, 4393-4425 | `lp × RISIKO` (`RISIKO` er en **mutérbar global**, sat fra en dropdown) | `(nettoKr + rKr) × 0.035`, plus `transportNetto × 0.035` separat i 2862 | **Ja.** Miljø på transport regnes et andet sted end miljø på materiel |
| `index.html` | 1846–2108 | `s.lp × getRisiko()/100`, `risikoNull ? 0` | `(n + r) × 0.035` — **`0.035` inline seks gange** | Nej i formel, ja i form |
| `admin.html` | 3457–3465 | `base × RISIKO_RATE` (`0.065`) | (regner ikke miljø) | Nej |
| `intern-test.html` | (spejler `intern.html`, ældre) | — | — | **Ja** — død kode, men afviger fra `intern.html` på `antal`-håndteringen |

**Konkret afvigelse, der giver forskellige tal i dag:** `intern.html:4393` og `:4425` ganger
med `antal` (tilføjet 2026-08-10, commits `7ebd312`/`aa6b03a`), mens
`dashboard_v2.html:963` ikke gør. Et tilbud med `antal > 1` viser derfor ét tal i
tilbudshistorikken og et andet i Dashboard.

**`RISIKO` i `intern.html` er en global variabel der muteres fra UI'et**
(`let RISIKO = 0.065` linje 1919, overskrevet i `applyRisiko()` linje 2354). Alt der regner
efter den, afhænger af hvornår i sidens livscyklus det kører.

### 4.2 `satser` i `priser.json` bruges ikke

`data/priser.json` indeholder:

```json
"satser": { "risikotillaeg_pct": 6.5, "miljoebidrag_pct": 3.5, "moms_pct": 25 }
```

**Ingen fil læser `satser`.** Alle otte implementeringer ovenfor har deres egne hardkodede
tal. Der findes altså allerede en autoritativ konfiguration — den er bare ikke koblet på.

### 4.3 Rabatkategorier — tre uforenelige vokabularer

| Lag | Værdier |
|---|---|
| `index.html` formular (`data-cat`) | `jord_anlaeg`, `bygning`, `lift`, `special`, `container_lv`, `trailer`, **`lastvogn`** |
| `samhandel-data.js` → RAW | `rabat_jord`, `rabat_lift`, `rabat_trailer`, `rabat_container`, `rabat_bygning`, `rabat_special` — **ingen `lastvogn`** |
| `samhandel-data.js` → visningsnavne | `Jord & Anlæg`, `Liftmateriel`, `Trailerlifte`, `Container & Letvogne`, `Bygningsmateriel`, `Specialmaskiner` |
| `priser.json` produktkategorier | `Jord- og Anlægsmateriel` (81), `Bygningsmateriel` (129), `Liftmateriel` (84), `Varevogne & Containere` (34), `Letvogne` (43) |
| `index.html` Bilag 1-filter (`data-cat`) | `JORD- OG ANLÆGSMATERIEL`, `BYGNINGSMATERIEL`, `LIFTMATERIEL`, `LETVOGNE` (versaler) |

**BEKRÆFTET mod skemaet:** der findes ingen `Rabat_Lastvognslifte`-kolonne på listen.

**Konkret datatab:** `lastvogn` sendes i payloaden fra `index.html:397` men har ingen
modtagende SP-kolonne og ingen mapning i `samhandel-data.js`. Rabatten på
"Lastvognslifte m. betjening" kan altså sættes i formularen og **forsvinder**.
Feltet er dog `type="hidden"` med fast værdi `0` og teksten "Iflg. tilbud", så tabet er
i praksis nul i dag — men konstruktionen er en fælde.

Desuden matcher rabatkategorierne (6-7) ikke produktkategorierne (5), og ingen af dem
matcher Bilag 1-filterets versal-varianter.

### 4.4 Risikofri underkategorier — samme liste, tre steder

```js
const RISIKO_FRIT_UKAT = ['Drivmiddel','Antigraffiti behandling','Rengøring','Diverse',
  'Diverse ydelser','Diverse omkostninger - varevogne','Lastvognslifte med betjening'];
```

| Fil | Linje | Afviger? |
|---|---|---|
| `intern.html` | 2155 | Basis |
| `intern-test.html` | 1641 | Identisk (død kode) |
| `admin.html` | 3460 | **Ja** — `admin.html:3464` tilføjer `\|\| (p.category \|\| '').toUpperCase().includes('DRIVMIDDEL')`. Admin fritager altså flere produkter for risikotillæg end tilbudsværktøjet gør |

### 4.5 Afdelingslister

| Kilde | Antal | Indhold | Status |
|---|---|---|---|
| `data/afdelinger.json` | 28 | navn, region, telefon, mail, adresse, by | Kanonisk |
| `nettopriser_template.html:556` `const BRANCHES` | 28 | **Byte-for-byte identisk** (verificeret ved JSON-sammenligning) | Bevidst kopi — arket skal virke offline i kundens mail |
| `din-aftale.html:1214` | 28 | Henter `/data/afdelinger.json` over HTTP | Korrekt — men har en hardkodet fallback-kontaktboks i markup (`backoffice.udlejningen@stark.dk`, linje 966) |
| `priser.json` → `saelgere[]` | 36 | navn, mail, tlf, type (`kam` / andet) | **Anden ting.** Bruges kun til afsender-dropdown og "nærmeste afdeling"-transportberegning. Har hverken region eller telefonnummer til afdelingen |

De to 28-lister er i sync **lige nu**. Der findes ingen mekanisme der holder dem i sync.

### 4.6 Validering af kundenumre

| Sted | Regel |
|---|---|
| `kunde.js:8` | Token skal matche et GUID-regex — **kundenummeret valideres ikke** |
| `nethire-lookup.js` | Ingen formatvalidering; `kunde_nr` interpoleres **direkte ind i SOAP-XML** (`<FromCustomerNumber>${kunde_nr}</FromCustomerNumber>`) |
| `nethire-import.js` | `/^\d{6,12}$/` på kundenr udtrukket fra PDF |
| `realiseret-omsaetning.js` | Kun `String(...).trim()` + ikke-tom |
| `index.html` | Fritekstfelt, ingen validering før afsendelse |

Fem steder, fem regler, og faktiske kundenumre i repoet spænder fra 8 til 9 cifre
(`10002152` … `346999999`). Der findes ingen fælles definition af hvad et kundenummer er.

### 4.7 Mail-skabeloner

| Skabelon | Hvor | Bemærkning |
|---|---|---|
| Tilbudsmail | `mail/tilbud-mail.js` (`buildTilbudMailHtml`) — indlæst via `<script src>` i `intern.html` | Den rigtige placering. **Eneste delte JS-fil i hele repoet** |
| Tilbudsmail (kopi) | `intern-test.html:3785` — samme funktion inline | Død kode, men afviger |
| Accept-bekræftelsesside | `accept-tilbud.js` — 130 linjer inline HTML+CSS+JS i en serverless function | Egen kopi af header, farver, knapper, footer |
| Fejlside | `accept-tilbud.js` (`fejlSide`) | Endnu en kopi |
| Afvisningsside | `afvis-tilbud.html` + `pa-afvis-snippet.html` | To varianter af samme side |
| Aftalemail | Bygges **inde i PA-flowet** bag `/api/flow` | Ikke i repoet. Kan ikke versioneres, reviewes eller testes |

### 4.8 Header, footer, farver, knapper

`#E87722` / `#1B3A6B` er hardkodet **i 12 filer**, i alt ca. 235 forekomster
(`index.html` 61, `intern-test.html` 60, `intern.html` 35, `stark_prisaftale_v5.html` 31,
`dashboard_v2.html` 10, `accept-tilbud.js` 8, `afvis-tilbud.html` 7, resten 1–5).

Der findes ingen `tokens.css`, ingen delt stylesheet og ingen delte komponenter. Hver fil
har sin egen `<style>`-blok på 200–800 linjer.

Otte forskellige Google Fonts-forespørgsler med otte forskellige vægtkombinationer af
Barlow / Barlow Condensed / Oswald / Inter / JetBrains Mono.

### 4.9 OTP-login-modulet

`mit-omraade.html:423` har kommentaren *"LOGIN / OTP MODULE — kopieret 1:1 fra intern.html"*.
Tre filer indeholder samme ~60 linjer: `intern.html`, `intern-test.html`, `mit-omraade.html`.

---

## 5. localStorage og klient-tilstand

| Nøgle | App | Indhold | Kat. | Hvad brugeren mister ved enhedsskift |
|---|---|---|---|---|
| `stark_intern_session` | `intern.html`, `intern-test.html`, `mit-omraade.html` | `{ mail, expiry }` — 8 timers gyldighed, **ren klientside-kontrol** | **B** | Skal logge ind igen. Acceptabelt. **Men:** udløbet håndhæves kun i browseren; ingen serverside-session findes |
| `stark_tilbud` | `intern.html`, `intern-test.html` | **Hele tilbudshistorikken** inkl. `cc`, `tlf`, `kontakt`, `fritekst`, `vilkaar`, `ydelser`, `tilvalg`, `transporter` — alle de felter SP ikke gemmer | **C** | **Mister alt der ikke er i SP.** Et tilbud åbnet på en anden maskine viser kun maskinerne — ingen ydelser, ingen fritekst, ingen transportlinjer, ingen kontaktperson |
| `akademi:favoritter` | `akademi/index.html` | Op til 30 side-ID'er | **B** | Mister favoritter |
| `akademi:senest` | `akademi/index.html` | Op til 12 `{id, tidsstempel}` | **B** | Mister "senest set" |
| `akademi:gennemfoert` | `akademi/index.html` | Array af `kategori/slug` for de 5 onboarding-trin | **B** | **Mister hele sin fremdrift.** Dette er den kendte sag |

**Ingen `sessionStorage` bruges nogen steder.** Ingen cookies sættes af applikationskoden.

**Det vigtigste fund i dette afsnit er ikke akademiets fremdrift — det er `stark_tilbud`.**
Akademiets tab er 5 afkrydsninger. `stark_tilbud` er den eneste kilde til seks felter på
hvert eneste tilbud, herunder to fritekstfelter i kategori C. Det er ikke cache; det er
primær datalagring i en browser, i strid med `CLAUDE.md` §5.3.

De seks Netlify-only sites (hub, stickers, rekvisitionsgenerator, merchandise, opmaaling,
rapportering) kunne **ikke** undersøges for klient-tilstand. Se §8 og §10.

---

## 6. Akademiet særskilt

> ### ⚠️ FORÆLDET AFSNIT — rettet 2026-08-12
>
> **Hele akademikomplekset er siden erklæret dødt** (`CLAUDE.md` §3.00, bekræftet af Jesper).
> De ni SharePoint-akademilister og de 19 `Score_*`-kolonner på `Medarbejdere_Udlejning`
> opdateres ikke længere. Akademiet på den nye platform bygges fra bunden med Supabase som
> datalager — **ingen migrering, ingen bagudkompatibilitet**.
>
> To konkrete fejl i afsnittet nedenfor:
>
> 1. **"Der er ingen moduler, ingen lektioner og ingen quizspørgsmål"** er forkert.
>    SharePoint-listen `Udlejning-MiniTests` indeholder 21 færdigskrevne spørgsmål med fire
>    svarmuligheder og facit. Konklusionen byggede på, at akademi-*sitets frontend* ikke
>    havde nogen quiz — hvilket ikke er det samme som, at der ikke fandtes spørgsmål.
>    De 21 er ikke en migrationskilde, men kan bruges redaktionelt
>    (`docs/datagrundlag.md` §2.3).
> 2. **"Fremdrift findes kun i localStorage"** var ufuldstændigt. Der fandtes også 19
>    `Score_*`-kolonner med 88 rækker. De er nu døde, så konklusionen holder i praksis —
>    men den holdt ikke af den grund, afsnittet angav.
>
> **Datamodellen i §6.3 er stadig brugbar** som udgangspunkt for det nye akademi, men den
> skal udvides med spørgsmål og besvarelser, som §6.1 troede ikke fandtes.
>
> Afsnittet er bevaret uændret nedenfor som dokumentation af, hvad der blev fundet og hvornår.


### 6.1 Struktur i dag

| Niveau | Antal | Bemærkning |
|---|---|---|
| Kategorier | 6 | `ny-med-udlejning` (5 sider), `lifte` (5), `anlaegsmaskiner` (5), `skurvogne` (4), `oekonomi` (5), `genvej` (1) |
| Sider | 25 | `{ id, category, slug, label, blocks[] }` |
| Indholdsblokke | 757 | `faq` 433 · `rte` 183 · `image` 59 · `hero` 28 · `cta` 27 · `spec` 16 · `person-group` 6 · `section-nav` 5 |

*(`README.md` i akademi-repoet siger 789 blokke. Faktisk optælling af den committede
`academy-data.json` giver 757. README'en er stale.)*

**Der er ingen moduler, ingen lektioner og ingen quizspørgsmål.** De 433 `faq`-blokke er
opslagsværk — spørgsmål og svar til læsning, ikke til besvarelse. Der findes intet sted i
koden hvor en bruger afgiver et svar, og ingen score, ingen rigtig/forkert-logik.

### 6.2 Fremdrift i dag

Fremdrift er **fem hardkodede trin** i `index.html:499`:

```js
const ONBOARDING = [
  { cat: 'ny-med-udlejning', slug: 'kultur',       label: 'Velkommen & kultur' },
  { cat: 'ny-med-udlejning', slug: 'intro',        label: 'Introforløb' },
  { cat: 'ny-med-udlejning', slug: 'nethire',      label: 'Nethire & systemer' },
  { cat: 'lifte',            slug: 'sikkerhed',    label: 'Sikkerhed på pladsen' },
  { cat: 'oekonomi',         slug: 'bruttoavance', label: 'Bruttoavance — grundmodellen' }
];
```

`markDone(cat, slug)` skriver `"cat/slug"` i `localStorage['akademi:gennemfoert']`, men
**kun** hvis parret findes i `ONBOARDING`. De øvrige 20 sider tæller ikke.
Visningen er `${done.length} af ${ONBOARDING.length} gennemført`.

Der er **ingen login**, ingen bruger og ingen identitet overhovedet. Akademiet ved ikke
hvem der læser.

### 6.3 Foreslået datamodel

Kursusindhold **A** (frit i Supabase), fremdrift **B** (kun `email_hash`):

```sql
-- Kategori A — kursusindhold. Læses af alle indloggede, skrives kun af admin.
create table akademi_kategorier (
  id            text primary key,          -- 'ny-med-udlejning'
  label         text not null,
  sortering     int  not null default 0
);

create table akademi_sider (
  id            text primary key,          -- 'ny-med-udlejning-kultur'
  kategori_id   text not null references akademi_kategorier(id),
  slug          text not null,
  label         text not null,
  sortering     int  not null default 0,
  unique (kategori_id, slug)
);

create table akademi_blokke (
  id            bigserial primary key,
  side_id       text not null references akademi_sider(id) on delete cascade,
  sortering     int  not null,
  type          text not null,             -- rte | faq | image | hero | cta | spec | …
  indhold       jsonb not null
);

-- Kategori A — hvad der tæller som et forløb. Afløser ONBOARDING-arrayet i frontend.
create table akademi_forloeb (
  id            text primary key,          -- 'onboarding'
  label         text not null
);
create table akademi_forloeb_trin (
  forloeb_id    text not null references akademi_forloeb(id) on delete cascade,
  side_id       text not null references akademi_sider(id),
  sortering     int  not null,
  primary key (forloeb_id, side_id)
);

-- Kategori B — fremdrift. ALDRIG navn, ALDRIG mailadresse.
create table akademi_fremdrift (
  email_hash    text not null,             -- HMAC-SHA256, jf. CLAUDE.md §4
  side_id       text not null references akademi_sider(id),
  gennemfoert   timestamptz not null default now(),
  primary key (email_hash, side_id)
);
create index on akademi_fremdrift (side_id);
```

**"Hvor langt er jeg"** — ét opslag på `email_hash`:

```sql
select count(*) filter (where f.gennemfoert is not null) as gennemfoert,
       count(*)                                          as ialt
from   akademi_forloeb_trin t
left   join akademi_fremdrift f
       on f.side_id = t.side_id and f.email_hash = $1
where  t.forloeb_id = 'onboarding';
```

**"Hvad mangler jeg"** — samme join, `where f.side_id is null`.

**Aggregeret fremdrift uden at kunne udpege enkeltpersoner fra databasen alene:**

```sql
select t.side_id,
       count(distinct f.email_hash) as antal_gennemfoert
from   akademi_forloeb_trin t
left   join akademi_fremdrift f on f.side_id = t.side_id
where  t.forloeb_id = 'onboarding'
group  by t.side_id;
```

Denne forespørgsel giver "18 har gennemført Sikkerhed på pladsen" uden at nogen række i
Supabase indeholder et navn eller en mailadresse. Sammenkoblingen `email_hash → person`
kræver `PSEUDONYM_SECRET` (Netlify env var) **og** brugerlisten i SharePoint. Ingen af
delene kan nås fra et databasedump.

**To ting der skal håndhæves for at det holder:**

1. **Minimumsgrænse på aggregering.** Med et lille hold kan "1 person har gennemført
   modul X" i praksis udpege personen. Aggregerede visninger bør skjule celler under
   f.eks. 5.
2. **Ingen tidsstempel-lækage i admin-UI.** `gennemfoert` er nødvendig for at kunne rydde
   op, men en liste sorteret på tidsstempel + kendskab til hvem der startede hvornår er
   en genidentificeringsvej. Vis aggregater, ikke rækker.

**RLS:** `akademi_fremdrift` skal have policy der kun tillader `email_hash = current_setting('app.email_hash')`
for læsning/skrivning fra brugerkontekst, og aggregering kun via `security definer`-funktioner.

---

## 7. Eksterne afhængigheder

| Afhængighed | Bruges til | Sender data ud af huset? |
|---|---|---|
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | Barlow, Barlow Condensed, Oswald, Inter, JetBrains Mono. 8 forskellige forespørgsler | **Ja** — brugerens IP og User-Agent ved hvert sidevisning. Gælder også `nettopriser_template.html`, som ligger i **kundens** mail: hver gang kunden åbner sit nettoprisark, går der et kald til Google |
| **Google Maps JS API** (`maps.googleapis.com`) | Places Autocomplete + DistanceMatrix i `intern.html`, Places + Geocoder i `admin.html` | **Ja, og det er det alvorligste.** **Kundens leveringsadresse** tastes i et Autocomplete-felt og sendes til Google ved hvert tastetryk. Afdelings- og destinationskoordinater sendes i DistanceMatrix-kald |
| **cdnjs.cloudflare.com** — SheetJS `xlsx 0.18.5` | Excel-parsing i `admin.html` (bulk-import, realiseret omsætning) | Nej — parsing sker lokalt. **Men** det er et ikke-integritetstjekket tredjepartsscript med fuld DOM-adgang på admin-siden. Ingen SRI-hash |
| **unpkg.com** — React 18.3.1, ReactDOM, Babel standalone | Kun i `akademi/support.js` | **Nej i praksis** — filen indlæses ikke af `index.html`. Død afhængighed |
| **Power Automate / Power Platform** (`default2e114308…powerplatform.com`) | 8 flow-URL'er | **Ja** — hele datastrømmen. Intern tenant |
| **SharePoint** (`starkworkspace.sharepoint.com`) | Datalager | Intern tenant |
| **Nethire SOAP** (`nhws-integration.nethire.dk`) | Kundeopslag på CVR/kundenr, risikoklasse | **Ja** — kundenummer sendes; navn, noter og forsikrings-ID modtages |
| **Nethire web** (`web.nethire.dk`) | Deep-links til tilbud | Kun link |
| **GitHub API** (`api.github.com`) | `github-proxy.js`, `update-priser-json.js` — læser og **committer** `priser.json` og `customers.json` | **Ja** — sælgerkatalog og kundedata committes til GitHub af en admin-handling |
| **`stark-udlejning.netlify.app`** | 33 hardkodede absolutte URL'er til logo, `customers.json`, accept-links | Egen infrastruktur, men hardkodet — knækker ved domæneskifte til `starkudlejning.dk` |
| **`www.stark.dk`, `teams.microsoft.com`, `www.google.com`, `www.netlifystatus.com`** | Almindelige links | Nej |

**Ikke undersøgt:** de seks Netlify-only sites. De kan have deres egne CDN'er, tracking-scripts
og indlejrede tjenester. Se §10.

---

## 8. Risici og åbne spørgsmål

### 8.1 Sikkerhed — kræver stillingtagen før migrering

| # | Fund | Fil / bevis |
|---|---|---|
| 1 | **Admin-adgangskode i klartekst i klientkoden.** `const ADMIN_CREDS = { user: 'admin', pass: 'stark2026' }` — enhver der åbner kildevisning på den offentlige side har fuld admin | `admin.html:1671` |
| 2 | **Dashboard-adgangskode i klartekst.** `const DASH_CREDS = {user:'admin', pass:'Stark2026'}` | `dashboard_v2.html:844` |
| 3 | **`authorization`-headeren er den literale streng `internal`.** `tilbud-data.js` og `samhandel-data.js` tjekker kun `if (!auth) return 401` — enhver ikke-tom værdi passerer. Al tilbuds- og aftaledata kan hentes med ét curl-kald | `tilbud-data.js:6`, `samhandel-data.js:118`, 7 kaldsteder i frontend |
| 4 | **`index.html` har ingen adgangskontrol.** Siden der opretter og sender samhandelsaftaler til kunder er fuldt offentlig | `index.html` — ingen login-kode |
| 5 | **`vis-tilbud.html` har ingen adgangskontrol** trods "(intern)" i titlen. Viser kundenavn, kontaktdata, priser og rabatter | `vis-tilbud.html` |
| 6 | **PA-flow-URL'er med signatur er hardkodet i repoet og i `netlify.toml`.** Otte styk. Signaturen *er* autentifikationen — den der har URL'en kan trigge flowet | `netlify.toml:12,38`, `send-tilbud.js:1`, `otp-login.js:1`, `otp-verify.js:1`, `accept-tilbud.js:1`, `tilbud-status.js:16-17`, `tilbud-data.js:2` |
| 7 | **`SECRETS_SCAN_ENABLED = "false"`** i `netlify.toml` — Netlifys egen hemmelighedsscanning er slået fra | `netlify.toml:7-8` |
| 8 | **Kundedata og medarbejderdata er version-kontrolleret i Git** og serveres offentligt. 30 kunder + 36 medarbejdere + 199 kundedokumenter | `data/c8f2a9/customers.json`, `data/priser.json`, `kundeaftaler/`, `kundeaftaler_kopi/` |
| 9 | **Kundedokumenter ligger på forudsigelige offentlige URL'er.** `…/kundeaftaler/<KUNDENR>/nettoprisark.html`. Kender man kundenummeret, kan man læse aftalen | `kundeaftaler/` |
| 10 | **Sessionen er ren klientside.** `{mail, expiry}` i localStorage. Redigér `expiry`, eller skriv en vilkårlig `@stark.dk`-adresse ind, og du er "logget ind". Ingen serverside-validering nogen steder | `intern.html:6434-6447` |
| 11 | **`kunde_nr` interpoleres direkte ind i SOAP-XML** uden escaping | `nethire-lookup.js:77` |
| 12 | **`accept-tilbud.js` interpolerer query-parametre direkte ind i HTML** (`firma`, `saelger`, `saelgermail` fra URL'en) uden escaping | `accept-tilbud.js:73-160` |
| 13 | **Accept registreres ved page load**, uden bekræftelse. Enhver der åbner accept-linket — også en videresendt mail eller en mail-scanner — accepterer tilbuddet | `accept-tilbud.js`, `registerAccept()` |

Punkt 1–5 og 10 betyder tilsammen, at der i dag **ikke findes reel adgangskontrol** på
noget af det, der i den nye platform skal ligge bag login. Det ændrer ikke på, at
`CLAUDE.md` §1's "standard er bag login" er rigtig — men det betyder, at migreringen
lukker huller, ikke bare flytter kode.

### 8.2 Beslutninger der kræver Jesper

| # | Spørgsmål |
|---|---|
| 1 | **Hvad er `ansogning.netlify.app`?** Site med 2 serverless functions, ikke nævnt nogen steder, intet tilgængeligt repo. Skal den med i platformen, eller ud? |
| 2 | **Skal `martin-kongsvad` med?** Repoet findes (`stark-udlejning/martin-kongsvad`, public) men vises ikke i repo-listen. Ser personligt ud. |
| 3 | ~~**Findes `afvigelsesrapportering` overhovedet?**~~ **AFKLARET — spørgsmålet var forkert stillet.** Siden findes og er i drift. Den manglede kun i deploy-listen, fordi listen kun viser ændrede filer. Se rettelsen i §0.3. |
| 4 | **Hvad skal der ske med kundedokumenterne i `kundeaftaler/`?** 105 kunders aftaler på offentlige, forudsigelige URL'er. Bag login, bag token, eller flyttes til SharePoint? Det ændrer hele kundeportalens design. |
| 5 | **Skal `din-aftale.html` have OTP?** Repoets `CLAUDE.md` påstår OTP-login. Der er ingen. Kun token i URL. Eksterne kunder har ikke `@stark.dk`-adresser, så det nuværende OTP-flow kan ikke bruges. |
| 6 | **Skal `beregning: 1` (miljø af netto alene) understøttes videre?** Historiske tilbud regnes stadig efter den. Enten bevares forgreningen i `lib/pricing.js`, eller også genberegnes historikken. `CLAUDE.md` §5.5 nævner kun v2. |
| 7 | **Skal `ydelser`, `vilkaar`, `fritekst`, `cc`, `kontakt` og `tlf` persisteres?** I dag lever de kun i sælgerens localStorage. Fire af dem er kategori C. |
| 8 | **Er `Masterark_Priser`-listen stadig i brug** af noget uden for dette repo? Hvis nej, kan `sp-patch.js` og flowet slettes. |
| 9 | **Skal det døde `tilbud-status`-flow ryddes i PA-portalen?** Udestående punkt fra `docs/pa-flows.md`. |
| 10 | **Hvem må se hvilke tilbud?** I dag ser alle sælgere alle tilbud (`tilbud-data` henter ufiltreret). Er det tilsigtet eller en utilsigtet konsekvens af at `Fra`-filteret ikke virkede? |
| 11 | **`potentiel_omsaetning`, `omsaetning_stark`, `realiseret_omsaetning` — A eller C?** Klassificeret C `TVIVL` her, fordi de kun har mening sammen med kundenummeret. Hvis de kan opbevares uden kundenøgle, kan de flyttes til A. |
| 12 | **Skal Google Maps-opslag på kundeadresser fortsætte?** Kundens leveringsadresse sendes til Google ved hvert tastetryk i Autocomplete. |
| 13 | **Skal Google Fonts fortsætte i `nettopriser_template.html`?** Arket åbnes i kundens mailklient og kalder Google hver gang. Selvhostede fonte fjerner det. |

### 8.3 Hvad der ikke kunne undersøges

Eksplicit, jf. `CLAUDE.md` §5.7:

| Ting | Hvorfor |
|---|---|
| **Filerne på de 6 Netlify-only sites** (hub, rapportering, stickers, rekvisitionsgenerator, merchandise, opmaaling) samt spinning | `*.netlify.app` er blokeret af egress-proxyen (403). Ingen `NETLIFY_TOKEN`. MCP-serveren har ingen fil-operationer. **Konsekvens: §1's inventar, §2's feltliste, §5's localStorage-liste og §7's afhængighedsliste dækker ikke disse syv sites** |
| **Antal rækker i alle SharePoint-lister** | Ingen SharePoint-adgang. Alle "Rækker"-celler i §3.1 står som Ukendt |
| **Faktiske SP-kolonnenavne og -typer** | Udledt af kaldende kode. `samhandel.js` og `samhandel-data.js` dobbelt-tjekker selv casing, fordi PA-flowets Select-output aldrig er set direkte |
| **Flow-definitionerne for 15 af de 19 flows** | Kun `Send tilbud` er eksporteret (`docs/pa-send-tilbud-definition.json`). Ingen PA-portaladgang |
| **Hvad `/api/flow` faktisk gør** | Systemets tungeste flow: SP-skrivning + nettoprisark-generering + mail + Nethire-oprettelse. Ingen definition, ingen dokumentation. **Største ukendte i migreringen** |
| **Nettoprisark-generatoren** | Kun skabelonen (`nettopriser_template.html`) og outputtet (`kundeaftaler/`) findes i repoet. Selve udfyldningen sker i PA |
| **Om Netlify Forms indeholder historiske data** | `forms: not enabled` på alle 12 sites i dag. Om der *har været* formularer, kan ikke ses |
| **Netlify env vars pr. site** | MCP-serveren eksponerer dem ikke. Listen over `SP_*`/`PA_*`-variabler i §3.2 er udledt af `process.env`-opslag i koden |
| **Om `kundeaftaler/`-dokumenterne indeholder mere end pris** | Ikke åbnet. 210 filer med kundedata; jeg har talt dem, ikke læst dem |
| **Akademiets billedmangel** | `billed-tjekliste.md` nævner 59 forventede billeder; `images/` har 109 filer. Ikke krydstjekket hvilke der mangler |

---

## 9. Forslag til rækkefølge

Kriteriet er **risiko**, ikke værdi.

### Først: `/akademi`

| Kriterium | Vurdering |
|---|---|
| Datakategorier | A (indhold) + B (fremdrift). **Ingen kategori C overhovedet** |
| PA-afhængigheder | **Ingen** |
| SharePoint-afhængigheder | **Ingen** |
| Beregningslogik | **Ingen** |
| Eksterne integrationer | Kun Google Fonts |
| Nuværende backend | Ingen — ét statisk `index.html` + én JSON |
| Hvis det går galt | Fem afkrydsninger går tabt. De er allerede tabt hver gang nogen skifter browser |
| Hvad det beviser | OTP-login mod allowlist · `email_hash`-mønstret · Supabase + RLS · én rute i den nye struktur · designsystemet · at Netlify-functions-laget virker |

Akademiet er det eneste sted, hvor **hele det bærende mønster fra `CLAUDE.md` §4** kan
bevises end-to-end uden at røre en eneste kundeoplysning. Migreringen tilføjer samtidig
noget der reelt mangler: fremdrift der overlever et enhedsskift. Det er hovedårsagen til
migreringen, jf. `CLAUDE.md` §5.3, og det er den billigste app at bevise den på.

**`spilmere`-repoet er en færdig reference for præcis denne stak** — Supabase Postgres med
RLS på alle tabeller, nummererede migrations i `supabase/migrations/`, Netlify Functions i
ESM, samme deploy-model. Værd at læse før den første migration skrives.

### Derefter: `/vaerktoejer/*` og `/rapportering/*` — men først skal de hentes hjem

De syv `drop`-sites er små, statiske, uden backend og uden Git-historik. De er det oplagte
næste skridt, **og** det bedste sted at bevise ét delt designsystem og ét login på tværs
af flere sider.

Men de kan ikke planlægges før §0 er gennemført. **Hjemtagningen af `legacy/` er derfor
det næste konkrete stykke arbejde** — før prompt 01, ikke efter.

### Så: `/hub`

Tidsregistrering er kategori B (medarbejderdata) uden kundedata. Naturligt trin to i
pseudonymiseringsmønstret, når akademiet har bevist det.

### Til sidst: `/samhandel`

Sidst, og med god grund. Den har al kategori C-dataen, alle PA-flows, hele beregningskæden
i seks versioner, `/api/flow`-flowet som ingen har kortlagt, Nethire-integrationen,
nettoprisark-generatoren, 105 kunders dokumenter og seks felter der kun findes i sælgernes
browsere.

**Ét stykke arbejde bør dog trækkes frem foran alt andet**, fordi det ikke afhænger af nogen
migrering: `lib/pricing.js` med `satser` fra konfiguration, unit-testet mod §5.5, og
`beregning`-forgreningen ét sted. Så længe der findes seks implementeringer, giver to af
dem allerede forskellige svar i produktion (§4.1), og enhver ny app arver problemet.

Tilsvarende bør punkt 1–3 i §8.1 (adgangskoder i klientkoden, `authorization: internal`)
vurderes selvstændigt af Jesper. De er ikke migreringsopgaver — de er tilstanden i
produktion i dag.

---

## 10. Dækning

### 10.1 Gennemgået

| Repo / kilde | Hvad | Hvordan |
|---|---|---|
| `stark-udlejning/stark-prisaftale` | Alle 12 HTML-filer i roden, alle 19 netlify-functions, `mail/tilbud-mail.js`, `netlify.toml`, `package.json`, `generate-array.py`, `docs/pa-flows.md`, `docs/pa-send-tilbud-definition.json`, `data/priser.json`, `data/afdelinger.json`, `data/c8f2a9/customers.json` | Læst direkte. Store HTML-filer er gennemgået målrettet (beregningslogik, localStorage, API-kald, adgangskontrol, eksterne kald, formularfelter) — **ikke linje for linje** |
| `stark-udlejning/stark-prisaftale` → `kundeaftaler/`, `kundeaftaler_kopi/` | **Kun talt og sammenlignet strukturelt.** 105 vs. 94 mapper, 210 vs. 188 filer, 0 mapper unikke for kopien, 5 stikprøver alle afvigende | `find`, `diff -rq`. **Indholdet er ikke læst** |
| `stark-udlejning/akademi` | Alle filer undtagen de 109 billeder | Klonet shallow (`717ff04`), læst |
| `stark-udlejning/spilmere` | `README.md`, `netlify.toml`, filliste | Klonet shallow (`c98c0cd`). **Kun overfladisk** — nok til at fastslå at den ikke hører til platformen |
| Netlify-kontoen | Alle 12 sites listet. Deploy-metadata hentet for 11 af 12 | Netlify MCP: `get-projects`, `get-project`, `get-deploy-for-site`, `get-forms-for-project` |

### 10.2 Ikke haft adgang til

| Ting | Årsag |
|---|---|
| **Deploy-filerne på alle 12 Netlify-sites** | Egress-proxy blokerer `*.netlify.app` (403 på CONNECT). Ingen `NETLIFY_TOKEN`. Netlify-MCP har ingen fil-operation. **Dette er §0's manglende leverance** |
| `stark-udlejning/martin-kongsvad` | Repoet fremgår ikke af sessionens repo-liste. Kun bevist eksisterende via commit-URL i deploy-metadata |
| Repo bag `ansogning` | Findes ikke i repo-listen; deploy-metadata angiver intet repo |
| SharePoint (`starkworkspace.sharepoint.com`) | Ingen adgang. Alle listestrukturer i §3.1 er **udledt af kode**, ikke aflæst |
| Power Automate-portalen | Ingen adgang. 15 af 19 flows er beskrevet ud fra kaldende kode |
| Netlify env vars | Eksponeres ikke af MCP-serveren |
| Nethire | Ingen credentials |
| Google Maps-forbrug | Ingen adgang til konsollen |

### 10.3 Påstande jeg ikke kan stå inde for

- **Rutekolonnen "Ny rute" i §1.2 er mit forslag, ikke en beslutning.** Den er sat ud fra
  `CLAUDE.md` §1's udkast plus det jeg har set i koden.
- **Kolonnenavnene på `Samhandelsaftaler_Rabatter` (§3.1) er de mest usikre i dokumentet.**
  De er læst baglæns ud af defensiv dobbelt-casing-kode i `samhandel.js`/`samhandel-data.js`,
  skrevet af nogen der heller ikke havde set flowets faktiske output.
- **Feltlisterne i §2 dækker kun de tre datastrømme jeg kunne læse kode for.** De syv
  Netlify-only sites er ikke med — de kan have felter, ingen af os kender.
- **Jeg har ikke kørt nogen tests og ikke afprøvet noget endpoint.** Alt i dette dokument er
  statisk læsning af kode plus metadata fra Netlifys API.
- **Rækketal for alle SharePoint-lister er ukendte**, og intet i §3 bygger på faktiske data.

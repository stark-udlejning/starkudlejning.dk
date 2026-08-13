# SendMail — byg den ved at klone `Sendtilbud`

> **Note om denne fil.** CC-prompt 03 §3 beder om at *"skrive `docs/pa-flows-sendmail.md`
> om"* og at overtage *"de tre curl-tests fra det nuværende dokument"*. **Filen fandtes ikke**
> — hverken i dette repo, i nogen branch, eller i `stark-prisaftale`, hvis `docs/pa-flows.md`
> ikke nævner SendMail overhovedet. Der var altså ingen curl-tests at tilpasse.
> Dokumentet er skrevet fra bunden, og de tre tests nedenfor er nye.
> Jf. `CLAUDE.md` §5.7: jeg fandt den ikke, og jeg kan ikke sige, at den aldrig har eksisteret.

---

## 1. Hvorfor klone frem for at bygge

`SendMail` skal ikke bygges fra bunden. **`Sendtilbud`s mailkald er allerede rent gennemløb**
— flowet renderer intet selv, og afsenderadressen virker allerede:

| `SendEmailV2`-parameter | Værdi i `Sendtilbud` i dag | Svarer til `sendMail()` |
|---|---|---|
| `emailMessage/To` | `@triggerBody()?['to']` | `til` |
| `emailMessage/Cc` | `@triggerBody()?['cc']` | `cc` |
| `emailMessage/Subject` | `@triggerBody()?['subject']` | `emne` |
| `emailMessage/Body` | `@triggerBody()?['html']` | `htmlBody` — **færdigrenderet HTML** |
| `emailMessage/ReplyTo` | `@triggerBody()?['from']` | `svarTil` |
| `emailMessage/From` | `udlejning@stark.dk` (fast) | — Send As er allerede i orden |
| `emailMessage/Importance` | `Normal` (fast) | — |

Fem af seks parametre i `lib/sendMail.js` er dermed allerede på plads, i drift, med den
rigtige afsender. Det eneste, der mangler, er vedhæftninger.

> ⚠️ **Grundlaget er en eksport, ikke portalen.** Tabellen er læst ud af
> `flows/Sendtilbud/definition.json`. Eksporterne i `flows/` bærer ingen tidsstempler, og
> mindst én af dem er beviseligt forældet (`docs/datagrundlag.md` §4.4b og §6.3).
> **Åbn `Sendtilbud` i portalen og sammenlign, før du kloner.** Er parametrene anderledes,
> gælder portalen.

---

## 2. Fremgangsmåde

### 2.1 Klon originalen

I Power Automate: **Gem som** på `Sendtilbud` → navngiv kopien `SendMail`.

> ### ⚠️ Originalen `Sendtilbud` røres ikke
>
> Den kører videre, indtil `/samhandel` er skåret over (`CLAUDE.md` §11). Alt arbejde sker
> i kopien. Ingen ændring i originalen, ikke engang en omdøbning af et trin.

### 2.2 Fjern fra kopien

| Handling | Type | Hvorfor den skal væk |
|---|---|---|
| `Create item` i `Tilbud` | `OpenApiConnection` | SharePoint-skrivning hører i adapteren, ikke i mailflowet. `SendMail` må ikke kende en eneste liste |
| Den ene `If` | `If` | `CLAUDE.md` §2: adaptere har **nul betingelser** |
| `Response` med `itemId` | `Response` | Adapteren returnerer ikke SP-id'er. Erstattes, se §2.4 |
| Trigger-schemaets `tilbud`-objekt | — | 32 `object`- og 30 `string`-erklæringer, der beskriver et tilbud. Erstattes af det flade schema i §2.3 |

### 2.3 Nyt trigger-schema

Skal matche `sendMail({ til, cc, emne, htmlBody, svarTil, vedhaeftninger })` i
`netlify/functions/lib/sendMail.js` præcist. Feltnavnene er danske, fordi adapterlaget er det.

```json
{
  "type": "object",
  "properties": {
    "til":            { "type": "array", "items": { "type": "string" } },
    "cc":             { "type": "array", "items": { "type": "string" } },
    "emne":           { "type": "string" },
    "htmlBody":       { "type": "string" },
    "svarTil":        { "type": ["string", "null"] },
    "vedhaeftninger": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "filnavn":       { "type": "string" },
          "indholdBase64": { "type": "string" }
        },
        "required": ["filnavn", "indholdBase64"]
      }
    }
  },
  "required": ["til", "emne", "htmlBody"]
}
```

`til` og `cc` er **arrays**, ikke semikolonseparerede strenge — `lib/sendMail.js` normaliserer
allerede til array via `tilListe()`. Sammenkædning til Outlooks format sker i mappingen (§2.5),
ikke i kalderen.

### 2.4 Behold og tilpas

| Handling | Ændring |
|---|---|
| `Send an email (V2)` | Behold. Ret parametrene, se §2.5 |
| `Response` | Behold, men returnér kun `{"ok": true}` med statuskode 200. Ingen `itemId` |

### 2.5 Parametermapping i `Send an email (V2)`

| Parameter | Ny værdi |
|---|---|
| `emailMessage/To` | `@join(triggerBody()?['til'], ';')` |
| `emailMessage/Cc` | `@join(coalesce(triggerBody()?['cc'], createArray()), ';')` |
| `emailMessage/Subject` | `@triggerBody()?['emne']` |
| `emailMessage/Body` | `@triggerBody()?['htmlBody']` |
| `emailMessage/ReplyTo` | `@triggerBody()?['svarTil']` |
| `emailMessage/From` | `udlejning@stark.dk` — **uændret** |
| `emailMessage/Importance` | `Normal` — **uændret** |
| `emailMessage/Attachments` | `@triggerBody()?['vedhaeftninger']` — se §3 |

> **Om `join` og `coalesce`:** `CLAUDE.md` §2 kræver nul expressions i adapterne. De to her er
> ren formatkonvertering mellem JSON-array og Outlooks semikolonstreng — ikke logik, ingen
> betingelser, ingen beregning. **Vil man have dem helt væk**, kan `lib/sendMail.js` sende
> `til` og `cc` som færdige semikolonstrenge i stedet. Det er den reneste løsning målt på §2,
> og den anbefales, hvis flowet ellers ville skulle bære sin første expression.

### 2.6 Vedhæftninger

Mønstret findes i `STARKUdlejning—FormularEmailGateway`, som håndterer `attachments`. **Men
kopiér det ikke råt** — Gateway-flowet gør to ting, `SendMail` ikke skal:

| Gateway gør | `SendMail` skal |
|---|---|
| `Create file` → skriver hver vedhæftning til et SharePoint-bibliotek | **Ikke skrive filer.** Vedhæftninger sendes med mailen og gemmes ikke |
| `Append to string variable` → bygger en liste af links til filerne | Udgår |
| `GetFileContentByPath` → læser filen tilbage | Udgår |

Outlook-konnektoren tager vedhæftninger direkte som array af
`{ Name, ContentBytes }`. Feltnavnene skal mappes:

```
Name         ← @item()?['filnavn']
ContentBytes ← @item()?['indholdBase64']
```

Er der ingen `Apply to each` tilbage efter oprydningen, kan hele arrayet gives direkte til
`emailMessage/Attachments`.

> ⚠️ **Hent ikke BCC'en med.** `FormularEmailGateway` har en hardkodet
> `emailMessage/Bcc = jesper.kongsvad@stark.dk` på hver eneste afsendelse
> (`docs/datagrundlag.md` §4.2). `SendMail` må ikke have en BCC.

### 2.7 Sikkerhed

`lib/sendMail.js` sender allerede headeren `x-stark-secret` med værdien fra
`PA_SHARED_SECRET`. **Flowet validerer den ikke i dag.** Tilføj som første trin i kopien en
`If`, der sammenligner
`@triggerOutputs()?['headers']?['x-stark-secret']` med den forventede værdi, og svarer 401 ved
uoverensstemmelse.

> Dette er den ene betingelse, `SendMail` gerne må have. Den er ikke forretningslogik, men
> adgangskontrol på selve adapteren — uden den kan enhver, der kender flow-URL'en, sende mail
> fra `udlejning@stark.dk`. Det er præcis den eksponering, `docs/kortlaegning.md` §8.1 punkt 6
> beskriver ved de nuværende signerede flow-URL'er.

### 2.8 Sæt env var

Kopiér HTTP-triggerens URL til Netlify:

```
PA_SENDMAIL_URL = <URL fra SendMail-flowets trigger>
PA_SHARED_SECRET = <samme værdi som i flowets validering>
```

Ingen anden fil end `lib/sendMail.js` må kende URL'en (`CLAUDE.md` §5.1).

---

## 3. Tests

Tre tests, i rækkefølge. Kør dem mod flowets URL, **ikke** gennem Netlify — så testes flowet
isoleret fra adapteren.

Sæt først:

```bash
export SENDMAIL_URL='<URL fra SendMail-flowets trigger>'
export STARK_SECRET='<PA_SHARED_SECRET>'
export TESTMAIL='test1@starkudlejning.dk'   # aldrig en rigtig kollega, jf. CLAUDE.md §11
```

### Test 1 — simpel mail

Beviser: trigger-schemaet accepterer det flade format, HTML sendes uændret, afsenderen er
`udlejning@stark.dk`, og `svarTil` sætter Reply-To.

```bash
curl -sS -X POST "$SENDMAIL_URL" \
  -H 'Content-Type: application/json' \
  -H "x-stark-secret: $STARK_SECRET" \
  -d '{
    "til": ["'"$TESTMAIL"'"],
    "emne": "SendMail test 1 — simpel",
    "htmlBody": "<h1>Test 1</h1><p>Hvis denne overskrift er <strong>fed</strong>, er HTML sendt uændret.</p>",
    "svarTil": "udlejning@stark.dk"
  }' -w '\nHTTP %{http_code}\n'
```

**Forventet:** `HTTP 200`, body `{"ok":true}`. Mailen ankommer med formateret HTML,
afsender `udlejning@stark.dk`, Reply-To sat.

### Test 2 — cc og vedhæftning

Beviser: `cc` som array bliver til flere modtagere, og vedhæftningen kommer med som fil —
**ikke** som et link til SharePoint.

```bash
curl -sS -X POST "$SENDMAIL_URL" \
  -H 'Content-Type: application/json' \
  -H "x-stark-secret: $STARK_SECRET" \
  -d '{
    "til": ["'"$TESTMAIL"'"],
    "cc": ["test2@starkudlejning.dk"],
    "emne": "SendMail test 2 — cc og vedhæftning",
    "htmlBody": "<p>Der bør være én vedhæftet fil ved navn test.txt.</p>",
    "vedhaeftninger": [
      { "filnavn": "test.txt", "indholdBase64": "SGVqIGZyYSBTVEFSSyBVZGxlam5pbmcu" }
    ]
  }' -w '\nHTTP %{http_code}\n'
```

**Forventet:** `HTTP 200`. Begge adresser modtager. `test.txt` er vedhæftet og indeholder
`Hej fra STARK Udlejning.` **Tjek samtidig, at der ikke er oprettet en fil i SharePoint** —
gør flowet det, er `Create file` ikke fjernet.

### Test 3 — afvist uden hemmelighed

Beviser: valideringen i §2.7 virker. **Denne test skal fejle.**

```bash
curl -sS -X POST "$SENDMAIL_URL" \
  -H 'Content-Type: application/json' \
  -d '{
    "til": ["'"$TESTMAIL"'"],
    "emne": "SendMail test 3 — bør AFVISES",
    "htmlBody": "<p>Denne mail må aldrig ankomme.</p>"
  }' -w '\nHTTP %{http_code}\n'
```

**Forventet:** `HTTP 401`. **Ingen mail ankommer.** Gør den det, er flowet åbent for enhver,
der kender URL'en, og må ikke tages i brug.

### Efter testene

Kontrollér `mail_log` i Supabase: tre rækker, hvoraf test 1 og 2 står som `sendt` og test 3
aldrig blev logget (den nåede ikke gennem `lib/sendMail.js`). Modtagere skal stå som
`modtager_hash`, **aldrig i klartekst** (`CLAUDE.md` §3).

---

## 4. Tjekliste før flowet tages i brug

- [ ] `Sendtilbud` er uændret og kører stadig
- [ ] `SendMail` har **nul** `Create item`-handlinger
- [ ] `SendMail` kender **ingen** SharePoint-liste
- [ ] Eneste `If` i flowet er hemmelighedsvalideringen
- [ ] Ingen BCC
- [ ] `From` er `udlejning@stark.dk`
- [ ] Trigger-schemaet matcher `sendMail()`-signaturen i `lib/sendMail.js`
- [ ] Alle tre tests giver det forventede resultat, inkl. 401 i test 3
- [ ] `PA_SENDMAIL_URL` og `PA_SHARED_SECRET` er sat i Netlify
- [ ] URL'en optræder ingen steder i repoet

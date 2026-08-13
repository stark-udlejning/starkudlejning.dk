# Datagrundlag

Kortlægningen (`docs/kortlaegning.md`) byggede på frontend-kode og på hvad der kunne udledes
baglæns af defensive `||`-kæder. Dette dokument bygger på de faktiske skemaer for 31
SharePoint-lister (`docs/sharepoint/sp-skemaer.json`) og de faktiske definitioner for 33
Power Automate-flows (`flows/`).

**Ingen kode skrevet. Intet rørt i `flows/`. Ingen filer oprettet uden for `docs/`.**

Klassificeringen følger `CLAUDE.md` §3, med §3.0 som styrende: **Supabase er standardvalget.
SharePoint kræver en begrundelse i form af et konkret kategori C-felt.**

Rettelser til `docs/kortlaegning.md` og `CLAUDE.md` er samlet i §8. **Ingen af de to filer er
ændret** — de venter på godkendelse.

---

## 0. Sammenfatning

### Det, der ændrer noget nu

| # | Fund | Hvor |
|---|---|---|
| 1 | **`Sendtilbud`s mailkald er allerede en ren `sendMail`-adapter.** `SendMail` klones frem, bygges ikke | §4.2, `pa-flows-sendmail.md` |
| 2 | **`Medarbejdere` bruges som brugerkatalog. `Platformsbrugere` oprettes ikke** — den ville drive fra en liste, der allerede synkroniseres dagligt fra Graph | §3.3 |
| 3 | **`priser.json` i repoet er autoritativ.** `Priser_Materiel` slettes og genopbygges dagligt fra den. Hele priskomplekset kan flyttes til Supabase | §6 |
| 4 | **Beregningskæden findes et syvende sted — i et dagligt PA-flow.** Tallene er verificeret korrekte i drift; problemet er, at kæden overhovedet kan skrives uden for review | §6.3 |
| 5 | **`Tilbud` gemmer seks felter, kortlægningen troede gik tabt** — `Cc`, `Tlf`, `Kontakt`, `Fritekst`, `Vilkaar`, `YdelserJSON` | §1.3 |
| 6 | **Tre leverandørlister mangler en rute.** Foreslået: `/vaerktoejer/leverandoerer` | §5.2 |
| 7 | **`SyncMedarbejderefraGraph` er en reel tredje flow-kandidat** — Graph-adgang uden afløser i kode | §4.4 |

### Forbehold, der gælder hele §4

| # | Fund | Hvor |
|---|---|---|
| 8 | ⚠️ **Eksporterne i `flows/` kan ikke dateres, og mindst én er beviseligt forældet.** Alt i §4 er hypotese, ikke kortlægning. §1, §2, §3, §5 og §6 bygger på skemaerne og står fast | **§4.4b** |

### Afklaret siden — ingen handling

| # | Fund | Hvor |
|---|---|---|
| 9 | **Hele akademikomplekset er dødt** — ni lister + 19 `Score_*`-kolonner. Ingen fremdrift at migrere. `Udlejning-MiniTests`' 21 spørgsmål kan bruges redaktionelt | §2 |
| 10 | **Det gamle OTP-flow rettes ikke** — systemet afløses, og `CLAUDE.md` §7 gælder for den nye platform. Fundene i §4.3 er historik. Ét af dem har uafhængig dækning: `Medarbejdere` har ingen kolonne, der kan rumme et forsøgsantal | §4.3 |

**Tal:** 31 lister · 350 felter · 7.405 rækker i alt · 8 tomme lister · 33 flow-definitioner.

---

## 1. Feltklassificering — alle 31 lister

### 1.0 Læsevejledning

- **`InternalName` er sandheden.** `Title` er kun visning. Hvert sted de afviger er markeret.
- **`KODET`** = det interne navn indeholder `_x00e6_` (æ), `_x00f8_` (ø), `_x00e5_` (å),
  `_x00c6_` (Æ), `_x00d8_` (Ø), `_x0020_` (mellemrum), `_x002e_` (punktum), `_x0025_` (%).
  Skriver man det viste navn i en query, rammer man ingenting.
- **`Choice` / `MultiChoice`** er markeret. De returneres som `{Value: '…'}` fra PA og kræver
  udpakning. Kortlægningen §2.7 fandt allerede den fejlkilde i `samhandel.js`.
- **`field_N`** = listen er importeret fra et regneark. Det interne navn bærer ingen betydning
  overhovedet. 9 lister er ramt.
- Tvivl → **C** + `TVIVL`.

### 1.1 Oversigt med rækketal

| Liste | Rækker | Felter | Dominerende kategori | Skæbne |
|---|---:|---:|---|---|
| `Medarbejdere` | 3.618 | 6 | C | **Bliver** → `Platformsbrugere` (§3) |
| **`Akademi_Master`** | 1.599 | 16 | — | **DØD** (§2) |
| `Masterark_Priser` | 436 | 15 | A | **Nedlægges** (§6) |
| `FormularAfvigelser` | 389 | 6 | C | Bliver |
| `Priser_Materiel` | 368 | 9 | A | **Nedlægges** (§6) |
| `Priser_Transport` | 250 | 7 | A | Supabase |
| `FormularKlager` | 132 | 8 | C | Bliver |
| `Samhandelsaftaler_Rabatter` | 103 | 33 | Blandet | Splittes (§1.3) |
| `Kundeportaler` | 99 | 11 | C | Bliver |
| `Medarbejdere_Udlejning` | 88 | 31 | Blandet | Splittes (§3). 19 `Score_*` er **DØD** |
| `Leverandoer_indlejning…` | 58 | 8 | C `TVIVL` | Bliver |
| `FormularMaskiner` | 55 | 7 | C | Bliver |
| `Leverandoer_tilbehoer…` | 34 | 7 | C `TVIVL` | Bliver |
| `Udlejning-Centre` | 31 | 6 | A | Supabase |
| `Tilbud` | 29 | 27 | Blandet | Splittes (§1.3) |
| `Opmålingsanmodninger` | 28 | 12 | C | Bliver |
| **`Udlejning-MiniTests`** | 21 | 12 | — | **DØD** (§2) |
| **`Udlejning-Kompetencer`** | 20 | 4 | — | **DØD** (§2) |
| `Besigtigelsesformular` | 15 | 10 | C | Bliver |
| `CyclingForCancer26` | 13 | 9 | C | Bliver |
| `Leverandoer_service…` | 11 | 8 | C `TVIVL` | Bliver |
| **`Udlejning-Læringspakker`** | 6 | 12 | — | **DØD** (§2) |
| `HUB Tidsregistrering` | 2 | 9 | B | Supabase pseudonymiseret |
| **`Initialer`** | **0** | 1 | — | **DØD** |
| **`Udlejning-KompetenceResultater`** | **0** | 16 | — | **DØD** (§2) |
| **`Udlejning-KompetenceScores`** | **0** | 15 | — | **DØD** (§2) |
| **`Udlejning-Kurser`** | **0** | 7 | — | **DØD** (§2) |
| **`Udlejning-KursusTilmeldinger`** | **0** | 9 | — | **DØD** (§2) |
| **`Udlejning-Medarbejdere`** | **0** | 9 | — | **DØD** |
| **`Udlejning-MiniTestBesvarelser`** | **0** | 10 | — | **DØD** (§2) |
| **`Varslede prisændringer`** | **0** | 10 | — | **DØD** (§6) |

**8 lister har 0 rækker.** Ingen af dem røres af noget flow. De er bygget og aldrig taget i
brug. Forbehold: 0 rækker beviser, at listen er tom *nu* — ikke at den aldrig har været brugt
og tømt igen. Der er intet i skemaer eller flows, der kan afgøre det.

### 1.2 Kategori C — lister der bliver i SharePoint

Disse har alle mindst ét felt, der identificerer en person. Begrundelsen står pr. liste.

#### `Medarbejdere` — 3.618 rækker · **den vigtigste liste i systemet**

| InternalName | Title | Type | Kat. | Note |
|---|---|---|---|---|
| `Title` | Titel | Text | **C** | **Indeholder mailadressen**, ikke et navn. OTP-flowet filtrerer på `Title eq '<mail>'` |
| `Mail` | Mail | Text | **C** | Samme værdi som `Title`. Dublet |
| `DisplayName` | DisplayName | Text | **C** | Fulde navn fra Graph |
| `AccountEnabled` | AccountEnabled | Boolean | B | Sættes `True` af *login-anmodningen* — se §4.3 |
| `OTP` | OTP | Text | **C** | **Engangskode i klartekst.** Se §4.3 |
| `OTPExpiry` | OTPExpiry | DateTime | A | Udløbstidspunkt |

Fyldes dagligt af `SyncMedarbejderefraGraph` fra Microsoft Graph. Det er hele STARK Group,
ikke kun Udlejning.

#### `Kundeportaler` — 99 rækker

| InternalName | Title | Type | Kat. | Note |
|---|---|---|---|---|
| `Title` | Titel | Text | **C** | TITLE≠INTERNAL. Kundens firmanavn |
| `KundeNr` | KundeNr | Text | **C** | Pseudonymiseres til `kunde_hash` i Supabase-kopien |
| `Kontakt` | Kontakt | Text | **C** | Kontaktperson |
| `Token` | Token | Text | **C** | Adgangsnøgle til kundens dokumenter — en hemmelighed, ikke et id |
| `SenderNavn` / `SenderMail` / `SenderTlf` | | Text | **C** | Sælgerens navn, mail, telefon |
| `IsKam` | IsKam | Boolean | **C** `TVIVL` | KAM-tilknytning på navn er eksplicit C i `CLAUDE.md` §3 |
| `NettoprisUrl` / `Bilag3Url` | | Text | **C** | Peger på et navngivet kundedokument |
| `Created0` | Created | DateTime | A | **TITLE≠INTERNAL** — `Created` er optaget af SharePoint selv |

#### `FormularAfvigelser` — 389 rækker

| InternalName | Title | Type | Kat. | Note |
|---|---|---|---|---|
| `Title` | Titel | Text | **C** | TITLE≠INTERNAL. Indsenderens identitet |
| `Afdeling` | Afdeling | Text | A | |
| `Afvigelsestyper` | Afvigelsestyper | Note | A `TVIVL` | Fritekst-serialiseret liste |
| `Uddybning` | Uddybning | **Note** | **C** | **Fritekst om hændelser og personer** |
| `Filer` | Filer | Note | **C** | Vedhæftninger |
| `Tidsstempel` | Tidsstempel | Text | A | Gemt som tekst, ikke DateTime |

#### `FormularKlager` — 132 rækker

`Title` (**C**, indsender) · `Dato` (Text, A) · `JSordrenummer` (A) · `Klagetyper` (Note, A
`TVIVL`) · `SagLoest` (A) · **`Kommentarer` (Note, C — fritekst om en klagesag)** ·
`Filer` (Note, **C**) · `Tidsstempel` (A).

#### `FormularMaskiner` — 55 rækker

`Title` (**C**) · `Produktgrupper` (Note, A) · `IntentType` (A) · `Maskiner` (Note, A) ·
`Filer` (Note, **C**) · `Tidsstempel` (A) ·
`H_x00e5_ndteret` **KODET** (Choice: Ja/Nej, A).

#### `Besigtigelsesformular` — 15 rækker · **ni af ti felter er KODET**

| InternalName | Title | Type | Kat. |
|---|---|---|---|
| `Title` | Udfylders email | Text | **C** |
| `Kunde_x0020_nr_x002e_` **KODET** | Kunde nr. | Number | **C** |
| `Kundenavn` | Kundenavn | Text | **C** |
| `Kontaktperson_x0020_hos_x0020_ku` **KODET, afkortet** | Kontaktperson hos kunde (navn) | Text | **C** |
| `Kontaktperson_x0020_hos_x0020_ku0` **KODET, afkortet + `0`** | Kontaktperson hos kunde (tlf) | Number | **C** |
| `Seneste_x0020_dato_x0020_for_x00` **KODET** | Seneste dato for besigtigelse | DateTime | A |
| `Kan_x0020_det_x0020_v_x00e6_re_x` **KODET** | Kan det være el maskinel? | **Choice** | A |
| `S_x00e6_rlige_x0020_forhold_x0020` **KODET** | Særlige forhold … | Text | **C** |
| `Hvad_x0020_skal_x0020_der_x0020_` **KODET** | Hvad skal der udføres? | Text | **C** `TVIVL` |
| `Adresse_x0020_for_x0020_opgaven` **KODET** | Adresse for opgaven | Text | **C** |

⚠️ **`Kontaktperson_x0020_hos_x0020_ku` og `…ku0` afviger kun ved et efterstillet `0`.**
SharePoint afkorter interne navne til 32 tegn og disambiguerer med et ciffer. Navn og telefon
på kundens kontaktperson kan altså ombyttes af en enkelt tastefejl. Telefonnummeret er
desuden `Number`, hvilket dropper foranstillede nuller og `+45`.

#### `Opmålingsanmodninger` — 28 rækker

`Title` (**C**) · `Udfylder_email` (**C**) · `Kundenummer` (**C**) · `Kundenavn` (**C**) ·
`Kontaktperson_navn` (**C**) · `Kontaktperson_telefon` (**C**) · `Adresse_for_opgaven`
(**C**) · `Hvad_skal_der_udfoeres` (Note, **C** `TVIVL`) · `Seneste_oenskede_dato` (Text, A) ·
`El_maskiner` (A) · `Saerlige_forhold` (Note, **C**) · `Mail_emne` (A).

Bemærk: samme formular som `Besigtigelsesformular`, men **uden** kodede tegn — felterne er
navngivet med `oe`/`ae` i stedet. To generationer af samme formular side om side.

#### `CyclingForCancer26` — 13 rækker · **eneste offentlige indgang**

`Title` (**C**, TITLE≠INTERNAL) · `Firma` (**C**) · `Email` (**C**) · `Telefon` (**C**) ·
`St_x00f8_rrelse` **KODET** (A) · `Timer` (A) · `Starttid` (A) · `Kommentar` (**C** `TVIVL`) ·
`TilmeldtDato` (A, gemt som Text).

Tilmeldinger fra eksterne er eksplicit kategori C (`CLAUDE.md` §3).

#### De tre leverandørlister — 58 + 34 + 11 rækker

Alle tre er regnearks-importer med `field_N`-navne. De indeholder **navngivne
kontaktpersoner hos leverandører** (`Kontakt Øst`, `Kontakt Vest`, `Kontakt person`) samt
telefon og mail.

Klassificeret **C `TVIVL`**: en navngiven kontaktperson hos en leverandør er en fysisk person,
og feltet er personhenførbart. Er kontakterne i praksis funktionspostkasser
(`salg@leverandoer.dk`), kan firmadata flyttes til A og kun kontaktpersonen blive.
**Det kan ikke afgøres fra skemaet alene — kræver et kig på rækkerne.**

⚠️ `Leverandoer_tilbehoer_reservedele.field_4` hedder `Telefon2`, er af typen **Number**, og
ligger ved siden af `field_2` = `Telefon` (Text). Et telefonnummer i et talfelt mister
foranstillede nuller.

### 1.3 Lister der splittes

#### `Tilbud` — 29 rækker · 27 felter

Kortlægningen §2.3 gættede kolonnenavnene baglæns. Her er de faktiske. **Seks felter, som
kortlægningen anførte som "gemmes ikke i dag", findes rent faktisk.**

| InternalName | Type | Kat. | Fremtid | Note |
|---|---|---|---|---|
| `Title`, `TilbudId` | Text | A | Supabase | |
| `Firma` | Text | **C** | SharePoint | |
| `Til` | Text | **C** | SharePoint | Kundens mail |
| `Fra` | Text | **C** | SharePoint | Frit redigerbar — jf. kortlægningen |
| **`Cc`** | Text | **C** | SharePoint | **Findes. Kortlægningen sagde "gemmes ikke"** |
| **`Tlf`** | Text | **C** | SharePoint | **Findes** |
| **`Kontakt`** | Text | **C** | SharePoint | **Findes** |
| `Kundenr` | Text | **C** | SharePoint + `kunde_hash` | |
| `Saelger` | Text | **C** | SharePoint | |
| `Sagsnr` | Text | **C** `TVIVL` | SharePoint | Kundens eget sagsnr. kan bære navne |
| `Periode`, `Lejeperiode`, `Risiko` | Text | A | Supabase | `Risiko` er **Text**, ikke Number |
| `Dato`, `Udlob`, `Opfolgning` | DateTime | A | Supabase | |
| `Status` | **Choice** | A | Supabase | **VALG: `sendt` \| `accepteret` \| `afslået`** |
| `Udtransport`, `Hjemtransport` | Number | A | Supabase | |
| `MaskinerJSON` | Note | A | Supabase → rigtige rækker | |
| **`YdelserJSON`** | Note | A | Supabase | **Findes. Kortlægningen sagde "gemmes ikke"** |
| **`Fritekst`** | **Note** | **C** | SharePoint | **Findes.** `CLAUDE.md` §3 nævner den eksplicit |
| **`Vilkaar`** | **Note** | **C** | SharePoint | **Findes** |
| `KundeNote` | **Note** | **C** | SharePoint | Kundens egen fritekst ved accept |
| `Arkiveret`, `Slettet` | Boolean | A | Supabase | |

**`Status` bekræfter kortlægningens fund:** værdisættet er `sendt`/`accepteret`/**`afslået`**,
mens frontend regner i `afvist`. Normaliseringen er nødvendig og skal ét sted hen.

#### `Samhandelsaftaler_Rabatter` — 103 rækker · 33 felter

Kortlægningen §3.1 kaldte disse kolonnenavne "de mest usikre i dokumentet". Her er de rigtige.
**Kortlægningen gættede flere forkert.**

| Kortlægningen gættede | Faktisk InternalName |
|---|---|
| `RabatJord` | `Rabat_JordOgAnlaeg` |
| `RabatLift` | `Rabat_Liftmateriel` |
| `RabatTrailer` | `Rabat_Trailerlifte` |
| `RabatContainer` | `Rabat_ContainereOgLetvogne` |
| `RabatBygning` | `Rabat_Bygningsmateriel` |
| `RabatSpecial` | `Rabat_Specialmaskiner` |
| `Omsaetning` | `Forventet_Omsaetning` |
| `OmsaetningStark` | `Forventet_Omsaetning_Stark` |
| `AfsenderNavn` | `Saelger_Navn` |
| `OvrigeSaelgereNavn` | `Ovrige_saelgere_navn` |
| `KundeCvr` | `KundeCVR` (versalt CVR) |

Klassificering:

| Felt | Type | Kat. | Fremtid |
|---|---|---|---|
| `Rabat_*` (6 stk.) | **Text** | A | Supabase. Rabatprocenter gemt som tekst |
| `Risikotillaeg`, `Transport`, `ErKAM`, `AntalKAMMaskiner` | Text | A / **C** for `ErKAM` `TVIVL` | |
| `Forventet_Omsaetning`, `Forventet_Omsaetning_Stark`, `RealiseretOmsaetning` | Number | **B** | Supabase mod `kunde_hash` (`CLAUDE.md` §4) |
| `RealiseretOpdateret`, `GyldigFra`, `Dato` | DateTime/Text | A | Supabase |
| `Status` | **Choice** | A | **VALG: `Kladde` \| `Til gennemgang` \| `Sendt`** |
| `KundeNr`, `KundeMail`, `KundeKontakt`, `KundeCVR` | Text | **C** | SharePoint |
| `Saelger_Navn`, `AfsenderMail`, `AfsenderTelefon` | Text | **C** | SharePoint |
| `Ovrige_saelgere_navn`, `Ovrige_saelgere_mail` | Text | **C** | SharePoint |
| `VegneNavn`, `VegneMail` | Text | **C** | SharePoint |
| `BeskedTilKunde` | **Note** | **C** | SharePoint — fritekst til kunden |
| `NethireNote` | **Note** | **C** | SharePoint — fritekst |
| `KAMMaskiner`, `BilagValgt` | Note | A | Supabase → rigtige rækker |

⚠️ **Der findes ingen `Rabat_Lastvognslifte`-kolonne.** Kortlægningen §4.3 fandt, at
`index.html` sender `lastvogn` i payloaden. Skemaet bekræfter, at værdien ikke har noget sted
at lande. Fundet står.

#### `Medarbejdere_Udlejning` — 88 rækker · 31 felter · **splittes i tre**

Se §2 og §3. Kort: 11 stamdata-felter (`field_N`, regnearks-import), 19 `Score_*`-felter
(akademiets fremdrift), 1 tidsstempel.

### 1.4 Kategori A — lister der flyttes uændret til Supabase

| Liste | Felter | Note |
|---|---|---|
| `Udlejning-Centre` (31) | `Title`, `field_1`–`field_5` = Region (**Choice, tom værdiliste**), Telefon, Mail, Adresse, PostnummerOgBy | Afdelingsliste. Svarer til `data/afdelinger.json` (28 rækker) — **tre rækker mere her**. Mails er funktionspostkasser → A |
| `Priser_Transport` (250) | `field_1` Kundetype, `field_2` KmFra, `field_3` KmTil, `field_4` VægtFraKg, `field_5` VægtTilKg, `field_6` Pris | Alle Number. Ren A |

⚠️ `Udlejning-Centre.field_1` er en **`Choice` med tom værdiliste** i skemaet. Enten er
valgene fjernet, eller også er feltet konverteret fra tekst. Værdierne kan ikke læses herfra.

### 1.5 Kategori B

| Liste | Felter | Note |
|---|---|---|
| `HUB Tidsregistrering` (2) | `Dato`, `Timer` (Number), `UdfoertAf`, `Udfoerende`, `Modtagende`, `Opgavetype`, `Lejeaftale`, `Kommentar` (Note) | `UdfoertAf`/`Udfoerende`/`Modtagende` identificerer medarbejdere → **pseudonymiseres til `email_hash`**. `Kommentar` er fritekst → **C `TVIVL`** |

To rækker. Værktøjet er reelt ikke i brug endnu.

---

## 2. Akademiet — dødt kompleks

> **Afklaret af Jesper 2026-08-12.** Akademiet er siden bygget om. De ni akademilister og
> de 19 `Score_*`-kolonner på `Medarbejdere_Udlejning` er **forældede og opdateres ikke
> længere**. Jf. `CLAUDE.md` §3.00.
>
> **Der er ingen fremdrift at migrere.** Akademiet på den nye platform bygges fra bunden
> med Supabase som datalager — ingen engangsimport, ingen bagudkompatibilitet.
>
> Den oprindelige udgave af dette afsnit fyldte 210 linjer med relationsdiagrammer, en
> arkitekturvurdering og en migreringsplan. Alt sammen hvilede på, at komplekset var
> levende. Det er skåret væk. Tilbage står kun det, et opslagsværk har brug for.

### 2.1 Status

| Liste | Rækker | Status |
|---|---:|---|
| `Akademi_Master` | 1.599 | **DØD** |
| `Udlejning-Kurser` | 0 | **DØD** |
| `Udlejning-Læringspakker` | 6 | **DØD** |
| `Udlejning-Kompetencer` | 20 | **DØD** |
| `Udlejning-KompetenceScores` | 0 | **DØD** |
| `Udlejning-KompetenceResultater` | 0 | **DØD** |
| `Udlejning-KursusTilmeldinger` | 0 | **DØD** |
| `Udlejning-MiniTests` | 21 | **DØD** — men se §2.3 |
| `Udlejning-MiniTestBesvarelser` | 0 | **DØD** |
| `Medarbejdere_Udlejning.Score_*` (19 kolonner) | 88 rækker | **DØD.** Kolonnerne nedlægges; resten af listen lever, se §3 |

Alle ti nedlægges uden erstatning. Ingen af dem røres af noget flow.

### 2.2 Lukkede spørgsmål

| Spørgsmål | Svar |
|---|---|
| Hvad skriver `Score_*`? | **Ingenting — ikke længere.** Spørgsmålet er lukket |
| Er fremdrift autoritativ i SharePoint eller localStorage? | Bortfaldet. Ingen af delene bruges |
| Hvad kræver migreringen af eksisterende resultater? | **Intet.** Der er ingenting at migrere |
| Kan de ni lister nedlægges? | Ja, alle ti poster ovenfor |

### 2.3 Det eneste, der er værd at tage med videre

**`Udlejning-MiniTests` indeholder 21 færdigskrevne spørgsmål** med fire svarmuligheder og
facit (`Sp_x00f8_rgsm_x00e5_l`, `SvarA`–`SvarD`, `Korrektsvar`, `Kritisk`,
`Sp_x00f8_rgsm_x00e5_lsnr`).

De er **ikke en migrationskilde** — listen er død, og det nye akademi bygges fra bunden.
Men spørgsmålene er skrevet af nogen med fagkendskab, og de kan spare arbejde som
**redaktionelt udgangspunkt**, når indholdet til det nye akademi skal skrives. Notér dem som
reference, ikke som data.

### 2.4 Én rettelse, der stadig gælder

Kortlægningen §6.1 konkluderede, at akademiet **ingen quizspørgsmål** havde. Det var forkert
— de 21 findes. Rettelsen står ved magt, selvom listen er død, fordi den samme fejlslutning
ellers kan gentage sig: konklusionen byggede på, at akademi-sitets frontend ikke havde nogen
quiz, hvilket ikke er det samme som at der ikke fandtes spørgsmål.

**`Akademi_Master` er desuden ikke en akademiliste** trods navnet. De 16 felter er et katalog
over maskinmanualer og datablade (`Producent`, `Model`, `ManualURL`, `DatabladURL`,
`DownloadStatus`). Uden betydning nu, hvor den er død — men værd at vide, hvis nogen falder
over navnet og tror, der ligger kursusindhold.


## 3. De tre medarbejderlister

| | `Medarbejdere` | `Medarbejdere_Udlejning` | `Udlejning-Medarbejdere` |
|---|---|---|---|
| **Rækker** | **3.618** | 88 | **0** |
| **Omfang** | Hele STARK Group | Kun Udlejning | — |
| **Kilde** | `SyncMedarbejderefraGraph`, dagligt | Regnearks-import (`field_N`) | Manuelt oprettet, aldrig fyldt |
| **Identitet** | `Title` = mail, `Mail`, `DisplayName` | `Title` = ukendt format | `Title` + `Mail` |
| **Stamdata** | Nej | Rolle, Afdeling, Lokation, Region, Telefon, Email, Fælles_mail, Fælles_telefon, Ledelsesniveau, Aktiv | Mail, Telefon, Center (Lookup), Region (**Choice**), Rolle (**Choice**), Startdato, Aktiv, Kommentar |
| **Andet** | `OTP`, `OTPExpiry`, `AccountEnabled` | **19 `Score_*`** + `Senestopdateret` | — |
| **Læses af flow** | `OTPLogin-Intern`, `OTPVerify-Intern`, `SyncMedarbejderefraGraph` | **Ingen** | **Ingen** |
| **Læses af kode** | Indirekte via `/api/otp-*` | **Ingen** | **Ingen** |
| **Måls af lookup fra** | Ingen | `MiniTestBesvarelser` | `KompetenceScores`, `KursusTilmeldinger` |

### 3.1 Overlap

`Mail`/`Email` findes i alle tre. `Telefon`, `Rolle`, `Region`, `Aktiv` findes i både
`Medarbejdere_Udlejning` og `Udlejning-Medarbejdere` — **de to er samme idé, bygget to gange.**
`Udlejning-Medarbejdere` er den pænere model (Choice-felter, Lookup til `Udlejning-Centre`,
`Startdato`), men er aldrig blevet fyldt.

### 3.2 Autoritativ?

- **`Medarbejdere` er autoritativ for identitet.** Den er den eneste, der synkroniseres,
  den eneste noget flow læser, og den eneste med aktuelle data.
- **`Medarbejdere_Udlejning` er autoritativ for stamdata og fremdrift.** 88 rækker, ingen
  automatik — vedligeholdes formentlig manuelt.
- **`Udlejning-Medarbejdere` er en efterladenskab.** 0 rækker, ingen læsere, og den blokerer
  to lookups. **Nedlægges.**

### 3.3 Kan en af dem bruges som `Platformsbrugere`?

**Ja. `Medarbejdere` kan bruges direkte, og bør bruges.**

`CLAUDE.md` §9.3 kræver en autoritativ liste med mail + navn, som joines på `hashEmail(Email)`
for at vise navne i `/admin/brugere`. `Medarbejdere` har præcis det:

| §9.3 kræver | `Medarbejdere` leverer |
|---|---|
| Mailadresse | `Mail` (og `Title`) |
| Visningsnavn | `DisplayName` |
| Vedligeholdt | Dagligt fra Graph — **bedre end en manuelt plejet liste** |
| Kategori C, i SharePoint | Ja |

> ### Anbefaling
>
> **Opret ikke `Platformsbrugere`. Brug `Medarbejdere`.**
>
> Den er allerede autoritativ, allerede synkroniseret og allerede den liste, login bygger på.
> En ny liste ville skulle holdes i sync med den — og ville med sikkerhed drive fra hinanden.
>
> To forbehold:
>
> 1. **`SyncMedarbejderefraGraph` sletter rækker.** Flowet henter alle mails fra Graph,
>    opretter manglende og kører derefter en sletteløkke. Tilføjes egne kolonner til listen,
>    skal det verificeres, at de overlever synkroniseringen. Vi skal alligevel kun **læse**
>    fra den — rollen bor i Supabase (§9.3) — så risikoen er lav.
> 2. **3.618 rækker er hele STARK Group.** Som brugerkatalog er det korrekt; som "hvem er
>    kollega i Udlejning" er det for bredt. Skal `/admin/brugere` kunne skelne, er
>    `Medarbejdere_Udlejning.field_2` (Afdeling) den eneste kilde — men den dækker kun 88.

---

## 4. Flows

### 4.1 Oversigt over alle 33

`If/Sw` = antal `If`- og `Switch`-handlinger. `Expr` = omtrentligt antal
`@expression(...)`-forekomster. Begge er mål for, hvor meget logik der ligger i flowet i
stedet for i repoet.

| Flow | Trigger | Hvad den gør | Lister | If/Sw | Expr | Anbefaling |
|---|---|---|---|---:|---:|---|
| `Sendtilbud` | HTTP | Mailer tilbud + `Create item` | `Tilbud` | 1 | 15 | **ADAPTER** → basis for `SendMail`, se §4.2 |
| `STARKUdlejning—FormularEmailGateway` | HTTP | Mail + vedhæftninger til SP + `Create item` i 3 lister | `FormularAfvigelser`, `FormularKlager`, `FormularMaskiner` | 1 | 31 | **ADAPTER** → bidrager vedhæftningsmønstret |
| `STARKUdlejning—Prisaftale` | HTTP | **Systemets tungeste.** Aftale + nettoprisark + mail + Nethire | `Kundeportaler`, `Samhandelsaftaler_Rabatter` | **5** | **152** | **NEDLÆG** |
| `Gemsamhandelsaftale+rabatter` | **Mail i delt postkasse**, hvert minut | Læser mail, Excel, opdaterer aftaler | `Samhandelsaftaler_Rabatter` | 2 | 47 | **NEDLÆG** — men se §4.5 |
| `Acceptertilbud` | HTTP | Sætter `Status`, sender mail | `Tilbud` | 3 | 17 | **NEDLÆG** |
| `Arkivertilbud` | HTTP | Sætter `Arkiveret` | `Tilbud` | 1 | 5 | **NEDLÆG** |
| `Slettilbud` | HTTP | Sætter `Slettet` | `Tilbud` | 1 | 5 | **NEDLÆG** |
| `AutomatiskArkiveringTilbud` | **Recurrence, dagligt** | Arkiverer gamle tilbud | `Tilbud` | 0 | 6 | **NEDLÆG** → Netlify scheduled function |
| `tilbud-data` | HTTP | `Get items` ufiltreret + `Select` | `Tilbud` | 0 | 29 | **NEDLÆG** |
| `tilbud-status` | HTTP | `Get items` filtreret på `Fra` | `Tilbud` | 0 | 5 | **DØD** — bekræftet, jf. kortlægningen §3.3 |
| `samhandel-data` | HTTP | `Get items` + `Select` | `Samhandelsaftaler_Rabatter` | 0 | 36 | **NEDLÆG** |
| `Samhandelprkundenr` | HTTP | `Get items` pr. kundenr | `Samhandelsaftaler_Rabatter` | 0 | 17 | **NEDLÆG** |
| `Realiseretomsætning` | HTTP | Opdaterer omsætningstal | `Samhandelsaftaler_Rabatter` | 0 | 7 | **NEDLÆG** |
| `PowerBI_Data` | **Fil oprettet/ændret**, hvert minut | Læser Excel → opdaterer aftaler | `Samhandelsaftaler_Rabatter` | 0 | 3 | **NEDLÆG** — se §4.5 |
| `Kundeportalerliste` | HTTP | `Get items` + `Select` | `Kundeportaler` | 0 | 14 | **NEDLÆG** |
| `Kundeportaleropslag` | HTTP | Opslag på token | `Kundeportaler` | 0 | 2 | **NEDLÆG** |
| `STARK-Udlejning-SkiftejerKundeportaler` | HTTP | Skifter sælger på portal | `Kundeportaler` | 1 | 5 | **NEDLÆG** |
| `OTPLogin-Intern` | HTTP | Genererer OTP, gemmer i klartekst, mailer | `Medarbejdere` | 1 | 10 | **NEDLÆG** — se §4.3 |
| `OTPVerify-Intern` | HTTP | Sammenligner OTP i klartekst | `Medarbejdere` | 1 | 4 | **NEDLÆG** — se §4.3 |
| `SyncMedarbejderefraGraph` | **Recurrence, dagligt** | Graph → `Medarbejdere`, m. sletteløkke | `Medarbejdere` | 1 | 19 | **ADAPTER** — se §4.4 |
| `Recurrence-HTTP,ParseJSON,…` | **Recurrence, dagligt** | Sletter og genopbygger prisliste | `Priser_Materiel` | 0 | 15 | **NEDLÆG** — se §6 |
| `Opdaternettopriser_templatepriser` | HTTP | Bygger nettoprisark-HTML | — | 0 | 6 | **NEDLÆG** |
| `HUBTidsregistrering` | HTTP | `Create item` | `HUB Tidsregistrering` | 0 | 1 | **NEDLÆG** |
| `BesigtigelseOpmålingsanmodning` | HTTP | `Create item` + mail | `Opmålingsanmodninger` | 1 | 9 | **NEDLÆG** |
| `Bestillingafstickers` | HTTP | Mail + SP-skrivning | — | 0 | 14 | **NEDLÆG** |
| `Bestillingafmerchandise` | HTTP | Mail + SP-skrivning | — | 0 | 14 | **NEDLÆG** |
| `CyclingForCancer26` | HTTP | Tilmelding + mail | `CyclingForCancer26` | 0 | 3 | **NEDLÆG** |
| `CyclingForCancer_GetBookings` | HTTP | `Get items` | `CyclingForCancer26` | 0 | 2 | **NEDLÆG** |
| `STARK-Udlejning-Hentnyhedsbillede` | HTTP | Streamer billede fra SP | — | 0 | 3 | **ADAPTER** `TVIVL` — se §4.5 |
| `STARK-Udlejning-Uploadnyhedsbillede` | HTTP | Uploader billede til SP | — | 0 | 3 | **ADAPTER** `TVIVL` |
| `Nethiretest` | **Button** | Manuel SOAP-test mod Nethire | — | 0 | 7 | **DØD** |
| `Button-SendanHTTPrequest` | **Button** | Manuel test | — | 0 | 1 | **DØD** |
| `flows/test` | — | Pladsholderfil på 1 byte | — | — | — | **DØD** |

**Fordeling:** 24 NEDLÆG · 5 ADAPTER (heraf 2 `TVIVL`) · 4 DØD.

### 4.2 SendMail findes allerede — byg den ikke

Prompt 02's vigtigste spørgsmål. **Svar: `Sendtilbud` er allerede en `sendMail`-adapter.**

Dens `SendEmailV2`-kald er rent gennemløb — flowet renderer intet selv:

| Parameter | Værdi i flowet | Svarer til |
|---|---|---|
| `emailMessage/To` | `@triggerBody()?['to']` | `til` |
| `emailMessage/Cc` | `@triggerBody()?['cc']` | `cc` |
| `emailMessage/Subject` | `@triggerBody()?['subject']` | `emne` |
| `emailMessage/Body` | `@triggerBody()?['html']` | **`htmlBody` — allerede færdigrenderet HTML** |
| `emailMessage/ReplyTo` | `@triggerBody()?['from']` | **`svarTil`** |
| `emailMessage/From` | `udlejning@stark.dk` | Fast afsender, **Send As virker** |

Det er `sendMail({ til, cc, emne, htmlBody, svarTil })` — fem af seks parametre, allerede i
drift, allerede med den rigtige afsenderadresse.

**Det eneste, der mangler, er vedhæftninger.** Mønstret findes i
`STARKUdlejning—FormularEmailGateway`, som håndterer `attachments` via `Create_file` +
`GetFileContentByPath`.

> ### Anbefaling
>
> **Byg `SendMail` ved at strippe `Sendtilbud`.** Konkret fjernes:
>
> | Fjern | Hvorfor |
> |---|---|
> | `Create item` i `Tilbud` (`OpenApiConnection`) | Skrivningen flyttes til SharePoint-adapteren |
> | Den ene `If` | Nul betingelser (`CLAUDE.md` §2) |
> | De 32 `object`- og 30 `string`-erklæringer i trigger-schemaet | Erstattes af det flade `{til, cc, emne, htmlBody, svarTil, vedhaeftninger}` |
> | `Response` med `itemId` | Adapteren returnerer ikke SP-id'er |
>
> **Tilføj** vedhæftningsblokken fra `FormularEmailGateway`, og **tilføj** `x-stark-secret`
> som header-validering (`lib/sendMail.js` sender den allerede).
>
> Alternativet — at strippe `FormularEmailGateway` — er dårligere: den har en **hardkodet
> BCC til `jesper.kongsvad@stark.dk`** på hver eneste afsendelse, og dens `From` er den samme.
> `Sendtilbud` har `ReplyTo`, hvilket `FormularEmailGateway` mangler.

⚠️ **Fund undervejs:** `STARKUdlejning—FormularEmailGateway` sender **BCC af hver indsendt
formular til en navngiven privatperson**. 576 indsendelser (389 + 132 + 55) er kopieret til én
postkasse. Det er ikke ulovligt, men det er en personhenførbar kopi uden for listen, og det
bør være et bevidst valg. **Spørgsmål til Jesper.**

### 4.3 OTP-flowene

> ### ⚠️ VERIFIKATIONSSTATUS — læs denne først
>
> Jeg er blevet bedt om at verificere disse fund **mod de kørende flows** i stedet for mod
> eksporten. **Det kan jeg ikke.** Der findes ingen Power Automate- eller
> Power Platform-adgang i denne session — jeg har søgt efter et værktøj og fundet intet.
> Mit eneste grundlag er de samme eksporter i `flows/`, som prisfundet i §6.3 netop har
> bevist kan være forældede.
>
> Jeg rapporterer derfor hvert punkt med **kilde og status**, ikke som bekræftet eller
> afkræftet. At kalde noget "bekræftet" på et grundlag, der lige er vist upålideligt, ville
> være præcis den fejl, `CLAUDE.md` §5.7 er skrevet imod.
>
> Ét punkt kan delvist afgøres uafhængigt, fordi `docs/sharepoint/sp-skemaer.json` er en
> **anden kilde** end flow-eksporterne — og en, der beviseligt er aktuel, fordi den bærer
> live `ItemCount`-tal. Se punkt 3.

#### Punkt for punkt

**1. Gemmes koden i klartekst?**

| | |
|---|---|
| **Eksporten siger** | Ja. `Compose = "@rand(100000, 999999)"` genererer koden; `item/OTP = "@outputs('Compose')"` skriver den råt. Der er ingen hash-funktion nogen steder i definitionen |
| **Uafhængig kilde** | Delvist. Skemaet viser `OTP` som `Text`, `MaxLength 255`. Det rummer både en 6-cifret kode og et 64-tegns hash — **skemaet kan derfor hverken bekræfte eller afkræfte** |
| **Status** | ⚠️ **IKKE VERIFICERET.** Kan kun afgøres ved at åbne `OTPLogin-Intern` i portalen og se, om `item/OTP` stadig skriver `outputs('Compose')` direkte |

**2. Ryddes koden ved brug?**

| | |
|---|---|
| **Eksporten siger** | Nej. `OTPVerify-Intern`s `Update_item` i ja-grenen sætter **kun** `item/AccountEnabled = True`. `OTP` og `OTPExpiry` røres ikke |
| **Uafhængig kilde** | Ingen. Kan ikke ses af skemaet |
| **Status** | ⚠️ **IKKE VERIFICERET** |

**3. Findes der en forsøgstæller eller rate limit?**

| | |
|---|---|
| **Eksporten siger** | Nej. Ingen tæller, ingen throttling i nogen af de to definitioner |
| **Uafhængig kilde** | **Ja — og den er stærk.** `Medarbejdere` har præcis seks felter: `Title`, `Mail`, `DisplayName`, `AccountEnabled`, `OTP`, `OTPExpiry`. **Der findes ingen kolonne, der kan rumme et forsøgsantal.** Skemaet er aktuelt (det bærer live `ItemCount` = 3.618) |
| **Status** | ✅ **BEKRÆFTET for en persistent tæller på `Medarbejdere`** — uanset hvad flowet gør, kan det ikke tælle forsøg i den liste. ⚠️ **IKKE VERIFICERET i øvrigt:** en tæller kunne ligge i en anden liste (ingen af de 31 ligner dog en kandidat) eller i en ekstern tjeneste |

**4. Hvornår sættes `AccountEnabled`?**

| | |
|---|---|
| **Eksporten siger** | To steder: i `OTPLogin-Intern` (**ved anmodningen**, før nogen har bevist noget) og igen i `OTPVerify-Intern` (ved verifikation). Desuden sætter `SyncMedarbejderefraGraph` det til `True` på alle nyoprettede rækker |
| **Uafhængig kilde** | Kun at feltet findes og er `Boolean` |
| **Status** | ⚠️ **IKKE VERIFICERET.** Bemærk, at Graph-synkroniseringen sætter feltet uafhængigt af login — så det er under alle omstændigheder ikke en spærre, der styres af OTP-flowet alene |

#### De øvrige §7-punkter, samme forbehold

| `CLAUDE.md` §7 kræver | Eksporten viser | Status |
|---|---|---|
| Ingen allowlist | `$filter=Title eq '<mail>'` + `equals(length(...), 1)` | ⚠️ Ikke verificeret |
| Identisk svar uanset udfald | `Response` 200 i ja-grenen, `Response_1` 401 i nej-grenen | ⚠️ Ikke verificeret |
| TTL 10 min | `Compose_1 = "@addMinutes(utcNow(), 10)"`, sammenlignet i `Condition` | ⚠️ Ikke verificeret — men stemmer med §7 |
| 6 cifre, `crypto.randomInt` | `"@rand(100000, 999999)"` — PA's `rand()` er ikke kryptografisk sikker | ⚠️ Ikke verificeret. **Nyt punkt**, ikke nævnt i den oprindelige udgave |

> ### Hvad det betyder for anbefalingen
>
> **Afgjort af Jesper 2026-08-12: det gamle OTP-flow rettes ikke. Systemet afløses.**
>
> `CLAUDE.md` §7 gælder for den **nye** platform. Den er ikke og har aldrig været en
> beskrivelse af, hvad de to gamle flows gør — Jesper har rettet §7, så det nu fremgår
> eksplicit.
>
> Begge flows nedlægges sammen med resten af `/samhandel`-laget, og OTP-logikken bygges
> i `lib/auth.js` efter §7 som skrevet. **Fundene ovenfor er dermed historik, ikke en
> opgave.** De står her, fordi de dokumenterer, hvad der ikke skal reproduceres — og
> fordi et af dem (forsøgstælleren) er den eneste OTP-observation med uafhængig dækning.

### 4.4 `SyncMedarbejderefraGraph` — det tredje flow

`CLAUDE.md` §3.0 sætter slutmålet til **to flows**. Dette flow er en reel tredje kandidat.

| | |
|---|---|
| **Hvad** | Henter alle brugere fra Microsoft Graph med paging, opretter manglende i `Medarbejdere`, sletter overskydende |
| **Trigger** | Recurrence, dagligt |
| **Kategori C-felt** | `Mail`, `DisplayName` — 3.618 personers navne og mailadresser |
| **Har det en afløser i kode?** | Nej. Graph-adgang kræver en Azure AD-app-registrering, vi ikke har |

Det rører kategori C og har ingen oplagt afløser. **Men det behøver ikke være et selvstændigt
flow.** Sletteløkken og paging-logikken er logik, der hører i repoet; selve Graph-kaldet er
adgang til tenanten.

> ### Anbefaling
>
> **Foldes ind i SharePoint-adapteren som en operation**, ikke som et selvstændigt flow.
> Adapteren får en `hentGraphBrugere`-operation uden logik; kaldet og sletteløkken styres af
> en Netlify scheduled function.
>
> Kan det ikke lade sig gøre, er dette det ene flow, der berettiget bliver et tredje.
> **Spørgsmål til Jesper.**

### 4.4b Hvor pålidelige er eksporterne i `flows/`?

Tilføjet 2026-08-12, efter at prisfundet i §6.3 viste sig at bygge på en forældet eksport.

**Kort svar: eksporterne kan ikke dateres, og mindst én er beviseligt forældet. Derfor kan
ingen af dem antages aktuelle.**

#### Hvad jeg har undersøgt

| Spor | Resultat |
|---|---|
| **Tidsstempler i filerne** | **Ingen.** De 33 eksporter indeholder kun `id`, `name` og `properties` med `apiId`, `connectionReferences`, `definition`, `displayName`, `flowFailureAlertSubscribed`, `isManaged`, `type`. En fuld PA-eksport bærer normalt `createdTime`, `lastModifiedTime` og `state` — **alle tre mangler i alle 33** |
| **Versionsnummer** | Ingen. `$schema` peger på `workflowdefinition.json#` i alle 33 — det er formatversionen, ikke flowets |
| **Git-historik** | Alle 33 er tilføjet i **én commit** (`357a2de`, "Add files via upload", 2026-08-12). Git viser hvornår filerne blev lagt i repoet, ikke hvornår hvert flow sidst blev rettet i portalen |
| **Kendt afvigelse** | Prisflowet: eksporten viser `field_7 = listepris × 0.035` og `field_8 = listepris × 1.1`; den kørende version er verificeret korrekt. **Mindst én eksport er altså forældet** |

Der er intet i eller omkring filerne, der kan skelne en eksport fra i går fra en fra sidste år.

#### Hvilke fund der er i risiko

**I risiko — bygger udelukkende på flow-eksporterne:**

| Fund | Afsnit |
|---|---|
| Alle fire OTP-punkter | §4.3 |
| At `Sendtilbud` allerede er en `sendMail`-adapter, og hvad der skal fjernes | §4.2 |
| At `FormularEmailGateway` BCC'er til en privatadresse | §4.2 |
| Klassificeringen NEDLÆG / ADAPTER / DØD for alle 33 | §4.1 |
| Tællingen af `If`/`Switch` og expressions | §4.1 |
| At `tilbud-status` er dødt | §4.1 |
| At prisflowet henter `priser-array.json` og genopbygger `Priser_Materiel` dagligt | §6.1 |
| At `SyncMedarbejderefraGraph` sletter rækker | §3, §4.4 |
| **At intet flow rører nogen akademiliste** | §2.2, §7 |

Det sidste fortjener en særlig bemærkning: det er en **negativ** påstand på tværs af alle 33
filer. Den er svagere end de øvrige, fordi den også falder, hvis der findes et flow i
tenanten, som slet ikke er eksporteret hertil. Antallet af flows i portalen er ukendt.

**Ikke i risiko — bygger på `sp-skemaer.json` eller på filer i repoet:**

| Fund | Hvorfor det holder |
|---|---|
| Alle feltnavne, typer, `Choice`-værdier, `Lookup`-mål, KODET-navne | Fra skemaeksporten |
| Alle rækketal og de 8 tomme lister | `antalElementer` er live-forespurgt data |
| De 19 `Score_*`-kolonner | Skemaet |
| At `Tilbud` har `Cc`, `Tlf`, `Kontakt`, `Fritekst`, `Vilkaar`, `YdelserJSON` | Skemaet |
| De 11 forkert gættede kolonnenavne på `Samhandelsaftaler_Rabatter` | Skemaet |
| At der ikke findes en `Rabat_Lastvognslifte`-kolonne | Skemaet |
| At `Medarbejdere` ikke har en forsøgstæller-kolonne | Skemaet |
| At `priser-array.json` er tre produkter bagud | Repofiler + `generate-array.py` |

**Skemaeksporten er en anden og bedre kilde end flow-eksporterne.** Den bærer live
`ItemCount`-tal, hvilket betyder, at den er trukket mod den kørende SharePoint. Der er intet
tilsvarende bevis for, at flow-eksporterne er trukket samtidig — eller overhovedet fra samme
tidspunkt indbyrdes.

#### Hvad der bør gøres

1. **Genudtræk `flows/` fra portalen**, og noter datoen i repoet. Uden en dato er enhver
   fremtidig analyse på samme usikre grund.
2. **Bevar `createdTime`, `lastModifiedTime` og `state`** i eksporten. De tre felter havde
   gjort denne undersøgelse overflødig.
3. **Notér antallet af flows i portalen**, så det kan sammenholdes med de 33. Er der flere,
   er alle negative påstande i dokumentet ufuldstændige.
4. Indtil da: **behandl §4 som en hypotese, ikke som en kortlægning.** §1, §2, §3, §5 og §6.1–6.2
   bygger på skemaerne og står fast.

### 4.5 Hvad flowene gør, som ikke har en oplagt afløser

| Ting | Flow | Problem |
|---|---|---|
| **Mail-modtagelse** | `Gemsamhandelsaftale+rabatter` | Trigges af mail i en delt postkasse, hvert minut. Netlify Functions kan ikke modtage mail. **Kræver enten et blivende flow eller en mailhook-tjeneste** |
| **Excel-læsning i tenanten** | `Gemsamhandelsaftale+rabatter`, `PowerBI_Data` | `shared_excelonlinebusiness` læser Excel-filer direkte i SharePoint. Client-side SheetJS dækker upload, men ikke filer, der lander i en mappe |
| **Fil-trigger** | `PowerBI_Data` | Trigges af "fil oprettet/ændret i mappe", hvert minut. Ingen afløser uden polling |
| **Planlagte kørsler** | `AutomatiskArkiveringTilbud`, `SyncMedarbejderefraGraph`, `Recurrence-HTTP…` | Netlify scheduled functions dækker dette. **Skal bygges, ikke flyttes** |
| **SP-dokumentbibliotek** | `Hent-`/`Uploadnyhedsbillede`, `FormularEmailGateway` | Læser og skriver filer i et bibliotek. Kan dækkes af SharePoint-adapteren, hvis den også kan filer — ellers to ekstra flows |
| **Nethire SOAP** | `Nethiretest` | Ingen PA-afhængighed. `nethire-lookup.js` taler allerede direkte SOAP. Flowet er en manuel testknap |

---

## 5. De 16 "ukendte" lister

| Liste | Rækker | Indhold | Skriver | Rute i `CLAUDE.md` §1? |
|---|---:|---|---|---|
| `Tilbud` | 29 | Tilbud | `Sendtilbud`, `Acceptertilbud`, `Arkivertilbud`, `Slettilbud` | ✅ `/samhandel` |
| `Samhandelsaftaler_Rabatter` | 103 | Samhandelsaftaler | `Prisaftale`, `Gemsamhandelsaftale`, `PowerBI_Data`, `Realiseretomsætning` | ✅ `/samhandel` |
| `Kundeportaler` | 99 | Kundens portaladgang | `Prisaftale`, `Skiftejer` | ✅ `/kunde/*` |
| `Masterark_Priser` | **436** | Prisregneark | **Intet flow** | ✅ `/admin/priser`. **Se §6.3** |
| `Priser_Materiel` | 368 | Prisspejl | `Recurrence-HTTP…` (dagligt) | ✅ `/admin/priser` |
| `Priser_Transport` | 250 | Transportsatser | **Intet flow** | ✅ `/admin/priser` |
| `Varslede prisændringer` | **0** | Varslede ændringer fra leverandører | **Intet flow** | ❌ **Mangler rute** |
| `Udlejning-Centre` | 31 | Afdelinger | **Intet flow** | ❌ Ingen egen rute — stamdata |
| `Besigtigelsesformular` | 15 | Besigtigelsesanmodning | `BesigtigelseOpmålingsanmodning` (skriver til den *anden* liste) | ⚠️ **Se nedenfor** |
| `Opmålingsanmodninger` | 28 | Opmålingsanmodning | `BesigtigelseOpmålingsanmodning` | ✅ `/vaerktoejer/opmaaling` |
| `Initialer` | **0** | Ét felt: `Title` | **Intet flow** | ❌ **Formål ukendt** |
| `HUB Tidsregistrering` | 2 | Tidsregistrering | `HUBTidsregistrering` | ✅ `/hub` |
| `CyclingForCancer26` | 13 | Tilmeldinger | `CyclingForCancer26`, `_GetBookings` | ✅ `/spinning` |
| `Leverandoer_indlejning…` | 58 | Leverandører af indlejet materiel | **Intet flow** | ❌ **Mangler rute** |
| `Leverandoer_service…` | 11 | Service/årseftersyn | **Intet flow** | ❌ **Mangler rute** |
| `Leverandoer_tilbehoer…` | 34 | Tilbehør/reservedele | **Intet flow** | ❌ **Mangler rute** |

### 5.1 To formularer til samme opgave

`Besigtigelsesformular` (15 rækker, kodede feltnavne) og `Opmålingsanmodninger` (28 rækker,
rene feltnavne) dækker samme opgave: kunde, kontaktperson, adresse, ønsket dato, hvad skal
udføres, særlige forhold, el-maskiner.

**Flowet `BesigtigelseOpmålingsanmodning` skriver kun til `Opmålingsanmodninger`.**
`Besigtigelsesformular` er den ældre generation — sandsynligvis en Microsoft Forms-formular,
som forklarer de kodede feltnavne. **Nedlægges efter eksport af de 15 rækker.**

### 5.2 Ruteforslag

**Forslag, ikke beslutninger.** Ruterne er ikke placeret i `CLAUDE.md` §1 — det er Jespers.

#### De tre leverandørlister → **`/vaerktoejer/leverandoerer`**

| Liste | Rækker | Indhold |
|---|---:|---|
| `Leverandoer_indlejning_af_maskiner_materiel` | 58 | Aftale, materiel, kontakt øst/vest, telefon, mail, hjemmeside |
| `Leverandoer_tilbehoer_reservedele` | 34 | Hvilke dele, kontaktperson, telefon, mail, prisliste |
| `Leverandoer_service_aarseftersyn` | 11 | Leverandørnavn, telefon øst/vest, kontaktperson, mail, link |

**Hvorfor `/vaerktoejer` og ikke `/admin`:** de tre er **opslagsværk til dagligt brug**, ikke
ledelsesdata. Den, der står på pladsen med en maskine, der skal have årseftersyn, skal kunne
slå leverandøren op — det er samme slags handling som at bestille mærkater eller lave en
rekvisition. Under `/admin` ville de være utilgængelige for netop dem, der har brug for dem.

**Hvorfor én rute og ikke tre:** de tre lister har næsten samme felter (navn, kontaktperson,
telefon, mail) og adskiller sig kun ved, hvad leverandøren kan levere. Én side med et filter
på kategori er både mindre at bygge og lettere at bruge end tre næsten ens sider.

**Adgang:** Intern. Alle tre er kategori C `TVIVL` (navngivne kontaktpersoner), så de læses
via adapteren og vises kun bag login.

⚠️ **Én ting bør afklares først:** er kontakterne fysiske personer eller funktionspostkasser?
Er de funktionspostkasser, falder listerne til kategori A og kan flyttes til Supabase. Det
kan ikke afgøres fra skemaet — se §9.2.

#### `Varslede prisændringer` → **ingen rute**

**Afgjort af Jesper 2026-08-12: listen får ingen rute.** Den er tom og nedlægges.
Konsekvensen for beregningskæden — at `stigning%` dermed ikke har nogen kilde — er beskrevet
i §6.4.

#### `Initialer` → **ingen rute**

**Afgjort af Jesper 2026-08-12: kræver ingen afklaring, får ingen rute.** 0 rækker, ét
tekstfelt, ingen læsere. Nedlægges.

---

## 6. Prisdata

### 6.1 Hvad der er autoritativt

**`data/priser.json` i `stark-prisaftale`-repoet.** Bevist, ikke antaget:

`Recurrence-HTTP,ParseJSON,Getitems,Applytoeach,Applytoeach` kører **dagligt** og gør:

1. `HTTP GET https://stark-udlejning.netlify.app/priser-array.json`
2. `Get_items` på `Priser_Materiel` (`$top=4000`) → **`Delete_item` i løkke — hele listen tømmes**
3. `Create_item` i løkke fra JSON'en

`Priser_Materiel` er altså et **dagligt genopbygget spejl**. Alt, hvad nogen skriver direkte i
listen, forsvinder inden for et døgn.

Kæden er:

```
admin.html  →  github-proxy.js  →  data/priser.json (Git)
                                        │
                                        ├─► generate-array.py → priser-array.json
                                        │        │
                                        │        └─► Netlify deploy
                                        │                │  (dagligt)
                                        │                ▼
                                        │        Priser_Materiel (368) ← spejl
                                        │
                                        └─► Opdaternettopriser_templatepriser
                                                 → nettopriser_template.html på SP
```

### 6.2 Hvor de 460 produkter kommer fra

Tallet 460 findes ikke som sådan. De faktiske tal:

| Kilde | Antal | Bemærkning |
|---|---:|---|
| `data/priser.json` → `products` | **371** | Autoritativ |
| `priser-array.json` | **368** | Genereret af `generate-array.py`. **Forældet — se nedenfor** |
| `Priser_Materiel` | **368** | Spejl af `priser-array.json`. Komplet ift. sin kilde |
| `Masterark_Priser` | **436** | Uafhængig — se §6.3 |

⚠️ **`priser-array.json` er tre produkter bagud i forhold til `priser.json`.**

`generate-array.py` er et rent 1:1-map uden filtrering — den skriver én række pr. produkt og
kan ikke tabe nogen. Med 371 produkter ind ville den skrive 371 ud. Den committede fil har
368. **Filen er altså ikke regenereret, siden de sidste tre produkter blev tilføjet.**

Det er ikke flowet, der er ufuldstændigt: `Priser_Materiel` (368) spejler `priser-array.json`
(368) korrekt. Fejlen ligger et led tidligere, i et manuelt trin.

Konsekvensen i dag er begrænset, fordi intet flow *læser* `Priser_Materiel`. Men mønstret er
værd at bemærke: `admin.html` skriver til `priser.json` via GitHub, mens `priser-array.json`
kun opdateres, hvis nogen husker at køre scriptet i hånden. **I den nye platform bortfalder
begge filer** — priser bliver rækker i Supabase, og det afledte array forsvinder.

### 6.3 Beregningskæden findes et syvende sted

> ### ⚠️ RETTET 2026-08-12
>
> **Den oprindelige udgave af dette afsnit påstod, at prisflowet regnede miljøbidrag og total
> forkert. Den påstand er trukket tilbage.**
>
> Jesper har verificeret det **kørende** flow: `field_7` og `field_8` beregnes korrekt i
> produktion. Fejlen lå ikke i flowet, men i mit grundlag — eksporten i
> `flows/Recurrence-HTTP,ParseJSON,Getitems,Applytoeach,Applytoeach/definition.json` er
> **forældet** og afspejler en tidligere version.
>
> Til protokols, fordi det er afgørende for §4.6: **min læsning af eksporten var korrekt.**
> Filen indeholder ordret
> `"@float(formatNumber(mul(items('Apply_to_each_1')?['listepris'], 0.035), '0.00'))"` for
> `field_7` og `… 1.1 …` for `field_8`. Fejlen var ikke en fejllæsning, men en antagelse om,
> at eksporten svarede til virkeligheden. Se §4.6.

Prisflowet **beregner selv** ved indsættelse i `Priser_Materiel`. Det er stadig rigtigt, og
det er stadig pointen:

| Felt | Hvad flowet beregner |
|---|---|
| `field_4` (Listepris_pr_dag) | `listepris` |
| `field_5` (Kundepris_pr_dag) | `listepris` — ingen rabat på spejlet |
| `field_6` (Risikotillæg) | `listepris × 6,5 %` |
| `field_7` (Miljøbidrag) | **Verificeret korrekt i den kørende version.** Formlen i eksporten er forældet |
| `field_8` (Kundepris_total) | **Verificeret korrekt i den kørende version.** Formlen i eksporten er forældet |

> **Kortlægningen §4.1 talte seks implementeringer af beregningskæden. Det rigtige tal er
> mindst syv, og den syvende ligger uden for repoet, i et flow der kører dagligt.**
>
> Det står ved magt, uanset om flowets tal er rigtige eller forkerte. Pointen er ikke, at
> implementeringen var forkert — den var faktisk rigtig — men at kæden **kan skrives et sted,
> ingen reviewer, og hvor ingen test fanger en afvigelse.** At den her er korrekt, er et
> resultat af omhu, ikke af konstruktionen. Det er netop det, `CLAUDE.md` §5.5 vil af med.

`Masterark_Priser` (436 rækker) har egne kolonner `Risikotillæg`, `Miljøbidrag` og `Total/dag`
— alle **Text**. Intet flow rører listen. Den er **en ottende kopi af de samme tal**, sandsynligvis
det oprindelige regneark, `priser.json` blev født ud af.

**Svar på kortlægningens åbne spørgsmål #8 (er `Masterark_Priser` stadig i brug?):**
Intet af de 33 flows nævner listen. `sp-patch.js` i det gamle repo peger på dens GUID
(`b803aafe…`), men den funktion returnerer 503, medmindre `PA_SP_PATCH_URL` er sat, og der
findes **intet flow med det formål**. **Listen er efterladt. Nedlægges** efter eksport.

### 6.4 `Varslede prisændringer` og `stigning_pct`

`CLAUDE.md` §5.5 har `Listepris = basispris × (1 + stigning%)`. `lib/pricing.js` implementerer
den som `beregnListepris(basispris, stigningPct)`.

`Varslede prisændringer` (0 rækker) har felterne:

| InternalName | Title | Type |
|---|---|---|
| `MasterID` | MasterID | Text |
| `Datofor_x00e6_ndring` **KODET** | Dato for ændring | DateTime |
| `Varekategori` | Varekategori | Text |
| `Leverand_x00f8_r` **KODET** | Leverandør | Text |
| `_x00c6_ndringstype` **KODET** | Ændringstype | Text |
| `Gns_x002e__x00e6_ndringi_x0025_` **KODET** | Gns. ændring i % | Text |
| `Nedreintervalgr_x00e6_nsei_x0025` **KODET** | Nedre intervalgrænse i % | Text |
| `_x00d8_vreintervalgr_x00e6_nsei_` **KODET** | Øvre intervalgrænse i % | Text |
| `Title` | **Intern information** | Text |
| `Eksterninformation` | Ekstern information | Text |

**Dette er kilden til `stigning_pct`** — leverandørvarslede prisstigninger pr. varekategori,
med gennemsnit og interval. `MasterID` kobler til `Masterark_Priser`.

**Men listen er tom, og `stigning_pct` bruges ingen steder.** `priser.json` har kun
`listepris`, ikke `basispris` + `stigning`. Kæden i §5.5 har altså et led, der aldrig har
været i brug: i praksis er `basispris = listepris` og `stigning = 0`.

Otte af ti feltnavne er kodede — `_x00c6_ndringstype` for `Ændringstype`, `Gns_x002e__x00e6_ndringi_x0025_`
for `Gns. ændring i %`. Værste eksempel i hele datagrundlaget.

> **Anbefaling:** listen genopbygges i Supabase med rene feltnavne som kategori A, og
> `stigning_pct` kobles til den. Der er ingen data at migrere.
> Alternativt: hvis prisvarsling ikke skal med, bør `stigning%` fjernes fra §5.5, så
> beregningskæden ikke bærer et led, ingen bruger. **Spørgsmål til Jesper.**

### 6.5 Kan hele priskomplekset flyttes til Supabase?

**Ja. Der er ingen identificerende felter i vejen.**

| Liste | Rækker | Kategori C-felt? | Dom |
|---|---:|---|---|
| `Priser_Materiel` | 368 | Nej | **Nedlægges.** Spejl af `priser.json` |
| `Priser_Transport` | 250 | Nej | **Supabase.** Ren A |
| `Masterark_Priser` | 436 | Nej | **Nedlægges.** Efterladt |
| `Varslede prisændringer` | 0 | Nej | **Supabase**, genopbygget |
| `Samhandelsaftaler_Rabatter` | 103 | **Ja** — `KundeMail`, `KundeKontakt`, `BeskedTilKunde` m.fl. | **Splittes.** Rabatsatser → A; omsætning → B mod `kunde_hash`; kundefelter bliver |

Rabatsatserne er de eneste priskoblede felter på en kategori C-liste, og de er tal uden
kundekobling i sig selv. De flyttes med `kunde_hash` som nøgle.

---

## 7. Revideret rækkefølge

`CLAUDE.md` §11 sætter `/akademi` først, med begrundelsen *"ingen kategori C, ingen PA, ingen
beregning"*. **Den begrundelse holder — og efter afklaringen af akademikomplekset holder den
bedre end da den blev skrevet.**

| §11's præmis | Datagrundlaget |
|---|---|
| Ingen kategori C | ✅ |
| Ingen PA | ✅ Intet af de 33 flow-eksporter rører nogen akademiliste (⚠️ negativ påstand, se §4.4b) |
| Ingen beregning | ✅ |
| Ingen SharePoint | ✅ **Nu entydigt.** De ni lister og `Score_*` er døde og migreres ikke |

`/akademi` har hverken data at migrere eller et gammelt system at holde i live. Den bygges fra
bunden, og den er dermed stadig det billigste sted at bevise hele mønstret — auth,
`email_hash`, Supabase, RLS, designsystem — uden at røre en kunde eller en kollega.

> ### Anbefaling: rækkefølgen i §11 fastholdes uændret
>
> | # | Trin | Bemærkning |
> |---|---|---|
> | 1 | Fundament + `/akademi` | Uændret. Bygges fra bunden; `Udlejning-MiniTests`' 21 spørgsmål kan bruges redaktionelt (§2.3) |
> | 2 | `/kunde/*` + dokumentadgang | Uændret. Lukker den største eksisterende eksponering |
> | 3 | `/rapportering/*` + `/admin`-ledelsesvisning | Uændret. `FormularEmailGateway` er allerede tæt på en adapter |
> | 4 | `/vaerktoejer/*` | + **`/vaerktoejer/leverandoerer`** (§5.2) |
> | 5 | `/hub` | **Kunne rykkes frem.** 2 rækker, 1 flow, 0 betingelser — den simpleste app i systemet |
> | 6 | `/samhandel` | Uændret. `Prisaftale`-flowet har 152 expressions og 5 betingelser |
>
> **De to ekstra trin, den tidligere udgave foreslog, er begge udgået:**
>
> - `0a` **eksport af `Score_*`** — udgår. Kolonnerne er døde; der er intet at redde.
> - `0b` **verifikation og rettelse af det gamle OTP-mønster** — udgår. Systemet afløses,
>   og `CLAUDE.md` §7 gælder for den nye platform, ikke som en beskrivelse af det gamle.
>   Fundene i §4.3 er dermed historik, ikke en opgave.


## 8. Rettelser — status

**Alle 17 rettelser er godkendt af Jesper og indarbejdet** i `docs/kortlaegning.md` og
`CLAUDE.md` (prompt 03 §2). Tabellen er nu et kvitteringsspor, ikke en anmodning.

### 8.1 `CLAUDE.md`

| # | Sted | Rettelse | Status |
|---|---|---|---|
| 1 | §7, "Ingen allowlist" | Det gamle flow havde en allowlist | ✅ **Rettet af Jesper.** §7 er omskrevet, så det gamle flow eksplicit *ikke* er referencen. Ikke rørt af mig |
| 2 | §7, "Mønstret er i drift og ændres ikke" | Formuleringen gjorde reglen uefterprøvelig | ✅ **Rettet af Jesper.** Se ovenfor |
| 3 | §9.3, `Platformsbrugere` | Listen findes ikke og oprettes ikke | ✅ **Indarbejdet.** §4 og §9.3 peger nu på `Medarbejdere` med faktiske `InternalName`-værdier |
| 4 | §5.5, beregningskæden | "seks implementeringer" var for lavt | ✅ **Indarbejdet** som mindst syv. ⚠️ **Formuleret anderledes end prompt 03 §2 bad om** — se note nedenfor |
| 5 | §5.5, `stigning%` | Leddet har aldrig været i brug | ✅ **Indarbejdet** |
| 6 | §3.0, "to flows i alt" | `SyncMedarbejderefraGraph` er en tredje kandidat | ✅ **Indarbejdet** |
| 7 | §11, rækkefølge | Byggede på, at akademiet havde data at migrere | ✅ **Bortfaldet.** Komplekset er dødt; rækkefølgen står uændret (§7) |

> ### ⚠️ Afvigelse fra prompt 03 §2 — regelændring, læs denne
>
> Prompt 03 §2 beder om, at `CLAUDE.md` §5.5 skal nævne *"den daglige flow-variant med
> miljøbidrag af listepris og total som `listepris × 1.1`"*.
>
> **Det er ikke skrevet ind**, fordi Jesper samtidig har oplyst, at prisflowet er
> **verificeret korrekt i drift** — de to formler stammer fra en forældet eksport (§6.3).
> At skrive dem ind i den bindende fil ville føre en tilbagetrukket påstand videre som fakta.
>
> §5.5 nævner i stedet, at kæden findes mindst syv steder, at den syvende ligger uden for
> repoet, og at den **regner rigtigt** — men uden for review og test. Pointen om duplikering
> står; den forkerte formel gør ikke.
>
> Jf. `CLAUDE.md`: *"Er noget i en prompt i konflikt med denne fil, så stop og spørg."*
> Her var konflikten mellem prompten og en senere oplysning fra produktejeren selv.

### 8.2 `docs/kortlaegning.md`

Alle ti er indarbejdet og markeret **RETTET** i teksten. Dokumentet har desuden fået en
advarsel øverst om, at `docs/datagrundlag.md` er autoritativ ved uenighed.

| # | Sted | Rettelse |
|---|---|---|
| 8 | §2.3 | Seks felter anført som "gemmes ikke i dag" findes alle som kolonner |
| 9 | §3.1 | Mindst 11 kolonnenavne på `Samhandelsaftaler_Rabatter` gættet forkert |
| 10 | §3.1 | Alle "Rækker: Ukendt" er nu udfyldt |
| 11 | §5, §6.2 | Akademiets fremdrift — nu bortfaldet, komplekset er dødt |
| 12 | §6.1 | "ingen quizspørgsmål" var forkert; de 21 findes |
| 13 | §6.3 | Datamodellen mangler spørgsmål og besvarelser |
| 14 | §3.1 | `Masterark_Priser` — afklaret: ingen flows rører den |
| 15 | §3.3 | `tilbud-status` dødt — bekræftet |
| 16 | §4.3 | `Rabat_Lastvognslifte` findes ikke — bekræftet |
| 17 | §8.2 spm. 7 | Bortfaldet: felterne persisteres allerede |

---


## 9. Dækning

### 9.1 Gennemgået

| Kilde | Hvad |
|---|---|
| `docs/sharepoint/sp-skemaer.json` | **Alle 31 lister, alle 350 felter.** Programmatisk udtræk af `InternalName`, `Title`, `TypeAsString`, `Required`, `Hidden`, `ReadOnlyField`, `MaxLength`, `Choice`-værdier og `Lookup`-mål fra `SchemaXml` |
| `flows/*/definition.json` | **32 af 33 parset.** Trigger, actions, `If`/`Switch`, expressions, connectors, liste-GUID'er. Detailgennemgang af 8: `Sendtilbud`, `FormularEmailGateway`, `OTPLogin-Intern`, `OTPVerify-Intern`, `SyncMedarbejderefraGraph`, `Recurrence-HTTP…`, `Opdaternettopriser`, `Prisaftale` |
| `stark-udlejning/akademi` | `index.html`, `data/academy-data.json` — krydset mod akademilisternes skemaer |
| `stark-udlejning/stark-prisaftale` | Gennemsøgt for `Score_`, `Medarbejdere_Udlejning`, prisreferencer |
| `docs/kortlaegning.md`, `CLAUDE.md` | Læst fuldt, krydset mod skemaer og flows |

### 9.2 Åbne spørgsmål — reduceret

Den oprindelige liste havde ti punkter. Fem er bortfaldet, fordi akademikomplekset er dødt
eller fordi Jesper har afgjort dem. **Fem står tilbage, formuleret som ja/nej-spørgsmål.**

| # | Spørgsmål | Hvorfor det betyder noget |
|---|---|---|
| **1** | **Er kontaktpersonerne i de tre `Leverandoer_*`-lister fysiske personer** (frem for funktionspostkasser som `salg@leverandoer.dk`)? | Ja → listerne bliver i SharePoint som kategori C. Nej → de flyttes til Supabase som kategori A. Afgør 103 rækker og `/vaerktoejer/leverandoerer` (§5.2) |
| **2** | **Indeholder `Medarbejdere_Udlejning.Title` en mailadresse** (frem for et navn)? | Ja → listens 88 rækker stamdata kan kobles direkte på `email_hash`. Nej → der skal joines mod `Medarbejdere.DisplayName` først, og navne er ikke unikke (§3) |
| **3** | **Er `flows/`-eksporterne trukket samtidig med `sp-skemaer.json`?** | Nej → hele §4 er hypotese, og eksporterne bør trækkes igen med dato. Prisflowet viser, at mindst én er forældet (§4.4b) |
| **4** | **Er der flere end 33 flows i Power Automate?** | Ja → alle negative påstande i §4 er ufuldstændige, herunder "intet flow rører X" (§4.4b) |
| **5** | **Skal `stigning%` blive i beregningskæden**, nu hvor `Varslede prisændringer` nedlægges uden erstatning? | Nej → leddet fjernes fra `CLAUDE.md` §5.5 og fra `lib/pricing.js`. Ja → der skal en ny kilde til prisvarsling (§6.4) |

**Bortfaldet siden sidst:**

| Spørgsmål | Hvorfor det er væk |
|---|---|
| Hvad skriver `Score_*`? | Akademiet er dødt — svaret er "ingenting, ikke længere" |
| Har de 8 tomme lister haft data? | Uden betydning; ingen af dem migreres |
| `Udlejning-Centre.field_1` (Region) med tom `Choice`-værdiliste | Kan aflæses af de 31 rækker, når listen migreres. Ikke en beslutning |
| `Initialer`s formål | Afgjort: ingen rute, nedlægges |
| Hvornår `priser-array.json` sidst blev regenereret | Uden betydning; begge filer bortfalder med `/admin/priser` |


### 9.3 Påstande, jeg ikke kan stå inde for

- **Kategorierne i §1 er mine forslag.** Særligt `TVIVL`-felterne — leverandørkontakter,
  `ErKAM`, `Sagsnr`, `Kommentar`-felter — kræver en beslutning, ikke en vurdering fra skemaet.
- **"Intet flow rører X"** gælder de 33 definitioner i `flows/`. Er der flows i tenanten, som
  ikke er eksporteret hertil, dækker udsagnet dem ikke.
- **Hele §4 hviler på eksporter, der ikke kan dateres, og hvoraf mindst én er forældet.**
  Prisfundet i §6.3 er trukket tilbage af netop den grund. Jeg har ikke kunnet efterprøve, om
  de øvrige flow-fund lider af samme fejl — se §4.4b for hvilke der er i risiko, og hvilke
  der hviler på skemaeksporten og derfor står fast.
- **Expression-tallene er omtrentlige.** De tæller `@funktion(`-forekomster i den serialiserede
  definition og er et groft mål for logikmængde, ikke et præcist antal.
- **Jeg har ikke kørt noget flow og ikke læst en eneste listerække.**

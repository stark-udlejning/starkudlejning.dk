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

## 0. De ti vigtigste fund

| # | Fund | Hvor |
|---|---|---|
| 1 | **Engangskoder gemmes i klartekst** i `Medarbejdere.OTP`, sammen med 3.618 mailadresser | §4.3 |
| 2 | **Koden invalideres aldrig ved brug.** Den kan genbruges indtil `OTPExpiry` | §4.3 |
| 3 | **Der er ingen forsøgstæller og ingen rate limit.** Ubegrænsede gæt på en 6-cifret kode | §4.3 |
| 4 | **Der ER en allowlist i dag** — `Medarbejdere`, 3.618 rækker. `CLAUDE.md` §7 siger der ingen er | §8 |
| 5 | **Akademiets fremdrift ligger i `Medarbejdere_Udlejning` som 19 flade `Score_*`-kolonner** — ikke i de ni akademilister | §2 |
| 6 | **Fire af de ni akademilister er tomme.** Hele mini-test- og kompetencemodellen er bygget, men aldrig taget i brug | §2 |
| 7 | **Intet flow rører nogen akademiliste.** Der findes ingen automatik omkring dem overhovedet | §2 |
| 8 | **Beregningskæden findes et syvende sted — inde i et PA-flow — og i en tredje, forkert variant** | §6 |
| 9 | **`priser.json` i repoet er autoritativ.** `Priser_Materiel` slettes og genopbygges dagligt fra den | §6 |
| 10 | **`Sendtilbud`s mailkald er allerede en ren `sendMail`-adapter.** Vi skal ikke bygge et nyt flow | §4.2 |

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
| `Akademi_Master` | 1.599 | 16 | A | Supabase |
| `Masterark_Priser` | 436 | 15 | A | **Nedlægges** (§6) |
| `FormularAfvigelser` | 389 | 6 | C | Bliver |
| `Priser_Materiel` | 368 | 9 | A | **Nedlægges** (§6) |
| `Priser_Transport` | 250 | 7 | A | Supabase |
| `FormularKlager` | 132 | 8 | C | Bliver |
| `Samhandelsaftaler_Rabatter` | 103 | 33 | Blandet | Splittes (§1.3) |
| `Kundeportaler` | 99 | 11 | C | Bliver |
| `Medarbejdere_Udlejning` | 88 | 31 | Blandet | Splittes (§2, §3) |
| `Leverandoer_indlejning…` | 58 | 8 | C `TVIVL` | Bliver |
| `FormularMaskiner` | 55 | 7 | C | Bliver |
| `Leverandoer_tilbehoer…` | 34 | 7 | C `TVIVL` | Bliver |
| `Udlejning-Centre` | 31 | 6 | A | Supabase |
| `Tilbud` | 29 | 27 | Blandet | Splittes (§1.3) |
| `Opmålingsanmodninger` | 28 | 12 | C | Bliver |
| `Udlejning-MiniTests` | 21 | 12 | A | Supabase |
| `Udlejning-Kompetencer` | 20 | 4 | A | Supabase |
| `Besigtigelsesformular` | 15 | 10 | C | Bliver |
| `CyclingForCancer26` | 13 | 9 | C | Bliver |
| `Leverandoer_service…` | 11 | 8 | C `TVIVL` | Bliver |
| `Udlejning-Læringspakker` | 6 | 12 | A | Supabase |
| `HUB Tidsregistrering` | 2 | 9 | B | Supabase pseudonymiseret |
| **`Initialer`** | **0** | 1 | — | **DØD** |
| **`Udlejning-KompetenceResultater`** | **0** | 16 | — | **DØD** |
| **`Udlejning-KompetenceScores`** | **0** | 15 | — | **DØD** |
| **`Udlejning-Kurser`** | **0** | 7 | — | **DØD** |
| **`Udlejning-KursusTilmeldinger`** | **0** | 9 | — | **DØD** |
| **`Udlejning-Medarbejdere`** | **0** | 9 | — | **DØD** |
| **`Udlejning-MiniTestBesvarelser`** | **0** | 10 | — | **DØD** |
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
| `Udlejning-Kompetencer` (20) | `Title`, `Kategori` (**Choice**: Produkt/Drift/Kunde/System/Sikkerhed/Personlig), `Beskrivelse` (Note), `Aktiv` | Ren A |
| `Udlejning-Læringspakker` (6) | + `Dimension` (**Choice**, 7 værdier), `Point`, `Materiale-`/`MiniTestLink` (URL), `R_x00e6_kkef_x00f8_lge` **KODET**, `Ejer` (**User**) | `Ejer` er et brugerfelt → **C** for netop det felt |
| `Udlejning-MiniTests` (21) | `Sp_x00f8_rgsm_x00e5_l` **KODET** (Note), `SvarA`–`SvarD`, `Korrektsvar` (**Choice** A/B/C/D), `Kritisk`, `Sp_x00f8_rgsm_x00e5_lsnr` **KODET** | Ren A. **Dette er de eneste rigtige quizspørgsmål i systemet** |
| `Akademi_Master` (1.599) | `Title` + `field_1`–`field_15` | Se §2.4 |

⚠️ `Udlejning-Centre.field_1` er en **`Choice` med tom værdiliste** i skemaet. Enten er
valgene fjernet, eller også er feltet konverteret fra tekst. Værdierne kan ikke læses herfra.

### 1.5 Kategori B

| Liste | Felter | Note |
|---|---|---|
| `HUB Tidsregistrering` (2) | `Dato`, `Timer` (Number), `UdfoertAf`, `Udfoerende`, `Modtagende`, `Opgavetype`, `Lejeaftale`, `Kommentar` (Note) | `UdfoertAf`/`Udfoerende`/`Modtagende` identificerer medarbejdere → **pseudonymiseres til `email_hash`**. `Kommentar` er fritekst → **C `TVIVL`** |

To rækker. Værktøjet er reelt ikke i brug endnu.

---

## 2. Akademiet — analysen omgjort

### 2.1 Konklusionen

**Kortlægningens konklusion var rigtig i substansen, men forkert i begrundelsen — og
prompt 02's præmis holder heller ikke.**

Fremdrift ligger **hverken** kun i localStorage **eller** i de ni akademilister. Den ligger et
tredje sted: **19 flade `Score_*`-tekstkolonner på `Medarbejdere_Udlejning`**.

| Påstand | Status |
|---|---|
| "Fremdrift findes kun i localStorage" (kortlægningen §5, §6.2) | **Delvist forkert.** Akademi-sitets egen fremdrift (5 onboarding-trin) er localStorage. Men der findes 19 `Score_*`-kolonner i SharePoint |
| "Der findes ni lister, der modsiger det" (prompt 02) | **Forkert præmis.** Fire af de ni er tomme, og ingen af de ni røres af noget flow eller nogen kode i repoerne |
| "Akademiet har ingen quizspørgsmål" (kortlægningen §6.1) | **Forkert.** `Udlejning-MiniTests` har 21 rigtige spørgsmål med A–D-svar og facit |

### 2.2 De ni lister

| Liste | Rækker | Hvad den er | Rørt af flow? | Rørt af kode? |
|---|---:|---|---|---|
| `Akademi_Master` | 1.599 | **Maskin-/manualkatalog — ikke kursusindhold.** Se §2.4 | Nej | Nej |
| `Udlejning-Kompetencer` | 20 | Kompetencetaksonomi (Produkt/Drift/Kunde/System/Sikkerhed/Personlig) | Nej | Nej |
| `Udlejning-Læringspakker` | 6 | Læringsmoduler m. dimension, point, tidsforbrug, links | Nej | Nej |
| `Udlejning-MiniTests` | 21 | **Quizspørgsmål** m. A–D og `Korrektsvar` | Nej | Nej |
| `Udlejning-Kurser` | **0** | Kursuskatalog | Nej | Nej |
| `Udlejning-KursusTilmeldinger` | **0** | Tilmelding + gennemførelse | Nej | Nej |
| `Udlejning-MiniTestBesvarelser` | **0** | Enkeltbesvarelser pr. spørgsmål | Nej | Nej |
| `Udlejning-KompetenceResultater` | **0** | Testforsøg m. delscorer og bestået/dumpet | Nej | Nej |
| `Udlejning-KompetenceScores` | **0** | Aggregeret score pr. medarbejder × kompetence | Nej | Nej |

### 2.3 Relationerne

```
Udlejning-Kompetencer (20) ──────────┐
   ▲                                 │
   │ Lookup                          │ Lookup
   │                                 ▼
Udlejning-MiniTests (21) ──Lookup──► Udlejning-Læringspakker (6)
   │                                 ▲            ▲
   │ Lookup                          │ Lookup     │ Lookup
   ▼                                 │            │
Udlejning-MiniTestBesvarelser (0) ───┘            │
   │                                              │
   │ Lookup "Medarbejder"                         │
   ▼                                              │
Medarbejdere_Udlejning (88) ◄─────────────────────┘
                                       (KompetenceResultater.Pakke)

Udlejning-Kurser (0) ──Lookup──► Udlejning-KursusTilmeldinger (0)
                                       │ Lookup "Medarbejder"
                                       ▼
                                 Udlejning-Medarbejdere (0)   ← TOM
                                       ▲
                                       │ Lookup "Medarbejder"
                                 Udlejning-KompetenceScores (0)
```

**Modellen er internt inkonsistent.** De tre `Medarbejder`-lookups peger tre forskellige
steder hen:

| Liste | `Medarbejder`-felt peger på | Rækker i målet |
|---|---|---:|
| `Udlejning-MiniTestBesvarelser` | `b017b189…` = **`Medarbejdere_Udlejning`** | 88 |
| `Udlejning-KompetenceScores` | `285adf51…` = **`Udlejning-Medarbejdere`** | **0** |
| `Udlejning-KursusTilmeldinger` | `285adf51…` = **`Udlejning-Medarbejdere`** | **0** |
| `Udlejning-KompetenceResultater` | *(ingen lookup — bruger `User`-felt)* | — |

To af lookuppene peger på en **tom** liste. En tilmelding kan ikke oprettes, før nogen
befolker `Udlejning-Medarbejdere`. Det forklarer, hvorfor alle fire resultatlister er tomme:
**modellen kan ikke bruges, som den står.**

### 2.4 `Akademi_Master` er ikke en akademiliste

Trods navnet. De 16 felter er:

`Kategori` · `Producent` · `Produktnavn` · `Model` · `ManualFilnavn` · `ManualURL` ·
`DatabladFilnavn` · `DatabladURL` · `ManualSharePointPath` · `DatabladSharePointPath` ·
`FlowKlar` · `DownloadStatus` · `DownloadNote` · `SidstBehandlet` · `FlowBehandlet`

Det er et **katalog over maskinmanualer og datablade** — 1.599 maskiner med producent, model
og links til dokumentation. `FlowKlar`, `DownloadStatus` og `FlowBehandlet` er
arbejdsmarkører for en download-automatisering, der **ikke findes blandt de 33 flows**.

**Svar på prompt 02's spørgsmål:** hverken indholdsliste eller konfigurationsliste. Det er et
**produktdatakatalog med indbygget job-kø**, som er havnet under akademi-navnet. Alle 16 felter
er `field_N` — en regnearks-import.

Kategori **A** i sin helhed. Ingen personoplysninger.

### 2.5 Hvor fremdriften faktisk ligger

`Medarbejdere_Udlejning` har 19 `Score_*`-kolonner, alle af typen **Text**:

| Kolonne | Svarer til |
|---|---|
| `Score_Ny_Kultur`, `Score_Ny_Intro`, `Score_Ny_Nethire`, `Score_Ny_Hvem` | Kategorien `ny-med-udlejning` |
| `Score_Lifte_Sikkerhed`, `Score_Lifte_Diagram`, `Score_Lifte_Manual`, `Score_Lifte_Maskiner` | `lifte` |
| `Score_Anlaeg_Maskintype`, `Score_Anlaeg_Sikkerhed`, `Score_Anlaeg_Diagram`, `Score_Anlaeg_Manual` | `anlaegsmaskiner` |
| `Score_Skure_Typer`, `Score_Skure_Sikkerhed`, `Score_Skure_Diagram` | `skurvogne` |
| `Score_oekonomi_brutto`, `Score_oekonomi_faktura`, `Score_oekonomi_rep`, `Score_oekonomi_retur` | `oekonomi` |
| `Senestopdateret` | TITLE≠INTERNAL (`Senest opdateret`) |

De fem kategorier matcher **præcis** de fem kategorier i `academy-data.json`
(`ny-med-udlejning`, `lifte`, `anlaegsmaskiner`, `skurvogne`, `oekonomi`), og fire af navnene
matcher `ONBOARDING`-arrayet i akademiets `index.html` (`kultur`, `intro`, `nethire`,
`sikkerhed`, `bruttoavance`).

**Hvad skriver dem?** Ikke noget, jeg kan finde:

- Ingen af de 33 flows nævner `Score_` eller liste-GUID'et `b017b189…`
- Akademiets `index.html` laver præcis ét netværkskald: `fetch('data/academy-data.json')`.
  Den skriver ingen steder hen
- Hverken `stark-prisaftale` eller `akademi` nævner `Score_` eller `Medarbejdere_Udlejning`

**Jeg kan ikke afgøre, hvad der udfylder dem.** Kandidater: manuel indtastning i
SharePoint-UI'et, en Power App, et Forms-flow uden for de 33, eller en engangsimport fra
regneark. `CLAUDE.md` §5.7: dette er "jeg fandt det ikke", ikke "det findes ikke".
**Spørgsmål til Jesper — det afgør, om der er data at migrere.**

### 2.6 Er fremdrift autoritativ i SharePoint eller localStorage?

**Ingen af dem — de måler forskellige ting og kan ikke divergere, fordi de aldrig taler sammen.**

| | localStorage (`akademi:gennemfoert`) | `Score_*` |
|---|---|---|
| Hvad | 5 onboarding-trin, afkrydset af brugeren | 19 scorer pr. medarbejder |
| Hvem | Anonym browser — akademiet har intet login | Navngiven medarbejder |
| Skrives af | `markDone()` i `index.html` | Ukendt (§2.5) |
| Læses af | Akademiets forside | Ingenting, jeg kan finde |

De to systemer har ingen forbindelse. Der er ingen synkronisering at bevare og ingen
divergens at afstemme.

### 2.7 Hvilke felter identificerer en medarbejder?

| Liste | Felt | Mekanisme |
|---|---|---|
| `Medarbejdere_Udlejning` | `Title` | Navn eller mail som tekst — **kan ikke afgøres fra skemaet** |
| `Udlejning-Medarbejdere` | `Title` + `Mail` | Tekst |
| `Udlejning-KompetenceResultater` | `Medarbejder` | **`User`-felt** — bundet til AD-kontoen |
| `Udlejning-Læringspakker` | `Ejer` | **`User`-felt** |
| `MiniTestBesvarelser`, `KompetenceScores`, `KursusTilmeldinger` | `Medarbejder` | **Lookup** på `Title` |

`User`-felterne er den hårdeste binding: de gemmer et AD-bruger-id og kan ikke pseudonymiseres
uden at miste koblingen. **Det er de eneste to felter i hele akademikomplekset, der er
uomgængeligt kategori C** — og begge sidder på lister med 0 og 6 rækker.

### 2.8 Arkitekturvurdering — anbefaling

Målt mod `CLAUDE.md` §3.0: hver liste skal kunne pege på et konkret kategori C-felt for at
overleve.

**Kursusindhold** — `Udlejning-Kurser`, `Læringspakker`, `Kompetencer`, `MiniTests`,
`Akademi_Master`:

| Liste | Kategori C-felt? | Dom |
|---|---|---|
| `Udlejning-Kompetencer` | Nej | **Supabase. Nedlægges** |
| `Udlejning-MiniTests` | Nej | **Supabase. Nedlægges** |
| `Udlejning-Kurser` | Nej — og tom | **Nedlægges uden migrering** |
| `Akademi_Master` | Nej | **Supabase. Nedlægges** |
| `Udlejning-Læringspakker` | **Ja: `Ejer` (User)** | Feltet er redaktionelt ejerskab, ikke persondata om en registreret. **Erstattes af `email_hash` → Supabase. Nedlægges** |

**Resultater og fremdrift** — kan de fungere mod `email_hash` alene?

| Liste | Kan pseudonymiseres? | Dom |
|---|---|---|
| `Udlejning-KompetenceScores` | Ja — `Medarbejder`-lookup → `email_hash` | **Kategori B → Supabase.** Tom, intet at migrere |
| `Udlejning-KursusTilmeldinger` | Ja | **Kategori B → Supabase.** Tom |
| `Udlejning-MiniTestBesvarelser` | Ja | **Kategori B → Supabase.** Tom |
| `Udlejning-KompetenceResultater` | Ja — `User` → `email_hash` ved migrering | **Kategori B → Supabase.** Tom |
| `Score_*` på `Medarbejdere_Udlejning` | Ja | **Kategori B → Supabase.** 88 rækker med rigtige data |

**Er der felter tilbage, der kræver den identificerende værdi?**

Nej. Gennemgået felt for felt findes der **intet felt i akademikomplekset, der ikke kan
fungere mod `email_hash`**. Fremdrift skal kunne vises til den, den tilhører, og aggregeres
for ledelsen. Begge dele virker med et hash: brugeren hasher sin egen mail ved login,
aggregering tæller distinkte hashes.

De to `User`-felter (`KompetenceResultater.Medarbejder`, `Læringspakker.Ejer`) er den eneste
tekniske forhindring, og de løses ved at oversætte AD-id til mail **én gang under migreringen**
og derefter hashe.

> ### Anbefaling
>
> **Alle ni lister nedlægges.** Ingen af dem har et felt, der begrunder ophold i SharePoint.
>
> Fire er tomme og kan slettes uden videre. `Akademi_Master` hører slet ikke til akademiet og
> flyttes som produktdatakatalog. De resterende fire flyttes: indhold som A, fremdrift som B
> mod `email_hash`.
>
> Datamodellen fra kortlægningen §6.3 holder, men skal udvides med `minitests`,
> `besvarelser` og `kompetencer`, da spørgsmålene faktisk findes.
>
> Jesper beslutter.

### 2.9 Hvad migreringen af eksisterende resultater kræver

| Kilde | Rækker | Kræver |
|---|---:|---|
| `Score_*` på `Medarbejdere_Udlejning` | 88 × op til 19 værdier | **Afklaring af hvad `Title` indeholder** (navn eller mail). Er det navn, skal der joines mod `Medarbejdere.DisplayName` for at få mailen, før den kan hashes. Navne er ikke unikke |
| De fire tomme resultatlister | 0 | Intet |
| `academy-data.json` | 25 sider, 757 blokke | Ren indlæsning, kategori A |
| `Udlejning-MiniTests` | 21 spørgsmål | Ren indlæsning, kategori A |
| localStorage-fremdrift | Ukendt antal browsere | Kan ikke hentes. Engangsimport ved første login, jf. prompt 01 PR 3 |

⚠️ **`Score_*` er de eneste rigtige akademidata, der findes.** 88 medarbejdere. Går de tabt,
kan de ikke genskabes. De skal eksporteres, før nogen rører `Medarbejdere_Udlejning`.

---

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

### 4.3 OTP-flowene — det gamle mønster er svagere end `CLAUDE.md` §7 beskriver

`CLAUDE.md` §7 siger: *"Fungerer som `intern.html` gør i dag. Mønstret er i drift og ændres
ikke."* **Definitionerne modsiger det på seks af syv punkter.**

| `CLAUDE.md` §7 kræver | `OTPLogin-Intern` / `OTPVerify-Intern` gør | |
|---|---|---|
| Ingen allowlist | `$filter=Title eq '<mail>'` + `equals(length(...), 1)` — **findes mailen ikke i `Medarbejdere`, sendes ingen kode** | ❌ |
| Kun **hash** gemmes, aldrig klartekst | `item/OTP = @outputs('Compose')` — **koden i klartekst** | ❌ |
| Engangsbrug, invalideres ved brug | `Update_item` sætter kun `AccountEnabled`. **`OTP` ryddes aldrig** | ❌ |
| Maks 5 forsøg | Ingen tæller nogen steder | ❌ |
| Rate limit pr. adresse og pr. IP | Ingen | ❌ |
| Identisk svar uanset udfald | To forskellige `Response`-grene i `Condition` | ❌ |
| TTL 10 min | `OTPExpiry` sammenlignes med `utcNow()` | ✅ |

Konsekvenser af de tre første tilsammen: en gyldig kode ligger læsbar i en liste, som 3.618
mailadresser også ligger i, den kan bruges igen og igen indtil den udløber, og der er ingen
grænse for, hvor mange gange den kan gættes.

Desuden sætter **login-anmodningen** `AccountEnabled = True`, altså før nogen har bevist noget.
Feltet er dermed ikke en spærre.

> ### Anbefaling
>
> **Begge flows nedlægges.** Hele OTP-logikken flyttes til `lib/auth.js`, bygget efter §7 som
> skrevet — ikke efter det, der kører.
>
> **Og §7 skal rettes**, så den ikke længere påstår, at det nuværende mønster opfylder den.
> Se §8. Det er en sikkerhedsregel; den bør ikke hvile på en forkert præmis.
>
> Bemærk konsekvensen af "ingen allowlist": porten bliver bredere, ikke smallere. I dag skal
> mailen findes i `Medarbejdere` (som ganske vist er hele STARK Group). Fjernes det, kan
> enhver `@stark.dk`-adresse anmode. Det er formentlig det tilsigtede — men det er en
> udvidelse, ikke status quo, og bør bekræftes.

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

### 5.2 Fire lister mangler en rute

| Liste | Rækker | Forslag |
|---|---:|---|
| De tre `Leverandoer_*` | 103 i alt | **`/vaerktoejer/leverandoerer`** — et opslagsværk, pladspersonalet i dag ikke har adgang til uden for SharePoint |
| `Varslede prisændringer` | 0 | Hører under **`/admin/priser`**. Se §6.4 |

`Initialer` (0 rækker, ét tekstfelt, ingen læsere) kan ikke afgøres. **Nedlægges som DØD**,
med mindre Jesper kender formålet.

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

### 6.3 Beregningskæden findes et syvende sted — og i en tredje variant

Prisflowet **beregner selv** ved indsættelse:

```
item/field_4 (Listepris_pr_dag)  = listepris
item/field_5 (Kundepris_pr_dag)  = listepris                          ← ingen rabat
item/field_6 (Risikotillæg)      = listepris × 0.065                  ← korrekt
item/field_7 (Miljøbidrag)       = listepris × 0.035                  ← FORKERT
item/field_8 (Kundepris_total)   = listepris × 1.1                    ← FORKERT
```

| Formel | `CLAUDE.md` §5.5 | Flowet |
|---|---|---|
| Risikotillæg | `listepris × 6,5 %` | `listepris × 0.065` ✅ |
| Miljøbidrag | `(nettopris + risikotillæg) × 3,5 %` | `listepris × 0.035` ❌ |
| Total | netto + risiko + miljø | `listepris × 1.1` ❌ |

Miljøvarianten er **hverken v1 eller v2**: v1 regner af nettopris, v2 af (netto + risiko),
flowet af listepris. Med 0 % rabat falder v1 og flowets variant sammen — men kun der.

`× 1.1` er et fladt 10 %-tillæg. For listepris 1.000 kr. giver kæden 1.000 + 65 + 37 =
**1.102 kr.**; flowet giver **1.100 kr.** Tæt nok til aldrig at være blevet opdaget, forkert nok
til at være forkert.

> **Kortlægningen §4.1 talte seks implementeringer med otte sæt hardkodede tal. Det rigtige tal
> er mindst syv implementeringer, og den syvende ligger uden for repoet, i et flow der kører
> dagligt.** Det styrker `CLAUDE.md` §5.5's begrundelse: så længe beregningen kan skrives et
> nyt sted, bliver den det.

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
beregning"*.

**Den begrundelse holder — bedre end forventet.** Datagrundlaget bekræfter den:

| §11's præmis | Datagrundlaget |
|---|---|
| Ingen kategori C | ✅ Kun to `User`-felter i hele komplekset, begge på lister med 0 og 6 rækker |
| Ingen PA | ✅ **Bekræftet: intet af de 33 flows rører nogen akademiliste** |
| Ingen beregning | ✅ |
| Ingen SharePoint | ⚠️ **Delvist forkert** — 88 rækker `Score_*` findes |

Det eneste, der ændrer sig, er at `/akademi` nu har **rigtige data at migrere**: 88
medarbejderes fremdrift og 21 quizspørgsmål. Det gør den lidt større, men ikke mere risikabel
— tværtimod er den nu det eneste sted, hvor hele mønstret (indhold A + fremdrift B mod
`email_hash`) kan bevises på ægte data uden at røre en eneste kunde.

> ### Anbefaling: behold `/akademi` først, men flyt to ting frem
>
> | # | Trin | Ændring ift. §11 |
> |---|---|---|
> | **0a** | **Eksportér `Score_*` fra `Medarbejdere_Udlejning`** (88 rækker) | **NY.** De er de eneste akademidata, der findes, og intet flow beskytter dem |
> | **0b** | **Ret OTP-mønstret** (§4.3) | **FLYTTET FREM.** Klartekstkoder, ingen invalidering og ingen forsøgsgrænse er i drift nu. Det bør ikke vente på tur |
> | 1 | Fundament + `/akademi` | Uændret |
> | 2 | `/kunde/*` + dokumentadgang | Uændret |
> | 3 | `/rapportering/*` + `/admin`-ledelsesvisning | Uændret. `FormularEmailGateway` er allerede tæt på en adapter |
> | 4 | `/vaerktoejer/*` | + **`/vaerktoejer/leverandoerer`** (§5.2) |
> | 5 | `/hub` | **Kunne rykkes frem.** 2 rækker, 1 flow, 0 betingelser — den simpleste app i hele systemet |
> | 6 | `/samhandel` | Uændret. `Prisaftale`-flowet har 152 expressions og 5 betingelser |
>
> Kriteriet er risiko. `0b` er med, fordi det er den eneste post på listen, hvor **ingenting
> at gøre også er en risiko**.

---

## 8. Rettelser til `docs/kortlaegning.md` og `CLAUDE.md`

**Ingen af filerne er ændret.** Listen afventer godkendelse.

### 8.1 `CLAUDE.md`

| # | Sted | Rettelse |
|---|---|---|
| 1 | **§7, "Ingen allowlist"** | Der **er** en allowlist i dag: `OTPLogin-Intern` kræver præcis ét match i `Medarbejdere` (3.618 rækker). At fjerne den er en **udvidelse** af adgangen, ikke status quo |
| 2 | **§7, "Mønstret er i drift og ændres ikke"** | Forkert. Det nuværende mønster fejler seks af syv krav i §7: klartekstkode, ingen invalidering, ingen forsøgstæller, ingen rate limit, forskellige svar, allowlist. **§7 beskriver målet, ikke nutiden** — formuleringen bør rettes, så en sikkerhedsregel ikke hviler på en forkert præmis |
| 3 | **§9.3, `Platformsbrugere`** | Listen findes ikke og bør ikke oprettes. `Medarbejdere` er allerede autoritativ, synkroniseret dagligt fra Graph og har `Mail` + `DisplayName` (§3.3) |
| 4 | **§5.5, beregningskæden** | "seks implementeringer" er for lavt. Der er mindst **syv**, og den syvende ligger i et PA-flow uden for repoet (§6.3) |
| 5 | **§5.5, `stigning%`** | Leddet har aldrig været i brug. Kilden (`Varslede prisændringer`) er tom, og `priser.json` har ingen `basispris` (§6.4) |
| 6 | **§3.0, "to flows i alt"** | `SyncMedarbejderefraGraph` er en reel tredje kandidat med Graph-adgang uden afløser (§4.4). Enten foldes den ind i adapteren, eller også bliver målet tre |
| 7 | **§11, rækkefølge** | `/akademi` rører **ikke** SharePoint — bekræftet. Men den har 88 rækker rigtige data, der skal eksporteres først (§7) |

### 8.2 `docs/kortlaegning.md`

| # | Sted | Rettelse |
|---|---|---|
| 8 | **§2.3**, "felter der gemmes ikke i dag" | **Forkert.** `Cc`, `Tlf`, `Kontakt`, `Fritekst`, `Vilkaar` og `YdelserJSON` findes alle som kolonner på `Tilbud`. `docs/pa-flows.md`'s liste var forældet |
| 9 | **§3.1**, kolonnenavne på `Samhandelsaftaler_Rabatter` | Mindst 11 navne gættet forkert (§1.3). De rigtige bruger `_`-separatorer: `Rabat_JordOgAnlaeg`, `Forventet_Omsaetning`, `Saelger_Navn` |
| 10 | **§3.1**, "Rækker: Ukendt" | Nu kendt for alle 31 lister. `Tilbud` = 29, `Samhandelsaftaler_Rabatter` = 103, `Kundeportaler` = 99 |
| 11 | **§5 og §6.2**, akademiets fremdrift | **Ufuldstændigt.** Ud over localStorage findes 19 `Score_*`-kolonner på `Medarbejdere_Udlejning` med 88 rækker (§2.5) |
| 12 | **§6.1**, "ingen quizspørgsmål" | **Forkert.** `Udlejning-MiniTests` har 21 spørgsmål med A–D-svar og facit (§2.2) |
| 13 | **§6.3**, foreslået datamodel | Holder, men mangler `minitests`, `besvarelser` og `kompetencer` |
| 14 | **§3.1**, `Masterark_Priser` "afklar om listen bruges" | **Afklaret: nej.** Intet af de 33 flows rører den (§6.3) |
| 15 | **§3.3**, `tilbud-status` dødt | **Bekræftet** af definitionen |
| 16 | **§4.3**, `lastvogn` uden modtagende kolonne | **Bekræftet.** Der findes ingen `Rabat_Lastvognslifte` |
| 17 | **§8.2, spørgsmål 7** | Besvaret: felterne persisteres allerede. Spørgsmålet bortfalder |

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

### 9.2 Ikke afgjort

| Ting | Hvorfor |
|---|---|
| **Hvad skriver `Score_*`?** | Intet flow, ingen kode i de repoer, jeg har adgang til. Kan være en Power App, en Forms-integration uden for `flows/`, eller manuel indtastning. **"Jeg fandt det ikke" — ikke "det findes ikke"** |
| **Hvad `Medarbejdere_Udlejning.Title` indeholder** | Navn eller mail. Afgør, om `Score_*` kan hashes direkte, eller om der skal joines først. Kræver et kig på rækkerne |
| **`Udlejning-Centre.field_1` (Region)** | `Choice` med tom værdiliste i skemaet. Værdierne kan ikke læses |
| **Hvornår `priser-array.json` sidst blev regenereret** | Begge prisfiler blev sidst committet i samme commit (`516cf89`, 2026-08-07), så git kan ikke vise, hvornår de kom ud af trit |
| **Om leverandørkontakter er personer eller funktionspostkasser** | Afgør C vs. A for tre lister. Kræver et kig på rækkerne |
| **`Initialer`s formål** | 0 rækker, ét felt, ingen læsere |
| **`flows/test`** | Pladsholderfil på 1 byte |
| **Om de 8 tomme lister nogensinde har haft data** | `ItemCount` viser nutiden. Der er intet i skemaer eller flows, der kan afgøre historikken |
| **Faktisk rækkeindhold i alle 31 lister** | Jeg har haft skemaer og rækketal, aldrig data. Ingen påstand i dette dokument bygger på en læst række |
| **De 5 øvrige flows uden detailgennemgang** | `Acceptertilbud`, `Bestillingaf*`, `CyclingForCancer*`, `HUBTidsregistrering`, `Kundeportaler*` — klassificeret ud fra actions, connectors og liste-GUID'er, ikke linje for linje |

### 9.3 Påstande, jeg ikke kan stå inde for

- **Kategorierne i §1 er mine forslag.** Særligt `TVIVL`-felterne — leverandørkontakter,
  `ErKAM`, `Sagsnr`, `Kommentar`-felter — kræver en beslutning, ikke en vurdering fra skemaet.
- **"Intet flow rører X"** gælder de 33 definitioner i `flows/`. Er der flows i tenanten, som
  ikke er eksporteret hertil, dækker udsagnet dem ikke.
- **Expression-tallene er omtrentlige.** De tæller `@funktion(`-forekomster i den serialiserede
  definition og er et groft mål for logikmængde, ikke et præcist antal.
- **Jeg har ikke kørt noget flow og ikke læst en eneste listerække.**

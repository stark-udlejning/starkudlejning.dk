# CC-prompt 03 — Oprydning og opdatering

> Køres efter PR #2 (datagrundlag). Ingen ny funktionalitet.

---

## 1. Døde systemer bekræftet

Jesper har bekræftet: akademiet er siden bygget om. De ni akademilister og de 19
`Score_*`-kolonner på `Medarbejdere_Udlejning` er **forældede og opdateres ikke længere**.

Konsekvenser, der skal indarbejdes i `docs/datagrundlag.md` og `docs/kortlaegning.md`:

- Der er **ingen fremdrift at migrere**. Spørgsmålet om hvad der skriver `Score_*` er
  lukket — svaret er: ingenting, ikke længere.
- Akademiet på den nye platform bygges fra bunden med Supabase som datalager.
  Ingen engangsimport, ingen bagudkompatibilitet.
- De ni lister og `Score_*`-kolonnerne markeres DØD.
- `Udlejning-MiniTests`' 21 spørgsmål er ikke en migrationskilde, men kan være et brugbart
  udgangspunkt for indhold. Notér dem som reference, ikke som data der skal flyttes.

Fjern de analyser og anbefalinger i `datagrundlag.md`, der bygger på, at komplekset var
levende. Lad ikke et dødt system fylde i et dokument, der skal bruges som opslagsværk.

`CLAUDE.md` §3.00 er allerede opdateret med dette.

## 2. Indarbejd de 17 rettelser

De 17 rettelser i `datagrundlag.md` §8 er godkendt. Ret `docs/kortlaegning.md` og
`CLAUDE.md` i overensstemmelse med dem, med disse forbehold:

- **`CLAUDE.md` §7 er allerede rettet** af Jesper — det nuværende OTP-flow er nu eksplicit
  markeret som *ikke* referencen. Rør ikke det afsnit.
- **`CLAUDE.md` §5.5** skal opdateres til at nævne, at beregningen findes i **syv** varianter,
  herunder den daglige flow-variant med miljøbidrag af listepris og total som
  `listepris × 1.1`. Formlen i §5.5 er fortsat den autoritative.
- Rettelser, der ændrer en regel eller en formel, skal fremgå tydeligt i PR-beskrivelsen —
  ikke blot indgå i diffen.

## 3. Mail-adapteren

`SendMail` bygges ikke fra bunden. `Sendtilbud`s mailkald er allerede rent gennemløb.

Skriv `docs/pa-flows-sendmail.md` om, så den beskriver **at klone `Sendtilbud` og strippe
den**, ikke at bygge et nyt flow. Dokumentet skal indeholde:

- Præcis hvilke handlinger der skal fjernes fra kopien, og hvilke der beholdes
- Hvilket trigger-schema kopien skal have, så den matcher `sendMail()`-signaturen i
  `CLAUDE.md`
- Hvordan vedhæftningsmønstret fra `FormularEmailGateway` overføres
- De tre curl-tests fra det nuværende dokument, tilpasset

**Originalen `Sendtilbud` røres ikke.** Den kører videre, indtil `/samhandel` er skåret over.

## 4. Platformsbrugere oprettes ikke

Anbefalingen er godkendt: `Medarbejdere` bruges som kilde til mail og navn, da den allerede
synkroniseres dagligt fra Graph.

Ret `CLAUDE.md` §4 og §9.3, så referencen til listen `Platformsbrugere` erstattes af
`Medarbejdere`. Beskriv, hvilke felter adapteren læser, med de faktiske `InternalName`-værdier.

## 5. Manglende ruter

Fire lister mangler en rute i `CLAUDE.md` §1: de tre leverandørlister og
`Varslede prisændringer`.

Foreslå ruter — placér dem ikke selv i tabellen. Angiv for hver, om den hører under
`/vaerktoejer`, `/admin` eller et nyt sted, og hvorfor.

## 6. Ubesvarede spørgsmål

`datagrundlag.md` §9.2 lister ting, du ikke kunne afgøre. Reducér listen til de spørgsmål,
der stadig har betydning nu, hvor akademikomplekset er dødt. Formulér hvert af dem som ét
konkret spørgsmål, Jesper kan svare ja eller nej til.

---

## Krav

- Én PR. **Merg ikke.**
- PR-beskrivelsen skal skelne mellem: rettelser der er ren oprydning, og rettelser der
  ændrer en regel eller en formel.
- `CLAUDE.md` §5.7 gælder fortsat: skeln mellem "jeg fandt det ikke" og "det findes ikke".

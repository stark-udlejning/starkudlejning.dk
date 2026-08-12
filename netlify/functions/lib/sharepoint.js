// SharePoint-adapter — STUB. Jf. CLAUDE.md §5.1.
//
// Laggrænsen skal eksistere fra første dag, også før der er noget bag den. Ellers
// vokser der SP-feltnavne, flow-URL'er og `?.Value`-mønstre ud i resten af koden,
// og så er lagdelingen brudt, før den blev bygget. Det er nøjagtigt, hvad der skete
// i det gamle system (docs/kortlaegning.md §2.7 og §4).
//
// ALLE kategori C-data går gennem denne fil: kundenavne, kontaktpersoner,
// kundemailadresser, telefonnumre, kundenumre, kundedokumenter, indsendte formularer.
// Intet af det må nogensinde havne i Supabase (CLAUDE.md §3).
//
// Implementeres i en senere PR. Rækkefølgen i CLAUDE.md §11 er:
//   1. Fundament + /akademi   ← vi er her; akademiet rører ikke SharePoint
//   2. /kunde/* + dokumentadgang
//   3. /rapportering/* + /admin-ledelsesvisning

export class SharePointIkkeImplementeret extends Error {
  constructor(operation) {
    super(
      `SharePoint-adapter ikke implementeret endnu (${operation}). ` +
      'Kategori C-data må ikke gemmes andre steder — se CLAUDE.md §3 og §5.1.'
    );
    this.name = 'SharePointIkkeImplementeret';
  }
}

/** Henter poster fra en SharePoint-liste. */
export async function hentListe() {
  throw new SharePointIkkeImplementeret('hentListe');
}

/** Henter én post ud fra et felt og en værdi. */
export async function hentPost() {
  throw new SharePointIkkeImplementeret('hentPost');
}

/** Opretter en post i en SharePoint-liste. */
export async function opretPost() {
  throw new SharePointIkkeImplementeret('opretPost');
}

/** Opdaterer en post i en SharePoint-liste. */
export async function opdaterPost() {
  throw new SharePointIkkeImplementeret('opdaterPost');
}

/**
 * Slår en kundemailadresse op i kontaktlisten — grundlaget for kundelogin (CLAUDE.md §8).
 * Kundemails ligger aldrig i Supabase, så opslaget SKAL gå her igennem.
 */
export async function findKundeViaMail() {
  throw new SharePointIkkeImplementeret('findKundeViaMail');
}

/**
 * Henter visningsnavne fra listen `Platformsbrugere` og joiner på hashEmail(Email).
 *
 * Kan adapteren ikke nås, skal kalderen vise brugerne UDEN navn frem for at fejle —
 * det er eksplicit acceptabelt (CLAUDE.md §9.3) og må ikke blokere /admin/brugere.
 */
export async function hentPlatformsbrugere() {
  throw new SharePointIkkeImplementeret('hentPlatformsbrugere');
}

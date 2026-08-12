// Pseudonymisering — det bærende mønster. Jf. CLAUDE.md §4.
//
// Vi gemmer aldrig mailadresser, navne eller kundenumre i Supabase. Vi gemmer et
// HMAC af værdien og genkender den ved at hashe input på ny. Der er aldrig brug for
// at LÆSE en mailadresse ud af databasen — kun at genkende den.
//
// Hemmeligheden ligger i Netlify env vars. Aldrig i repoet, aldrig i Supabase.

import crypto from 'node:crypto';

/**
 * Kastes når PSEUDONYM_SECRET mangler eller er ubrugelig.
 * Egen klasse, så kaldere kan skelne en fejlkonfiguration fra en datafejl.
 */
export class PseudonymKonfigurationsfejl extends Error {
  constructor(besked) {
    super(besked);
    this.name = 'PseudonymKonfigurationsfejl';
  }
}

// Kortere end dette er ikke en hemmelighed, det er en tastefejl. Grænsen er sat lavt
// nok til ikke at være i vejen og højt nok til at fange "secret", "test" og "".
const MIN_SECRET_LAENGDE = 16;

function hentSecret() {
  const secret = process.env.PSEUDONYM_SECRET;

  // Fejler HÅRDT. En stille fallback ville producere hashes, der ikke kan genskabes,
  // og dermed låse brugere ude af deres egen historik uden at nogen opdagede det.
  if (!secret) {
    throw new PseudonymKonfigurationsfejl(
      'PSEUDONYM_SECRET mangler. Sæt den i Netlify env vars. ' +
      'Der findes ingen fallback — se CLAUDE.md §4.'
    );
  }
  if (secret.length < MIN_SECRET_LAENGDE) {
    throw new PseudonymKonfigurationsfejl(
      `PSEUDONYM_SECRET er kun ${secret.length} tegn. Mindst ${MIN_SECRET_LAENGDE} kræves.`
    );
  }
  return secret;
}

/**
 * HMAC-SHA256 over `<domæne>:<normaliseret værdi>`.
 *
 * Normaliseringen (trim + lowercase) er det, der gør at "  Jesper@Stark.dk " og
 * "jesper@stark.dk" rammer den samme række. Ændres normaliseringen nogensinde,
 * mister alle eksisterende rækker deres nøgle — præcis som ved rotation af secret.
 *
 * Domæneprefixet er obligatorisk (CLAUDE.md §4). Uden det ville hashEmail('580')
 * og hashKunde('580') give samme værdi, og en kunde_hash brugt ved et uheld mod
 * `brugere` ville ramme en tilfældig række i stedet for at fejle højt.
 * Prefixet må aldrig ændres uden en migration af alle eksisterende hashes.
 *
 * @param {string} domaene   'email', 'kunde', … Nye hashtyper får deres eget.
 * @param {string|number} vaerdi
 * @returns {string} 64 hex-tegn
 */
function hmac(domaene, vaerdi) {
  if (vaerdi === null || vaerdi === undefined) {
    throw new TypeError('hash: værdien må ikke være null eller undefined');
  }
  const normaliseret = String(vaerdi).trim().toLowerCase();
  if (normaliseret === '') {
    throw new TypeError('hash: værdien må ikke være tom');
  }
  return crypto
    .createHmac('sha256', hentSecret())
    .update(`${domaene}:${normaliseret}`, 'utf8')
    .digest('hex');
}

/**
 * Hash af en mailadresse — intern som ekstern. Nøglen i `brugere`, `sessioner`,
 * `fremdrift` og `audit_log`.
 */
export const hashEmail = (vaerdi) => hmac('email', vaerdi);

/**
 * Hash af et kundenummer. Gør omsætningstal mulige i Supabase uden at kundenummeret
 * selv ligger der (CLAUDE.md §4).
 */
export const hashKunde = (vaerdi) => hmac('kunde', vaerdi);

/**
 * Sammenligning i konstant tid. Bruges hvor et hash sammenlignes med noget, en
 * angriber kan styre — fx en engangskode.
 */
export function hashErEns(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  // timingSafeEqual kaster ved forskellig længde, så længden tjekkes først.
  // Længden af et hash er ikke hemmelig.
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

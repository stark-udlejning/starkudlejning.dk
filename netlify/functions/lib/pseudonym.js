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
 * HMAC-SHA256 over en normaliseret værdi.
 *
 * Normaliseringen (trim + lowercase) er det, der gør at "  Jesper@Stark.dk " og
 * "jesper@stark.dk" rammer den samme række. Ændres normaliseringen nogensinde,
 * mister alle eksisterende rækker deres nøgle — præcis som ved rotation af secret.
 *
 * @param {string|number} vaerdi
 * @returns {string} 64 hex-tegn
 */
function hmac(vaerdi) {
  if (vaerdi === null || vaerdi === undefined) {
    throw new TypeError('hash: værdien må ikke være null eller undefined');
  }
  const normaliseret = String(vaerdi).trim().toLowerCase();
  if (normaliseret === '') {
    throw new TypeError('hash: værdien må ikke være tom');
  }
  return crypto
    .createHmac('sha256', hentSecret())
    .update(normaliseret, 'utf8')
    .digest('hex');
}

/**
 * Hash af en mailadresse — intern som ekstern. Nøglen i `brugere`, `sessioner`,
 * `fremdrift` og `audit_log`.
 */
export const hashEmail = hmac;

/**
 * Hash af et kundenummer. Gør omsætningstal mulige i Supabase uden at kundenummeret
 * selv ligger der (CLAUDE.md §4).
 *
 * Bemærk: `hashEmail` og `hashKunde` er med vilje samme funktion, præcis som CLAUDE.md §4
 * definerer dem. Det betyder, at de deler nøglerum — samme inputstreng giver samme hash
 * uanset hvilken af de to der kaldes. I praksis kolliderer en mailadresse og et
 * kundenummer ikke, da formaterne udelukker hinanden. Vil man have egentlig
 * domæneadskillelse, skal de to have hvert sit prefix inden HMAC'en — det er en ændring
 * af datamodellen og kræver godkendelse plus en migration af alle eksisterende hashes.
 * Det gøres derfor ikke her, men noteres.
 */
export const hashKunde = hmac;

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

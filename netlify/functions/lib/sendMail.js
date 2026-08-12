// Eneste vej til udgående mail. Jf. CLAUDE.md §5.1.
//
// Ingen anden fil må kende PA_SENDMAIL_URL. Formålet er, at Power Automate kan
// udskiftes ved at ændre denne ene fil. Lækker flow-URL'en ud i øvrige filer, er
// lagdelingen brudt — det er præcis dét, det gamle system gjorde, hvor otte
// signerede flow-URL'er lå hardkodet i repoet (docs/kortlaegning.md §8.1, punkt 6).
//
// Flowet er en ADAPTER: nul betingelser, nul expressions, nul beregninger. Det
// modtager færdigrenderet HTML og sender den. Al logik ligger her.

import { supabase } from './supabase.js';
import { hashEmail } from './pseudonym.js';

export class MailFejl extends Error {
  constructor(besked, detaljer) {
    super(besked);
    this.name = 'MailFejl';
    this.detaljer = detaljer;
  }
}

const MAIL_TIMEOUT_MS = 20_000;

function tilListe(v) {
  if (v === null || v === undefined || v === '') return [];
  return (Array.isArray(v) ? v : [v]).map((s) => String(s).trim()).filter(Boolean);
}

/**
 * Skriver en logrække FØR afsendelsen.
 *
 * Rækkefølgen er med vilje: en mail, der blev sendt uden at blive logget, er værre
 * end en logrække for en mail, der aldrig blev sendt. Status opdateres bagefter.
 *
 * Modtageren gemmes som `modtager_hash` — mailadresser hører ikke til i Supabase
 * (CLAUDE.md §3, kategori C). `emne` gemmes i klartekst; det er en systemgenereret
 * streng, ikke fritekst om en person. Bliver emnelinjer på et tidspunkt sammensat af
 * kundenavne, skal dette felt genovervejes.
 */
async function logStart({ modtagere, emne, anledning }) {
  const { data, error } = await supabase()
    .from('mail_log')
    .insert({
      modtager_hash: modtagere.map(hashEmail),
      antal_modtagere: modtagere.length,
      emne,
      anledning: anledning ?? null,
      status: 'sender'
    })
    .select('id')
    .single();

  if (error) throw new MailFejl('Kunne ikke skrive mail_log', error.message);
  return data.id;
}

async function logSlut(id, status, fejl) {
  // Fejler logopdateringen, må det ikke vælte en mail, der faktisk blev sendt.
  const { error } = await supabase()
    .from('mail_log')
    .update({ status, fejl: fejl ?? null, afsluttet: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('sendMail: kunne ikke opdatere mail_log', error.message);
}

/**
 * Sender en mail via PA-adapteren.
 *
 * @param {object}   arg
 * @param {string|string[]} arg.til
 * @param {string|string[]} [arg.cc]
 * @param {string}   arg.emne
 * @param {string}   arg.htmlBody         Færdigrenderet HTML. Flowet renderer intet.
 * @param {string}   [arg.svarTil]
 * @param {Array<{filnavn: string, indholdBase64: string}>} [arg.vedhaeftninger]
 * @param {string}   [arg.anledning]      Fri etiket til mail_log, fx 'otp' eller 'tilbud'.
 */
export async function sendMail({
  til,
  cc,
  emne,
  htmlBody,
  svarTil,
  vedhaeftninger = [],
  anledning
}) {
  const modtagere = tilListe(til);
  const ccListe = tilListe(cc);

  if (modtagere.length === 0) throw new MailFejl('sendMail: "til" mangler');
  if (!emne) throw new MailFejl('sendMail: "emne" mangler');
  if (!htmlBody) throw new MailFejl('sendMail: "htmlBody" mangler');

  const url = process.env.PA_SENDMAIL_URL;
  const secret = process.env.PA_SHARED_SECRET;
  if (!url) throw new MailFejl('PA_SENDMAIL_URL mangler i Netlify env vars');
  if (!secret) throw new MailFejl('PA_SHARED_SECRET mangler i Netlify env vars');

  const logId = await logStart({ modtagere, emne, anledning });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MAIL_TIMEOUT_MS);

  try {
    const svar = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Delt hemmelighed i header frem for signatur i URL'en. En URL havner i
        // logs, referrers og browserhistorik; en header gør ikke.
        'x-stark-secret': secret
      },
      body: JSON.stringify({
        til: modtagere,
        cc: ccListe,
        emne,
        htmlBody,
        svarTil: svarTil ?? null,
        vedhaeftninger
      }),
      signal: ctrl.signal
    });

    if (!svar.ok) {
      const tekst = await svar.text().catch(() => '');
      await logSlut(logId, 'fejlet', `HTTP ${svar.status}: ${tekst.slice(0, 500)}`);
      throw new MailFejl(`Mailflowet svarede ${svar.status}`, tekst.slice(0, 500));
    }

    await logSlut(logId, 'sendt');
    return { ok: true, logId };
  } catch (e) {
    if (e instanceof MailFejl) throw e;
    const besked = e.name === 'AbortError'
      ? `Mailflowet svarede ikke inden ${MAIL_TIMEOUT_MS} ms`
      : e.message;
    await logSlut(logId, 'fejlet', besked);
    throw new MailFejl('Kunne ikke sende mail', besked);
  } finally {
    clearTimeout(timer);
  }
}

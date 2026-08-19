// Session-, cookie- og brugerhjælpere. Jf. CLAUDE.md §7/§9 — med én bevidst
// afvigelse: selve OTP-anmodningen/-verifikationen ligger IKKE her, men i
// lib/pa-otp.js, som genbruger de eksisterende PA-flows bag intern.html (se
// docs/hub-plan.md). Det denne fil stadig ejer, uændret: sessionen efter et
// vellykket login, og opslag/oprettelse af brugerens rolle i Supabase
// (§9.3 — kun admin-rollen vedligeholdes manuelt).
//
// Sessionen er et tilfældigt, uigætteligt token. Cookien bærer tokenet i
// klartekst; serveren gemmer kun et HMAC af det i `sessioner`, så en session
// kan tilbagekaldes uden at afhænge af et JWT's udløbstid, og en læsning af
// tabellen alene ikke giver nogen adgang.

import crypto from 'node:crypto';
import { supabase } from './supabase.js';

export const COOKIE_NAVN = 'stark_session';

const SESSION_TTL_SEKUNDER = {
  bruger: 8 * 60 * 60,
  admin: 60 * 60
};

export class AuthKonfigurationsfejl extends Error {
  constructor(besked) {
    super(besked);
    this.name = 'AuthKonfigurationsfejl';
  }
}

function hashToken(token) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new AuthKonfigurationsfejl('SESSION_SECRET mangler i Netlify env vars');
  }
  return crypto.createHmac('sha256', secret).update(token, 'utf8').digest('hex');
}

/**
 * Opretter brugeren ved første login, eller opdaterer login-statistik på en
 * eksisterende. Rollen ændres ALDRIG her — kun /admin/brugere må forfremme (§9.3).
 */
export async function opdaterEllerOpretBruger(emailHash) {
  const nu = new Date().toISOString();
  const { data: eksisterende, error: opslagFejl } = await supabase()
    .from('brugere')
    .select('id, rolle, aktiv, antal_logins, foerste_login')
    .eq('email_hash', emailHash)
    .maybeSingle();
  if (opslagFejl) throw new Error(`opdaterEllerOpretBruger: ${opslagFejl.message}`);

  if (eksisterende) {
    const { error } = await supabase()
      .from('brugere')
      .update({
        sidste_login: nu,
        antal_logins: eksisterende.antal_logins + 1,
        foerste_login: eksisterende.foerste_login ?? nu
      })
      .eq('id', eksisterende.id);
    if (error) throw new Error(`opdaterEllerOpretBruger: ${error.message}`);
    return { id: eksisterende.id, rolle: eksisterende.rolle, aktiv: eksisterende.aktiv };
  }

  const { data: ny, error } = await supabase()
    .from('brugere')
    .insert({ email_hash: emailHash, foerste_login: nu, sidste_login: nu, antal_logins: 1 })
    .select('id, rolle, aktiv')
    .single();
  if (error) throw new Error(`opdaterEllerOpretBruger: ${error.message}`);
  return ny;
}

export async function opretSession(brugerId, rolle) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttl = SESSION_TTL_SEKUNDER[rolle] ?? SESSION_TTL_SEKUNDER.bruger;
  const udloeber = new Date(Date.now() + ttl * 1000).toISOString();
  const { error } = await supabase()
    .from('sessioner')
    .insert({ bruger_id: brugerId, token_hash: hashToken(token), udloeber });
  if (error) throw new Error(`opretSession: ${error.message}`);
  return { token, ttl };
}

export function parseCookies(headerStr) {
  const ud = {};
  (headerStr || '').split(';').forEach((del) => {
    const i = del.indexOf('=');
    if (i === -1) return;
    ud[del.slice(0, i).trim()] = decodeURIComponent(del.slice(i + 1).trim());
  });
  return ud;
}

/**
 * Host-only: intet Domain-attribut sættes (CLAUDE.md §7/§10).
 */
export function saetSessionCookie(token, ttlSekunder) {
  return `${COOKIE_NAVN}=${token}; Path=/; Max-Age=${ttlSekunder}; HttpOnly; Secure; SameSite=Lax`;
}

export function ryddSessionCookie() {
  return `${COOKIE_NAVN}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * Slår sessionscookien fra en indkommende request op mod `sessioner` + `brugere`.
 * @param {{headers: {get(name: string): string|null}}} req
 * @returns {Promise<{brugerId: string, rolle: string, tokenHash: string}|null>}
 */
export async function hentSessionFraRequest(req) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const token = cookies[COOKIE_NAVN];
  if (!token) return null;

  const tokenHash = hashToken(token);
  const { data, error } = await supabase()
    .from('sessioner')
    .select('bruger_id, udloeber, tilbagekaldt, brugere!inner(rolle, aktiv)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.tilbagekaldt) return null;
  if (new Date(data.udloeber).getTime() <= Date.now()) return null;
  if (!data.brugere.aktiv) return null;

  // "Sidst set" er kun til drift/observability — en fejl her må aldrig vælte
  // et ellers gyldigt opslag.
  supabase().from('sessioner').update({ sidst_set: new Date().toISOString() })
    .eq('token_hash', tokenHash).then(() => {}, () => {});

  return { brugerId: data.bruger_id, rolle: data.brugere.rolle, tokenHash };
}

export async function tilbagekaldSession(tokenHash) {
  const { error } = await supabase()
    .from('sessioner')
    .update({ tilbagekaldt: new Date().toISOString() })
    .eq('token_hash', tokenHash);
  if (error) throw new Error(`tilbagekaldSession: ${error.message}`);
}

// POST /api/auth-verificer  { email, kode }
//
// Selve kodeverifikationen sker i PA-flowet "OTP Verify - Intern" (genbrugt, se
// lib/pa-otp.js). Rolle og session hører fortsat til den nye platform (CLAUDE.md §9.3):
// PA ved intet om bruger/admin — det styres alene af `brugere` i Supabase.

import { verificerKode } from './lib/pa-otp.js';
import { hashEmail } from './lib/pseudonym.js';
import { opdaterEllerOpretBruger, opretSession, saetSessionCookie } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  let email = '';
  let kode = '';
  try {
    const body = await req.json();
    email = String(body?.email || '').trim().toLowerCase();
    kode = String(body?.kode || '').trim();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!email || !kode) {
    return new Response(JSON.stringify({ ok: false, besked: 'Mail og kode skal udfyldes.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { ok, data } = await verificerKode(email, kode);
    if (!ok) {
      return new Response(
        JSON.stringify({ ok: false, besked: data?.message || 'Forkert eller udløbet kode.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailHash = hashEmail(email);
    const bruger = await opdaterEllerOpretBruger(emailHash);
    if (!bruger.aktiv) {
      return new Response(JSON.stringify({ ok: false, besked: 'Kontoen er lukket.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { token, ttl } = await opretSession(bruger.id, bruger.rolle);
    return new Response(JSON.stringify({ ok: true, rolle: bruger.rolle }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': saetSessionCookie(token, ttl)
      }
    });
  } catch (e) {
    console.error('auth-verificer: fejlede', e.message);
    return new Response(JSON.stringify({ ok: false, besked: 'Der gik noget galt. Prøv igen om lidt.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

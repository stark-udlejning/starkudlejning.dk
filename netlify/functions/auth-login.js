// POST /api/auth-login  { email }
//
// Proxier direkte til PA-flowet "OTP Login - Intern" (samme som intern.html bruger).
// Bevidst valg — se lib/pa-otp.js og docs/hub-plan.md. Svaret afspejler derfor
// flowets egen semantik: 200 hvis mailen findes i SharePoint-allowlisten og koden er
// sendt, 404 hvis den ikke findes. Det er IKKE den generiske "identisk svar uanset
// udfald"-adfærd fra CLAUDE.md §7 — det er en kendt konsekvens af at genbruge flowet.

import { anmodOmKode } from './lib/pa-otp.js';

const STARK_MAIL = /^[^\s@]+@stark\.dk$/i;

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email || '').trim().toLowerCase();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!email) {
    return new Response(JSON.stringify({ ok: false, besked: 'Mailadresse mangler.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Billig, lokal afvisning af åbenlyst forkerte domæner, før PA-flowet kaldes.
  // Selve allowlisten ligger stadig i SharePoint via flowet, ikke her.
  if (!STARK_MAIL.test(email)) {
    return new Response(
      JSON.stringify({ ok: false, besked: 'Kun @stark.dk-mailadresser kan logge ind.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { ok, status, data } = await anmodOmKode(email);
    return new Response(
      JSON.stringify({ ok, besked: data?.message || (ok ? 'Kode sendt.' : 'Mailen blev ikke fundet.') }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('auth-login: PA-flow fejlede', e.message);
    return new Response(JSON.stringify({ ok: false, besked: 'Der gik noget galt. Prøv igen om lidt.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

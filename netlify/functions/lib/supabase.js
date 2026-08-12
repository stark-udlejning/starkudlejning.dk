// Supabase-adgang. Kun serverside. Jf. CLAUDE.md §5.2.
//
// Browseren taler ALDRIG direkte med Supabase. Der findes derfor bevidst ingen
// anon-key-klient i dette repo — al læsning og skrivning går gennem en function,
// der først har autoriseret kaldet.
//
// Klienten bruger service role og går uden om RLS. RLS er defence-in-depth: den
// sikrer, at en lækket anon-nøgle ikke kan læse noget som helst (se migration 001).
// Autorisationen ligger i functionen, ikke i databasen.

import { createClient } from '@supabase/supabase-js';

let klient = null;

export class SupabaseKonfigurationsfejl extends Error {
  constructor(besked) {
    super(besked);
    this.name = 'SupabaseKonfigurationsfejl';
  }
}

/**
 * Returnerer den delte service-role-klient. Genbruges på tværs af invocations i
 * samme container — createClient er dyr nok til at det tæller på en kold function.
 */
export function supabase() {
  if (klient) return klient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new SupabaseKonfigurationsfejl('SUPABASE_URL mangler i Netlify env vars');
  if (!key) {
    throw new SupabaseKonfigurationsfejl(
      'SUPABASE_SERVICE_ROLE_KEY mangler i Netlify env vars'
    );
  }

  klient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'starkudlejning' } }
  });
  return klient;
}

/**
 * Læser en sats fra `konfiguration` som tal.
 *
 * `??` og ikke `||` (CLAUDE.md §5.4): en sats på 0 er gyldig — 0 % risikotillæg
 * findes i virkeligheden — og må aldrig blive erstattet af et fallback.
 * Findes nøglen ikke, kastes der. Beregning på en gættet sats er værre end en fejl.
 */
export async function hentSats(noegle) {
  const { data, error } = await supabase()
    .from('konfiguration')
    .select('vaerdi')
    .eq('noegle', noegle)
    .maybeSingle();

  if (error) throw new Error(`konfiguration: kunne ikke læse "${noegle}": ${error.message}`);
  if (!data) throw new Error(`konfiguration: nøglen "${noegle}" findes ikke`);

  const tal = Number(data.vaerdi);
  if (!Number.isFinite(tal)) {
    throw new Error(`konfiguration: "${noegle}" er ikke et tal: ${JSON.stringify(data.vaerdi)}`);
  }
  return tal;
}

/**
 * Satserne til beregningskæden, i den form `lib/pricing.js` forventer dem.
 * Ét opslag her frem for hardkodede tal spredt ud i koden — se docs/kortlaegning.md §4.1.
 */
export async function hentSatser() {
  const [risikoPct, miljoePct] = await Promise.all([
    hentSats('risiko_pct'),
    hentSats('miljoe_pct')
  ]);
  return { risikoPct, miljoePct };
}

// Kalder de EKSISTERENDE PA-flows "OTP Login - Intern" og "OTP Verify - Intern" —
// samme flows som intern.html bruger i dag.
//
// BEVIDST VALG, IKKE DEFAULT-ANBEFALINGEN I CLAUDE.md §7. Produktejeren har valgt
// eksplicit at genbruge det gamle flow for at undgå at vedligeholde to OTP-mekanismer,
// vel vidende at flowet (jf. docs/datagrundlag.md §4.3) fejler flere af §7's krav:
// adgangen er en SharePoint-allowlist (ikke "enhver @stark.dk"), koden sammenlignes i
// PA i stedet for som hash, og svaret på "kode sendt" afslører om mailen findes i
// listen. Se docs/hub-plan.md for hele afvejningen. Rør IKKE dette uden at spørge —
// CLAUDE.md §7 og denne fil er bevidst uenige, og det er ikke en fejl der skal rettes.
//
// Det der STADIG er den nye platforms ansvar, uændret: rolle (bruger/admin) og
// session ligger i Supabase (`brugere`, `sessioner`), ikke i PA. Se lib/auth.js.

export class PaOtpFejl extends Error {
  constructor(besked, statusCode) {
    super(besked);
    this.name = 'PaOtpFejl';
    this.statusCode = statusCode;
  }
}

async function kaldFlow(urlEnvNavn, payload) {
  const url = process.env[urlEnvNavn];
  if (!url) {
    throw new PaOtpFejl(
      `${urlEnvNavn} mangler i Netlify env vars. Skal sættes til samme flow-trigger-URL ` +
      'som det gamle stark-udlejning-site bruger til intern.html (se docs/hub-plan.md).',
      500
    );
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const svar = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const data = await svar.json().catch(() => ({}));
    return { ok: svar.ok, status: svar.status, data };
  } catch (e) {
    const besked = e.name === 'AbortError' ? 'Flowet svarede ikke i tide' : e.message;
    throw new PaOtpFejl(besked, 502);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Beder "OTP Login - Intern" om at sende en kode.
 * Flowet selv afgør, om `mail` findes i SharePoint-allowlisten — 200 hvis den
 * findes og koden er sendt, 404 hvis den ikke findes.
 */
export async function anmodOmKode(mail) {
  return kaldFlow('PA_OTP_LOGIN_URL', { mail });
}

/**
 * Beder "OTP Verify - Intern" om at tjekke en indtastet kode.
 * 200 hvis koden matcher og ikke er udløbet, 401 ellers.
 */
export async function verificerKode(mail, otp) {
  return kaldFlow('PA_OTP_VERIFY_URL', { mail, otp });
}

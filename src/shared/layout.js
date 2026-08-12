// Delt header og footer. Ingen framework, ingen build.
//
// Modulet renderer markup og håndterer log ud. Det afgør INTET om adgang:
// hvad brugeren må, bestemmes serverside i den function, der leverer data
// (CLAUDE.md §5.2). En skjult knap er ikke adgangskontrol.

/**
 * Henter den aktuelle bruger fra /api/auth-mig.
 * Svaret indeholder `{ bruger_id, rolle }` — aldrig mail eller navn (CLAUDE.md §4).
 *
 * @returns {Promise<{bruger_id: string, rolle: string}|null>} null hvis ikke logget ind.
 */
export async function hentBruger() {
  try {
    const svar = await fetch('/api/auth-mig', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!svar.ok) return null;
    return await svar.json();
  } catch {
    // Netværksfejl skal ikke vælte siden. Kalderen behandler null som "ikke logget ind".
    return null;
  }
}

export async function logUd() {
  try {
    await fetch('/api/auth-logud', { method: 'POST', credentials: 'same-origin' });
  } finally {
    // Uanset hvad serveren svarede, skal brugeren ende på login.
    window.location.href = '/login';
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/**
 * Bygger header-markup.
 * @param {object} [valg]
 * @param {boolean} [valg.loggetInd]  Viser "Log ud" når true.
 * @param {string}  [valg.tag]        Etiket ved logoet, fx 'Admin'.
 */
export function headerMarkup({ loggetInd = true, tag = 'Udlejning' } = {}) {
  return `
    <header class="header">
      <div class="indhold header__rk">
        <a class="logo" href="/">
          <span class="logo__mark" aria-hidden="true">S</span>
          <span class="logo__navn">Stark</span>
          <span class="logo__tag">${esc(tag)}</span>
        </a>
        ${loggetInd
          ? '<button type="button" class="knap knap--sekundaer" data-handling="log-ud">Log ud</button>'
          : ''}
      </div>
    </header>`;
}

export function footerMarkup() {
  const aar = new Date().getFullYear();
  return `
    <footer class="footer">
      <div class="indhold footer__rk">
        <span>STARK Udlejning · internt værktøj</span>
        <span>&copy; ${aar} STARK Danmark A/S</span>
      </div>
    </footer>`;
}

/**
 * Indsætter header og footer i pladsholdere med id "header" og "footer",
 * og kobler log ud-knappen.
 */
export function monterLayout(valg = {}) {
  const h = document.getElementById('header');
  if (h) h.outerHTML = headerMarkup(valg);

  const f = document.getElementById('footer');
  if (f) f.outerHTML = footerMarkup();

  document.querySelector('[data-handling="log-ud"]')
    ?.addEventListener('click', logUd);
}

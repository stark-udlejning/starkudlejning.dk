import { hentBruger, monterLayout } from '/shared/layout.js';

// UI-lås, ikke adgangskontrol. De bagvedliggende sites har (eller mangler) deres
// eget login uændret — denne markering fortæller kun, at kortet hører til
// ledelsesdelen, jf. designoplægget for låste-men-synlige kort (CLAUDE.md §9.2).
function laasAdminKort(erAdmin) {
  document.querySelectorAll('[data-admin-only]').forEach((kort) => {
    if (erAdmin) return;
    kort.classList.add('kort--laast');
    kort.setAttribute('aria-disabled', 'true');
    kort.querySelector('.kort__titel')
      ?.insertAdjacentHTML('beforeend', ' <span class="badge badge--neutral">Kræver admin</span>');
    kort.addEventListener('click', (e) => e.preventDefault());
  });
}

(async () => {
  const bruger = await hentBruger();
  if (!bruger) {
    window.location.href = `/login?fra=${encodeURIComponent(window.location.pathname)}`;
    return;
  }
  monterLayout({ loggetInd: true, tag: 'Udlejning' });
  laasAdminKort(bruger.rolle === 'admin');
})();

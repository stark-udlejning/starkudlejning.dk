// Login-flow: mail → kode → session-cookie → videresend til hub'en (eller
// ?fra=<sti>, hvis brugeren blev sendt hertil fra en beskyttet side).

const mailFormular = document.getElementById('mail-formular');
const kodeFormular = document.getElementById('kode-formular');
const beskedOmraade = document.getElementById('besked-omraade');
const emailFelt = document.getElementById('email');
const kodeFelt = document.getElementById('kode');
const skiftMailKnap = document.getElementById('skift-mail');

let indtastetEmail = '';

function visBesked(tekst, type = 'info') {
  beskedOmraade.innerHTML = '';
  if (!tekst) return;
  const div = document.createElement('div');
  div.className = `besked besked--${type}`;
  div.textContent = tekst;
  beskedOmraade.appendChild(div);
}

function saetIndlaeser(knap, indlaeser) {
  knap.disabled = indlaeser;
  knap.dataset.tekst ??= knap.textContent;
  knap.textContent = indlaeser ? 'Sender …' : knap.dataset.tekst;
}

// Kun en relativ, same-origin sti accepteres — ellers kunne et manipuleret
// ?fra= sende en nylogget-ind bruger videre til et eksternt site.
function sikkerMaalSti(vaerdi) {
  if (!vaerdi) return '/';
  if (!vaerdi.startsWith('/') || vaerdi.startsWith('//')) return '/';
  if (vaerdi.includes('://')) return '/';
  return vaerdi;
}

mailFormular.addEventListener('submit', async (e) => {
  e.preventDefault();
  const knap = mailFormular.querySelector('button[type="submit"]');
  indtastetEmail = emailFelt.value.trim();
  saetIndlaeser(knap, true);
  visBesked('');

  try {
    const svar = await fetch('/api/auth-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: indtastetEmail })
    });
    const data = await svar.json().catch(() => ({}));
    if (!svar.ok) {
      visBesked(data.besked || 'Mailen blev ikke fundet.', 'fejl');
      return;
    }
    visBesked(data.besked || 'Kode sendt.', 'info');
    mailFormular.hidden = true;
    kodeFormular.hidden = false;
    kodeFelt.focus();
  } catch {
    visBesked('Der gik noget galt. Prøv igen om lidt.', 'fejl');
  } finally {
    saetIndlaeser(knap, false);
  }
});

kodeFormular.addEventListener('submit', async (e) => {
  e.preventDefault();
  const knap = kodeFormular.querySelector('button[type="submit"]');
  saetIndlaeser(knap, true);
  visBesked('');

  try {
    const svar = await fetch('/api/auth-verificer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: indtastetEmail, kode: kodeFelt.value.trim() })
    });
    const data = await svar.json().catch(() => ({}));
    if (!svar.ok || !data.ok) {
      visBesked(data.besked || 'Forkert eller udløbet kode.', 'fejl');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    window.location.href = sikkerMaalSti(params.get('fra'));
  } catch {
    visBesked('Der gik noget galt. Prøv igen om lidt.', 'fejl');
  } finally {
    saetIndlaeser(knap, false);
  }
});

skiftMailKnap.addEventListener('click', () => {
  kodeFormular.hidden = true;
  mailFormular.hidden = false;
  kodeFelt.value = '';
  visBesked('');
  emailFelt.focus();
});

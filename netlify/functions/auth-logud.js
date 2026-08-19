// POST /api/auth-logud — bruges af src/shared/layout.js (logUd()).

import { hentSessionFraRequest, tilbagekaldSession, ryddSessionCookie } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  const session = await hentSessionFraRequest(req);
  if (session) {
    try {
      await tilbagekaldSession(session.tokenHash);
    } catch (e) {
      // Brugeren skal altid kunne logge ud lokalt, selvom tilbagekaldelsen i
      // databasen af en eller anden grund fejler — cookien ryddes uanset.
      console.error('auth-logud: kunne ikke tilbagekalde session', e.message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': ryddSessionCookie() }
  });
};

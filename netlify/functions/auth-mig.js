// GET /api/auth-mig — bruges af src/shared/layout.js (hentBruger()).
// Svarer 401 hvis ikke logget ind. Aldrig mail eller navn i svaret (CLAUDE.md §4).

import { hentSessionFraRequest } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'GET') return new Response(null, { status: 405 });

  const session = await hentSessionFraRequest(req);
  if (!session) return new Response(null, { status: 401 });

  return new Response(
    JSON.stringify({ bruger_id: session.brugerId, rolle: session.rolle }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

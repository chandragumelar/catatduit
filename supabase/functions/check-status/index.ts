// ===== EDGE FUNCTION: check-status =====
// Returns user trial/paid status. Includes server_time for anti-tamper cache.
// Called once per boot (client caches 1 hour).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGIN  = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://app-catatduit.vercel.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  let email: string;
  try {
    const { data: { user }, error } = await db.auth.getUser(jwt);
    if (error || !user?.email) return json({ error: 'unauthorized' }, 401);
    email = user.email;
  } catch {
    return json({ error: 'unauthorized' }, 401);
  }

  // Upsert user — INSERT if new (trial starts now), DO NOTHING if existing
  const { error: upsertErr } = await db.from('users').upsert(
    { email },
    { onConflict: 'email', ignoreDuplicates: true }
  );
  if (upsertErr) return json({ error: 'server_error' }, 500);

  const { data: user, error: fetchErr } = await db
    .from('users')
    .select('is_paid, trial_expires')
    .eq('email', email)
    .single();

  if (fetchErr || !user) return json({ error: 'server_error' }, 500);

  const serverTime = new Date().toISOString();

  return json({
    success: true,
    is_paid: user.is_paid,
    trial_expires: user.trial_expires,
    server_time: serverTime,
    email,
  }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });
}

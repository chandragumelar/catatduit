// ===== EDGE FUNCTION: verify-key =====
// Validates license key, marks used, upgrades user to paid.
// Called from paywall.js. Uses service role key — never exposed to client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("https://obefugvlqxgawumsnctp.supabase.co")!;
const SERVICE_KEY = Deno.env.get("sb_secret_GxzACcvBl8knQZrw_WU1dg_3kbNNt5q")!;
const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://app-catatduit.vercel.app";

// Rate limit: in-memory, per IP. Resets on function cold start.
// 3 attempts per email per hour is enough for MVP.
const _attempts: Map<string, { count: number; resetAt: number }> = new Map();

function checkRateLimit(key: string, maxPerHour: number): boolean {
  const now = Date.now();
  const entry = _attempts.get(key);
  if (!entry || now > entry.resetAt) {
    _attempts.set(key, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count++;
  return true;
}

const GENERIC_FAIL = { success: false, error: "invalid_key" };

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify(GENERIC_FAIL), { status: 405 });
  }

  // Auth: must have valid Supabase JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json(GENERIC_FAIL, 401);

  let email: string;
  try {
    const supabaseUser = createClient(SUPABASE_URL, SERVICE_KEY);
    const {
      data: { user },
      error,
    } = await supabaseUser.auth.getUser(jwt);
    if (error || !user?.email) return json(GENERIC_FAIL, 401);
    email = user.email;
  } catch {
    return json(GENERIC_FAIL, 401);
  }

  // Rate limit per email
  if (!checkRateLimit(`email:${email}`, 3)) {
    return json({ success: false, error: "rate_limited" }, 429);
  }

  // Rate limit per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`ip:${ip}`, 5)) {
    return json({ success: false, error: "rate_limited" }, 429);
  }

  let key: string;
  try {
    const body = await req.json();
    key = (body.key ?? "").toString().trim().toUpperCase();
  } catch {
    return json(GENERIC_FAIL, 400);
  }

  if (!key) return json(GENERIC_FAIL, 400);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // Atomic: fetch key row + verify + update in one round trip via RPC
  // Fallback: manual two-step (select then update)
  const { data: keyRow, error: keyErr } = await db
    .from("license_keys")
    .select("key, is_used")
    .eq("key", key)
    .single();

  // Generic error for all failure cases — do not leak info
  if (keyErr || !keyRow || keyRow.is_used) return json(GENERIC_FAIL, 200);

  // Mark key used
  const { error: updateKeyErr } = await db
    .from("license_keys")
    .update({
      is_used: true,
      used_by_email: email,
      used_at: new Date().toISOString(),
    })
    .eq("key", key)
    .eq("is_used", false); // optimistic lock: fail if already used

  if (updateKeyErr) return json(GENERIC_FAIL, 200);

  // Upgrade user to paid
  const { error: updateUserErr } = await db
    .from("users")
    .update({ is_paid: true, key_used: key })
    .eq("email", email);

  if (updateUserErr) {
    // Rollback key mark — best effort
    await db
      .from("license_keys")
      .update({ is_used: false, used_by_email: null, used_at: null })
      .eq("key", key);
    return json(GENERIC_FAIL, 200);
  }

  return json({ success: true }, 200, ALLOWED_ORIGIN);
});

function json(body: unknown, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
    },
  });
}

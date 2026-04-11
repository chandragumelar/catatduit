// ===== TRIAL.JS — Trial status check, cache, routing =====
// Status route:
//   A. is_paid = true               → boot normal
//   B. trial aktif, sisa > 3 hari   → boot normal + countdown di settings
//   C. trial aktif, sisa ≤ 3 hari   → grace warning popup + countdown
//   D. expired + is_paid = false     → hard lock screen

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam
const GRACE_DAYS = 3;
const EF_CHECK_URL =
  "https://obefugvlqxgawumsnctp.supabase.co/functions/v1/check-status";

// ===== HMAC CACHE SIGNING (anti-tamper, casual) =====
// Key di-derive dari email + JWT sub — beda user beda key

async function _hmacSign(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function _buildCacheSecret(email) {
  // Pakai email + fixed app salt — tidak butuh JWT untuk derive
  return email + "_cd_trial_v1";
}

async function _writeCache(data, email) {
  const payload = JSON.stringify(data);
  const secret = await _buildCacheSecret(email);
  const sig = await _hmacSign(payload, secret);
  localStorage.setItem(
    STORAGE_KEYS.AUTH_CACHE,
    JSON.stringify({ payload, sig }),
  );
}

async function _readCache(email) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_CACHE);
    if (!raw) return null;
    const { payload, sig } = JSON.parse(raw);
    const secret = await _buildCacheSecret(email);
    const expected = await _hmacSign(payload, secret);
    if (sig !== expected) {
      // Signature mismatch — cache tampered, wipe it
      localStorage.removeItem(STORAGE_KEYS.AUTH_CACHE);
      return null;
    }
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function _cacheStillFresh(cache) {
  if (!cache?.fetched_at_local) return false;
  return Date.now() - new Date(cache.fetched_at_local).getTime() < CACHE_TTL_MS;
}

// ===== STATUS FETCH =====

async function _fetchStatusFromServer(jwt) {
  const res = await fetch(EF_CHECK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!res.ok) throw new Error(`check-status ${res.status}`);
  return res.json();
}

// ===== MAIN ENTRY =====

// Returns status object: { route: 'A'|'B'|'C'|'D', daysLeft, isPaid, email }
async function checkTrialStatus() {
  const session = await getSession();

  // Tidak ada session → arahkan ke auth screen
  if (!session) return { route: "AUTH" };

  const email = session.user.email;
  const jwt = session.access_token;

  // Coba cache dulu
  let cache = await _readCache(email);

  if (!cache || !_cacheStillFresh(cache)) {
    try {
      const serverData = await _fetchStatusFromServer(jwt);
      cache = {
        email: serverData.email,
        is_paid: serverData.is_paid,
        trial_expires: serverData.trial_expires,
        server_time: serverData.server_time,
        fetched_at_local: new Date().toISOString(),
      };
      await _writeCache(cache, email);
    } catch {
      // Offline fallback — pakai cache apapun umurnya
      if (!cache) return { route: "OFFLINE_NO_CACHE" };
    }
  }

  return _resolveRoute(cache);
}

function _resolveRoute(cache) {
  if (cache.is_paid) return { route: "A", isPaid: true, email: cache.email };

  // Hitung sisa dari server_time (bukan Date.now()) untuk anti-tamper
  const serverTime = new Date(cache.server_time);
  const trialExpires = new Date(cache.trial_expires);
  const msLeft = trialExpires - serverTime;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft > GRACE_DAYS)
    return { route: "B", daysLeft, email: cache.email };
  if (daysLeft > 0) return { route: "C", daysLeft, email: cache.email };
  return { route: "D", daysLeft: 0, email: cache.email };
}

// ===== COUNTDOWN BADGE (settings & header) =====

function renderTrialCountdown(daysLeft) {
  // Dipanggil oleh settings.js untuk render badge
  const el = document.getElementById("trial-countdown-badge");
  if (!el) return;
  el.style.display = "flex";
  el.textContent =
    daysLeft <= 0
      ? "Trial habis"
      : daysLeft === 1
        ? "Sisa 1 hari trial"
        : `Sisa ${daysLeft} hari trial`;
  el.className =
    daysLeft <= GRACE_DAYS ? "trial-badge trial-badge--warn" : "trial-badge";
}

// ===== GRACE POPUP (route C) =====

function showGracePopup(daysLeft) {
  const existing = document.getElementById("grace-popup-overlay");
  if (existing) return; // sudah tampil

  const overlay = document.createElement("div");
  overlay.id = "grace-popup-overlay";
  overlay.className = "grace-overlay";
  overlay.innerHTML = `
    <div class="grace-popup">
      <p class="grace-title">Trial kamu hampir selesai ⏳</p>
      <p class="grace-body">Sisa <strong>${daysLeft} hari</strong> lagi. Setelah itu semua catatan tetap aman, tapi app akan terkunci.</p>
      <button class="btn-primary" id="grace-btn-bayar">Lanjutkan Akses</button>
      <button class="btn-text-small" id="grace-btn-tutup">Nanti saja</button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById("grace-btn-bayar")?.addEventListener("click", () => {
    overlay.remove();
    _showScreen("screen-hardlock");
    initHardLockScreen();
  });
  document
    .getElementById("grace-btn-tutup")
    ?.addEventListener("click", () => overlay.remove());
}

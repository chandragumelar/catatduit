// ===== AUTH.JS — Supabase Magic Link auth =====
// Flow: input email → kirim magic link → user klik → callback → session

// Supabase client (anon key aman di client — RLS jaga semua table)
const _SUPABASE_URL = "https://obefugvlqxgawumsnctp.supabase.co";
const _SUPABASE_ANON = "sb_publishable_WWG7gKyRlu7ZJX6s_JuGyw_P0oG6qby";

let _supabase = null;

function getSupabase() {
  if (_supabase) return _supabase;
  // supabase-js di-load via CDN di index.html
  _supabase = window.supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON);
  return _supabase;
}

// ===== SESSION =====

async function getSession() {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  return session;
}

async function getSessionEmail() {
  const session = await getSession();
  return session?.user?.email ?? null;
}

async function getSessionJWT() {
  const session = await getSession();
  return session?.access_token ?? null;
}

function onAuthStateChange(callback) {
  getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

// ===== MAGIC LINK =====

async function sendMagicLink(email) {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://app-catatduit.vercel.app/auth/callback",
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

// Dipanggil saat app load di /auth/callback atau detect hash fragment
async function handleMagicLinkCallback() {
  const {
    data: { session },
    error,
  } = await getSupabase().auth.getSession();
  if (error) throw error;
  return session;
}

async function signOut() {
  await getSupabase().auth.signOut();
  // Hapus cache trial juga
  localStorage.removeItem(STORAGE_KEYS.AUTH_CACHE);
}

// ===== SCREENS =====

function initAuthScreens() {
  _initEmailScreen();
  _initMagicWaitScreen();
}

function _initEmailScreen() {
  const inputEl = document.getElementById("auth-email-input");
  const btnEl = document.getElementById("auth-email-btn");
  const errorEl = document.getElementById("auth-email-error");
  if (!inputEl || !btnEl) return;

  inputEl.addEventListener("input", () => {
    btnEl.disabled = !_isValidEmail(inputEl.value.trim());
    errorEl.textContent = "";
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !btnEl.disabled) btnEl.click();
  });

  btnEl.addEventListener("click", async () => {
    const email = inputEl.value.trim();
    if (!_isValidEmail(email)) return;

    btnEl.disabled = true;
    btnEl.textContent = "Mengirim...";
    errorEl.textContent = "";

    try {
      await sendMagicLink(email);
      // Simpan email sementara untuk UX (bukan auth)
      sessionStorage.setItem("cd_pending_email", email);
      _showScreen("screen-magic-wait");
      document.getElementById("auth-wait-email-display")?.textContent &&
        (document.getElementById("auth-wait-email-display").textContent =
          email);
    } catch (err) {
      errorEl.textContent = "Gagal kirim link. Coba lagi.";
      btnEl.disabled = false;
      btnEl.textContent = "Kirim Link Masuk";
    }
  });

  setTimeout(() => inputEl.focus(), 300);
}

function _initMagicWaitScreen() {
  const resendBtn = document.getElementById("auth-resend-btn");
  if (!resendBtn) return;

  let cooldown = 60;
  let timer = null;

  function startCooldown() {
    resendBtn.disabled = true;
    timer = setInterval(() => {
      cooldown--;
      resendBtn.textContent = `Kirim ulang (${cooldown}s)`;
      if (cooldown <= 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        resendBtn.textContent = "Kirim ulang link";
        cooldown = 60;
      }
    }, 1000);
  }

  startCooldown();

  resendBtn.addEventListener("click", async () => {
    const email = sessionStorage.getItem("cd_pending_email");
    if (!email) return;
    try {
      await sendMagicLink(email);
      startCooldown();
      showToast("Link baru sudah dikirim 📧");
    } catch {
      showToast("Gagal kirim ulang. Coba lagi.");
    }
  });
}

function _isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

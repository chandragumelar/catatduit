// ===== APP.JS — Main entry point, onboarding, boot =====

function initOnboarding() {
  // Bottom nav selalu disembunyikan selama onboarding
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'none';

  // Step 1 — Nama
  const inputNama = document.getElementById('input-nama');
  const btnMulai = document.getElementById('btn-mulai');
  const errorEl = document.getElementById('onboarding-error');

  if (inputNama && btnMulai) {
    inputNama.addEventListener('input', () => {
      btnMulai.disabled = inputNama.value.trim().length === 0;
      errorEl.textContent = '';
    });
    inputNama.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btnMulai.disabled) btnMulai.click();
    });
    btnMulai.addEventListener('click', () => {
      const nama = inputNama.value.trim();
      if (!nama) { errorEl.textContent = 'Nama tidak boleh kosong.'; return; }
      setData(STORAGE_KEYS.NAMA, nama);
      showOnboardingStep2();
    });
    setTimeout(() => inputNama.focus(), 300);
  }

  // Step 2 — Saldo Awal
  const inputSaldoAwal = document.getElementById('input-saldo-awal');
  const btnLanjut = document.getElementById('btn-lanjut');
  const errorSaldo = document.getElementById('onboarding-saldo-error');

  if (inputSaldoAwal && btnLanjut) {
    inputSaldoAwal.addEventListener('input', () => {
      const raw = inputSaldoAwal.value.replace(/\D/g, '');
      inputSaldoAwal.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
      const val = parseNominal(inputSaldoAwal.value);
      btnLanjut.disabled = val <= 0;
      if (errorSaldo) errorSaldo.textContent = '';
    });
    inputSaldoAwal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btnLanjut.disabled) btnLanjut.click();
    });
    btnLanjut.addEventListener('click', () => {
      const val = parseNominal(inputSaldoAwal.value);
      if (!val || val <= 0) {
        if (errorSaldo) errorSaldo.textContent = 'Isi total uang kamu sekarang.';
        return;
      }
      saveSaldoAwal(val);
      setData(STORAGE_KEYS.ONBOARDING, true);
      if (nav) nav.style.display = 'flex';
      showApp();
    });
  }
}

function showOnboardingStep2() {
  const step1 = document.getElementById('onboarding-step-1');
  const step2 = document.getElementById('onboarding-step-2');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';
  setTimeout(() => document.getElementById('input-saldo-awal')?.focus(), 200);
}

function showApp() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-app').classList.add('active');
  navigateTo('dashboard');
  if (window.lucide) lucide.createIcons();
}

function startApp() {
  if (!getData(STORAGE_KEYS.ONBOARDING, false)) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-onboarding').classList.add('active');
    initOnboarding();
    initBottomNav();
    initInputPage();
    return;
  }
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
  showApp();
}

function init() {
  try {
    localStorage.setItem('_t', '1'); localStorage.removeItem('_t');
  } catch (e) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;padding:24px;text-align:center;font-family:sans-serif;"><p>Browser kamu tidak mendukung penyimpanan lokal. Coba gunakan Chrome atau Firefox.</p></div>';
    return;
  }

  const nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'none';

  if (!isLicenseValid()) {
    document.getElementById('screen-license').classList.add('active');
    initLicenseScreen();
    return;
  }

  if (!getData(STORAGE_KEYS.ONBOARDING, false)) {
    document.getElementById('screen-onboarding').classList.add('active');
    initOnboarding();
    initBottomNav();
    initInputPage();
    return;
  }

  initBottomNav();
  initInputPage();
  if (nav) nav.style.display = 'flex';
  showApp();
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed (expected in file:// or dev):', err);
    });
  });
}

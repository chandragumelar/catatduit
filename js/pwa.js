// ===== PWA.JS — Install prompt, update banner, notifikasi =====

// ===== INSTALL PROMPT =====

let _deferredInstallPrompt = null;

function initPWA() {
  _initInstallPrompt();
  _initUpdateBanner();
  _initNotifScheduler();
}

function _initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;

    // Jangan langsung tembak — tunggu user sudah pakai app sedikit
    // Trigger setelah 3 sesi atau setelah catat transaksi pertama
    const txCount = getTransaksi().length;
    if (txCount >= 1 && !localStorage.getItem('cd_install_dismissed')) {
      _showInstallBanner();
    }
  });

  // Kalau sudah installed, sembunyikan semua install UI
  window.addEventListener('appinstalled', () => {
    _hideInstallBanner();
    localStorage.setItem('cd_app_installed', '1');
  });
}

function _showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  if (localStorage.getItem('cd_install_dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pwa-install-content">
      <span class="pwa-install-icon">📲</span>
      <div class="pwa-install-text">
        <strong>Tambah ke home screen</strong>
        <span>Akses lebih cepat, bisa offline</span>
      </div>
    </div>
    <div class="pwa-install-actions">
      <button class="btn-text-small" id="pwa-install-dismiss">Nanti</button>
      <button class="btn-primary pwa-install-btn" id="pwa-install-confirm">Pasang</button>
    </div>`;

  // Insert di bawah header dashboard
  const dashContent = document.getElementById('dashboard-content');
  dashContent?.insertAdjacentElement('afterbegin', banner);

  document.getElementById('pwa-install-confirm')?.addEventListener('click', async () => {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    const { outcome } = await _deferredInstallPrompt.userChoice;
    _deferredInstallPrompt = null;
    _hideInstallBanner();
    if (outcome === 'accepted') showToast('CatatDuit berhasil dipasang! 🎉');
  });

  document.getElementById('pwa-install-dismiss')?.addEventListener('click', () => {
    localStorage.setItem('cd_install_dismissed', '1');
    _hideInstallBanner();
  });
}

function _hideInstallBanner() {
  document.getElementById('pwa-install-banner')?.remove();
}

// ===== UPDATE BANNER =====
// Muncul kalau ada versi SW baru — minta user reload

function _initUpdateBanner() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          _showUpdateBanner(newWorker);
        }
      });
    });
  });

  // Cek update setiap kali user balik ke tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {});
    }
  });
}

function _showUpdateBanner(worker) {
  if (document.getElementById('pwa-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.className = 'pwa-update-banner';
  banner.innerHTML = `
    <span>✨ Ada versi baru CatatDuit</span>
    <button class="btn-primary pwa-update-btn" id="pwa-update-confirm">Perbarui</button>`;

  document.body.insertAdjacentElement('afterbegin', banner);

  document.getElementById('pwa-update-confirm')?.addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  });
}

// ===== NOTIFIKASI TAGIHAN =====
// Opt-in, lokal, scheduled via setTimeout (tidak butuh push server)
// Untuk reminder tagihan jatuh tempo hari ini atau besok

function _initNotifScheduler() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  // Jalankan check sekali saat app dibuka
  _checkTagihanDueNotif();
}

async function _checkTagihanDueNotif() {
  const tagihan = getTagihan();
  if (tagihan.length === 0) return;

  const { year, month } = getCurrentMonthYear();
  const today    = new Date();
  const todayStr = getTodayStr();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Filter tagihan yang jatuh tempo hari ini atau besok, belum bayar
  const due = tagihan.filter(t => {
    if (!t.jatuhTempo) return false;
    if (isTagihanPaidThisMonth(t, year, month)) return false;
    const d = new Date(t.jatuhTempo + 'T00:00:00');
    const day = d.getDate();
    const maxDay = new Date(year, month + 1, 0).getDate();
    const effectiveDay = Math.min(day, maxDay);
    const effectiveStr = new Date(year, month, effectiveDay).toISOString().split('T')[0];
    return effectiveStr === todayStr || effectiveStr === tomorrowStr;
  });

  if (due.length === 0) return;

  // Cek apakah sudah pernah notif hari ini
  const lastNotifDate = localStorage.getItem('cd_last_notif_date');
  if (lastNotifDate === todayStr) return;

  // Minta permission kalau belum
  if (Notification.permission === 'default') {
    // Jangan langsung minta — tunggu user klik opt-in di settings
    return;
  }

  if (Notification.permission === 'granted') {
    _sendTagihanNotif(due);
    localStorage.setItem('cd_last_notif_date', todayStr);
  }
}

function _sendTagihanNotif(duelist) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    const body = duelist.length === 1
      ? `${duelist[0].nama} — ${formatRupiah(duelist[0].nominal)} jatuh tempo segera.`
      : `${duelist.length} tagihan jatuh tempo segera. Cek sekarang.`;

    reg.showNotification('⏰ Reminder Tagihan — CatatDuit', {
      body,
      icon: '/catatduit/icons/icon-192.png',
      tag: 'tagihan-reminder',
      data: { url: '/catatduit/?tab=tagihan' },
    });
  }).catch(() => {});
}

// Dipanggil dari settings — tombol opt-in notifikasi
async function requestNotifPermission() {
  if (!('Notification' in window)) {
    showToast('Browser kamu tidak mendukung notifikasi.');
    return false;
  }
  if (Notification.permission === 'granted') {
    showToast('Notifikasi sudah aktif ✓');
    return true;
  }
  if (Notification.permission === 'denied') {
    showToast('Notifikasi diblokir. Aktifkan di pengaturan browser.');
    return false;
  }
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    showToast('Notifikasi tagihan aktif! ✓');
    localStorage.setItem('cd_last_notif_date', ''); // reset supaya langsung cek
    _checkTagihanDueNotif();
    return true;
  }
  return false;
}

function getNotifPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

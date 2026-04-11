// ===== PAYWALL.JS — Hard lock screen + key redemption =====
// Route D: trial expired, is_paid = false

const EF_VERIFY_URL =
  "https://obefugvlqxgawumsnctp.supabase.co/functions/v1/check-status";

const TRAKTEER_URL = "https://trakteer.id/warungdigital"; // ganti URL asli
const SAWERIA_URL = "https://saweria.co/warungdigital"; // ganti URL asli

function initHardLockScreen() {
  const container = document.getElementById("screen-hardlock");
  if (!container) return;

  container.innerHTML = `
    <div class="hardlock-wrap">
      <div class="hardlock-icon">🙏</div>
      <h2 class="hardlock-title">Masa trialmu sudah selesai</h2>
      <p class="hardlock-sub">Terima kasih sudah mencoba CatatDuit selama 14 hari.<br>Semua catatanmu tetap aman — tinggal satu langkah untuk lanjut.</p>

      <div class="hardlock-cta-group">
        <a href="${TRAKTEER_URL}" target="_blank" rel="noopener" class="btn-trakteer">
          ☕ Dukung di Trakteer
        </a>
        <a href="${SAWERIA_URL}" target="_blank" rel="noopener" class="btn-saweria">
          🌱 Dukung di Saweria
        </a>
      </div>

      <p class="hardlock-hint">Setelah bayar, kamu akan dapat key aktivasi di pesan terima kasih.</p>

      <div class="hardlock-key-section">
        <label class="hardlock-key-label">Punya key aktivasi?</label>
        <input
          type="text"
          id="hardlock-key-input"
          class="hardlock-key-input"
          placeholder="CD-XXXX-XXXX-XXXX"
          maxlength="17"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
        />
        <p class="hardlock-key-error" id="hardlock-key-error"></p>
        <button class="btn-primary" id="hardlock-key-btn" disabled>Aktifkan</button>
      </div>
    </div>`;

  _initKeyInput();
}

function _initKeyInput() {
  const inputEl = document.getElementById("hardlock-key-input");
  const btnEl = document.getElementById("hardlock-key-btn");
  const errorEl = document.getElementById("hardlock-key-error");
  if (!inputEl || !btnEl) return;

  // Auto-format CD-XXXX-XXXX-XXXX (reuse pattern dari license.js)
  inputEl.addEventListener("input", () => {
    let val = inputEl.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!val.startsWith("CD-")) val = "CD-" + val.replace(/^CD-?/, "");
    const digits = val.replace(/^CD-/, "").replace(/-/g, "");
    let formatted = "CD-";
    for (let i = 0; i < digits.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) formatted += "-";
      formatted += digits[i];
    }
    inputEl.value = formatted;
    errorEl.textContent = "";
    btnEl.disabled = formatted.length < 14;
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !btnEl.disabled) btnEl.click();
  });

  btnEl.addEventListener("click", () => _submitKey(inputEl, btnEl, errorEl));
}

async function _submitKey(inputEl, btnEl, errorEl) {
  const key = inputEl.value.trim();

  // Client-side format + checksum check dulu (reuse dari license.js)
  if (!validateLicenseKey(key)) {
    errorEl.textContent = "Format key tidak valid. Periksa kembali.";
    return;
  }

  btnEl.disabled = true;
  btnEl.textContent = "Memverifikasi...";
  errorEl.textContent = "";

  try {
    const jwt = await getSessionJWT();
    if (!jwt) throw new Error("no_session");

    const res = await fetch(EF_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ key }),
    });

    const data = await res.json();

    if (data.success) {
      // Update cache is_paid = true langsung, tidak perlu refetch
      const email = await getSessionEmail();
      if (email) {
        const cache = await _readCache(email);
        if (cache) {
          cache.is_paid = true;
          await _writeCache(cache, email);
        }
      }

      showToast("Aktivasi berhasil! Selamat datang 🎉");
      // Boot ulang dari state paid
      setTimeout(() => location.reload(), 1200);
    } else if (data.error === "rate_limited") {
      errorEl.textContent = "Terlalu banyak percobaan. Coba lagi dalam 1 jam.";
      btnEl.disabled = false;
      btnEl.textContent = "Aktifkan";
    } else {
      errorEl.textContent =
        "Key tidak valid atau sudah dipakai. Hubungi seller jika ada masalah.";
      btnEl.disabled = false;
      btnEl.textContent = "Aktifkan";
    }
  } catch {
    errorEl.textContent =
      "Koneksi gagal. Pastikan internet aktif lalu coba lagi.";
    btnEl.disabled = false;
    btnEl.textContent = "Aktifkan";
  }
}

// ===== LICENSE.JS — Client-side license key validation =====
// Format: CD-XXXX-XXXX-XXXX
// Checksum: sum of all digits mod 97 === 0 (after embedding check digit)

const LICENSE_PREFIX = 'CD-';
const LICENSE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1

function licenseChecksum(segments) {
  // segments: array of 3 strings (without prefix)
  const joined = segments.join('').toUpperCase();
  let sum = 0;
  for (let i = 0; i < joined.length; i++) {
    const idx = LICENSE_CHARSET.indexOf(joined[i]);
    if (idx === -1) return -1;
    sum = (sum * 31 + idx) % 97;
  }
  return sum;
}

function validateLicenseKey(key) {
  if (!key || typeof key !== 'string') return false;
  const upper = key.toUpperCase().trim();
  if (!upper.startsWith(LICENSE_PREFIX)) return false;
  const rest = upper.slice(LICENSE_PREFIX.length);
  const parts = rest.split('-');
  if (parts.length !== 3) return false;
  if (parts.some(p => p.length !== 4)) return false;
  for (const p of parts) {
    for (const c of p) {
      if (!LICENSE_CHARSET.includes(c)) return false;
    }
  }
  // Checksum: last char of segment[2] is check digit
  // Check: checksum of first 11 chars + check digit === 42
  const allChars = parts.join('');
  const dataChars = allChars.slice(0, 11);
  const checkChar = allChars[11];

  let sum = 0;
  for (let i = 0; i < dataChars.length; i++) {
    const idx = LICENSE_CHARSET.indexOf(dataChars[i]);
    sum = (sum * 31 + idx) % 97;
  }
  const expectedCheckIdx = 42 % LICENSE_CHARSET.length;
  const actualCheckIdx = LICENSE_CHARSET.indexOf(checkChar);

  // Check: (sum + actualCheckIdx) % 97 === 42 % 97
  return ((sum + actualCheckIdx) % 97) === (42 % 97);
}

function isLicenseValid() {
  const saved = getLicense();
  if (!saved) return false;
  return validateLicenseKey(saved);
}

function initLicenseScreen() {
  const inputEl = document.getElementById('license-input');
  const btnEl = document.getElementById('btn-license-submit');
  const errorEl = document.getElementById('license-error');

  if (!inputEl || !btnEl) return;

  // Auto-format input as user types
  inputEl.addEventListener('input', () => {
    let val = inputEl.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    // Ensure CD- prefix
    if (!val.startsWith('CD-')) {
      val = 'CD-' + val.replace(/^CD-?/, '');
    }
    // Auto-insert dashes
    const digits = val.replace(/^CD-/, '').replace(/-/g, '');
    let formatted = 'CD-';
    for (let i = 0; i < digits.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) formatted += '-';
      formatted += digits[i];
    }
    inputEl.value = formatted;
    errorEl.textContent = '';
    btnEl.disabled = formatted.length < 14;
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btnEl.disabled) btnEl.click();
  });

  btnEl.addEventListener('click', () => {
    const key = inputEl.value.trim();
    if (!validateLicenseKey(key)) {
      errorEl.textContent = 'Key tidak valid. Periksa kembali atau hubungi seller.';
      inputEl.focus();
      return;
    }
    saveLicense(key);
    showToast('Aktivasi berhasil! Selamat datang di CatatDuit 🎉');
    startApp();
  });

  setTimeout(() => inputEl.focus(), 300);
}

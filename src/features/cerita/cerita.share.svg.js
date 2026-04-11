// ===== CERITA.SHARE.SVG.JS — SVG template builder untuk share image =====
// Output: 1080x1920 SVG string

const SHARE_W = 1080;
const SHARE_H = 1920;

function buildShareSVG({ persona, totalMasuk, totalKeluar, totalNabung,
  cashflow, cashflowPositif, shareText, bulanNama, year, grad0, grad1 }) {

  const cfColor = cashflowPositif ? '#10b981' : '#ef4444';
  const cfSign  = cashflowPositif ? '+' : '';

  const nabungEl = totalNabung > 0 ? `
    <rect x="680" y="860" width="320" height="100" rx="16" fill="rgba(255,255,255,0.12)"/>
    <text x="840" y="897" font-size="22" fill="rgba(255,255,255,0.7)" text-anchor="middle">Nabung</text>
    <text x="840" y="935" font-size="34" font-weight="700" fill="#5eead4" text-anchor="middle">${_fmtSVG(totalNabung)}</text>` : '';

  const textSVG = _wrapText(shareText, 36).map((l, i) =>
    `<text x="540" y="${1420 + i * 52}" font-size="36" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-style="italic" font-family="-apple-system,sans-serif">${escHtml(l)}</text>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_W}" height="${SHARE_H}" viewBox="0 0 ${SHARE_W} ${SHARE_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${grad0}"/><stop offset="100%" stop-color="${grad1}"/>
    </linearGradient>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.06)"/>
    </linearGradient>
  </defs>
  <rect width="${SHARE_W}" height="${SHARE_H}" fill="url(#bg)"/>
  <rect width="${SHARE_W}" height="${SHARE_H}" fill="rgba(0,0,0,0.15)"/>
  <text x="540" y="180" font-size="40" fill="rgba(255,255,255,0.6)" text-anchor="middle" font-family="-apple-system,sans-serif">Cerita Bulan Ini</text>
  <text x="540" y="260" font-size="72" font-weight="700" fill="white" text-anchor="middle" font-family="-apple-system,sans-serif">${bulanNama} ${year}</text>
  <text x="540" y="500" font-size="160" text-anchor="middle">${persona.icon}</text>
  <text x="540" y="610" font-size="68" font-weight="800" fill="white" text-anchor="middle" font-family="-apple-system,sans-serif">${persona.nama}</text>
  <text x="540" y="680" font-size="36" fill="rgba(255,255,255,0.75)" text-anchor="middle" font-style="italic" font-family="-apple-system,sans-serif">"${escHtml(persona.tagline)}"</text>
  <rect x="60" y="760" width="440" height="220" rx="24" fill="url(#cardBg)"/>
  <text x="280" y="827" font-size="28" fill="rgba(255,255,255,0.65)" text-anchor="middle" font-family="-apple-system,sans-serif">Masuk</text>
  <text x="280" y="910" font-size="52" font-weight="700" fill="#6ee7b7" text-anchor="middle" font-family="-apple-system,sans-serif">${_fmtSVG(totalMasuk)}</text>
  <rect x="540" y="760" width="440" height="220" rx="24" fill="url(#cardBg)"/>
  <text x="760" y="827" font-size="28" fill="rgba(255,255,255,0.65)" text-anchor="middle" font-family="-apple-system,sans-serif">Keluar</text>
  <text x="760" y="910" font-size="52" font-weight="700" fill="#fca5a5" text-anchor="middle" font-family="-apple-system,sans-serif">${_fmtSVG(totalKeluar)}</text>
  ${nabungEl}
  <rect x="60" y="1020" width="960" height="130" rx="24" fill="rgba(255,255,255,0.12)"/>
  <text x="160" y="1100" font-size="34" fill="rgba(255,255,255,0.7)" font-family="-apple-system,sans-serif">Cashflow bulan ini</text>
  <text x="980" y="1100" font-size="48" font-weight="700" fill="${cfColor}" text-anchor="end" font-family="-apple-system,sans-serif">${cfSign}${_fmtSVG(cashflow)}</text>
  <line x1="60" y1="1220" x2="1020" y2="1220" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
  ${textSVG}
  <text x="540" y="1820" font-size="32" fill="rgba(255,255,255,0.4)" text-anchor="middle" font-family="-apple-system,sans-serif">CatatDuit · app-catatduit.vercel.app</text>
</svg>`;
}

function _wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    const candidate = (cur + ' ' + w).trim();
    if (candidate.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = candidate;
  });
  if (cur) lines.push(cur);
  return lines;
}

function _fmtSVG(n) {
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toLocaleString('id-ID') + 'jt';
  if (n >= 1000)    return Math.round(n / 1000).toLocaleString('id-ID') + 'rb';
  return formatRupiah(n);
}

// ===== CERITA.JS — "Cerita Bulan Ini" feature =====
// On-demand, filter bulan+tahun, threshold 5 transaksi
// Output: fullscreen bottom sheet + print/PDF

const CERITA_MIN_TX = 15;

// ===== PERSONA ENGINE =====

const PERSONAS = [
  {
    id: 'semut',
    icon: '🐜',
    nama: 'Si Semut',
    tagline: 'Pelan tapi pasti.',
    match: (d) => d.totalMasuk > 0 && (d.totalNabung / d.totalMasuk) >= 0.20,
  },
  {
    id: 'hemat',
    icon: '🎯',
    nama: 'Si Hemat',
    tagline: 'Bulan ini kamu versi lebih baik dari diri sendiri.',
    match: (d) => d.prevKeluar > 0 && ((d.prevKeluar - d.totalKeluar) / d.prevKeluar) >= 0.20,
  },
  {
    id: 'foodie',
    icon: '🍜',
    nama: 'Si Foodie',
    tagline: 'Hidup untuk makan, bukan makan untuk hidup.',
    match: (d) => d.topKatId && ['makan'].includes(d.topKatId),
  },
  {
    id: 'nomaden',
    icon: '🛵',
    nama: 'Si Nomaden',
    tagline: 'Jalannya jauh, tapi kamu pantau terus.',
    match: (d) => d.topKatId && ['transport'].includes(d.topKatId),
  },
  {
    id: 'pejuang',
    icon: '💪',
    nama: 'Si Pejuang',
    tagline: 'Bulan ini berat, tapi kamu tetap catat.',
    match: (d) => d.cashflow < 0,
  },
  {
    id: 'rajin',
    icon: '📓',
    nama: 'Si Rajin',
    tagline: 'Data kamu lebih akurat dari kebanyakan orang.',
    match: (d) => d.konsistensiPct >= 0.80,
  },
  {
    id: 'santuy',
    icon: '☁️',
    nama: 'Si Santuy',
    tagline: 'Aman, tapi ada ruang untuk lebih baik.',
    match: (d) => d.cashflow >= 0 && d.totalNabung === 0,
  },
  {
    id: 'seimbang',
    icon: '⚖️',
    nama: 'Si Seimbang',
    tagline: 'Tidak ada yang terlalu banyak, tidak ada yang terlalu sedikit.',
    match: (d) => {
      // tidak ada satu kategori yang dominan (> 40% pengeluaran)
      if (d.totalKeluar === 0) return false;
      return d.topKatPct < 0.40;
    },
  },
  {
    id: 'pencatat',
    icon: '📱',
    nama: 'Si Pencatat',
    tagline: 'Sudah catat, itu langkah pertama yang paling penting.',
    match: () => true, // fallback
  },
];

function getPersona(data) {
  return PERSONAS.find(p => p.match(data)) || PERSONAS[PERSONAS.length - 1];
}

// ===== KALKULASI DATA CERITA =====

function calcCeritaData(year, month) {
  const txList = getTransaksi();
  const txBulan = txList.filter(tx => isSameMonth(tx.tanggal, year, month));

  if (txBulan.length < CERITA_MIN_TX) {
    return { ready: false, txCount: txBulan.length };
  }

  const totalMasuk  = txBulan.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar = txBulan.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung = txBulan.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);
  const cashflow    = totalMasuk - totalKeluar;

  // Bulan lalu
  const prevDate  = new Date(year, month - 1, 1);
  const prevKeluar = txList
    .filter(tx => tx.jenis === 'keluar' && isSameMonth(tx.tanggal, prevDate.getFullYear(), prevDate.getMonth()))
    .reduce((s, tx) => s + tx.nominal, 0);

  // Top kategori
  const katTotal = {};
  txBulan.filter(tx => tx.jenis === 'keluar').forEach(tx => {
    katTotal[tx.kategori] = (katTotal[tx.kategori] || 0) + tx.nominal;
  });
  const katSorted = Object.entries(katTotal).sort((a, b) => b[1] - a[1]);
  const topKatId  = katSorted[0]?.[0] || null;
  const topKatPct = topKatId && totalKeluar > 0 ? katTotal[topKatId] / totalKeluar : 0;
  const top3      = katSorted.slice(0, 3);

  // Konsistensi
  const hariDalamBulan = new Date(year, month + 1, 0).getDate();
  const hariAdaTx      = new Set(txBulan.map(tx => tx.tanggal)).size;
  // untuk bulan berjalan, denominator = hari yang sudah lewat
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const hariDenom = isCurrentMonth ? now.getDate() : hariDalamBulan;
  const konsistensiPct = hariAdaTx / hariDenom;

  // Streak
  const streak = _calcCeritaStreak(txList);

  // Shareable sentence
  const nama = getNama();
  const shareText = _buildShareText({ nama, cashflow, prevKeluar, totalKeluar, totalNabung, totalMasuk, isCurrentMonth });

  const data = {
    totalMasuk, totalKeluar, totalNabung, cashflow,
    prevKeluar, topKatId, topKatPct, top3, katTotal,
    konsistensiPct, hariAdaTx, hariDenom, hariDalamBulan,
    streak, nama, isCurrentMonth, txCount: txBulan.length,
  };

  const persona = getPersona(data);

  return { ready: true, ...data, persona, shareText };
}

function _calcCeritaStreak(txList) {
  const dates = new Set(txList.map(tx => tx.tanggal));
  let streak = 0;
  const d = new Date();
  if (!dates.has(d.toISOString().split('T')[0])) d.setDate(d.getDate() - 1);
  while (true) {
    const str = d.toISOString().split('T')[0];
    if (!dates.has(str)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ===== SHAREABLE SENTENCE =====

const _ceritaSeed = Math.random() < 0.5 ? 0 : 1;
function _cPick(a, b) { return _ceritaSeed === 0 ? a : b; }

function _buildShareText({ nama, cashflow, prevKeluar, totalKeluar, totalNabung, totalMasuk, isCurrentMonth }) {
  const suffix = isCurrentMonth ? ' (sampai hari ini)' : '';

  if (cashflow > 0 && prevKeluar > 0 && totalKeluar < prevKeluar) {
    const pct = Math.round(((prevKeluar - totalKeluar) / prevKeluar) * 100);
    return _cPick(
      `${nama} lebih hemat ${pct}% dari bulan lalu${suffix}. Diam-diam konsisten.`,
      `Pengeluaran turun ${pct}% dari bulan lalu${suffix}. Bukan kebetulan — ini hasil kebiasaan catat.`,
    );
  }
  if (totalNabung > 0 && totalMasuk > 0) {
    const pct = Math.round((totalNabung / totalMasuk) * 100);
    return _cPick(
      `${pct}% dari pemasukan sudah disisihkan${suffix}. Si Semut memang tidak pernah panik.`,
      `${nama} sisihkan ${_fmt(totalNabung)} buat nabung${suffix}. Langkah kecil yang berarti.`,
    );
  }
  if (cashflow < 0) {
    return _cPick(
      `Bulan ini berat. Tapi ${nama} tetap catat, dan itu yang penting${suffix}.`,
      `Pengeluaran melebihi pemasukan ${_fmt(Math.abs(cashflow))}${suffix}. Bulan depan mulai dari data ini.`,
    );
  }
  if (cashflow > 0) {
    return _cPick(
      `Cashflow positif ${_fmt(cashflow)}${suffix}. ${nama} pegang kendali.`,
      `${nama} tutup bulan ini dengan sisa ${_fmt(cashflow)}${suffix}. Solid.`,
    );
  }
  return `${nama} sudah catat keuangan bulan ini. Itu sudah cukup untuk mulai.`;
}

// Format angka human-readable: 2100000 → "2,1jt", 450000 → "450rb"
function _fmt(n) {
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toLocaleString('id-ID') + 'jt';
  if (n >= 1000)    return Math.round(n / 1000).toLocaleString('id-ID') + 'rb';
  return formatRupiah(n);
}

// ===== RENDER =====

function openCerita(year, month) {
  document.getElementById('cerita-overlay')?.remove();

  const data = calcCeritaData(year, month);
  const bulanNama = BULAN_NAMES[month];
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;
  const badgeText = isCurrentMonth ? 'Sampai hari ini' : 'Final';

  const overlay = document.createElement('div');
  overlay.id = 'cerita-overlay';
  overlay.className = 'cerita-overlay';

  // Filter bar HTML
  const now = new Date();
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const txCount = getTransaksi().filter(tx => isSameMonth(tx.tanggal, y, m)).length;
    if (txCount > 0) {
      monthOptions.push(`<option value="${y}-${m}" ${y === year && m === month ? 'selected' : ''}>${BULAN_NAMES[m]} ${y}</option>`);
    }
  }

  overlay.innerHTML = `
    <div class="cerita-sheet" id="cerita-sheet">
      <div class="cerita-topbar">
        <select class="cerita-filter" id="cerita-month-select">
          ${monthOptions.join('')}
        </select>
        <button class="cerita-close" id="cerita-close">✕</button>
      </div>

      <div class="cerita-body" id="cerita-body">
        ${data.ready ? _renderCeritaContent(data, bulanNama, year, badgeText) : _renderCeritaEmpty(data)}
      </div>

      ${data.ready ? `
      <div class="cerita-actions">
        <button class="btn-primary cerita-print-btn" id="cerita-print">
          💾 Simpan / Print PDF
        </button>
      </div>` : ''}
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  document.getElementById('cerita-close').addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 300); } });

  document.getElementById('cerita-month-select')?.addEventListener('change', (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    overlay.remove();
    openCerita(y, m);
  });

  document.getElementById('cerita-print')?.addEventListener('click', () => _printCerita(data, bulanNama, year));
}

function _renderCeritaContent(data, bulanNama, year, badgeText) {
  const { persona, totalMasuk, totalKeluar, totalNabung, cashflow,
          top3, konsistensiPct, hariAdaTx, hariDenom, shareText } = data;

  const cashflowPositif = cashflow >= 0;

  return `
    <div class="cerita-content" id="cerita-printable">

      <div class="cerita-header">
        <span class="cerita-bulan">${bulanNama} ${year}</span>
        <span class="cerita-badge">${badgeText}</span>
      </div>

      <div class="cerita-persona">
        <div class="cerita-persona-icon">${persona.icon}</div>
        <div class="cerita-persona-nama">${persona.nama}</div>
        <div class="cerita-persona-tagline">"${persona.tagline}"</div>
      </div>

      <div class="cerita-angka-grid">
        <div class="cerita-angka-item">
          <div class="cerita-angka-label">Masuk</div>
          <div class="cerita-angka-value income">${_fmt(totalMasuk)}</div>
        </div>
        <div class="cerita-angka-item">
          <div class="cerita-angka-label">Keluar</div>
          <div class="cerita-angka-value expense">${_fmt(totalKeluar)}</div>
        </div>
        ${totalNabung > 0 ? `
        <div class="cerita-angka-item">
          <div class="cerita-angka-label">Nabung</div>
          <div class="cerita-angka-value nabung">${_fmt(totalNabung)}</div>
        </div>` : ''}
      </div>

      <div class="cerita-cashflow ${cashflowPositif ? 'positif' : 'negatif'}">
        <span class="cerita-cashflow-label">Cashflow bulan ini</span>
        <span class="cerita-cashflow-value">${cashflowPositif ? '+' : ''}${_fmt(cashflow)}</span>
      </div>

      ${top3.length > 0 ? `
      <div class="cerita-terboros">
        <div class="cerita-section-label">Terboros</div>
        ${top3.map(([katId, val]) => {
          const k = getKategoriById(katId, 'keluar');
          const pct = totalKeluar > 0 ? Math.round((val / totalKeluar) * 100) : 0;
          return `
          <div class="cerita-kat-row">
            <span class="cerita-kat-icon">${k.icon}</span>
            <span class="cerita-kat-nama">${escHtml(k.nama)}</span>
            <span class="cerita-kat-val">${_fmt(val)}</span>
            <span class="cerita-kat-pct">${pct}%</span>
          </div>`;
        }).join('')}
      </div>` : ''}

      <div class="cerita-konsistensi">
        <div class="cerita-section-label">Konsistensi catat</div>
        <div class="cerita-konsistensi-text">${hariAdaTx} dari ${hariDenom} hari</div>
        <div class="cerita-bar-wrap">
          <div class="cerita-bar" style="width:${Math.round(konsistensiPct * 100)}%"></div>
        </div>
      </div>

      <div class="cerita-share-text">
        "${escHtml(shareText)}"
      </div>

      <div class="cerita-watermark">CatatDuit · app-catatduit.vercel.app</div>
    </div>`;
}

function _renderCeritaEmpty(data) {
  return `
    <div class="cerita-empty">
      <div class="cerita-empty-icon">📖</div>
      <p class="cerita-empty-title">Ceritanya belum lengkap</p>
      <p class="cerita-empty-desc">
        ${data.txCount === 0
          ? 'Belum ada catatan di bulan ini.'
          : `Baru ${data.txCount} catatan. Tambah ${CERITA_MIN_TX - data.txCount} lagi biar ceritanya lebih lengkap.`}
      </p>
    </div>`;
}

// ===== PRINT / PDF =====

function _printCerita(data, bulanNama, year) {
  const content = document.getElementById('cerita-printable')?.innerHTML || '';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>CatatDuit — ${bulanNama} ${year}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, sans-serif; background: #f9fafb; display:flex; justify-content:center; padding:24px; }
    .cerita-content { max-width:390px; width:100%; background:white; border-radius:20px; padding:24px; }
    .cerita-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .cerita-bulan { font-size:13px; color:#6b7280; font-weight:500; }
    .cerita-badge { font-size:11px; background:#f3f4f6; color:#9ca3af; padding:3px 8px; border-radius:20px; }
    .cerita-persona { text-align:center; padding:20px 0; }
    .cerita-persona-icon { font-size:56px; margin-bottom:8px; }
    .cerita-persona-nama { font-size:22px; font-weight:700; color:#111827; margin-bottom:4px; }
    .cerita-persona-tagline { font-size:13px; color:#6b7280; font-style:italic; }
    .cerita-angka-grid { display:flex; gap:10px; margin:16px 0; }
    .cerita-angka-item { flex:1; background:#f9fafb; border-radius:12px; padding:12px; text-align:center; }
    .cerita-angka-label { font-size:11px; color:#9ca3af; margin-bottom:4px; }
    .cerita-angka-value { font-size:16px; font-weight:700; }
    .income { color:#059669; } .expense { color:#dc2626; } .nabung { color:#0d9488; }
    .cerita-cashflow { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-radius:12px; margin-bottom:16px; }
    .cerita-cashflow.positif { background:#ecfdf5; }
    .cerita-cashflow.negatif { background:#fef2f2; }
    .cerita-cashflow-label { font-size:13px; color:#6b7280; }
    .cerita-cashflow-value { font-size:18px; font-weight:700; }
    .cerita-cashflow.positif .cerita-cashflow-value { color:#059669; }
    .cerita-cashflow.negatif .cerita-cashflow-value { color:#dc2626; }
    .cerita-section-label { font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
    .cerita-terboros { margin-bottom:16px; }
    .cerita-kat-row { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid #f3f4f6; }
    .cerita-kat-icon { font-size:16px; }
    .cerita-kat-nama { flex:1; font-size:13px; color:#374151; }
    .cerita-kat-val { font-size:13px; font-weight:600; color:#111827; }
    .cerita-kat-pct { font-size:11px; color:#9ca3af; width:32px; text-align:right; }
    .cerita-konsistensi { margin-bottom:16px; }
    .cerita-konsistensi-text { font-size:13px; color:#374151; margin-bottom:6px; }
    .cerita-bar-wrap { height:6px; background:#f3f4f6; border-radius:3px; }
    .cerita-bar { height:100%; background:#0d9488; border-radius:3px; }
    .cerita-share-text { font-size:14px; color:#374151; font-style:italic; line-height:1.6; text-align:center; padding:16px; background:#f9fafb; border-radius:12px; margin-bottom:16px; }
    .cerita-watermark { font-size:11px; color:#d1d5db; text-align:center; }
    @media print { body { padding:0; background:white; } .cerita-content { border-radius:0; box-shadow:none; } }
  </style>
</head>
<body>
  <div class="cerita-content">${content}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
}

// ===== DASHBOARD CARD (entry point) =====

function renderCeritaCard(container) {
  const { year, month } = getCurrentMonthYear();
  const txBulanIni = getTransaksi().filter(tx => isSameMonth(tx.tanggal, year, month));
  if (txBulanIni.length < CERITA_MIN_TX) return; // belum cukup data, card tidak muncul

  const bulanNama = BULAN_NAMES[month];
  const card = document.createElement('div');
  card.className = 'card cerita-dashboard-card';
  card.innerHTML = `
    <div class="cerita-card-inner">
      <div>
        <p class="cerita-card-label">✨ Cerita bulan ${bulanNama} siap dibaca</p>
        <p class="cerita-card-sub">Kamu sudah catat ${txBulanIni.length} transaksi bulan ini.</p>
      </div>
      <span class="cerita-card-arrow">→</span>
    </div>`;
  card.addEventListener('click', () => openCerita(year, month));
  container.appendChild(card);
}

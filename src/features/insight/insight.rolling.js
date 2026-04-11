// ===== INSIGHT.ROLLING.JS — Rolling 2-week category insight (Sprint C #19) =====
// Extend rule-based dari Sprint B Item 13 dengan:
// - window rolling 2 minggu (bukan hanya "minggu ini vs minggu lalu")
// - granular per kategori (breakdown semua kategori, bukan hanya top-1)
// - severity scoring: kecil/sedang/besar/ekstrem
// - anomaly detection: kategori yang tiba-tiba muncul / hilang
// Tidak butuh ML library — pure rule-based, 100% localStorage.

// ===== CONSTANTS =====

const ROLLING_WINDOW_DAYS = 14; // current window: today - 14 hari
const ROLLING_BASELINE_DAYS = 14; // baseline window: 15-28 hari yang lalu

const SEVERITY = {
  NONE:    { label: 'stabil',  minPct: 0,   color: 'var(--success)' },
  SMALL:   { label: 'naik tipis',  minPct: 10,  color: 'var(--text-muted)' },
  MEDIUM:  { label: 'naik',   minPct: 30,  color: 'var(--warning)' },
  HIGH:    { label: 'naik signifikan', minPct: 60,  color: 'var(--danger)' },
  EXTREME: { label: 'melonjak',    minPct: 120, color: 'var(--danger)' },
};

// ===== CORE CALC =====

/**
 * calcRollingInsight(txList)
 * 
 * Return object:
 * {
 *   windowNow:  { start, end },
 *   windowPrev: { start, end },
 *   categories: [
 *     {
 *       id, nama, icon,
 *       valNow, valPrev,
 *       pctChange,          // +/- persen, null kalau prev = 0
 *       severity,           // 'none' | 'small' | 'medium' | 'high' | 'extreme'
 *       trend,              // 'up' | 'down' | 'stable' | 'new' | 'gone'
 *       anomaly,            // bool — true kalau kategori ini muncul/hilang tiba-tiba
 *       label,              // human-readable label
 *     }
 *   ],
 *   topUp:    [...],  // sorted by pctChange desc (paling naik)
 *   topDown:  [...],  // sorted by pctChange asc (paling turun)
 *   newCats:  [...],  // kategori yang muncul di window ini tapi tidak ada sebelumnya
 *   goneCats: [...],  // kategori yang ada sebelumnya tapi tidak ada di window ini
 *   summary:  string,         // satu kalimat summary untuk display
 *   hasData:  bool,
 * }
 */
function calcRollingInsight(txList) {
  const today  = new Date();
  const msPerDay = 86400000;

  // Window now: hari ini - 14 hari ke belakang
  const endNow   = new Date(today); endNow.setHours(23, 59, 59, 999);
  const startNow = new Date(today.getTime() - (ROLLING_WINDOW_DAYS - 1) * msPerDay);
  startNow.setHours(0, 0, 0, 0);

  // Window prev: 15-28 hari lalu
  const endPrev   = new Date(today.getTime() - ROLLING_WINDOW_DAYS * msPerDay);
  endPrev.setHours(23, 59, 59, 999);
  const startPrev = new Date(today.getTime() - (ROLLING_WINDOW_DAYS + ROLLING_BASELINE_DAYS - 1) * msPerDay);
  startPrev.setHours(0, 0, 0, 0);

  const _toStr = d => d.toISOString().split('T')[0];

  const windowNow  = { start: _toStr(startNow),  end: _toStr(endNow) };
  const windowPrev = { start: _toStr(startPrev), end: _toStr(endPrev) };

  // Filter only keluar transaksi
  const txKeluar = txList.filter(tx => tx.jenis === 'keluar');

  const sumNow  = {};
  const sumPrev = {};

  txKeluar.forEach(tx => {
    const d = new Date(tx.tanggal + 'T00:00:00');
    if (d >= startNow && d <= endNow)   sumNow[tx.kategori]  = (sumNow[tx.kategori]  || 0) + tx.nominal;
    if (d >= startPrev && d <= endPrev) sumPrev[tx.kategori] = (sumPrev[tx.kategori] || 0) + tx.nominal;
  });

  const allCatIds = new Set([...Object.keys(sumNow), ...Object.keys(sumPrev)]);
  if (allCatIds.size === 0) {
    return { hasData: false, categories: [], topUp: [], topDown: [], newCats: [], goneCats: [], summary: '', windowNow, windowPrev };
  }

  const categories = [];
  allCatIds.forEach(id => {
    const valNow  = sumNow[id]  || 0;
    const valPrev = sumPrev[id] || 0;
    const katInfo = getKategoriById(id, 'keluar');

    let pctChange = null;
    let trend     = 'stable';
    let anomaly   = false;
    let severity  = 'none';

    if (valPrev > 0 && valNow > 0) {
      pctChange = Math.round(((valNow - valPrev) / valPrev) * 100);
      if (Math.abs(pctChange) < 5) trend = 'stable';
      else if (pctChange > 0) trend = 'up';
      else trend = 'down';

      // Severity (hanya untuk naik)
      if (pctChange >= SEVERITY.EXTREME.minPct) severity = 'extreme';
      else if (pctChange >= SEVERITY.HIGH.minPct) severity = 'high';
      else if (pctChange >= SEVERITY.MEDIUM.minPct) severity = 'medium';
      else if (pctChange >= SEVERITY.SMALL.minPct) severity = 'small';
      else severity = 'none';

    } else if (valPrev === 0 && valNow > 0) {
      // Kategori baru muncul di window ini
      trend   = 'new';
      anomaly = true;
    } else if (valPrev > 0 && valNow === 0) {
      // Kategori hilang di window ini
      trend   = 'gone';
      pctChange = -100;
      anomaly = true;
    }

    // Human-readable label
    const label = _buildLabel(trend, pctChange, severity, katInfo.nama);

    categories.push({
      id, nama: katInfo.nama, icon: katInfo.icon,
      valNow, valPrev,
      pctChange, severity, trend, anomaly, label,
    });
  });

  // Sort: paling naik di atas
  categories.sort((a, b) => (b.pctChange ?? -999) - (a.pctChange ?? -999));

  const topUp   = categories.filter(c => c.trend === 'up'   && c.pctChange >= 20).slice(0, 3);
  const topDown = categories.filter(c => c.trend === 'down' && c.pctChange <= -20).slice(0, 3);
  const newCats = categories.filter(c => c.trend === 'new');
  const goneCats = categories.filter(c => c.trend === 'gone');

  const summary = _buildSummary(topUp, topDown, newCats, goneCats, categories);

  return {
    hasData: true,
    categories,
    topUp,
    topDown,
    newCats,
    goneCats,
    summary,
    windowNow,
    windowPrev,
  };
}

// ===== LABEL & SUMMARY BUILDERS =====

function _buildLabel(trend, pct, severity, nama) {
  if (trend === 'new')    return `${nama} baru muncul 2 minggu ini`;
  if (trend === 'gone')   return `${nama} tidak ada di 2 minggu ini`;
  if (trend === 'stable') return `${nama} stabil`;
  if (pct === null)       return `${nama}`;
  const arrow = trend === 'up' ? '↑' : '↓';
  return `${arrow} ${nama} ${Math.abs(pct)}%`;
}

function _buildSummary(topUp, topDown, newCats, goneCats, all) {
  const parts = [];

  if (topUp.length > 0) {
    const names = topUp.map(c => c.nama).join(', ');
    const maxPct = topUp[0].pctChange;
    if (maxPct >= 120) parts.push(`${topUp[0].nama} melonjak ${maxPct}% dalam 2 minggu terakhir`);
    else if (maxPct >= 60) parts.push(`${names} naik signifikan dari 2 minggu lalu`);
    else parts.push(`${names} naik dibanding 2 minggu lalu`);
  }

  if (topDown.length > 0 && parts.length === 0) {
    parts.push(`${topDown.map(c => c.nama).join(', ')} lebih hemat dari 2 minggu lalu`);
  }

  if (parts.length === 0) {
    return 'Pola pengeluaran kamu stabil dalam 2 minggu terakhir.';
  }

  return parts.join('. ') + '.';
}

// ===== RENDER: INSIGHT CARD =====

/**
 * renderRollingInsightCard(containerId, calcData)
 * Render card breakdown rolling insight ke dalam container.
 * Dipanggil dari dashboard.js.
 */
function renderRollingInsightCard(containerId, txList) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const insight = calcRollingInsight(txList);

  if (!insight.hasData) {
    container.innerHTML = `<p class="insight-empty">Analisis siap setelah kamu catat lebih banyak transaksi 📊</p>`;
    return;
  }

  const { topUp, topDown, newCats, goneCats, summary, windowNow, windowPrev } = insight;

  let html = `
    <div class="rolling-insight-summary">${escHtml(summary)}</div>
    <div class="rolling-insight-period">
      <span class="ri-period-label">Periode ini</span>
      <span class="ri-period-date">${formatDate(windowNow.start)} – ${formatDate(windowNow.end)}</span>
    </div>
  `;

  // Top naik
  if (topUp.length > 0) {
    html += `<div class="ri-section-title">🔺 Kategori naik</div>`;
    topUp.forEach(c => {
      html += _renderRollingRow(c, 'up');
    });
  }

  // New categories
  if (newCats.length > 0) {
    html += `<div class="ri-section-title">🆕 Baru muncul</div>`;
    newCats.forEach(c => {
      html += _renderRollingRow(c, 'new');
    });
  }

  // Top turun
  if (topDown.length > 0) {
    html += `<div class="ri-section-title">🟢 Lebih hemat</div>`;
    topDown.forEach(c => {
      html += _renderRollingRow(c, 'down');
    });
  }

  // Gone categories — hanya tampil kalau ada
  if (goneCats.length > 0) {
    html += `<div class="ri-section-title ri-section-gone">Tidak ada di periode ini</div>`;
    goneCats.forEach(c => {
      html += _renderRollingRow(c, 'gone');
    });
  }

  // Baseline period label
  html += `
    <div class="ri-baseline-label">
      Dibanding: ${formatDate(windowPrev.start)} – ${formatDate(windowPrev.end)}
    </div>
  `;

  container.innerHTML = html;
}

function _renderRollingRow(c, trend) {
  const pctText = c.pctChange !== null ? `${c.pctChange > 0 ? '+' : ''}${c.pctChange}%` : 'baru';

  let pctClass = '';
  if (trend === 'up')   pctClass = c.severity === 'extreme' || c.severity === 'high' ? 'ri-pct--danger' : 'ri-pct--warn';
  if (trend === 'down') pctClass = 'ri-pct--good';
  if (trend === 'new')  pctClass = 'ri-pct--new';
  if (trend === 'gone') pctClass = 'ri-pct--gone';

  const valNowText  = c.valNow  > 0 ? formatRupiah(c.valNow)  : '—';
  const valPrevText = c.valPrev > 0 ? formatRupiah(c.valPrev) : '—';

  return `
    <div class="ri-row">
      <div class="ri-row-left">
        <span class="ri-icon">${c.icon}</span>
        <div class="ri-row-info">
          <span class="ri-nama">${escHtml(c.nama)}</span>
          <span class="ri-compare">${valPrevText} → ${valNowText}</span>
        </div>
      </div>
      <span class="ri-pct ${pctClass}">${pctText}</span>
    </div>
  `;
}

// ===== EXPORT untuk dashboard.insight.js PIPELINE =====

/**
 * getRollingInsightText(txList)
 * Dipanggil dari INSIGHT_PIPELINE di dashboard.insight.js.
 * Return satu string insight atau null kalau tidak cukup data.
 */
function getRollingInsightText(txList) {
  try {
    const insight = calcRollingInsight(txList);
    if (!insight.hasData || (!insight.topUp.length && !insight.newCats.length)) return null;
    return insight.summary;
  } catch (e) {
    return null;
  }
}

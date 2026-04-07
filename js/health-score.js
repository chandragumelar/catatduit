// ===== HEALTH-SCORE.JS — Financial Health Score (v3) =====
// 4 komponen @ 25% masing-masing. Tentang kebiasaan, bukan jumlah uang.

const HEALTH_SCORE_THRESHOLD_DAYS = 2; // muncul sejak hari ke-2

// ===== KALKULASI =====

function calcHealthScore() {
  const txList = getTransaksi();
  const { year, month } = getCurrentMonthYear();
  const today = new Date();
  const hariIni = today.getDate();
  const hariDalamBulan = new Date(year, month + 1, 0).getDate();

  // Cek threshold — belum cukup data
  const txBulanIni = txList.filter(tx => isSameMonth(tx.tanggal, year, month));
  const hariAdaTx = new Set(txBulanIni.map(tx => tx.tanggal)).size;
  if (hariAdaTx < HEALTH_SCORE_THRESHOLD_DAYS) {
    return { ready: false, hariAdaTx, threshold: HEALTH_SCORE_THRESHOLD_DAYS };
  }

  // --- Komponen 1: Konsistensi catat (25%) ---
  // Hari ada transaksi ÷ total hari yang sudah lewat bulan ini
  const hariSudahLewat = Math.min(hariIni, hariDalamBulan);
  const skorKonsistensi = Math.round((hariAdaTx / hariSudahLewat) * 100);

  // --- Komponen 2: Rasio nabung (25%) ---
  // Nominal nabung ÷ pemasukan bulan ini (cap 100)
  const totalMasuk  = txBulanIni.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung = txBulanIni.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);
  let skorNabung = 0;
  if (totalMasuk > 0) {
    const rasio = totalNabung / totalMasuk;
    // 20%+ nabung = 100, linear dari 0
    skorNabung = Math.min(Math.round((rasio / 0.20) * 100), 100);
  } else if (totalNabung > 0) {
    // Ada nabung tapi belum ada pemasukan tercatat — kasih 50
    skorNabung = 50;
  }

  // --- Komponen 3: Cashflow positif (25%) ---
  // Pengeluaran < Pemasukan → 100, sebaliknya → 0
  const totalKeluar = txBulanIni.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  const skorCashflow = (totalMasuk === 0 && totalKeluar === 0) ? 100
    : totalKeluar <= totalMasuk ? 100 : 0;

  // --- Komponen 4: Tagihan terbayar (25%) ---
  const tagihan = getTagihan();
  const tagihanBulanIni = tagihan.filter(t => {
    if (!t.jatuhTempo) return false;
    const d = new Date(t.jatuhTempo + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });
  let skorTagihan = 100; // kalau tidak ada tagihan = perfect
  if (tagihanBulanIni.length > 0) {
    const sudahBayar = tagihanBulanIni.filter(t => isTagihanPaidThisMonth(t, year, month)).length;
    skorTagihan = Math.round((sudahBayar / tagihanBulanIni.length) * 100);
  }

  // --- Total ---
  const total = Math.round((skorKonsistensi + skorNabung + skorCashflow + skorTagihan) / 4);

  return {
    ready: true,
    total,
    komponen: {
      konsistensi: { skor: skorKonsistensi, hariAdaTx, hariSudahLewat },
      nabung:      { skor: skorNabung, totalNabung, totalMasuk },
      cashflow:    { skor: skorCashflow, totalMasuk, totalKeluar },
      tagihan:     { skor: skorTagihan, tagihanBulanIni },
    },
  };
}

function getHealthLabel(score) {
  if (score >= 80) return { label: 'Keuangan sehat',   color: 'health-green',  emoji: '💚' };
  if (score >= 60) return { label: 'Lumayan baik',      color: 'health-yellow', emoji: '💛' };
  if (score >= 40) return { label: 'Perlu perhatian',   color: 'health-orange', emoji: '🟠' };
  return             { label: 'Butuh tindakan',         color: 'health-red',    emoji: '🔴' };
}

// ===== ACTION SENTENCES — 2 versi per kondisi, rotate per session =====

const _hsSeed = Math.random() < 0.5 ? 0 : 1;
function _hsPick(a, b) { return _hsSeed === 0 ? a : b; }

function getHealthActionSentence(scoreData) {
  if (!scoreData.ready) return null;
  const { total, komponen } = scoreData;
  const { konsistensi, nabung, cashflow, tagihan } = komponen;

  // Prioritas: masalah terbesar dulu
  if (cashflow.skor === 0) return _hsPick(
    'Pengeluaran bulan ini melebihi pemasukan — fokus kurangi dulu.',
    'Cashflow minus bulan ini. Tahan pengeluaran yang bisa ditunda.',
  );
  if (tagihan.skor < 50) return _hsPick(
    'Ada tagihan yang belum terbayar bulan ini — selesaikan dulu.',
    'Beberapa tagihan masih pending. Bayar sekarang biar skor naik.',
  );
  if (konsistensi.skor < 50) return _hsPick(
    'Catat lebih rutin — data yang konsisten bikin gambarannya akurat.',
    `Baru catat ${konsistensi.hariAdaTx} dari ${konsistensi.hariSudahLewat} hari. Coba catat tiap hari ya.`,
  );
  if (nabung.skor < 30 && cashflow.totalMasuk > 0) return _hsClick(
    'Belum ada catatan nabung bulan ini. Sisihkan walau sedikit.',
    'Coba sisihkan minimal 10% dari pemasukan untuk nabung.',
  );
  if (total >= 80) return _hsPick(
    'Semua komponen bagus. Pertahankan kebiasaan ini!',
    'Keuangan bulan ini terjaga. Konsisten ya!',
  );
  return _hsPick(
    'Ada ruang untuk lebih baik — tap "Kenapa?" untuk lihat detailnya.',
    'Skor bisa naik — lihat komponen mana yang perlu diperbaiki.',
  );
}

// typo guard
function _hsClick(a, b) { return _hsPick(a, b); }

// ===== PARAGRAF PENJELASAN =====

function getHealthExplanation(scoreData) {
  if (!scoreData.ready) return '';
  const { komponen } = scoreData;
  const { konsistensi, nabung, cashflow, tagihan } = komponen;

  const lines = [];

  lines.push(`Konsistensi catat: ${konsistensi.skor}/100 — kamu mencatat di ${konsistensi.hariAdaTx} dari ${konsistensi.hariSudahLewat} hari bulan ini.`);

  if (nabung.totalMasuk > 0) {
    const pct = Math.round((nabung.totalNabung / nabung.totalMasuk) * 100);
    lines.push(`Rasio nabung: ${nabung.skor}/100 — ${formatRupiah(nabung.totalNabung)} dari pemasukan ${formatRupiah(nabung.totalMasuk)} (${pct}%).`);
  } else {
    lines.push(`Rasio nabung: ${nabung.skor}/100 — belum ada pemasukan tercatat bulan ini.`);
  }

  lines.push(`Cashflow: ${cashflow.skor}/100 — ${cashflow.skor === 100 ? 'pengeluaran masih di bawah pemasukan.' : 'pengeluaran melebihi pemasukan bulan ini.'}`);

  if (tagihan.tagihanBulanIni.length > 0) {
    const sudah = tagihan.tagihanBulanIni.filter(t => isTagihanPaidThisMonth(t, new Date().getFullYear(), new Date().getMonth())).length;
    lines.push(`Tagihan: ${tagihan.skor}/100 — ${sudah} dari ${tagihan.tagihanBulanIni.length} tagihan bulan ini sudah terbayar.`);
  } else {
    lines.push(`Tagihan: ${tagihan.skor}/100 — tidak ada tagihan bulan ini.`);
  }

  return lines.join('\n');
}

// ===== RENDER =====

function renderHealthScore(container) {
  const scoreData = calcHealthScore();

  if (!scoreData.ready) {
    // Belum cukup data — tampilkan progress bar menuju threshold
    const pct = Math.round((scoreData.hariAdaTx / scoreData.threshold) * 100);
    const el = document.createElement('div');
    el.className = 'card health-score-card';
    el.innerHTML = `
      <p class="summary-label">FINANCIAL HEALTH SCORE</p>
      <p class="health-score-warming">Catat ${scoreData.threshold - scoreData.hariAdaTx} hari lagi untuk lihat skor keuanganmu.</p>
      <div class="health-progress-bar-wrap">
        <div class="health-progress-bar" style="width:${pct}%"></div>
      </div>
      <p class="health-score-sub">${scoreData.hariAdaTx} dari ${scoreData.threshold} hari tercatat</p>`;
    container.appendChild(el);
    return;
  }

  const { total } = scoreData;
  const { label, color, emoji } = getHealthLabel(total);
  const actionText = getHealthActionSentence(scoreData);

  const el = document.createElement('div');
  el.className = `card health-score-card`;
  el.innerHTML = `
    <p class="summary-label">FINANCIAL HEALTH SCORE</p>
    <div class="health-score-main">
      <div class="health-score-circle ${color}">
        <span class="health-score-number">${total}</span>
        <span class="health-score-max">/100</span>
      </div>
      <div class="health-score-right">
        <p class="health-score-label">${emoji} ${escHtml(label)}</p>
        <p class="health-score-action">${escHtml(actionText)}</p>
      </div>
    </div>
    <div class="health-score-bars">
      ${_renderKomponenBar('Catat rutin',    scoreData.komponen.konsistensi.skor)}
      ${_renderKomponenBar('Nabung',         scoreData.komponen.nabung.skor)}
      ${_renderKomponenBar('Cashflow',       scoreData.komponen.cashflow.skor)}
      ${_renderKomponenBar('Tagihan',        scoreData.komponen.tagihan.skor)}
    </div>
    <button class="btn-text-small health-score-why" id="btn-health-why">Kenapa? ▾</button>
    <div class="health-score-explanation" id="health-explanation" style="display:none;"></div>`;

  container.appendChild(el);

  document.getElementById('btn-health-why')?.addEventListener('click', () => {
    const expEl  = document.getElementById('health-explanation');
    const btnEl  = document.getElementById('btn-health-why');
    const isOpen = expEl.style.display !== 'none';
    if (isOpen) {
      expEl.style.display = 'none';
      btnEl.textContent = 'Kenapa? ▾';
    } else {
      expEl.style.display = 'block';
      expEl.innerHTML = getHealthExplanation(scoreData)
        .split('\n')
        .map(l => `<p class="health-exp-line">${escHtml(l)}</p>`)
        .join('');
      btnEl.textContent = 'Tutup ▴';
    }
  });
}

function _renderKomponenBar(label, skor) {
  const color = skor >= 80 ? 'health-green' : skor >= 60 ? 'health-yellow' : skor >= 40 ? 'health-orange' : 'health-red';
  return `
    <div class="health-komponen-row">
      <span class="health-komponen-label">${escHtml(label)}</span>
      <div class="health-komponen-bar-wrap">
        <div class="health-komponen-bar ${color}" style="width:${skor}%"></div>
      </div>
      <span class="health-komponen-skor">${skor}</span>
    </div>`;
}

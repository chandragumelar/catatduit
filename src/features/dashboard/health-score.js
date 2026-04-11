// ===== HEALTH-SCORE.JS — Financial Health Score (v4) =====
// Komponen: Konsistensi 20%, Cashflow 35%, Nabung 25%, Tagihan 20%
// Nabung di-skip + bobot redistribusi kalau tidak ada pemasukan

const HEALTH_SCORE_THRESHOLD_DAYS = 5; // 5 hari kalender sejak tanggal tx tertua

// ===== KALKULASI =====

function calcHealthScore() {
  const txList = getTransaksi();
  const { year, month } = getCurrentMonthYear();

  const txBulanIni = txList.filter(tx => isSameMonth(tx.tanggal, year, month));

  // Grace period: hitung dari tanggal tx tertua bulan ini ke hari ini
  if (txBulanIni.length === 0) {
    return { ready: false, hariAdaTx: 0, threshold: HEALTH_SCORE_THRESHOLD_DAYS };
  }

  const tanggalSorted = txBulanIni.map(tx => tx.tanggal).sort();
  const oldest = new Date(tanggalSorted[0] + 'T00:00:00');
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const hariSejakMulai = Math.round((today - oldest) / (1000 * 60 * 60 * 24)) + 1;
  const hariAdaTx = new Set(txBulanIni.map(tx => tx.tanggal)).size;

  if (hariSejakMulai < HEALTH_SCORE_THRESHOLD_DAYS) {
    return { ready: false, hariAdaTx: hariSejakMulai, threshold: HEALTH_SCORE_THRESHOLD_DAYS };
  }

  // --- Komponen 1: Konsistensi catat (20%) ---
  // Hari ada transaksi ÷ hari sejak mulai pakai
  const skorKonsistensi = Math.min(Math.round((hariAdaTx / hariSejakMulai) * 100), 100);

  // --- Komponen 2: Cashflow (35%) ---
  const totalMasuk  = txBulanIni.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar = txBulanIni.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  let skorCashflow;
  if (totalMasuk === 0 && totalKeluar === 0) {
    skorCashflow = 100; // belum ada data, netral
  } else if (totalMasuk === 0 && totalKeluar > 0) {
    skorCashflow = 20; // keluar tapi belum input gaji — mungkin belum catat, jangan 0
  } else {
    const overspendRatio = (totalKeluar - totalMasuk) / totalMasuk;
    if (overspendRatio <= 0)        skorCashflow = 100;
    else if (overspendRatio <= 0.15) skorCashflow = 70;
    else if (overspendRatio <= 0.30) skorCashflow = 45;
    else                             skorCashflow = 15;
  }

  // --- Komponen 3: Nabung (25%) — skip kalau tidak ada pemasukan ---
  const totalNabung = txBulanIni.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);
  let skorNabung = null; // null = skip
  if (totalMasuk > 0) {
    const rasio = totalNabung / totalMasuk;
    if (rasio === 0)        skorNabung = 0;
    else if (rasio <= 0.05) skorNabung = 30;
    else if (rasio <= 0.10) skorNabung = 55;
    else if (rasio <= 0.20) skorNabung = 75;
    else                    skorNabung = 100;
  }

  // --- Komponen 4: Tagihan (20%) ---
  const tagihan = getTagihan();
  const tagihanBulanIni = tagihan.filter(t => {
    if (!t.jatuhTempo) return false;
    const d = new Date(t.jatuhTempo + 'T00:00:00');
    if (t.isRecurring === false) return d.getFullYear() === year && d.getMonth() === month;
    const currentDate = new Date(year, month, 1);
    const startDate   = new Date(d.getFullYear(), d.getMonth(), 1);
    return currentDate >= startDate;
  });
  let skorTagihan = 100;
  if (tagihanBulanIni.length > 0) {
    const sudahBayar = tagihanBulanIni.filter(t => isTagihanPaidThisMonth(t, year, month)).length;
    skorTagihan = Math.round((sudahBayar / tagihanBulanIni.length) * 100);
  }

  // --- Total dengan bobot, redistribusi kalau nabung skip ---
  let total;
  if (skorNabung === null) {
    // Nabung skip: bobot 25% dibagi ke 3 komponen lain
    // Konsistensi 20→27%, Cashflow 35→46%, Tagihan 20→27%
    total = Math.round(
      (skorKonsistensi * 0.27) +
      (skorCashflow    * 0.46) +
      (skorTagihan     * 0.27)
    );
  } else {
    total = Math.round(
      (skorKonsistensi * 0.20) +
      (skorCashflow    * 0.35) +
      (skorNabung      * 0.25) +
      (skorTagihan     * 0.20)
    );
  }

  return {
    ready: true,
    total,
    nabungSkip: skorNabung === null,
    komponen: {
      konsistensi: { skor: skorKonsistensi, hariAdaTx, hariSejakMulai },
      nabung:      { skor: skorNabung ?? 0, totalNabung, totalMasuk, skip: skorNabung === null },
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
    `Baru catat ${konsistensi.hariAdaTx} dari ${konsistensi.hariSejakMulai} hari. Coba catat tiap hari ya.`,
  );
  if (nabung.skor < 30 && cashflow.totalMasuk > 0 && !nabung.skip) return _hsPick(
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

// Narasi "Kenapa?" — 2 versi per score range, rotate per session
// Terasa seperti teman yang baca kondisi keuangan lo dan ngomong langsung

function getHealthExplanation(scoreData) {
  if (!scoreData.ready) return '';
  const { total, komponen } = scoreData;
  const { konsistensi, nabung, cashflow, tagihan } = komponen;

  const now = new Date();
  const sudahBayarTagihan = tagihan.tagihanBulanIni.filter(
    t => isTagihanPaidThisMonth(t, now.getFullYear(), now.getMonth())).length;
  const totalTagihan = tagihan.tagihanBulanIni.length;

  // Bagian-bagian narasi dibangun dari data aktual
  const bagianData = _buildNarasiBagian({ konsistensi, nabung, cashflow, tagihan, sudahBayarTagihan, totalTagihan });

  if (total >= 80) return _hsPick(
    `${bagianData.akurasi} ${bagianData.cashflowPos} ${bagianData.nabungPos} ${bagianData.tagihanPos} Ini bukan keberuntungan — ini pola.`,
    `${bagianData.akurasi} ${bagianData.nabungPos} ${bagianData.tagihanPos} Kalau bulan depan sama, ini sudah jadi gaya hidupmu.`,
  );

  if (total >= 60) return _hsPick(
    `${bagianData.akurasi} ${bagianData.cashflowPos} ${bagianData.nabungNeutral} ${bagianData.tagihanNeutral} Fondasinya sudah ada — tinggal dijaga.`,
    `${bagianData.akurasi2} ${bagianData.cashflowPos} ${bagianData.tagihanNeutral} Sedikit lebih konsisten, gambarannya jauh lebih akurat.`,
  );

  if (total >= 40) return _hsPick(
    `${bagianData.akurasi2} ${bagianData.cashflowNeg} ${bagianData.tagihanNeg} Tidak harus diselesaikan semua besok — mulai dari satu hal dulu.`,
    `${bagianData.akurasi} ${bagianData.cashflowNeg} ${bagianData.nabungNeutral} ${bagianData.tagihanNeg} Satu langkah kecil sekarang lebih baik dari rencana besar yang tidak dimulai.`,
  );

  return _hsPick(
    `${bagianData.akurasi2} ${bagianData.cashflowNeg} ${bagianData.tagihanNeg} Tidak apa-apa — yang penting sekarang tahu posisinya.`,
    `${bagianData.akurasi2} ${bagianData.cashflowNeg} ${bagianData.tagihanNeg} Justru karena kamu buka app ini dan lihat angkanya — itu sudah langkah pertama yang paling susah.`,
  );
}

function _buildNarasiBagian({ konsistensi, nabung, cashflow, tagihan, sudahBayarTagihan, totalTagihan }) {
  const { hariAdaTx, hariSejakMulai } = konsistensi;
  const pctAkurasi = Math.round((hariAdaTx / hariSejakMulai) * 100);

  // Akurasi data (konsistensi catat)
  const akurasi = hariAdaTx >= hariSejakMulai * 0.8
    ? `Data bulan ini cukup lengkap — kamu catat ${hariAdaTx} dari ${hariSejakMulai} hari, jadi gambarannya bisa dipercaya.`
    : `Dari ${hariSejakMulai} hari sejak mulai, baru ${hariAdaTx} hari yang tercatat — sekitar ${100 - pctAkurasi}% pengeluaran mungkin belum terpantau.`;
  const akurasi2 = hariAdaTx >= hariSejakMulai * 0.8
    ? `${hariAdaTx} dari ${hariSejakMulai} hari tercatat — cukup untuk lihat polanya.`
    : `Catatan masuk baru ${hariAdaTx} dari ${hariSejakMulai} hari, jadi kondisi sebenarnya bisa jadi berbeda dari yang kelihatan.`;

  // Cashflow
  const selisihCashflow = Math.abs(cashflow.totalMasuk - cashflow.totalKeluar);
  const cashflowPos = cashflow.totalMasuk > 0
    ? `Pengeluaran masih terkendali di bawah pemasukan — ada sisa ${formatRupiah(selisihCashflow)} bulan ini.`
    : `Cashflow bulan ini positif.`;
  const cashflowNeg = cashflow.totalMasuk > 0
    ? `Pengeluaran sudah melewati pemasukan ${formatRupiah(selisihCashflow)} bulan ini.`
    : `Pengeluaran melebihi pemasukan bulan ini.`;

  // Nabung
  const pctNabung = nabung.totalMasuk > 0
    ? Math.round((nabung.totalNabung / nabung.totalMasuk) * 100) : 0;
  const nabungPos = nabung.totalNabung > 0
    ? `${pctNabung}% dari pemasukan sudah disisihkan untuk nabung — ${formatRupiah(nabung.totalNabung)}.`
    : `Belum ada yang disisihkan untuk nabung bulan ini.`;
  const nabungNeutral = nabung.totalNabung > 0
    ? `Ada ${formatRupiah(nabung.totalNabung)} yang sudah disisihkan.`
    : `Nabung bulan ini belum ada — satu area yang masih bisa diperkuat.`;

  // Tagihan
  const tagihanPos = totalTagihan === 0
    ? `Tidak ada tagihan bulan ini.`
    : sudahBayarTagihan === totalTagihan
      ? `Semua ${totalTagihan} tagihan bulan ini sudah lunas.`
      : `${sudahBayarTagihan} dari ${totalTagihan} tagihan sudah terbayar.`;
  const tagihanNeutral = totalTagihan === 0
    ? ``
    : sudahBayarTagihan < totalTagihan
      ? `${totalTagihan - sudahBayarTagihan} tagihan masih perlu diselesaikan.`
      : `Tagihan beres semua.`;
  const tagihanNeg = totalTagihan > 0 && sudahBayarTagihan < totalTagihan
    ? `${totalTagihan - sudahBayarTagihan} tagihan masih outstanding.`
    : ``;

  return { akurasi, akurasi2, cashflowPos, cashflowNeg, nabungPos, nabungNeutral, tagihanPos, tagihanNeutral, tagihanNeg };
}

// ===== RENDER =====

function renderHealthScore(container) {
  const scoreData = calcHealthScore();

  if (!scoreData.ready) {
    const pct = Math.round((scoreData.hariAdaTx / scoreData.threshold) * 100);
    const sisaHari = scoreData.threshold - scoreData.hariAdaTx;
    const warmupTitle = scoreData.hariAdaTx === 0
      ? 'Financial Health Score butuh beberapa hari data'
      : sisaHari === 1
        ? 'Skor keuanganmu hampir siap — 1 hari lagi!'
        : `Skor keuanganmu siap dalam ${sisaHari} hari`;
    const warmupSub = scoreData.hariAdaTx === 0
      ? `Catat transaksi selama ${scoreData.threshold} hari, lalu skor kesehatan keuanganmu akan dihitung otomatis dari cashflow, tabungan, dan tagihan.`
      : `Catat terus — butuh ${sisaHari} hari lagi supaya datanya cukup untuk menilai cashflow, tabungan, dan tagihan kamu secara akurat.`;
    const el = document.createElement('div');
    el.className = 'card health-score-card';
    el.innerHTML = `
      <p class="summary-label">FINANCIAL HEALTH SCORE</p>
      <p class="health-score-warming">${warmupTitle}</p>
      <div class="health-progress-bar-wrap">
        <div class="health-progress-bar" style="width:${pct}%"></div>
      </div>
      <p class="health-score-sub">${warmupSub}</p>`;
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
      ${_renderKomponenBar('Konsistensi',  scoreData.komponen.konsistensi.skor)}
      ${scoreData.nabungSkip
        ? _renderKomponenBarSkip('Nabung')
        : _renderKomponenBar('Nabung', scoreData.komponen.nabung.skor)}
      ${_renderKomponenBar('Cashflow',    scoreData.komponen.cashflow.skor)}
      ${_renderKomponenBar('Tagihan',     scoreData.komponen.tagihan.skor)}
    </div>
    <button class="btn-text-small health-score-why" id="btn-health-why">Kenapa? ▾</button>
    <div class="health-score-explanation" id="health-explanation" style="display:none;"></div>`;

  container.appendChild(el);

  const btnWhy = el.querySelector('#btn-health-why');
  const expEl  = el.querySelector('#health-explanation');
  if (btnWhy && expEl) {
    btnWhy.addEventListener('click', () => {
      const isOpen = expEl.style.display !== 'none';
      if (isOpen) {
        expEl.style.display = 'none';
        btnWhy.textContent = 'Kenapa? ▾';
      } else {
        expEl.style.display = 'block';
        expEl.innerHTML = getHealthExplanation(scoreData)
          .split('\n')
          .filter(Boolean)
          .map(l => `<p class="health-exp-line">${escHtml(l)}</p>`)
          .join('');
        btnWhy.textContent = 'Tutup ▴';
      }
    });
  }
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

function _renderKomponenBarSkip(label) {
  return `
    <div class="health-komponen-row">
      <span class="health-komponen-label">${escHtml(label)}</span>
      <div class="health-komponen-bar-wrap" style="display:flex;align-items:center;">
        <span style="font-size:11px;color:var(--gray-400);">belum ada pemasukan</span>
      </div>
      <span class="health-komponen-skor" style="color:var(--gray-400);">—</span>
    </div>`;
}

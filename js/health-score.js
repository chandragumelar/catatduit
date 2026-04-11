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
    if (t.isRecurring === false) return d.getFullYear() === year && d.getMonth() === month;
    const currentDate = new Date(year, month, 1);
    const startDate   = new Date(d.getFullYear(), d.getMonth(), 1);
    return currentDate >= startDate;
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
  const { hariAdaTx, hariSudahLewat } = konsistensi;
  const pctAkurasi = Math.round((hariAdaTx / hariSudahLewat) * 100);

  // Akurasi data (konsistensi catat)
  const akurasi = hariAdaTx >= hariSudahLewat * 0.8
    ? `Data bulan ini cukup lengkap — kamu catat ${hariAdaTx} dari ${hariSudahLewat} hari, jadi gambarannya bisa dipercaya.`
    : `Dari ${hariSudahLewat} hari bulan ini, baru ${hariAdaTx} hari yang tercatat — sekitar ${100 - pctAkurasi}% pengeluaran mungkin belum terpantau.`;
  const akurasi2 = hariAdaTx >= hariSudahLewat * 0.8
    ? `${hariAdaTx} dari ${hariSudahLewat} hari tercatat — cukup untuk lihat polanya.`
    : `Catatan masuk baru ${hariAdaTx} dari ${hariSudahLewat} hari, jadi kondisi sebenarnya bisa jadi berbeda dari yang kelihatan.`;

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
    // Warmup copy: beda tergantung sudah catat atau belum sama sekali
    const warmupTitle = scoreData.hariAdaTx === 0
      ? 'Yuk mulai catat keuanganmu!'
      : sisaHari === 1
        ? 'Hampir sampai — satu hari lagi!'
        : `Bagus! Catat ${sisaHari} hari lagi untuk lihat skormu.`;
    const warmupSub = scoreData.hariAdaTx === 0
      ? 'Setelah 2 hari catat, skor keuanganmu akan muncul di sini.'
      : 'Skor dihitung dari kebiasaan, bukan jumlah uang — makin rutin, makin akurat.';
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
      ${_renderKomponenBar('Akurasi data',    scoreData.komponen.konsistensi.skor)}
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

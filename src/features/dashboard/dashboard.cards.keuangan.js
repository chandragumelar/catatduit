// =============================================================================
// DASHBOARD.CARDS.KEUANGAN.JS
// Tanggung jawab: buildKeuanganCard — collapsible card "Keuangan Bulan Ini"
// Depends on: storage.*.js, utils.js, state.js
// =============================================================================


let _keuanganExpanded = false;

function buildKeuanganCard({
  wallets, estimasiSaldo, totalNabung, totalTagihanBelumBayar,
  tagihanSudahBayar, tagihanBulanIni, uangBebas, bebasDipakai, tagihan,
}) {
  const hasRincian = totalTagihanBelumBayar > 0 || totalNabung > 0;
  const heroAngka  = hasRincian ? bebasDipakai : estimasiSaldo;
  const heroClass  = heroAngka >= 0 ? 'income' : 'expense';

  const card = document.createElement('div');
  card.className = 'card keuangan-card';
  card.id = 'keuangan-bulan-ini-card';
  card.dataset.cardId = DASHBOARD_CARDS.KEUANGAN;

  function render() {
    card.innerHTML = _buildKeuanganHTML({
      heroAngka, heroClass, wallets, estimasiSaldo,
      totalTagihanBelumBayar, uangBebas,
      totalNabung, bebasDipakai,
      tagihanSudahBayar, tagihanBulanIni, tagihan,
    });

    card.querySelector('#keuangan-toggle')?.addEventListener('click', () => {
      _keuanganExpanded = !_keuanganExpanded;
      render();
    });
    card.querySelector('#btn-goto-tagihan-card')?.addEventListener('click', () => {
      state.tabunganTab = 'tagihan';
      navigateTo('tabungan');
    });
  }

  render();
  return card;
}

function _buildKeuanganHTML({
  heroAngka, heroClass, wallets, estimasiSaldo,
  totalTagihanBelumBayar, uangBebas,
  totalNabung, bebasDipakai,
  tagihanSudahBayar, tagihanBulanIni, tagihan,
}) {
  const header = `
    <div class="keuangan-collapsed" id="keuangan-toggle">
      <div class="keuangan-collapsed-left">
        <p class="summary-label">KEUANGAN BULAN INI</p>
        <p class="keuangan-hero ${heroClass}">${formatRupiah(heroAngka)}</p>
        <p class="keuangan-hint">${_keuanganExpanded ? 'Sembunyikan ▴' : 'Lihat rincian ▾'}</p>
      </div>
    </div>`;

  if (!_keuanganExpanded) return header;

  const walletRows = wallets.length > 1
    ? `<div class="keuangan-section">
        ${wallets.map(w => {
          const saldo = getSaldoWallet(w.id);
          return `<div class="keuangan-row">
            <span class="keuangan-row-label">${w.icon} ${escHtml(w.nama)}</span>
            <span class="keuangan-row-val ${saldo >= 0 ? '' : 'expense'}">${formatRupiah(saldo)}</span>
          </div>`;
        }).join('')}
      </div>`
    : '';

  const tagihanRows = totalTagihanBelumBayar > 0
    ? `<div class="keuangan-row keuangan-row--minus">
        <span>Tagihan belum dibayar</span><span>− ${formatRupiah(totalTagihanBelumBayar)}</span>
      </div>
      <div class="keuangan-divider"></div>
      <div class="keuangan-row keuangan-row--result">
        <span>Setelah tagihan</span>
        <span class="${uangBebas >= 0 ? 'income' : 'expense'}">${formatRupiah(uangBebas)}</span>
      </div>`
    : '';

  const nabungRows = totalNabung > 0
    ? `<div class="keuangan-row keuangan-row--minus">
        <span>Nabung bulan ini</span><span>− ${formatRupiah(totalNabung)}</span>
      </div>
      <div class="keuangan-divider"></div>
      <div class="keuangan-row keuangan-row--result keuangan-row--final">
        <span>Uang bebas <span style="font-size:10px;font-weight:400;color:var(--gray-400);">· setelah tagihan &amp; nabung</span></span>
        <span class="${bebasDipakai >= 0 ? 'income' : 'expense'}">${formatRupiah(bebasDipakai)}</span>
      </div>`
    : '';

  const tagihanStatus = tagihanBulanIni.length > 0
    ? `<p class="tagihan-paid-status keuangan-row--sub" style="margin-top:4px;">
        ${_buildTagihanStatusText(tagihanSudahBayar.length, tagihanBulanIni.length)}
      </p>`
    : tagihan.length === 0
      ? `<button class="btn-text-small" id="btn-goto-tagihan-card" style="margin-top:8px;">
          + Tambah tagihan rutin
        </button>`
      : '';

  return `${header}
    <div class="keuangan-detail">
      ${walletRows}
      <div class="keuangan-divider"></div>
      <div class="keuangan-row keuangan-row--sub">
        <span>Total saldo</span><span>${formatRupiah(estimasiSaldo)}</span>
      </div>
      ${tagihanRows}
      ${nabungRows}
      ${tagihanStatus}
    </div>`;
}

function _buildTagihanStatusText(sudah, total) {
  if (sudah === total)  return '✅ Semua tagihan bulan ini sudah beres!';
  if (sudah === 0)      return `${total} tagihan bulan ini belum dibayar`;
  return `${total - sudah} dari ${total} tagihan belum dibayar`;
}

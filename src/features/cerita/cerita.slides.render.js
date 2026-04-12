// =============================================================================
// CERITA.SLIDES.RENDER.JS
// Tanggung jawab: Renderer slide 1-5 Cerita Bulan Ini
// Depends on: utils.js, cerita.data.js
// =============================================================================


function _slideIntro(bulanNama, year, isCurrentMonth, txCount) {
  const badge = isCurrentMonth ? 'Sampai hari ini' : 'Rekap final';
  return `
    <div class="cs-content cs-intro">
      <div class="cs-anim cs-anim-1"><p class="cs-eyebrow">✨ Cerita Bulan Ini</p></div>
      <div class="cs-anim cs-anim-2"><h2 class="cs-title-big">${bulanNama}<br>${year}</h2></div>
      <div class="cs-anim cs-anim-3">
        <span class="cs-badge">${badge}</span>
        <p class="cs-sub">${txCount} catatan kamu bulan ini.</p>
      </div>
      <div class="cs-anim cs-anim-4"><p class="cs-hint">Geser untuk lanjut →</p></div>
    </div>`;
}

function _slideAngka(totalMasuk, totalKeluar, totalNabung, cashflow, cashflowPositif) {
  const nabungBlock = totalNabung > 0 ? `
    <div class="cs-angka-item nabung">
      <div class="cs-angka-label">Nabung</div>
      <div class="cs-angka-val">${_fmtSlide(totalNabung)}</div>
    </div>` : '';
  return `
    <div class="cs-content cs-angka-slide">
      <div class="cs-anim cs-anim-1"><p class="cs-eyebrow">Keuangan bulan ini</p></div>
      <div class="cs-anim cs-anim-2 cs-angka-grid">
        <div class="cs-angka-item masuk">
          <div class="cs-angka-label">Masuk</div>
          <div class="cs-angka-val">${_fmtSlide(totalMasuk)}</div>
        </div>
        <div class="cs-angka-item keluar">
          <div class="cs-angka-label">Keluar</div>
          <div class="cs-angka-val">${_fmtSlide(totalKeluar)}</div>
        </div>
        ${nabungBlock}
      </div>
      <div class="cs-anim cs-anim-3 cs-cashflow ${cashflowPositif ? 'positif' : 'negatif'}">
        <span class="cs-cf-label">Cashflow</span>
        <span class="cs-cf-val">${cashflowPositif ? '+' : ''}${_fmtSlide(cashflow)}</span>
      </div>
    </div>`;
}

function _slideKategori(top3, totalKeluar) {
  if (!top3.length) {
    return `<div class="cs-content"><p class="cs-eyebrow">Pengeluaran</p><p class="cs-sub">Belum ada data pengeluaran.</p></div>`;
  }
  const rows = top3.map(([katId, val]) => {
    const k   = getKategoriById(katId, 'keluar');
    const pct = totalKeluar > 0 ? Math.round((val / totalKeluar) * 100) : 0;
    return `
      <div class="cs-kat-row">
        <span class="cs-kat-icon">${k.icon}</span>
        <div class="cs-kat-info">
          <div class="cs-kat-top">
            <span class="cs-kat-nama">${escHtml(k.nama)}</span>
            <span class="cs-kat-val">${_fmtSlide(val)}</span>
          </div>
          <div class="cs-kat-bar-wrap"><div class="cs-kat-bar" style="width:${pct}%"></div></div>
        </div>
        <span class="cs-kat-pct">${pct}%</span>
      </div>`;
  }).join('');
  return `
    <div class="cs-content cs-kat-slide">
      <div class="cs-anim cs-anim-1"><p class="cs-eyebrow">Terboros bulan ini</p></div>
      <div class="cs-anim cs-anim-2 cs-kat-list">${rows}</div>
    </div>`;
}

function _fmtSlide(n) {
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toLocaleString('id-ID') + 'jt';
  if (n >= 1000)    return Math.round(n / 1000).toLocaleString('id-ID') + 'rb';
  return formatRupiah(n);
}

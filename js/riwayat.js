// ===== RIWAYAT.JS — Transaction history page =====

function renderRiwayat() {
  const txList = getTransaksi();
  const filterBulan = document.getElementById('filter-bulan');

  if (filterBulan) {
    const bulanSet = new Set(txList.map(tx => tx.tanggal.substr(0, 7)));
    const bulanArr = Array.from(bulanSet).sort((a, b) => b.localeCompare(a));
    const { year, month } = getCurrentMonthYear();
    const currentKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    filterBulan.innerHTML = bulanArr.map(b => {
      const [y, m] = b.split('-');
      return `<option value="${b}" ${b === currentKey ? 'selected' : ''}>${BULAN_NAMES[parseInt(m) - 1]} ${y}</option>`;
    }).join('');

    if (!state.riwayatFilter.bulan) {
      state.riwayatFilter.bulan = bulanArr.includes(currentKey) ? currentKey : (bulanArr[0] || null);
    }
    if (state.riwayatFilter.bulan) filterBulan.value = state.riwayatFilter.bulan;
    filterBulan.onchange = () => { state.riwayatFilter.bulan = filterBulan.value; renderRiwayatContent(); };
  }

  // Jenis filter — now includes "Nabung"
  document.querySelectorAll('#filter-jenis .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.jenis === state.riwayatFilter.jenis);
    btn.onclick = () => {
      state.riwayatFilter.jenis = btn.dataset.jenis;
      document.querySelectorAll('#filter-jenis .toggle-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.jenis === state.riwayatFilter.jenis));
      renderRiwayatContent();
    };
  });

  document.getElementById('btn-back-riwayat')?.addEventListener('click', () => navigateTo('dashboard'));
  renderRiwayatContent();
  if (window.lucide) lucide.createIcons();
}

function renderRiwayatContent() {
  const container = document.getElementById('riwayat-content');
  if (!container) return;

  let filtered = getTransaksi();
  if (state.riwayatFilter.bulan) filtered = filtered.filter(tx => tx.tanggal.startsWith(state.riwayatFilter.bulan));
  if (state.riwayatFilter.jenis !== 'semua') filtered = filtered.filter(tx => tx.jenis === state.riwayatFilter.jenis);
  filtered.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id));

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p class="empty-title">Tidak ada catatan</p><p class="empty-desc">Tidak ada catatan di periode ini.</p></div>`;
    return;
  }

  // Show totals for filtered period
  const totalMasuk = filtered.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar = filtered.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung = filtered.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);

  if (state.riwayatFilter.jenis === 'semua') {
    const summaryEl = document.createElement('div');
    summaryEl.className = 'riwayat-summary';
    summaryEl.innerHTML = `
      <div class="riwayat-sum-item income">
        <span>Masuk</span><span>${formatRupiah(totalMasuk)}</span>
      </div>
      <div class="riwayat-sum-item keluar">
        <span>Keluar</span><span>${formatRupiah(totalKeluar)}</span>
      </div>
      ${totalNabung > 0 ? `<div class="riwayat-sum-item nabung">
        <span>Nabung</span><span>${formatRupiah(totalNabung)}</span>
      </div>` : ''}`;
    container.appendChild(summaryEl);
  }

  const groups = {};
  filtered.forEach(tx => { if (!groups[tx.tanggal]) groups[tx.tanggal] = []; groups[tx.tanggal].push(tx); });

  const card = document.createElement('div');
  card.className = 'card';

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const label = document.createElement('p');
    label.className = 'tx-group-date';
    label.textContent = formatDate(date);
    card.appendChild(label);

    groups[date].forEach(tx => {
      const div = document.createElement('div');
      div.innerHTML = buildTxItemHTML(tx);
      const item = div.firstElementChild;
      item.addEventListener('click', () => openInputPage('edit', tx.id));
      card.appendChild(item);
    });
  });

  container.appendChild(card);
}

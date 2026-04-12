// ===== RIWAYAT.JS — Transaction history page (Sprint A2) =====

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
    filterBulan.onchange = () => {
      state.riwayatFilter.bulan = filterBulan.value;
      state.riwayatFilter.search = '';
      const searchEl = document.getElementById('riwayat-search');
      if (searchEl) searchEl.value = '';
      renderRiwayatContent();
    };
  }

  // Jenis filter
  document.querySelectorAll('#filter-jenis .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.jenis === state.riwayatFilter.jenis);
    btn.onclick = () => {
      state.riwayatFilter.jenis = btn.dataset.jenis;
      document.querySelectorAll('#filter-jenis .toggle-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.jenis === state.riwayatFilter.jenis));
      renderRiwayatContent();
    };
  });

  // Item 6: Searchbox
  const searchEl = document.getElementById('riwayat-search');
  if (searchEl) {
    searchEl.value = state.riwayatFilter.search || '';
    searchEl.oninput = () => {
      state.riwayatFilter.search = searchEl.value.trim().toLowerCase();
      renderRiwayatContent();
    };
    const clearBtn = document.getElementById('riwayat-search-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        searchEl.value = '';
        state.riwayatFilter.search = '';
        renderRiwayatContent();
        searchEl.focus();
      };
    }
  }

  document.getElementById('btn-back-riwayat')?.addEventListener('click', () => navigateTo('dashboard'));
  renderRiwayatContent();
  if (window.lucide) lucide.createIcons();
}

function renderRiwayatContent() {
  const container = document.getElementById('riwayat-content');
  if (!container) return;

  const searchQuery = (state.riwayatFilter.search || '').toLowerCase();

  let filtered = getTransaksi();
  if (state.riwayatFilter.bulan) filtered = filtered.filter(tx => tx.tanggal.startsWith(state.riwayatFilter.bulan));
  if (state.riwayatFilter.jenis !== 'semua') filtered = filtered.filter(tx => tx.jenis === state.riwayatFilter.jenis);

  // Item 6: Filter by nama kategori atau catatan
  if (searchQuery) {
    const cats = getKategori();
    const allCats = [...(cats.keluar||[]), ...(cats.masuk||[]), ...(cats.nabung||[])];
    filtered = filtered.filter(tx => {
      const catObj = allCats.find(c => c.id === tx.kategori);
      const catNama = catObj ? catObj.nama.toLowerCase() : '';
      return (tx.catatan || '').toLowerCase().includes(searchQuery) || catNama.includes(searchQuery);
    });
  }

  filtered.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id.localeCompare(a.id));

  // update clear button
  const clearBtn = document.getElementById('riwayat-search-clear');
  if (clearBtn) clearBtn.style.display = searchQuery ? 'flex' : 'none';

  container.innerHTML = '';

  if (filtered.length === 0) {
    const emptyMsg = searchQuery
      ? `Tidak ada hasil untuk "<strong>${escHtml(searchQuery)}</strong>"`
      : 'Tidak ada catatan di periode ini.';
    container.innerHTML = buildEmptyState('🔍', 'Tidak ditemukan', emptyMsg, null);
    return;
  }

  // Totals
  const totalMasuk  = filtered.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0);
  const totalKeluar = filtered.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').reduce((s, tx) => s + tx.nominal, 0);
  const totalNabung = filtered.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0);

  if (state.riwayatFilter.jenis === 'semua' && !searchQuery) {
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

  // Item 7: Hari Mahal — tanggal dengan total keluar tertinggi
  const dailyKeluar = {};
  filtered.filter(tx => tx.jenis === 'keluar' && tx.type !== 'transfer_out').forEach(tx => {
    dailyKeluar[tx.tanggal] = (dailyKeluar[tx.tanggal] || 0) + tx.nominal;
  });
  const uniqueDays = Object.keys(dailyKeluar);
  const hariMahalDate = uniqueDays.length > 1
    ? Object.entries(dailyKeluar).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;

  const groups = {};
  filtered.forEach(tx => { if (!groups[tx.tanggal]) groups[tx.tanggal] = []; groups[tx.tanggal].push(tx); });

  const card = document.createElement('div');
  card.className = 'card';

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const isHariMahal = date === hariMahalDate && !searchQuery;

    const label = document.createElement('p');
    label.className = 'tx-group-date' + (isHariMahal ? ' tx-group-date--mahal' : '');
    label.innerHTML = formatDate(date) + (isHariMahal
      ? ` <span class="hari-mahal-badge">🔥 Paling boros</span>`
      : '');
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

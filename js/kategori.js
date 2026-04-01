// ===== KATEGORI.JS — Kelola Kategori page =====

function renderKategori() {
  const backBtn = document.getElementById('btn-back-kategori');
  if (backBtn) {
    backBtn.onclick = () => {
      // If we came from input page (preserve state), go back to input
      if (state.inputPreserve !== null) {
        openInputPage('add'); // will restore from inputPreserve
      } else {
        navigateTo('settings');
      }
    };
  }

  document.querySelectorAll('#kategori-tabs .tab-btn').forEach(btn => {
    btn.onclick = () => {
      state.kategoriTab = btn.dataset.tab;
      document.querySelectorAll('#kategori-tabs .tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === state.kategoriTab));
      renderKategoriContent();
    };
    btn.classList.toggle('active', btn.dataset.tab === state.kategoriTab);
  });

  renderKategoriContent();
  if (window.lucide) lucide.createIcons();
}

function renderKategoriContent() {
  const container = document.getElementById('kategori-content');
  if (!container) return;

  const list = getKategori()[state.kategoriTab] || [];
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card';

  list.forEach(k => {
    const item = document.createElement('div');
    item.className = 'kategori-item';
    item.innerHTML = `
      <span class="kategori-item-icon">${k.icon}</span>
      <span class="kategori-item-name">${escHtml(k.nama)}</span>
      <button class="btn-icon-sm danger" data-action="hapus" data-id="${k.id}" title="Hapus">
        <i data-lucide="trash-2"></i>
      </button>`;
    card.appendChild(item);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-kategori';
  addBtn.innerHTML = `<i data-lucide="plus-circle"></i> Tambah Kategori`;
  addBtn.onclick = () => handleTambahKategori();
  card.appendChild(addBtn);

  container.appendChild(card);

  card.querySelectorAll('[data-action="hapus"]').forEach(btn => {
    btn.onclick = () => handleHapusKategori(btn.dataset.id);
  });

  if (window.lucide) lucide.createIcons();
}

function handleTambahKategori() {
  const nama = window.prompt('Nama kategori baru:');
  if (!nama) return;
  const trimmed = nama.trim();
  if (!trimmed) { showToast('Nama kategori tidak boleh kosong.'); return; }

  const kat = getKategori();
  if (kat[state.kategoriTab].some(k => k.nama.toLowerCase() === trimmed.toLowerCase())) {
    showToast('Kategori dengan nama ini sudah ada.'); return;
  }

  const icon = window.prompt('Emoji untuk kategori:', '📦') || '📦';
  kat[state.kategoriTab].push({ id: 'custom_' + Date.now(), nama: trimmed, icon: icon.trim() || '📦' });
  saveKategori(kat);
  showToast(`Kategori "${trimmed}" ditambahkan.`);
  renderKategoriContent();

  // If we came from input and there's preserved state, update chip jenis tab
  if (state.inputPreserve) {
    state.inputPreserve.jenis = state.kategoriTab;
  }
}

function handleHapusKategori(id) {
  const kat = getKategori();
  const list = kat[state.kategoriTab];
  const item = list.find(k => k.id === id);
  if (!item) return;

  const txList = getTransaksi();
  const usageCount = txList.filter(tx => tx.kategori === id).length;
  const msg = usageCount > 0
    ? `Kategori "${item.nama}" dipakai di ${usageCount} catatan. Kalau dihapus, akan masuk ke "Lainnya". Lanjutkan?`
    : `Hapus kategori "${item.nama}"?`;

  showModal(msg, () => {
    if (usageCount > 0) {
      const fallbackId = state.kategoriTab === 'masuk' ? 'lainnya_masuk' : 'lainnya_keluar';
      txList.forEach(tx => { if (tx.kategori === id) tx.kategori = fallbackId; });
      saveTransaksi(txList);
      invalidateTransaksiCache();
    }
    const idx = list.findIndex(k => k.id === id);
    if (idx !== -1) list.splice(idx, 1);
    saveKategori(kat);
    showToast('Kategori dihapus.');
    renderKategoriContent();
  });
}

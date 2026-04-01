// ===== INPUT.JS — Catat transaksi page =====

function initInputPage() {
  document.getElementById('btn-keluar')?.addEventListener('click', () => setInputJenis('keluar'));
  document.getElementById('btn-masuk')?.addEventListener('click', () => setInputJenis('masuk'));
  document.getElementById('btn-nabung')?.addEventListener('click', () => setInputJenis('nabung'));

  const nominalInput = document.getElementById('input-nominal');
  nominalInput?.addEventListener('input', () => {
    const raw = nominalInput.value.replace(/\D/g, '');
    nominalInput.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
    document.getElementById('error-nominal').textContent = '';
  });

  document.getElementById('form-transaksi')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSimpan();
  });

  document.getElementById('btn-back-input')?.addEventListener('click', () => {
    if (checkInputChanges()) {
      showModal('Perubahan belum disimpan. Keluar?', () => navigateTo('dashboard'), 'Ya, Keluar', false);
    } else {
      navigateTo(state.inputMode === 'edit' ? 'riwayat' : 'dashboard');
    }
  });

  document.getElementById('btn-delete-tx')?.addEventListener('click', () => {
    showModal('Yakin mau hapus catatan ini? Tidak bisa dibatalkan.', () => {
      const txList = getTransaksi().filter(tx => tx.id !== state.editingId);
      saveTransaksi(txList);
      invalidateTransaksiCache();
      showToast('Catatan dihapus.');
      navigateTo('dashboard');
    });
  });
}

function setInputJenis(jenis) {
  state.inputJenis = jenis;
  state.inputKategori = null;

  ['keluar', 'masuk', 'nabung'].forEach(j => {
    document.getElementById(`btn-${j}`)?.classList.toggle('active', j === jenis);
  });

  renderChips();
  document.getElementById('error-kategori').textContent = '';
}

function renderChips() {
  const wrap = document.getElementById('chip-kategori');
  if (!wrap) return;

  // Nabung categories are fixed — no user add/remove
  const isNabung = state.inputJenis === 'nabung';
  const list = isNabung
    ? KATEGORI_DEFAULT.nabung
    : (getKategori()[state.inputJenis] || []);

  const freq = getKategoriFrequency(state.inputJenis);
  const sorted = isNabung ? list : [...list].sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
  const top8 = sorted.slice(0, 8);
  const rest = sorted.slice(8);

  wrap.innerHTML = '';

  top8.forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip ${state.inputKategori === k.id ? 'active' : ''}`;
    btn.dataset.id = k.id;
    btn.innerHTML = `${k.icon} <span>${escHtml(k.nama)}</span>`;
    btn.onclick = () => selectChip(k.id);
    wrap.appendChild(btn);
  });

  if (rest.length > 0) {
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'chip';
    moreBtn.textContent = 'Lainnya +';
    moreBtn.onclick = () => {
      moreBtn.remove();
      rest.forEach(k => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chip ${state.inputKategori === k.id ? 'active' : ''}`;
        btn.dataset.id = k.id;
        btn.innerHTML = `${k.icon} <span>${escHtml(k.nama)}</span>`;
        btn.onclick = () => selectChip(k.id);
        wrap.appendChild(btn);
      });
      // Re-add tambah kategori chip if not nabung
      if (!isNabung) appendTambahKategoriChip(wrap);
    };
    wrap.appendChild(moreBtn);
  }

  // "+ Tambah Kategori" chip — only for keluar/masuk
  if (!isNabung) appendTambahKategoriChip(wrap);
}

function appendTambahKategoriChip(wrap) {
  const addChip = document.createElement('button');
  addChip.type = 'button';
  addChip.className = 'chip chip--add';
  addChip.innerHTML = `<i data-lucide="plus"></i> <span>Tambah Kategori</span>`;
  addChip.onclick = () => {
    // Preserve current input state
    state.inputPreserve = {
      jenis: state.inputJenis,
      kategori: state.inputKategori,
      nominal: document.getElementById('input-nominal').value,
      tanggal: document.getElementById('input-tanggal').value,
      catatan: document.getElementById('input-catatan').value,
    };
    navigateTo('kategori');
  };
  wrap.appendChild(addChip);
  if (window.lucide) lucide.createIcons();
}

function selectChip(id) {
  state.inputKategori = id;
  document.querySelectorAll('#chip-kategori .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.id === id));
  document.getElementById('error-kategori').textContent = '';
}

function openInputPage(mode, id = null) {
  state.inputMode = mode;
  state.editingId = id;

  const titleEl = document.getElementById('input-page-title');
  const deleteBtn = document.getElementById('btn-delete-tx');
  const tanggalInput = document.getElementById('input-tanggal');

  document.getElementById('error-nominal').textContent = '';
  document.getElementById('error-kategori').textContent = '';
  tanggalInput.max = getTodayStr();

  // Check if we're restoring preserved state (return from kategori)
  if (state.inputPreserve && mode === 'add') {
    const p = state.inputPreserve;
    state.inputPreserve = null;
    state.inputJenis = p.jenis;
    state.inputKategori = p.kategori;
    document.getElementById('input-nominal').value = p.nominal;
    tanggalInput.value = p.tanggal;
    document.getElementById('input-catatan').value = p.catatan;

    ['keluar', 'masuk', 'nabung'].forEach(j => {
      document.getElementById(`btn-${j}`)?.classList.toggle('active', j === p.jenis);
    });
    titleEl.textContent = 'Catat Keuangan';
    deleteBtn.style.display = 'none';
    renderChips();
    navigateTo('input');
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (mode === 'add') {
    titleEl.textContent = 'Catat Keuangan';
    deleteBtn.style.display = 'none';
    state.inputJenis = 'keluar';
    state.inputKategori = null;
    document.getElementById('input-nominal').value = '';
    document.getElementById('input-catatan').value = '';
    tanggalInput.value = getTodayStr();
    setInputJenis('keluar');
  } else {
    const tx = getTransaksi().find(t => t.id === id);
    if (!tx) { navigateTo('dashboard'); return; }
    titleEl.textContent = 'Edit Catatan';
    deleteBtn.style.display = 'flex';
    state.inputJenis = tx.jenis;
    state.inputKategori = tx.kategori;
    document.getElementById('input-nominal').value = tx.nominal.toLocaleString('id-ID');
    tanggalInput.value = tx.tanggal;
    document.getElementById('input-catatan').value = tx.catatan || '';
    ['keluar', 'masuk', 'nabung'].forEach(j => {
      document.getElementById(`btn-${j}`)?.classList.toggle('active', j === tx.jenis);
    });
    renderChips();
  }

  navigateTo('input');
  if (mode === 'add') setTimeout(() => document.getElementById('input-nominal')?.focus(), 200);
  if (window.lucide) lucide.createIcons();
}

function checkInputChanges() {
  if (state.inputMode === 'add') {
    return parseNominal(document.getElementById('input-nominal').value) > 0 || state.inputKategori !== null;
  }
  const tx = getTransaksi().find(t => t.id === state.editingId);
  if (!tx) return false;
  const nom = parseNominal(document.getElementById('input-nominal').value);
  const tanggal = document.getElementById('input-tanggal').value;
  const catatan = document.getElementById('input-catatan').value.trim();
  return nom !== tx.nominal || state.inputKategori !== tx.kategori || tanggal !== tx.tanggal || catatan !== (tx.catatan || '') || state.inputJenis !== tx.jenis;
}

function handleSimpan() {
  const nominal = parseNominal(document.getElementById('input-nominal').value);
  const kategori = state.inputKategori;
  const tanggal = document.getElementById('input-tanggal').value;
  const catatan = document.getElementById('input-catatan').value.trim();
  let valid = true;

  if (!nominal || nominal <= 0) {
    document.getElementById('error-nominal').textContent = 'Nominal harus lebih dari 0.';
    valid = false;
  }
  if (!kategori) {
    document.getElementById('error-kategori').textContent = 'Pilih kategori dulu.';
    valid = false;
  }
  if (!valid) return;

  const txList = getTransaksi();
  if (state.inputMode === 'add') {
    txList.push({ id: generateId(), jenis: state.inputJenis, nominal, kategori, tanggal: tanggal || getTodayStr(), catatan });
  } else {
    const idx = txList.findIndex(t => t.id === state.editingId);
    if (idx !== -1) txList[idx] = { ...txList[idx], jenis: state.inputJenis, nominal, kategori, tanggal, catatan };
  }

  if (saveTransaksi(txList)) {
    showToast('Tersimpan ✓');
    navigateTo('dashboard');
  }
}

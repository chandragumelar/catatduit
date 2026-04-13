// =============================================================================
// INPUT.JS
// Tanggung jawab: Form tambah/edit transaksi (keluar, masuk, nabung)
// Depends on: state.js, storage.js, utils.js, ui.js
// =============================================================================


function initInputPage() {
  document.getElementById('btn-keluar')?.addEventListener('click', () => setInputJenis('keluar'));
  document.getElementById('btn-masuk')?.addEventListener('click',  () => setInputJenis('masuk'));
  document.getElementById('btn-nabung')?.addEventListener('click', () => setInputJenis('nabung'));

  const nominalInput = document.getElementById('input-nominal');
  nominalInput?.addEventListener('input', () => {
    const raw = nominalInput.value.replace(/\D/g, '');
    nominalInput.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
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

// ===== JENIS =====

function setInputJenis(jenis) {
  state.inputJenis = jenis;
  state.inputKategori = null;

  ['keluar', 'masuk', 'nabung'].forEach(j => {
    document.getElementById(`btn-${j}`)?.classList.toggle('active', j === jenis);
  });

  renderChips();
  renderWalletPicker();
  document.getElementById('error-kategori').textContent = '';
}

// ===== WALLET PICKER =====

function renderWalletPicker() {
  const wrap = document.getElementById('input-wallet-wrap');
  if (!wrap) return;

  // Multicurrency: hanya tampilkan wallet sesuai toggle aktif
  const allWallets = getWallets().filter(w => !w.hidden);
  const wallets = (isMulticurrencyEnabled() && getSecondaryCurrency())
    ? allWallets.filter(w => isWalletMatchesToggle(w))
    : allWallets;

  if (wallets.length <= 1) {
    wrap.style.display = 'none';
    state.inputWalletId = wallets[0]?.id || DEFAULT_WALLET_ID;
    return;
  }

  wrap.style.display = 'block';

  if (!state.inputWalletId || !wallets.find(w => w.id === state.inputWalletId)) {
    state.inputWalletId = wallets[0].id;
  }

  const walletLabel = state.inputJenis === 'masuk' ? 'Ke dompet' : state.inputJenis === 'nabung' ? 'Di dompet' : 'Dari dompet';
  wrap.innerHTML = `
    <label class="input-label">${walletLabel}</label>
    <div class="wallet-chip-wrap" id="wallet-chips"></div>`;

  const chipsWrap = wrap.querySelector('#wallet-chips');
  wallets.forEach(w => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip wallet-chip ${state.inputWalletId === w.id ? 'active' : ''}`;
    chip.dataset.id = w.id;
    chip.innerHTML = `${w.icon} <span>${escHtml(w.nama)}</span>`;
    chip.addEventListener('click', () => {
      state.inputWalletId = w.id;
      chipsWrap.querySelectorAll('.wallet-chip').forEach(c =>
        c.classList.toggle('active', c.dataset.id === w.id));
    });
    chipsWrap.appendChild(chip);
  });
}

// ===== KATEGORI CHIPS =====

function renderChips() {
  const wrap = document.getElementById('chip-kategori');
  if (!wrap) return;

  // Nabung tidak pakai kategori
  if (state.inputJenis === 'nabung') {
    wrap.innerHTML = '';
    const sec = document.getElementById('section-kategori');
    if (sec) sec.style.display = 'none';
    return;
  }
  const sec = document.getElementById('section-kategori');
  if (sec) sec.style.display = '';

  const list = getKategori()[state.inputJenis] || [];
  const freq = getKategoriFrequency(state.inputJenis);
  const sorted = [...list].sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
  const top8 = sorted.slice(0, 8);
  const rest = sorted.slice(8);

  wrap.innerHTML = '';
  const tambahWrap = document.getElementById('chip-tambah-wrap');
  if (tambahWrap) tambahWrap.innerHTML = '';

  top8.forEach(k => {
    wrap.appendChild(_makeChip(k));
  });

  if (rest.length > 0) {
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'chip';
    moreBtn.textContent = 'Lainnya +';
    moreBtn.onclick = () => {
      moreBtn.remove();
      rest.forEach(k => wrap.appendChild(_makeChip(k)));
      appendTambahKategoriChip(wrap);
    };
    wrap.appendChild(moreBtn);
  }

  appendTambahKategoriChip(wrap);
}

function _makeChip(k) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `chip ${state.inputKategori === k.id ? 'active' : ''}`;
  btn.dataset.id = k.id;
  btn.innerHTML = `${k.icon} <span>${escHtml(k.nama)}</span>`;
  btn.onclick = () => selectChip(k.id);
  return btn;
}

function appendTambahKategoriChip(wrap) {
  // "Tambah Kategori" rendered in its own container below the chip row
  const tambahWrap = document.getElementById('chip-tambah-wrap');
  if (!tambahWrap) return;
  tambahWrap.innerHTML = '';
  const addChip = document.createElement('button');
  addChip.type = 'button';
  addChip.className = 'chip chip--add';
  addChip.innerHTML = `<i data-lucide="plus"></i> <span>Tambah Kategori</span>`;
  addChip.onclick = () => {
    state.inputPreserve = {
      jenis: state.inputJenis,
      kategori: state.inputKategori,
      walletId: state.inputWalletId,
      nominal: document.getElementById('input-nominal').value,
      tanggal: document.getElementById('input-tanggal').value,
      catatan: document.getElementById('input-catatan').value,
    };
    navigateTo('kategori');
  };
  tambahWrap.appendChild(addChip);
  if (window.lucide) lucide.createIcons();
}

function selectChip(id) {
  state.inputKategori = id;
  document.querySelectorAll('#chip-kategori .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.id === id));
  document.getElementById('error-kategori').textContent = '';
}

// ===== OPEN / RESTORE =====

function openInputPage(mode, id = null) {
  state.inputMode = mode;
  state.editingId = id;

  const titleEl    = document.getElementById('input-page-title');
  const deleteBtn  = document.getElementById('btn-delete-tx');
  const tanggalInput = document.getElementById('input-tanggal');

  document.getElementById('error-nominal').textContent  = '';
  document.getElementById('error-kategori').textContent = '';
  tanggalInput.max = getTodayStr();

  // Restore state setelah balik dari halaman kategori
  if (state.inputPreserve && mode === 'add') {
    const p = state.inputPreserve;
    state.inputPreserve  = null;
    state.inputJenis     = p.jenis;
    state.inputKategori  = p.kategori;
    state.inputWalletId  = p.walletId || null;

    document.getElementById('input-nominal').value = p.nominal;
    tanggalInput.value = p.tanggal;
    document.getElementById('input-catatan').value = p.catatan;

    ['keluar', 'masuk', 'nabung'].forEach(j =>
      document.getElementById(`btn-${j}`)?.classList.toggle('active', j === p.jenis));

    titleEl.textContent    = 'Catat Keuangan';
    deleteBtn.style.display = 'none';
    renderChips();
    renderWalletPicker();
    navigateTo('input');
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (mode === 'add') {
    titleEl.textContent    = 'Catat Keuangan';
    deleteBtn.style.display = 'none';
    state.inputJenis    = 'keluar';
    state.inputKategori = null;
    // Multicurrency: default ke wallet pertama dari currency aktif
    const activeWals = (isMulticurrencyEnabled() && getSecondaryCurrency())
      ? getActiveWallets()
      : getWallets().filter(w => !w.hidden);
    state.inputWalletId = activeWals[0]?.id || DEFAULT_WALLET_ID;

    document.getElementById('input-nominal').value = '';
    document.getElementById('input-catatan').value = '';
    tanggalInput.value = getTodayStr();

    // Update currency prefix sesuai toggle aktif
    const pfx = document.getElementById('input-currency-prefix');
    if (pfx) pfx.textContent = getCurrencySymbol();

    setInputJenis('keluar'); // juga trigger renderChips + renderWalletPicker
  } else {
    const tx = getTransaksi().find(t => t.id === id);
    if (!tx) { navigateTo('dashboard'); return; }

    titleEl.textContent    = 'Edit Catatan';
    deleteBtn.style.display = 'flex';
    state.inputJenis    = tx.jenis;
    state.inputKategori = tx.kategori;
    state.inputWalletId = tx.wallet_id || getWallets()[0]?.id || DEFAULT_WALLET_ID;

    document.getElementById('input-nominal').value = formatNominalInput(tx.nominal);
    tanggalInput.value = tx.tanggal;
    document.getElementById('input-catatan').value = tx.catatan || '';

    ['keluar', 'masuk', 'nabung'].forEach(j =>
      document.getElementById(`btn-${j}`)?.classList.toggle('active', j === tx.jenis));

    renderChips();
    renderWalletPicker();
  }

  navigateTo('input');
  if (mode === 'add') setTimeout(() => document.getElementById('input-nominal')?.focus(), 200);
  if (window.lucide) lucide.createIcons();
}

// ===== VALIDATION =====

function checkInputChanges() {
  if (state.inputMode === 'add') {
    return parseNominal(document.getElementById('input-nominal').value) > 0 || state.inputKategori !== null;
  }
  const tx = getTransaksi().find(t => t.id === state.editingId);
  if (!tx) return false;
  return parseNominal(document.getElementById('input-nominal').value) !== tx.nominal
    || state.inputKategori !== tx.kategori
    || document.getElementById('input-tanggal').value !== tx.tanggal
    || document.getElementById('input-catatan').value.trim() !== (tx.catatan || '')
    || state.inputJenis !== tx.jenis
    || state.inputWalletId !== (tx.wallet_id || DEFAULT_WALLET_ID);
}

// ===== SIMPAN =====

function handleSimpan() {
  const nominal  = parseNominal(document.getElementById('input-nominal').value);
  const kategori = state.inputKategori;
  const tanggal  = document.getElementById('input-tanggal').value;
  const catatan  = document.getElementById('input-catatan').value.trim();
  const walletId = state.inputWalletId || getWallets()[0]?.id || DEFAULT_WALLET_ID;
  let valid = true;

  if (!nominal || nominal <= 0) {
    document.getElementById('error-nominal').textContent = 'Nominal harus lebih dari 0.';
    valid = false;
  }
  // Nabung tidak pakai kategori — set default otomatis
  if (state.inputJenis === 'nabung') {
    if (!kategori) state.inputKategori = 'tabungan';
  } else if (!kategori) {
    document.getElementById('error-kategori').textContent = 'Pilih kategori dulu.';
    valid = false;
  }
  if (!valid) return;

  const tgl    = tanggal || getTodayStr();
  const txList = getTransaksi();

  if (state.inputMode === 'add') {
    // ===== SMART DUPLICATE DETECTOR =====
    // Cek transaksi dalam 5 menit terakhir dengan nominal + kategori yang sama
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    const duplicate = txList.find(tx =>
      tx.jenis === state.inputJenis &&
      tx.nominal === nominal &&
      tx.kategori === (state.inputJenis === 'nabung' ? (kategori || 'tabungan') : kategori) &&
      tx.timestamp && (now - tx.timestamp) <= FIVE_MIN
    );

    if (duplicate) {
      const k = getKategoriById(duplicate.kategori, duplicate.jenis);
      showModal(
        `⚠️ Transaksi serupa baru saja dicatat\n\n${k.icon} ${k.nama} · ${formatRupiah(duplicate.nominal)}\n\nYakin mau catat lagi?`,
        () => _doSimpan(txList, nominal, kategori, tgl, catatan, walletId),
        'Tetap Simpan',
        false
      );
      return;
    }

    _doSimpan(txList, nominal, kategori, tgl, catatan, walletId);
  } else {
    const idx = txList.findIndex(t => t.id === state.editingId);
    if (idx !== -1) {
      txList[idx] = {
        ...txList[idx],
        jenis: state.inputJenis,
        nominal,
        kategori,
        tanggal: tgl,
        catatan,
        wallet_id: walletId,
        timestamp: txList[idx].timestamp || new Date(tgl + 'T12:00:00').getTime(),
      };
    }
    if (saveTransaksi(txList)) {
      showToast('Tersimpan ✓');
      navigateTo('dashboard');
    }
  }
}

function _doSimpan(txList, nominal, kategori, tgl, catatan, walletId) {
  txList.push({
    id: generateId(),
    jenis: state.inputJenis,
    nominal,
    kategori: state.inputJenis === 'nabung' ? (kategori || 'tabungan') : kategori,
    tanggal: tgl,
    catatan,
    wallet_id: walletId,
    timestamp: new Date(tgl + 'T' + new Date().toTimeString().slice(0, 8)).getTime(),
  });
  if (saveTransaksi(txList)) {
    showToast('Tersimpan ✓');
    checkAndShowDonationNudge(); // Item 9
    navigateTo('dashboard');
  }
}

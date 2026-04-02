// ===== TABUNGAN.JS — Halaman Tabungan & Tagihan =====

function renderTabungan() {
  document.querySelectorAll('#tabungan-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.tabunganTab);
    btn.onclick = () => {
      state.tabunganTab = btn.dataset.tab;
      document.querySelectorAll('#tabungan-tabs .tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === state.tabunganTab));
      renderTabunganContent();
    };
  });

  renderTabunganContent();
}

function renderTabunganContent() {
  const container = document.getElementById('tabungan-content');
  if (!container) return;
  container.innerHTML = '';

  if (state.tabunganTab === 'tabungan') {
    renderTabunganTab(container);
  } else {
    renderTagihanTab(container);
  }

  if (window.lucide) lucide.createIcons();
}

// ===== Tab Tabungan =====
function renderTabunganTab(container) {
  const txList = getTransaksi();
  const { year, month } = getCurrentMonthYear();
  const txNabungBulanIni = txList.filter(tx => tx.jenis === 'nabung' && isSameMonth(tx.tanggal, year, month));
  const txNabungAll = txList.filter(tx => tx.jenis === 'nabung');

  const totalBulanIni = txNabungBulanIni.reduce((s, tx) => s + tx.nominal, 0);
  const totalAkumulasi = txNabungAll.reduce((s, tx) => s + tx.nominal, 0);

  // Summary cards
  const summaryEl = document.createElement('div');
  summaryEl.className = 'tabungan-summary';
  summaryEl.innerHTML = `
    <div class="card tabungan-stat">
      <p class="summary-label">Nabung Bulan Ini</p>
      <p class="summary-value nabung">${formatRupiah(totalBulanIni)}</p>
    </div>
    <div class="card tabungan-stat">
      <p class="summary-label">Total Nabung</p>
      <p class="summary-value nabung">${formatRupiah(totalAkumulasi)}</p>
    </div>`;
  container.appendChild(summaryEl);

  // Goals — shared pool model
  const goals = getGoals();
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const progressKeseluruhan = totalTarget > 0 ? Math.min((totalAkumulasi / totalTarget) * 100, 100) : 0;
  const sisaTarget = Math.max(totalTarget - totalAkumulasi, 0);
  const estimasi = totalBulanIni > 0 && sisaTarget > 0 ? Math.ceil(sisaTarget / totalBulanIni) : null;

  const goalsCard = document.createElement('div');
  goalsCard.className = 'card';
  goalsCard.innerHTML = `<div class="section-header"><h3 class="section-title">Goals</h3>${goals.length < MAX_GOALS ? '<button class="btn-add-goal" id="btn-add-goal"><i data-lucide="plus"></i> Tambah</button>' : ''}</div>`;

  if (goals.length === 0) {
    goalsCard.innerHTML += `<div class="empty-state" style="padding:24px 0"><div class="empty-icon">🎯</div><p class="empty-desc">Belum ada goal. Yuk buat target menabung pertamamu!</p></div>`;
  } else {
    const listEl = document.createElement('div');
    listEl.className = 'goals-list';
    goals.forEach((goal, idx) => {
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.innerHTML = `
        <div class="goal-header">
          <div class="goal-name">${escHtml(goal.nama)}</div>
          <div class="goal-right">
            <span class="goal-target">${formatRupiah(goal.target)}</span>
            <button class="btn-icon-sm" data-action="edit-goal" data-idx="${idx}" title="Edit">✏️</button>
            <button class="btn-icon-sm danger" data-action="hapus-goal" data-idx="${idx}" title="Hapus">🗑️</button>
          </div>
        </div>`;
      listEl.appendChild(item);
    });
    goalsCard.appendChild(listEl);

    // Divider + total
    const divider = document.createElement('div');
    divider.className = 'goals-divider';
    divider.innerHTML = `
      <div class="goals-total-row">
        <span class="goals-total-label">Total Target</span>
        <span class="goals-total-value">${formatRupiah(totalTarget)}</span>
      </div>`;
    goalsCard.appendChild(divider);

    // Single progress bar
    const progressEl = document.createElement('div');
    progressEl.className = 'goal-progress-wrap';
    progressEl.innerHTML = `
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width:${progressKeseluruhan.toFixed(1)}%"></div>
      </div>
      <div class="goal-progress-label">
        <span>${formatRupiah(totalAkumulasi)} dari ${formatRupiah(totalTarget)}</span>
        <span>${Math.round(progressKeseluruhan)}%</span>
      </div>
      ${estimasi !== null ? `<p class="goal-estimasi">Estimasi tercapai semua goals: <strong>${estimasi} bulan lagi</strong></p>` : ''}`;
    goalsCard.appendChild(progressEl);
  }

  container.appendChild(goalsCard);

  document.getElementById('btn-add-goal')?.addEventListener('click', () => handleTambahGoal());
  goalsCard.querySelectorAll('[data-action="edit-goal"]').forEach(btn => {
    btn.addEventListener('click', () => handleEditGoal(parseInt(btn.dataset.idx)));
  });
  goalsCard.querySelectorAll('[data-action="hapus-goal"]').forEach(btn => {
    btn.addEventListener('click', () => handleHapusGoal(parseInt(btn.dataset.idx)));
  });
  if (window.lucide) lucide.createIcons();
}

function handleTambahGoal() {
  const nama = window.prompt('Nama goal kamu (contoh: DP Rumah, Laptop Baru):');
  if (!nama || !nama.trim()) return;
  const targetStr = window.prompt('Target nominal (contoh: 5000000):');
  const target = parseInt((targetStr || '').replace(/\D/g, ''), 10);
  if (!target || target <= 0) { showToast('Nominal target tidak valid.'); return; }

  const goals = getGoals();
  if (goals.length >= MAX_GOALS) { showToast(`Maksimal ${MAX_GOALS} goals.`); return; }
  goals.push({ id: generateId(), nama: nama.trim(), target });
  saveGoals(goals);
  showToast('Goal ditambahkan! 🎯');
  renderTabunganContent();
}

function handleEditGoal(idx) {
  const goals = getGoals();
  const goal = goals[idx];
  if (!goal) return;

  const nama = window.prompt('Nama goal:', goal.nama);
  if (nama === null) return; // cancelled
  if (!nama.trim()) { showToast('Nama tidak boleh kosong.'); return; }

  const targetStr = window.prompt('Target nominal:', goal.target.toString());
  if (targetStr === null) return; // cancelled
  const target = parseInt((targetStr || '').replace(/\D/g, ''), 10);
  if (!target || target <= 0) { showToast('Nominal target tidak valid.'); return; }

  goals[idx] = { ...goal, nama: nama.trim(), target };
  saveGoals(goals);
  showToast('Goal diperbarui.');
  renderTabunganContent();
}

function handleHapusGoal(idx) {
  const goals = getGoals();
  const goal = goals[idx];
  if (!goal) return;
  showModal(`Hapus goal "${goal.nama}"?`, () => {
    goals.splice(idx, 1);
    saveGoals(goals);
    showToast('Goal dihapus.');
    renderTabunganContent();
  }, 'Ya, Hapus');
}

// ===== Tab Tagihan =====
function renderTagihanTab(container) {
  const tagihan = getTagihan();
  const { year, month } = getCurrentMonthYear();

  // Disclaimer
  const disclaimerEl = document.createElement('div');
  disclaimerEl.className = 'tagihan-disclaimer';
  disclaimerEl.innerHTML = `
    <span>⚠️</span>
    <span>Daftar ini hanya <strong>pengingat</strong> — bukan bukti pembayaran. Kecuali kamu tap <strong>Sudah Bayar</strong>, tagihan tidak otomatis tercatat sebagai pengeluaran.</span>`;
  container.appendChild(disclaimerEl);

  const tagihanCard = document.createElement('div');
  tagihanCard.className = 'card';

  const sortedTagihan = [...tagihan].sort((a, b) => {
    if (!a.jatuhTempo) return 1;
    if (!b.jatuhTempo) return -1;
    return a.jatuhTempo.localeCompare(b.jatuhTempo);
  });

  tagihanCard.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Tagihan</h3>
      <button class="btn-add-tagihan" id="btn-add-tagihan"><i data-lucide="plus"></i> Tambah</button>
    </div>`;

  if (sortedTagihan.length === 0) {
    tagihanCard.innerHTML += `<div class="empty-state" style="padding:16px 0"><div class="empty-icon">📋</div><p class="empty-desc">Belum ada tagihan. Tambah reminder tagihan rutinmu!</p></div>`;
  } else {
    sortedTagihan.forEach((t) => {
      const jatuhTempoFormatted = t.jatuhTempo ? formatDate(t.jatuhTempo) : '-';
      const isPaid = isTagihanPaidThisMonth(t, year, month);
      const isThisMonth = (() => {
        if (!t.jatuhTempo) return false;
        const d = new Date(t.jatuhTempo + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      })();

      const item = document.createElement('div');
      item.className = `tagihan-item ${isThisMonth ? 'tagihan-item--this-month' : ''}`;
      item.innerHTML = `
        <div class="tagihan-info">
          <div class="tagihan-nama">${escHtml(t.nama)}</div>
          <div class="tagihan-detail">Jatuh tempo: ${jatuhTempoFormatted}${t.isRecurring === false ? ' · Sekali bayar' : ''}</div>
        </div>
        <div class="tagihan-right">
          <div class="tagihan-nominal">${formatRupiah(t.nominal)}</div>
          <div class="tagihan-actions">
            ${isThisMonth
              ? isPaid
                ? `<span class="tagihan-lunas-badge">✓ Lunas</span>`
                : `<button class="btn-sudah-bayar" data-id="${t.id}">Sudah Bayar</button>`
              : ''}
            <button class="btn-icon-sm" data-action="edit-tagihan" data-id="${t.id}" title="Edit">✏️</button>
            <button class="btn-icon-sm danger" data-action="hapus-tagihan" data-id="${t.id}" title="Hapus">🗑️</button>
          </div>
        </div>`;
      tagihanCard.appendChild(item);
    });
  }

  container.appendChild(tagihanCard);

  document.getElementById('btn-add-tagihan')?.addEventListener('click', () => handleTambahTagihan());
  tagihanCard.querySelectorAll('[data-action="edit-tagihan"]').forEach(btn => {
    btn.addEventListener('click', () => handleEditTagihan(btn.dataset.id));
  });
  tagihanCard.querySelectorAll('[data-action="hapus-tagihan"]').forEach(btn => {
    btn.addEventListener('click', () => handleHapusTagihan(btn.dataset.id));
  });
  tagihanCard.querySelectorAll('.btn-sudah-bayar').forEach(btn => {
    btn.addEventListener('click', () => handleSudahBayar(btn.dataset.id));
  });
  if (window.lucide) lucide.createIcons();
}

function handleSudahBayar(id) {
  const tagihan = getTagihan();
  const t = tagihan.find(x => x.id === id);
  if (!t) return;
  const { year, month } = getCurrentMonthYear();

  // Buat bottom sheet
  const existing = document.getElementById('bottom-sheet-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'bottom-sheet-overlay';
  overlay.className = 'bottom-sheet-overlay';

  const nominalFormatted = t.nominal.toLocaleString('id-ID');

  overlay.innerHTML = `
    <div class="bottom-sheet" id="bottom-sheet">
      <div class="bottom-sheet-handle"></div>
      <h3 class="bottom-sheet-title">Konfirmasi pembayaran</h3>
      <p class="bottom-sheet-subtitle">${escHtml(t.nama)}</p>
      <div class="bottom-sheet-field">
        <label class="input-label">Nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix">Rp</span>
          <input type="text" id="bs-nominal" class="input-nominal" value="${nominalFormatted}" inputmode="numeric" />
        </div>
        <p class="bottom-sheet-hint">Sesuaikan kalau nominalnya berbeda dari biasanya.</p>
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Tanggal bayar</label>
        <input type="date" id="bs-tanggal" class="input-field" value="${getTodayStr()}" max="${getTodayStr()}" />
      </div>
      <div class="bottom-sheet-actions">
        <button class="btn-secondary" id="bs-cancel">Batal</button>
        <button class="btn-primary" id="bs-confirm">Bayar &amp; Catat</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  // Format nominal on input
  const nominalInput = document.getElementById('bs-nominal');
  nominalInput.addEventListener('input', () => {
    const raw = nominalInput.value.replace(/\D/g, '');
    nominalInput.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
  });

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };

  document.getElementById('bs-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('bs-confirm').addEventListener('click', () => {
    const nominal = parseNominal(nominalInput.value);
    if (!nominal || nominal <= 0) { showToast('Nominal tidak valid.'); return; }
    const tanggal = document.getElementById('bs-tanggal').value || getTodayStr();

    // Buat transaksi keluar otomatis
    const txList = getTransaksi();
    txList.push({
      id: generateId(),
      jenis: 'keluar',
      nominal,
      kategori: 'lainnya_keluar',
      tanggal,
      catatan: t.nama,
    });
    saveTransaksi(txList);
    invalidateTransaksiCache();

    // Mark paid
    markTagihanPaid(id, year, month);

    // Kalau sekali bayar, hapus dari list
    if (t.isRecurring === false) {
      const updated = getTagihan().filter(x => x.id !== id);
      saveTagihan(updated);
    }

    close();
    showToast(`${t.nama} tercatat sebagai pengeluaran ✓`);
    renderTabunganContent();
  });
}

function showTagihanBottomSheet({ title, confirmText = 'Simpan', nama = '', nominal = '', jatuhTempo = '', isRecurring = true, onConfirm }) {
  const existing = document.getElementById('bottom-sheet-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'bottom-sheet-overlay';
  overlay.className = 'bottom-sheet-overlay';

  const nominalFormatted = nominal ? Number(nominal).toLocaleString('id-ID') : '';

  overlay.innerHTML = `
    <div class="bottom-sheet" id="bottom-sheet">
      <div class="bottom-sheet-handle"></div>
      <h3 class="bottom-sheet-title">${escHtml(title)}</h3>
      <div class="bottom-sheet-field">
        <label class="input-label">Nama tagihan</label>
        <input type="text" id="bs-nama" class="input-field" placeholder="contoh: Netflix, BPJS, Cicilan HP" value="${escHtml(nama)}" maxlength="50" />
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix">Rp</span>
          <input type="text" id="bs-nominal" class="input-nominal" placeholder="" value="${nominalFormatted}" inputmode="numeric" />
        </div>
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Tanggal jatuh tempo</label>
        <input type="date" id="bs-jatuh-tempo" class="input-field" value="${jatuhTempo}" />
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Tagihan ini muncul setiap bulan?</label>
        <p class="bottom-sheet-hint" style="margin-bottom:8px;">Contoh rutin: Netflix, listrik. Contoh sekali: hutang ke teman.</p>
        <div class="jenis-toggle" style="margin-top:0;">
          <button type="button" class="jenis-btn ${isRecurring ? 'active' : ''}" id="bs-recurring-ya">Ya</button>
          <button type="button" class="jenis-btn ${!isRecurring ? 'active' : ''}" id="bs-recurring-tidak">Tidak</button>
        </div>
      </div>
      <p class="bottom-sheet-hint" id="bs-error" style="color:var(--red);min-height:16px;"></p>
      <div class="bottom-sheet-actions">
        <button class="btn-secondary" id="bs-cancel">Batal</button>
        <button class="btn-primary" id="bs-confirm">${escHtml(confirmText)}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  // Format nominal
  const nominalInput = document.getElementById('bs-nominal');
  nominalInput.addEventListener('input', () => {
    const raw = nominalInput.value.replace(/\D/g, '');
    nominalInput.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
  });

  // Toggle recurring
  let recurringVal = isRecurring;
  document.getElementById('bs-recurring-ya').addEventListener('click', () => {
    recurringVal = true;
    document.getElementById('bs-recurring-ya').classList.add('active');
    document.getElementById('bs-recurring-tidak').classList.remove('active');
  });
  document.getElementById('bs-recurring-tidak').addEventListener('click', () => {
    recurringVal = false;
    document.getElementById('bs-recurring-tidak').classList.add('active');
    document.getElementById('bs-recurring-ya').classList.remove('active');
  });

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };

  document.getElementById('bs-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('bs-confirm').addEventListener('click', () => {
    const namaVal = document.getElementById('bs-nama').value.trim();
    const nominalVal = parseNominal(nominalInput.value);
    const jatuhTempoVal = document.getElementById('bs-jatuh-tempo').value || null;
    const errorEl = document.getElementById('bs-error');

    if (!namaVal) { errorEl.textContent = 'Nama tidak boleh kosong.'; return; }
    if (!nominalVal || nominalVal <= 0) { errorEl.textContent = 'Nominal tidak valid.'; return; }

    onConfirm({ nama: namaVal, nominal: nominalVal, jatuhTempo: jatuhTempoVal, isRecurring: recurringVal });
    close();
  });

  setTimeout(() => document.getElementById('bs-nama')?.focus(), 300);
}

function handleTambahTagihan() {
  showTagihanBottomSheet({
    title: 'Tambah Tagihan',
    confirmText: 'Tambah Tagihan',
    onConfirm: ({ nama, nominal, jatuhTempo, isRecurring }) => {
      const tagihan = getTagihan();
      tagihan.push({ id: generateId(), nama, nominal, jatuhTempo, isRecurring, paidMonths: [] });
      saveTagihan(tagihan);
      showToast('Tagihan ditambahkan!');
      renderTabunganContent();
    },
  });
}

function handleEditTagihan(id) {
  const tagihan = getTagihan();
  const t = tagihan.find(x => x.id === id);
  if (!t) return;

  showTagihanBottomSheet({
    title: 'Edit Tagihan',
    nama: t.nama,
    nominal: t.nominal,
    jatuhTempo: t.jatuhTempo || '',
    isRecurring: t.isRecurring !== false,
    onConfirm: ({ nama, nominal, jatuhTempo, isRecurring }) => {
      const idx = tagihan.findIndex(x => x.id === id);
      tagihan[idx] = { ...t, nama, nominal, jatuhTempo, isRecurring };
      saveTagihan(tagihan);
      showToast('Tagihan diperbarui.');
      renderTabunganContent();
    },
  });
}

function handleHapusTagihan(id) {
  const tagihan = getTagihan();
  const t = tagihan.find(x => x.id === id);
  if (!t) return;
  showModal(`Hapus tagihan "${t.nama}"?`, () => {
    const updated = tagihan.filter(x => x.id !== id);
    saveTagihan(updated);
    showToast('Tagihan dihapus.');
    renderTabunganContent();
  }, 'Ya, Hapus');
}

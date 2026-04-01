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
  if (window.lucide) lucide.createIcons();
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
            <button class="btn-icon-sm" data-action="edit-goal" data-idx="${idx}" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon-sm danger" data-action="hapus-goal" data-idx="${idx}" title="Hapus"><i data-lucide="trash-2"></i></button>
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

  const tagihanBulanIni = tagihan.filter(t => {
    if (!t.jatuhTempo) return false;
    const d = new Date(t.jatuhTempo + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Disclaimer
  const disclaimerEl = document.createElement('div');
  disclaimerEl.className = 'tagihan-disclaimer';
  disclaimerEl.innerHTML = `
    <span>⚠️</span>
    <span>Daftar ini hanya <strong>pengingat</strong> — bukan bukti pembayaran. Tagihan dianggap lunas hanya jika kamu sudah mencatatnya sebagai <strong>Uang Keluar</strong>.</span>`;
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
      const isThisMonth = tagihanBulanIni.some(x => x.id === t.id);

      const item = document.createElement('div');
      item.className = `tagihan-item ${isThisMonth ? 'tagihan-item--this-month' : ''}`;
      item.innerHTML = `
        <div class="tagihan-info">
          <div class="tagihan-nama">${escHtml(t.nama)}</div>
          <div class="tagihan-detail">Jatuh tempo: ${jatuhTempoFormatted}</div>
        </div>
        <div class="tagihan-right">
          <div class="tagihan-nominal">${formatRupiah(t.nominal)}</div>
          <div class="tagihan-actions">
            <button class="btn-icon-sm" data-action="edit-tagihan" data-id="${t.id}" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon-sm danger" data-action="hapus-tagihan" data-id="${t.id}" title="Hapus"><i data-lucide="trash-2"></i></button>
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
}

function handleTambahTagihan() {
  const nama = window.prompt('Nama tagihan (contoh: Netflix, BPJS, Cicilan HP):');
  if (!nama || !nama.trim()) return;
  const nominalStr = window.prompt('Nominal tagihan:');
  const nominal = parseInt((nominalStr || '').replace(/\D/g, ''), 10);
  if (!nominal || nominal <= 0) { showToast('Nominal tidak valid.'); return; }
  const jatuhTempo = window.prompt('Tanggal jatuh tempo (YYYY-MM-DD, contoh: 2026-04-25):');
  if (jatuhTempo && !/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo.trim())) {
    showToast('Format tanggal tidak valid. Gunakan YYYY-MM-DD'); return;
  }

  const tagihan = getTagihan();
  tagihan.push({ id: generateId(), nama: nama.trim(), nominal, jatuhTempo: jatuhTempo ? jatuhTempo.trim() : null });
  saveTagihan(tagihan);
  showToast('Tagihan ditambahkan!');
  renderTabunganContent();
}

function handleEditTagihan(id) {
  const tagihan = getTagihan();
  const t = tagihan.find(x => x.id === id);
  if (!t) return;

  const nama = window.prompt('Nama tagihan:', t.nama);
  if (nama === null) return;
  if (!nama.trim()) { showToast('Nama tidak boleh kosong.'); return; }

  const nominalStr = window.prompt('Nominal tagihan:', t.nominal.toString());
  if (nominalStr === null) return;
  const nominal = parseInt((nominalStr || '').replace(/\D/g, ''), 10);
  if (!nominal || nominal <= 0) { showToast('Nominal tidak valid.'); return; }

  const jatuhTempo = window.prompt('Tanggal jatuh tempo (YYYY-MM-DD):', t.jatuhTempo || '');
  if (jatuhTempo && !/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo.trim())) {
    showToast('Format tanggal tidak valid. Gunakan YYYY-MM-DD'); return;
  }

  const idx = tagihan.findIndex(x => x.id === id);
  tagihan[idx] = { ...t, nama: nama.trim(), nominal, jatuhTempo: jatuhTempo ? jatuhTempo.trim() : null };
  saveTagihan(tagihan);
  showToast('Tagihan diperbarui.');
  renderTabunganContent();
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

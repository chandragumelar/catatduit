// =============================================================================
// GOALS.JS
// Tanggung jawab: Financial goals — tambah, edit, tracking progres
// Depends on: state.js, storage.js, utils.js, ui.js
// =============================================================================


function renderTabunganTab(container) {
  const allTxList = getTransaksi();
  const { year, month } = getCurrentMonthYear();

  // Multicurrency: filter transaksi nabung hanya dari wallet currency aktif
  const activeWalletIds = (typeof isMulticurrencyEnabled === 'function' && isMulticurrencyEnabled() && getSecondaryCurrency())
    ? new Set(getActiveWallets().map(w => w.id))
    : null;

  const txList = activeWalletIds
    ? allTxList.filter(tx => activeWalletIds.has(tx.wallet_id))
    : allTxList;

  const txNabungBulanIni = txList.filter(tx => tx.jenis === 'nabung' && isSameMonth(tx.tanggal, year, month));
  const txNabungAll      = txList.filter(tx => tx.jenis === 'nabung');
  const totalBulanIni    = txNabungBulanIni.reduce((s, tx) => s + tx.nominal, 0);
  const totalAkumulasi   = txNabungAll.reduce((s, tx) => s + tx.nominal, 0);

  // Summary
  const summaryEl = document.createElement('div');
  summaryEl.className = 'tabungan-summary';
  summaryEl.innerHTML = `
    <div class="card tabungan-stat">
      <p class="summary-label">Nabung Bulan Ini</p>
      <p class="summary-value nabung">${formatWithActiveCurrency(totalBulanIni)}</p>
    </div>
    <div class="card tabungan-stat">
      <p class="summary-label">Total Nabung</p>
      <p class="summary-value nabung">${formatWithActiveCurrency(totalAkumulasi)}</p>
    </div>`;
  container.appendChild(summaryEl);

  // Goals card
  const goals       = getGoals();
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const sisaTarget  = Math.max(totalTarget - totalAkumulasi, 0);
  const estimasi    = totalBulanIni > 0 && sisaTarget > 0 ? Math.ceil(sisaTarget / totalBulanIni) : null;
  const progressPct = totalTarget > 0 ? Math.min((totalAkumulasi / totalTarget) * 100, 100) : 0;

  const goalsCard = document.createElement('div');
  goalsCard.className = 'card';
  goalsCard.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Target Tabungan</h3>
      ${goals.length < MAX_GOALS ? '<button class="btn-add-goal" id="btn-add-goal"><i data-lucide="plus"></i> Tambah</button>' : ''}
    </div>`;

  if (goals.length === 0) {
    goalsCard.innerHTML += `
      ${buildEmptyState('🎯', '', 'Belum ada goal. Yuk buat target menabung pertamamu!', null)}`;
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
            <span class="goal-target">${formatWithActiveCurrency(goal.target)}</span>
            <button class="btn-icon-sm" data-action="edit-goal" data-idx="${idx}" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon-sm danger" data-action="hapus-goal" data-idx="${idx}" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
      listEl.appendChild(item);
    });
    goalsCard.appendChild(listEl);

    const divider = document.createElement('div');
    divider.className = 'goals-divider';
    divider.innerHTML = `
      <div class="goals-total-row">
        <span class="goals-total-label">Total Target</span>
        <span class="goals-total-value">${formatWithActiveCurrency(totalTarget)}</span>
      </div>`;
    goalsCard.appendChild(divider);

    const progressEl = document.createElement('div');
    progressEl.className = 'goal-progress-wrap';
    progressEl.innerHTML = `
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width:${progressPct.toFixed(1)}%"></div>
      </div>
      <div class="goal-progress-label">
        <span>${formatWithActiveCurrency(totalAkumulasi)} dari ${formatWithActiveCurrency(totalTarget)}</span>
        <span>${Math.round(progressPct)}%</span>
      </div>
      ${estimasi !== null ? `<p class="goal-estimasi">Estimasi tercapai dalam <strong>${estimasi} bulan lagi</strong></p><p class="goal-estimasi-sub">rata-rata ${formatWithActiveCurrency(totalBulanIni)}/bulan</p>` : ''}`;
    goalsCard.appendChild(progressEl);
  }

  container.appendChild(goalsCard);

  document.getElementById('btn-add-goal')?.addEventListener('click', () => _showGoalSheet());
  goalsCard.querySelectorAll('[data-action="edit-goal"]').forEach(btn =>
    btn.addEventListener('click', () => _showGoalSheet(parseInt(btn.dataset.idx))));
  goalsCard.querySelectorAll('[data-action="hapus-goal"]').forEach(btn =>
    btn.addEventListener('click', () => _hapusGoal(parseInt(btn.dataset.idx))));

  if (window.lucide) lucide.createIcons();
}

// ===== BOTTOM SHEET: Tambah / Edit Goal =====

function _showGoalSheet(idx = null) {
  const goals   = getGoals();
  const isEdit  = idx !== null;
  const goal    = isEdit ? goals[idx] : null;

  _openBottomSheet({
    title: isEdit ? 'Edit Goal' : 'Tambah Goal',
    fields: `
      <div class="bottom-sheet-field">
        <label class="input-label">Nama goal</label>
        <input type="text" id="bs-nama" class="input-field"
          placeholder="contoh: DP Rumah, Laptop Baru"
          value="${escHtml(goal?.nama || '')}" maxlength="50" />
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Target nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix">${getCurrencySymbol()}</span>
          <input type="text" id="bs-nominal" class="input-nominal"
            placeholder="0"
            value="${goal ? formatNominalInput(goal.target) : ''}"
            inputmode="numeric" />
        </div>
      </div>`,
    confirmText: isEdit ? 'Simpan' : 'Tambah Goal',
    onOpen: () => {
      document.getElementById('bs-nominal').addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
      });
    },
    onConfirm: () => {
      const nama   = document.getElementById('bs-nama').value.trim();
      const target = parseNominal(document.getElementById('bs-nominal').value);
      if (!nama)              return 'Nama tidak boleh kosong.';
      if (!target || target <= 0) return 'Nominal target tidak valid.';

      if (isEdit) {
        goals[idx] = { ...goal, nama, target };
        saveGoals(goals);
        showToast('Goal diperbarui.');
      } else {
        if (goals.length >= MAX_GOALS) return `Maksimal ${MAX_GOALS} goals.`;
        goals.push({ id: generateId(), nama, target });
        saveGoals(goals);
        showToast('Goal ditambahkan! 🎯');
      }
      renderTabunganContent();
      renderOnboardingChecklist('onboarding-checklist-wrap');
      return null;
    },
  });
}

function _hapusGoal(idx) {
  const goals = getGoals();
  const goal  = goals[idx];
  if (!goal) return;
  showModal(`Hapus goal "${goal.nama}"?`, () => {
    goals.splice(idx, 1);
    saveGoals(goals);
    showToast('Goal dihapus.');
    renderTabunganContent();
  }, 'Ya, Hapus');
}

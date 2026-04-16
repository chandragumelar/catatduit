// =============================================================================
// GOALS.JS
// Tanggung jawab: Financial goals — tambah, edit, tracking progres
// Depends on: state.js, storage.js, utils.js, ui.js
// =============================================================================


function renderTabunganTab(container) {
  const allTxList = getTransaksi();
  const { year, month } = getCurrentMonthYear();

  // Aktif currency = currency yang sedang ditampilkan toggle
  const activeCurrency = getActiveCurrencyCode();

  // Wallets yang currency-nya match toggle aktif
  const activeWalletIds = new Set(
    getWallets().filter(w => !w.hidden && getWalletCurrency(w) === activeCurrency).map(w => w.id)
  );

  const txList = allTxList.filter(tx => activeWalletIds.has(tx.wallet_id));

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

  // Goals — hanya tampilkan yang currency-nya match toggle aktif
  // Goal lama tanpa currency dianggap base currency (backward compat)
  const baseCurrency = getBaseCurrency();
  const allGoals     = getGoals();
  const goals        = allGoals.filter(g => (g.currency || baseCurrency) === activeCurrency);

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const sisaTarget  = Math.max(totalTarget - totalAkumulasi, 0);
  const estimasi    = totalBulanIni > 0 && sisaTarget > 0 ? Math.ceil(sisaTarget / totalBulanIni) : null;
  const progressPct = totalTarget > 0 ? Math.min((totalAkumulasi / totalTarget) * 100, 100) : 0;

  const goalsCard = document.createElement('div');
  goalsCard.className = 'card';
  goalsCard.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Target Tabungan</h3>
      ${allGoals.length < MAX_GOALS ? '<button class="btn-add-goal" id="btn-add-goal"><i data-lucide="plus"></i> Tambah</button>' : ''}
    </div>`;

  if (goals.length === 0) {
    goalsCard.innerHTML += `
      ${buildEmptyState('🎯', '', 'Belum ada goal. Yuk buat target menabung pertamamu!', null)}`;
  } else {
    const listEl = document.createElement('div');
    listEl.className = 'goals-list';
    goals.forEach((goal) => {
      // Cari index asli di allGoals untuk edit/hapus
      const realIdx = allGoals.indexOf(goal);
      const walletName = _getGoalWalletName(goal);
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.innerHTML = `
        <div class="goal-header">
          <div class="goal-name">
            ${escHtml(goal.nama)}
            ${walletName ? `<span class="goal-wallet-badge">${escHtml(walletName)}</span>` : ''}
          </div>
          <div class="goal-right">
            <span class="goal-target">${formatWithCurrency(goal.target, goal.currency || baseCurrency)}</span>
            <button class="btn-icon-sm" data-action="edit-goal" data-idx="${realIdx}" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon-sm danger" data-action="hapus-goal" data-idx="${realIdx}" title="Hapus"><i data-lucide="trash-2"></i></button>
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

// Helper: ambil nama wallet goal (jika ada wallet_id)
function _getGoalWalletName(goal) {
  if (!goal.wallet_id) return null;
  const w = getWallets().find(w => w.id === goal.wallet_id);
  return w ? w.nama : null;
}

// ===== BOTTOM SHEET: Tambah / Edit Goal =====

function _showGoalSheet(idx = null) {
  const goals  = getGoals();
  const isEdit = idx !== null;
  const goal   = isEdit ? goals[idx] : null;

  // Semua wallet aktif (tidak hidden), dua currency included
  const allWallets = getWallets().filter(w => !w.hidden);
  const baseCurrency = getBaseCurrency();

  // Tentukan wallet default:
  // - Edit: wallet dari goal (atau fallback ke wallet pertama)
  // - Tambah: wallet pertama dari toggle aktif
  const defaultWalletId = goal?.wallet_id
    ? goal.wallet_id
    : (getActiveWallets()[0]?.id || allWallets[0]?.id || '');

  const walletOptions = allWallets.map(w => {
    const sym = getCurrencySymbolByCode(getWalletCurrency(w));
    return `<option value="${escHtml(w.id)}" data-currency="${escHtml(getWalletCurrency(w))}" data-symbol="${escHtml(sym)}" ${w.id === defaultWalletId ? 'selected' : ''}>${escHtml(w.nama)} (${escHtml(getWalletCurrency(w))})</option>`;
  }).join('');

  // Symbol untuk wallet default
  const defaultWallet  = allWallets.find(w => w.id === defaultWalletId);
  const defaultSymbol  = defaultWallet ? getCurrencySymbolByCode(getWalletCurrency(defaultWallet)) : getCurrencySymbolByCode(baseCurrency);

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
        <label class="input-label">Simpan di dompet</label>
        <select id="bs-wallet" class="bs-wallet-currency-select">
          ${walletOptions}
        </select>
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Target nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix" id="bs-currency-prefix">${defaultSymbol}</span>
          <input type="text" id="bs-nominal" class="input-nominal"
            placeholder="0"
            value="${goal ? formatNominalInput(goal.target) : ''}"
            inputmode="numeric" />
        </div>
      </div>`,
    confirmText: isEdit ? 'Simpan' : 'Tambah Goal',
    onOpen: () => {
      const walletSelect = document.getElementById('bs-wallet');
      const prefixEl     = document.getElementById('bs-currency-prefix');
      const nominalEl    = document.getElementById('bs-nominal');

      // Update prefix saat wallet berubah
      walletSelect.addEventListener('change', () => {
        const opt = walletSelect.selectedOptions[0];
        if (opt) prefixEl.textContent = opt.dataset.symbol || 'Rp';
      });

      nominalEl.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
      });
    },
    onConfirm: () => {
      const nama      = document.getElementById('bs-nama').value.trim();
      const target    = parseNominal(document.getElementById('bs-nominal').value);
      const walletSel = document.getElementById('bs-wallet');
      const walletId  = walletSel.value;
      const opt       = walletSel.selectedOptions[0];
      const currency  = opt?.dataset.currency || baseCurrency;

      if (!nama)               return 'Nama tidak boleh kosong.';
      if (!target || target <= 0) return 'Nominal target tidak valid.';
      if (!walletId)           return 'Pilih dompet terlebih dahulu.';

      if (isEdit) {
        goals[idx] = { ...goal, nama, target, wallet_id: walletId, currency };
        saveGoals(goals);
        showToast('Goal diperbarui.');
      } else {
        if (goals.length >= MAX_GOALS) return `Maksimal ${MAX_GOALS} goals.`;
        goals.push({ id: generateId(), nama, target, wallet_id: walletId, currency });
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

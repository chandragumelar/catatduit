// =============================================================================
// BUDGET.JS
// Tanggung jawab: Budget per kategori — render, simpan, dan validasi anggaran bulanan
// Depends on: state.js, storage.js, ui.js
// =============================================================================


function renderBudgetSection(container) {
  const budgets      = getBudgets();
  const statusMap    = calcBudgetStatus();
  const period       = getBudgetPeriod();
  const hasAnyBudget = Object.keys(budgets).length > 0;

  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.cardId = DASHBOARD_CARDS.BUDGET;

  if (!hasAnyBudget) {
    card.innerHTML = `
      <div class="section-header">
        <h3 class="section-title">Budget</h3>
      </div>
      <p class="budget-empty-text">Belum ada budget. Set limit pengeluaran per kategori biar lebih terkontrol.</p>
      <button class="btn-secondary" id="btn-set-budget-empty">Set Budget</button>`;
    container.appendChild(card);
    container.querySelector('#btn-set-budget-empty')?.addEventListener('click', () => showBudgetManager());
    return;
  }

  const entries     = Object.entries(statusMap);
  const jebol       = entries.filter(([, s]) => s.status === 'jebol').length;
  const warning     = entries.filter(([, s]) => s.status === 'warning').length;
  const periodLabel = entries[0]?.[1]?.periodLabel || (period === 'weekly' ? 'Minggu Ini' : 'Bulan Ini');
  const periodBadge = period === 'weekly'
    ? `<span class="budget-period-badge">Mingguan</span>`
    : '';

  card.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Budget ${periodBadge}</h3>
      <button class="btn-kelola" id="btn-kelola-budget">✏️ Kelola</button>
    </div>
    <p class="budget-period-label">${escHtml(periodLabel)}</p>
    ${jebol > 0 ? `<p class="budget-alert jebol">🔴 ${jebol} kategori sudah melebihi budget!</p>` : ''}
    ${warning > 0 && jebol === 0 ? `<p class="budget-alert warning">🟠 ${warning} kategori mendekati limit.</p>` : ''}
    <div class="budget-list" id="budget-list-dashboard">
      ${entries.map(([katId, s]) => _buildBudgetRowHTML(katId, s)).join('')}
    </div>`;

  container.appendChild(card);
  container.querySelector('#btn-kelola-budget')?.addEventListener('click', () => showBudgetManager());
}

function _buildBudgetRowHTML(katId, s) {
  const k = getKategoriById(katId, 'keluar');
  return `
    <div class="budget-row">
      <div class="budget-row-top">
        <span class="budget-kategori">${k.icon} ${escHtml(k.nama)}</span>
        <span class="budget-angka ${s.status}">
          ${formatRupiah(s.used)} <span class="budget-slash">/</span> ${formatRupiah(s.limit)}
        </span>
      </div>
      <div class="budget-bar-wrap">
        <div class="budget-bar ${s.status}" style="width:${Math.min(s.pct, 100)}%"></div>
      </div>
      <div class="budget-row-bottom">
        <span class="budget-pct ${s.status}">${s.pct}%</span>
        <span class="budget-sisa">
          ${s.status === 'jebol'
            ? `Lebih ${formatRupiah(s.used - s.limit)}`
            : `Sisa ${formatRupiah(s.limit - s.used)}`}
        </span>
      </div>
    </div>`;
}

// ===== BUDGET MANAGER =====

function showBudgetManager() {
  const budgets  = getBudgets();
  const kategori = getKategori().keluar;
  const period   = getBudgetPeriod();

  _openBottomSheet({
    title: 'Set Budget',
    fields: `
      <div class="budget-period-toggle-wrap">
        <p class="bottom-sheet-hint" style="margin-bottom:6px;font-weight:600;">Period budget:</p>
        <div class="budget-period-toggle">
          <button type="button" class="budget-period-btn ${period === 'monthly' ? 'active' : ''}" data-period="monthly">📅 Bulanan</button>
          <button type="button" class="budget-period-btn ${period === 'weekly'  ? 'active' : ''}" data-period="weekly">🗓️ Mingguan</button>
        </div>
        <p class="budget-period-hint" id="bm-period-hint">${_getPeriodHint(period)}</p>
      </div>
      <p class="bottom-sheet-hint" style="margin-top:16px;margin-bottom:12px;">
        Kosongkan atau isi 0 untuk tidak set limit.
      </p>
      <div class="budget-manager-list" id="bm-list">
        ${kategori.filter(k => k.id !== 'transfer_keluar').map(k => {
          const current = budgets[k.id] || 0;
          return `
            <div class="bm-row">
              <label class="bm-label">${k.icon} ${escHtml(k.nama)}</label>
              <div class="nominal-wrap bm-input-wrap">
                <span class="nominal-prefix" style="font-size:12px;">${getCurrencySymbol()}</span>
                <input type="text" class="input-nominal bm-input" data-kat="${k.id}"
                  placeholder="Tidak diset"
                  value="${current > 0 ? formatNominalInput(current) : ''}"
                  inputmode="numeric" style="font-size:13px;padding:6px 8px;" />
              </div>
            </div>`;
        }).join('')}
      </div>`,
    confirmText: 'Simpan Budget',
    onOpen: () => {
      document.querySelectorAll('.bm-input').forEach(input => {
        input.addEventListener('input', () => {
          const raw = input.value.replace(/\D/g, '');
          input.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
        });
      });
      document.querySelectorAll('.budget-period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.budget-period-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const hint = document.getElementById('bm-period-hint');
          if (hint) hint.textContent = _getPeriodHint(btn.dataset.period);
        });
      });
    },
    onConfirm: () => {
      const newBudgets = {};
      document.querySelectorAll('.bm-input').forEach(input => {
        const val = parseNominal(input.value);
        if (val > 0) newBudgets[input.dataset.kat] = val;
      });
      const activeBtn = document.querySelector('.budget-period-btn.active');
      if (activeBtn) saveBudgetPeriod(activeBtn.dataset.period);
      saveBudgets(newBudgets);
      showToast('Budget disimpan ✓');
      renderDashboard();
      return null;
    },
  });
}

function _getPeriodHint(period) {
  if (period === 'weekly') {
    const { start, end } = getBudgetPeriodRange();
    return `Berlaku Senin–Minggu (${formatDate(start)} – ${formatDate(end)})`;
  }
  const { year, month } = getCurrentMonthYear();
  return `Berlaku satu bulan: ${BULAN_NAMES[month]} ${year}`;
}

// ===== HEALTH SCORE INTEGRATION =====

function getBudgetInsight() {
  const statusMap = calcBudgetStatus();
  const entries   = Object.entries(statusMap);
  if (entries.length === 0) return null;

  const jebol = entries.filter(([, s]) => s.status === 'jebol');
  if (jebol.length > 0) {
    const k = getKategoriById(jebol[0][0], 'keluar');
    return jebol.length === 1
      ? `Budget ${k.nama} sudah jebol.`
      : `${jebol.length} kategori sudah melebihi budget.`;
  }

  const warning = entries.filter(([, s]) => s.status === 'warning');
  if (warning.length > 0) {
    const k = getKategoriById(warning[0][0], 'keluar');
    return `${k.nama} sudah ${warning[0][1].pct}% dari budget — hati-hati.`;
  }

  return null;
}

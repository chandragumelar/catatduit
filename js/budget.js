// ===== BUDGET.JS — Budget per kategori =====

// ===== RENDER DI DASHBOARD =====

function renderBudgetSection(container) {
  const budgets    = getBudgets();
  const statusMap  = calcBudgetStatus();
  const hasAnyBudget = Object.keys(budgets).length > 0;

  const card = document.createElement('div');
  card.className = 'card';

  if (!hasAnyBudget) {
    card.innerHTML = `
      <div class="section-header">
        <h3 class="section-title">Budget Bulan Ini</h3>
      </div>
      <p class="budget-empty-text">Belum ada budget. Set limit pengeluaran per kategori biar lebih terkontrol.</p>
      <button class="btn-secondary" id="btn-set-budget-empty">Set Budget</button>`;
    container.appendChild(card);
    document.getElementById('btn-set-budget-empty')?.addEventListener('click', () => showBudgetManager());
    return;
  }

  const entries = Object.entries(statusMap);
  const jebol   = entries.filter(([, s]) => s.status === 'jebol').length;
  const warning = entries.filter(([, s]) => s.status === 'warning').length;

  card.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Budget Bulan Ini</h3>
      <button class="btn-text-small" id="btn-kelola-budget">Kelola</button>
    </div>
    ${jebol > 0 ? `<p class="budget-alert jebol">🔴 ${jebol} kategori sudah melebihi budget!</p>` : ''}
    ${warning > 0 && jebol === 0 ? `<p class="budget-alert warning">🟠 ${warning} kategori mendekati limit.</p>` : ''}
    <div class="budget-list" id="budget-list-dashboard">
      ${entries.map(([katId, s]) => _buildBudgetRowHTML(katId, s)).join('')}
    </div>`;

  container.appendChild(card);
  document.getElementById('btn-kelola-budget')?.addEventListener('click', () => showBudgetManager());
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

// ===== BUDGET MANAGER (bottom sheet) =====

function showBudgetManager() {
  const budgets  = getBudgets();
  const kategori = getKategori().keluar;

  _openBottomSheet({
    title: 'Set Budget per Kategori',
    fields: `
      <p class="bottom-sheet-hint" style="margin-bottom:12px;">
        Kosongkan atau isi 0 untuk tidak set limit di kategori tersebut.
      </p>
      <div class="budget-manager-list" id="bm-list">
        ${kategori.map(k => {
          const current = budgets[k.id] || 0;
          return `
            <div class="bm-row">
              <label class="bm-label">${k.icon} ${escHtml(k.nama)}</label>
              <div class="nominal-wrap bm-input-wrap">
                <span class="nominal-prefix" style="font-size:12px;">Rp</span>
                <input type="text" class="input-nominal bm-input" data-kat="${k.id}"
                  placeholder="Tidak diset"
                  value="${current > 0 ? current.toLocaleString('id-ID') : ''}"
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
          input.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
        });
      });
    },
    onConfirm: () => {
      const newBudgets = {};
      document.querySelectorAll('.bm-input').forEach(input => {
        const val = parseNominal(input.value);
        if (val > 0) newBudgets[input.dataset.kat] = val;
      });
      saveBudgets(newBudgets);
      showToast('Budget disimpan ✓');
      renderDashboard();
      return null;
    },
  });
}

// ===== INTEGRASI HEALTH SCORE =====
// dipanggil dari calcHealthScore sebagai komponen opsional ke-5
// tidak mengubah formula utama (tetap 4 komponen @ 25%)
// tapi jadi bagian dari getHealthActionSentence

function getBudgetInsight() {
  const statusMap = calcBudgetStatus();
  const entries   = Object.entries(statusMap);
  if (entries.length === 0) return null;

  const jebol = entries.filter(([, s]) => s.status === 'jebol');
  if (jebol.length > 0) {
    const k = getKategoriById(jebol[0][0], 'keluar');
    return jebol.length === 1
      ? `Budget ${k.nama} sudah jebol bulan ini.`
      : `${jebol.length} kategori sudah melebihi budget bulan ini.`;
  }

  const warning = entries.filter(([, s]) => s.status === 'warning');
  if (warning.length > 0) {
    const k = getKategoriById(warning[0][0], 'keluar');
    return `${k.nama} sudah ${warning[0][1].pct}% dari budget — hati-hati.`;
  }

  return null;
}

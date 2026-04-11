// ===== TABUNGAN.JS — Orchestrator tab Tabungan & Tagihan (v3) =====
// Goals logic → goals.js | Tagihan logic → tagihan.js

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
  try {
    if (state.tabunganTab === 'tabungan') renderTabunganTab(container);
    else renderTagihanTab(container);
  } catch (e) {
    container.innerHTML = '<p style="padding:24px;color:var(--gray-500);">Terjadi kesalahan. Coba lagi.</p>';
  }
  if (window.lucide) lucide.createIcons();
}

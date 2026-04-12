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

  // Onboarding back banner
  if (state.fromOnboarding) {
    const banner = document.createElement('div');
    banner.id = 'onboarding-back-banner';
    banner.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--teal-light,#e6f4f1);color:var(--teal);font-size:13px;font-weight:500;padding:10px 16px;cursor:pointer;margin-bottom:4px;border-radius:8px;';
    banner.innerHTML = '<span>←</span><span>Kembali ke Setup CatatDuit</span>';
    banner.addEventListener('click', () => {
      state.fromOnboarding = false;
      navigateTo('dashboard');
    });
    container.appendChild(banner);
  }

  try {
    if (state.tabunganTab === 'tabungan') renderTabunganTab(container);
    else renderTagihanTab(container);
  } catch (e) {
    container.innerHTML = '<p style="padding:24px;color:var(--gray-500);">Terjadi kesalahan. Coba lagi.</p>';
  }
  if (window.lucide) lucide.createIcons();
}

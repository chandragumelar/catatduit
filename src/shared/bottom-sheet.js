// =============================================================================
// BOTTOM-SHEET.JS
// Tanggung jawab: Generic bottom sheet component (open/close/render)
// Depends on: (none)
// =============================================================================

// Menggantikan semua window.prompt() di v2.
//
// Usage:
// _openBottomSheet({
//   title, subtitle?, fields (HTML string),
//   confirmText, onOpen?, onConfirm (return error string | null)
// })

function _openBottomSheet({ title, subtitle = '', fields, confirmText = 'Simpan', onOpen, onConfirm }) {
  // Hapus sheet yang mungkin masih ada
  document.getElementById('bottom-sheet-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'bottom-sheet-overlay';
  overlay.className = 'bottom-sheet-overlay';
  overlay.innerHTML = `
    <div class="bottom-sheet" id="bottom-sheet">
      <div class="bottom-sheet-handle"></div>
      ${title    ? `<h3 class="bottom-sheet-title">${escHtml(title)}</h3>` : ''}
      ${subtitle ? `<p class="bottom-sheet-subtitle">${escHtml(subtitle)}</p>` : ''}
      ${fields}
      <p class="bottom-sheet-error" id="bs-error"></p>
      <div class="bottom-sheet-actions">
        <button class="btn-secondary" id="bs-cancel">Batal</button>
        <button class="btn-primary" id="bs-confirm">${escHtml(confirmText)}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  if (onOpen) onOpen();

  // Focus input pertama
  setTimeout(() => overlay.querySelector('input')?.focus(), 300);

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };

  document.getElementById('bs-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('bs-confirm').addEventListener('click', () => {
    const errorEl = document.getElementById('bs-error');
    errorEl.textContent = '';
    const err = onConfirm();
    if (err) {
      errorEl.textContent = err;
      return;
    }
    close();
  });
}

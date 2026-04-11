// ===== CERITA.SLIDES.RENDER2.JS — Slide builders: persona, closing =====

function _slidePersona(persona, grad0, grad1, streak) {
  const streakBlock = streak > 0
    ? `<p class="cs-streak">🔥 ${streak} hari berturut-turut catat</p>` : '';
  return `
    <div class="cs-content cs-persona-slide" style="background:linear-gradient(160deg,${grad0},${grad1})">
      <div class="cs-anim cs-anim-1 cs-persona-icon">${persona.icon}</div>
      <div class="cs-anim cs-anim-2">
        <h2 class="cs-persona-nama">${persona.nama}</h2>
        <p class="cs-persona-tagline">"${escHtml(persona.tagline)}"</p>
      </div>
      <div class="cs-anim cs-anim-3">${streakBlock}</div>
    </div>`;
}

function _slideClosing(shareText, konsistensiPct, hariAdaTx, hariDenom, grad0, grad1) {
  const pct = Math.round(konsistensiPct * 100);
  return `
    <div class="cs-content cs-closing-slide">
      <div class="cs-anim cs-anim-1"><p class="cs-eyebrow">Konsistensi catat</p></div>
      <div class="cs-anim cs-anim-2">
        <div class="cs-konsistensi-row">
          <span>${hariAdaTx} dari ${hariDenom} hari</span><span>${pct}%</span>
        </div>
        <div class="cs-bar-wrap">
          <div class="cs-bar" style="width:${pct}%;background:linear-gradient(90deg,${grad0},${grad1})"></div>
        </div>
      </div>
      <div class="cs-anim cs-anim-3 cs-share-quote">"${escHtml(shareText)}"</div>
      <div class="cs-anim cs-anim-4 cs-closing-actions">
        <button class="btn-primary cs-share-btn" id="cs-share-btn">📸 Simpan sebagai Gambar</button>
        <p class="cs-watermark">CatatDuit · app-catatduit.vercel.app</p>
      </div>
    </div>`;
}

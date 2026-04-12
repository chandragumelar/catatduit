// =============================================================================
// CERITA.SLIDES.JS
// Tanggung jawab: Sequence controller untuk slide-slide Cerita Bulan Ini
// Depends on: state.js, cerita.slides.render.js, cerita.slides.render2.js
// =============================================================================

// Depends on: cerita.slides.render.js

const SLIDE_COUNT = 5;

function buildCeritaSlides(data, bulanNama, year) {
  const { persona, totalMasuk, totalKeluar, totalNabung, cashflow,
          top3, konsistensiPct, hariAdaTx, hariDenom, shareText, streak } = data;
  const [grad0, grad1]  = getPersonaGradient(persona.id);
  const cashflowPositif = cashflow >= 0;

  const slides = [
    _slideIntro(bulanNama, year, data.isCurrentMonth, data.txCount),
    _slideAngka(totalMasuk, totalKeluar, totalNabung, cashflow, cashflowPositif),
    _slideKategori(top3, totalKeluar),
    _slidePersona(persona, grad0, grad1, streak),
    _slideClosing(shareText, konsistensiPct, hariAdaTx, hariDenom, grad0, grad1),
  ];

  const dots = Array.from({ length: SLIDE_COUNT }, (_, i) =>
    `<span class="cs-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`
  ).join('');

  return `
    <div class="cs-carousel" id="cs-carousel">
      <div class="cs-track" id="cs-track">
        ${slides.map((s, i) => `<div class="cs-slide" data-index="${i}">${s}</div>`).join('')}
      </div>
      <div class="cs-dots" id="cs-dots">${dots}</div>
    </div>`;
}

function initCarousel(onShareClick) {
  const track = document.getElementById('cs-track');
  if (!track) return;

  const slides = track.querySelectorAll('.cs-slide');
  const dots   = document.querySelectorAll('.cs-dot');

  _animateSlide(0);

  // IntersectionObserver for scroll-snap active slide detection
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.intersectionRatio >= 0.6) {
        const idx = +e.target.dataset.index;
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        _animateSlide(idx);
      }
    });
  }, { root: track, threshold: 0.6 });

  slides.forEach(s => io.observe(s));

  // Dot navigation
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () =>
      slides[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    );
  });

  document.getElementById('cs-share-btn')?.addEventListener('click', onShareClick);
}

function _animateSlide(idx) {
  const slide = document.querySelectorAll('.cs-slide')[idx];
  if (!slide) return;
  slide.querySelectorAll('.cs-anim').forEach(el => {
    el.classList.remove('cs-visible');
    void el.offsetWidth; // force reflow
    el.classList.add('cs-visible');
  });
}

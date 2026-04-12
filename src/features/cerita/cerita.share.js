// =============================================================================
// CERITA.SHARE.JS
// Tanggung jawab: Share flow controller — trigger share native atau fallback
// Depends on: cerita.share.svg.js, cerita.sharetext.js
// =============================================================================

// Depends on: cerita.share.svg.js

function generateShareImage(data, bulanNama, year) {
  const { persona, totalMasuk, totalKeluar, totalNabung, cashflow, shareText } = data;
  const [grad0, grad1]  = getPersonaGradient(persona.id);
  const cashflowPositif = cashflow >= 0;

  const svg = buildShareSVG({
    persona, totalMasuk, totalKeluar, totalNabung,
    cashflow, cashflowPositif, shareText,
    bulanNama, year, grad0, grad1,
  });

  _svgToPng(svg, `CatatDuit-${bulanNama}-${year}.png`);
}

function _svgToPng(svgStr, filename) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();

  img.onload = () => {
    const canvas  = document.createElement('canvas');
    canvas.width  = SHARE_W;
    canvas.height = SHARE_H;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob(pngBlob => {
      const a   = document.createElement('a');
      a.href     = URL.createObjectURL(pngBlob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }, 'image/png');
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Gagal generate gambar. Coba lagi.');
  };

  img.src = url;
}

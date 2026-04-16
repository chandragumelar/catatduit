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
  // Gunakan data URI bukan blob URL — lebih reliable untuk SVG→canvas cross-browser
  const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  const img     = new Image();

  img.onload = () => {
    const canvas  = document.createElement('canvas');
    canvas.width  = SHARE_W;
    canvas.height = SHARE_H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // toBlob lebih efisien, tapi fallback ke toDataURL kalau null (low-memory device)
    try {
      canvas.toBlob(pngBlob => {
        if (!pngBlob) {
          _downloadViaDataUrl(canvas, filename);
          return;
        }
        const blobUrl = URL.createObjectURL(pngBlob);
        _triggerDownload(blobUrl, filename);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }, 'image/png');
    } catch (e) {
      _downloadViaDataUrl(canvas, filename);
    }
  };

  img.onerror = () => {
    showToast('Gagal generate gambar. Coba lagi.');
  };

  img.src = dataUri;
}

function _triggerDownload(href, filename) {
  const a   = document.createElement('a');
  a.href     = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function _downloadViaDataUrl(canvas, filename) {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    _triggerDownload(dataUrl, filename);
  } catch (e) {
    showToast('Gagal generate gambar. Coba lagi.');
  }
}

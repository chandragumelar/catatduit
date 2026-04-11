// ===== QUICK-CAPTURE.JS — Input super cepat, target <10 detik =====
// Accessible dari: shortcut home screen (URL param ?q=1) atau FAB long-press
// Flow: Nominal → Kategori → Simpan (wallet otomatis = default)

const QC_MAX_RECENT = 5; // kategori recent yang ditampilkan

function initQuickCapture() {
  // Trigger via URL param ?q=1 (untuk shortcut home screen)
  if (new URLSearchParams(location.search).get('q') === '1') {
    openQuickCapture();
    return;
  }

  // Long-press pada FAB
  const fab = document.getElementById('nav-fab');
  if (!fab) return;

  let pressTimer = null;
  fab.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => openQuickCapture(), 500);
  });
  fab.addEventListener('pointerup',    () => clearTimeout(pressTimer));
  fab.addEventListener('pointerleave', () => clearTimeout(pressTimer));
}

function openQuickCapture() {
  document.getElementById('qc-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'qc-overlay';
  overlay.className = 'qc-overlay';

  const wallets  = getWallets();
  const walletId = wallets[0]?.id || DEFAULT_WALLET_ID;

  // Recent kategori keluar (berdasarkan frekuensi)
  const freq    = getKategoriFrequency('keluar');
  const allKat  = getKategori().keluar;
  const recent  = [...allKat]
    .sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0))
    .slice(0, QC_MAX_RECENT);

  overlay.innerHTML = `
    <div class="qc-sheet" id="qc-sheet">
      <div class="qc-handle"></div>

      <!-- Step 1: Nominal -->
      <div class="qc-step" id="qc-step-1">
        <p class="qc-label">Berapa yang keluar?</p>
        <div class="qc-nominal-wrap">
          <span class="qc-prefix">${getCurrencySymbol()}</span>
          <input type="text" id="qc-nominal" class="qc-nominal-input"
            placeholder="0" inputmode="numeric" autofocus />
        </div>
        <div class="qc-numpad" id="qc-numpad">
          ${['1','2','3','4','5','6','7','8','9','⌫','0','✓']
            .map(k => `<button class="qc-key" data-key="${k}">${k}</button>`)
            .join('')}
        </div>
      </div>

      <!-- Step 2: Kategori -->
      <div class="qc-step" id="qc-step-2" style="display:none;">
        <p class="qc-label">Kategori apa?</p>
        <div class="qc-chips" id="qc-chips">
          ${recent.map(k => `
            <button class="qc-chip" data-id="${k.id}">
              ${k.icon} ${escHtml(k.nama)}
            </button>`).join('')}
          <button class="qc-chip qc-chip--more" id="qc-more-kat">Lainnya +</button>
        </div>
        <button class="qc-skip" id="qc-skip-kat">Lewati — simpan tanpa kategori</button>
      </div>

      <!-- Step 3: Done -->
      <div class="qc-step" id="qc-step-3" style="display:none;">
        <div class="qc-done-icon">✅</div>
        <p class="qc-done-text" id="qc-done-text">Tersimpan!</p>
        <button class="btn-secondary qc-lagi" id="qc-lagi">Catat lagi</button>
      </div>

      <button class="qc-close" id="qc-close">✕</button>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  _initQCStep1(overlay, walletId);

  document.getElementById('qc-close').addEventListener('click', () => _closeQC(overlay));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeQC(overlay); });
}

function _initQCStep1(overlay, walletId) {
  const input    = document.getElementById('qc-nominal');
  const numpad   = document.getElementById('qc-numpad');

  setTimeout(() => input.focus(), 200);

  // Format input
  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '');
    input.value = raw ? Math.min(parseInt(raw, 10), MAX_NOMINAL).toLocaleString('id-ID') : '';
  });

  // Numpad
  numpad.addEventListener('click', (e) => {
    const key = e.target.closest('.qc-key')?.dataset.key;
    if (!key) return;

    if (key === '⌫') {
      const raw = input.value.replace(/\D/g, '').slice(0, -1);
      input.value = raw ? parseInt(raw, 10).toLocaleString('id-ID') : '';
      return;
    }
    if (key === '✓') {
      _qcGoToKategori(overlay, walletId);
      return;
    }
    // Angka
    const raw = (input.value.replace(/\D/g, '') + key);
    const num = Math.min(parseInt(raw, 10), MAX_NOMINAL);
    input.value = num.toLocaleString('id-ID');
  });

  // Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _qcGoToKategori(overlay, walletId);
  });
}

function _qcGoToKategori(overlay, walletId) {
  const nominal = parseNominal(document.getElementById('qc-nominal').value);
  if (!nominal || nominal <= 0) {
    document.getElementById('qc-nominal').classList.add('qc-error-shake');
    setTimeout(() => document.getElementById('qc-nominal')?.classList.remove('qc-error-shake'), 400);
    return;
  }

  // Simpan nominal ke overlay dataset untuk step 2
  overlay.dataset.nominal  = nominal;
  overlay.dataset.walletId = walletId;

  document.getElementById('qc-step-1').style.display = 'none';
  document.getElementById('qc-step-2').style.display = 'block';

  // Chip handlers
  document.querySelectorAll('.qc-chip:not(.qc-chip--more)').forEach(chip => {
    chip.addEventListener('click', () => {
      _qcSimpan(overlay, parseInt(overlay.dataset.nominal), chip.dataset.id, walletId);
    });
  });

  // Lewati
  document.getElementById('qc-skip-kat').addEventListener('click', () => {
    _qcSimpan(overlay, parseInt(overlay.dataset.nominal), 'lainnya_keluar', walletId);
  });

  // Lainnya — buka semua kategori
  document.getElementById('qc-more-kat').addEventListener('click', () => {
    const allKat  = getKategori().keluar;
    const chipsEl = document.getElementById('qc-chips');
    chipsEl.innerHTML = '';
    allKat.forEach(k => {
      const chip = document.createElement('button');
      chip.className = 'qc-chip';
      chip.dataset.id = k.id;
      chip.innerHTML = `${k.icon} ${escHtml(k.nama)}`;
      chip.addEventListener('click', () =>
        _qcSimpan(overlay, parseInt(overlay.dataset.nominal), k.id, walletId));
      chipsEl.appendChild(chip);
    });
  });
}

function _qcSimpan(overlay, nominal, kategoriId, walletId) {
  const today  = getTodayStr();
  const txList = getTransaksi();
  const now    = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;

  const duplicate = txList.find(tx =>
    tx.jenis === 'keluar' &&
    tx.nominal === nominal &&
    tx.kategori === kategoriId &&
    tx.timestamp && (now - tx.timestamp) <= FIVE_MIN
  );

  const _doSave = () => {
    txList.push({
      id: generateId(),
      jenis: 'keluar',
      nominal,
      kategori: kategoriId,
      tanggal: today,
      catatan: '',
      wallet_id: walletId,
      timestamp: Date.now(),
    });
    saveTransaksi(txList);
    invalidateTransaksiCache();
    _qcShowDone(overlay, nominal, kategoriId);
  };

  if (duplicate) {
    const k = getKategoriById(kategoriId, 'keluar');
    showModal(
      `⚠️ Transaksi serupa baru saja dicatat\n\n${k.icon} ${k.nama} · ${formatRupiah(duplicate.nominal)}\n\nYakin mau catat lagi?`,
      _doSave,
      'Tetap Simpan',
      false
    );
    return;
  }

  _doSave();
}

function _qcShowDone(overlay, nominal, kategoriId) {
  // Step 3: done
  document.getElementById('qc-step-2').style.display = 'none';
  document.getElementById('qc-step-3').style.display = 'block';
  const k = getKategoriById(kategoriId, 'keluar');
  document.getElementById('qc-done-text').textContent =
    `${formatRupiah(nominal)} — ${k.nama} tersimpan!`;

  document.getElementById('qc-lagi').addEventListener('click', () => {
    // Reset ke step 1
    document.getElementById('qc-nominal').value = '';
    document.getElementById('qc-step-3').style.display = 'none';
    document.getElementById('qc-step-1').style.display = 'block';
    setTimeout(() => document.getElementById('qc-nominal').focus(), 100);
  });

  // Auto-close setelah 2 detik kalau user tidak tap "Catat lagi"
  setTimeout(() => {
    if (document.getElementById('qc-overlay')) {
      _closeQC(overlay);
      renderDashboard();
    }
  }, 2000);
}

function _closeQC(overlay) {
  overlay.classList.remove('show');
  setTimeout(() => {
    overlay.remove();
    renderDashboard();
  }, 300);
}

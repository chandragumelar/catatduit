// ===== TAGIHAN.JS — Tab Tagihan =====

function renderTagihanTab(container) {
  const tagihan = getTagihan();
  const { year, month } = getCurrentMonthYear();

  // Disclaimer
  const disclaimerEl = document.createElement('div');
  disclaimerEl.className = 'tagihan-disclaimer';
  disclaimerEl.innerHTML = `
    <span>⚠️</span>
    <span>Daftar ini hanya <strong>pengingat</strong> — bukan bukti pembayaran. Kecuali kamu tap <strong>Sudah Bayar</strong>, tagihan tidak otomatis tercatat sebagai pengeluaran.</span>`;
  container.appendChild(disclaimerEl);

  const tagihanCard = document.createElement('div');
  tagihanCard.className = 'card';
  tagihanCard.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Tagihan</h3>
      <button class="btn-add-tagihan" id="btn-add-tagihan"><i data-lucide="plus"></i> Tambah</button>
    </div>`;

  const sorted = [...tagihan].sort((a, b) => {
    if (!a.jatuhTempo) return 1;
    if (!b.jatuhTempo) return -1;
    return a.jatuhTempo.localeCompare(b.jatuhTempo);
  });

  if (sorted.length === 0) {
    tagihanCard.innerHTML += `
      ${buildEmptyState('📋', '', 'Belum ada tagihan. Tambah reminder tagihan rutinmu!', null)}`;
  } else {
    sorted.forEach(t => {
      const isPaid       = isTagihanPaidThisMonth(t, year, month);
      const isThisMonth  = _isTagihanThisMonth(t, year, month);
      const jatuhFormatted = _formatJatuhTempo(t, year, month);

      const item = document.createElement('div');
      item.className = `tagihan-item ${isThisMonth ? 'tagihan-item--this-month' : ''}`;
      item.innerHTML = `
        <div class="tagihan-info">
          <div class="tagihan-nama">${escHtml(t.nama)}</div>
          <div class="tagihan-detail">Jatuh tempo: ${jatuhFormatted}${t.isRecurring === false ? ' · Sekali bayar' : ''}</div>
        </div>
        <div class="tagihan-right">
          <div class="tagihan-nominal">${formatRupiah(t.nominal)}</div>
          <div class="tagihan-actions">
            ${isThisMonth
              ? isPaid
                ? `<span class="tagihan-lunas-badge">✓ Lunas</span>`
                : `<button class="btn-sudah-bayar" data-id="${t.id}">Sudah Bayar</button>`
              : ''}
            <button class="btn-icon-sm" data-action="edit-tagihan" data-id="${t.id}" title="Edit"><i data-lucide="pencil"></i></button>
            <button class="btn-icon-sm danger" data-action="hapus-tagihan" data-id="${t.id}" title="Hapus"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
      tagihanCard.appendChild(item);
    });
  }

  container.appendChild(tagihanCard);

  document.getElementById('btn-add-tagihan')?.addEventListener('click', () => _showTagihanSheet());
  tagihanCard.querySelectorAll('[data-action="edit-tagihan"]').forEach(btn =>
    btn.addEventListener('click', () => _showTagihanSheet(btn.dataset.id)));
  tagihanCard.querySelectorAll('[data-action="hapus-tagihan"]').forEach(btn =>
    btn.addEventListener('click', () => _hapusTagihan(btn.dataset.id)));
  tagihanCard.querySelectorAll('.btn-sudah-bayar').forEach(btn =>
    btn.addEventListener('click', () => _showBayarSheet(btn.dataset.id)));

  if (window.lucide) lucide.createIcons();
}

// ===== HELPERS =====

function _isTagihanThisMonth(t, year, month) {
  if (!t.jatuhTempo) return false;
  const d = new Date(t.jatuhTempo + 'T00:00:00');
  if (t.isRecurring === false) return d.getFullYear() === year && d.getMonth() === month;
  // Recurring: relevan mulai dari bulan+tahun jatuh tempo pertama kali
  // Tidak muncul di bulan-bulan SEBELUM tanggal jatuh tempo dibuat
  const tagihanYear  = d.getFullYear();
  const tagihanMonth = d.getMonth();
  const currentDate  = new Date(year, month, 1);
  const startDate    = new Date(tagihanYear, tagihanMonth, 1);
  return currentDate >= startDate;
}

function _formatJatuhTempo(t, year, month) {
  if (!t.jatuhTempo) return '-';
  const d = new Date(t.jatuhTempo + 'T00:00:00');
  const day = d.getDate();
  if (t.isRecurring !== false) {
    const maxDay = new Date(year, month + 1, 0).getDate();
    const effectiveDay = Math.min(day, maxDay);
    return new Date(year, month, effectiveDay).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return formatDate(t.jatuhTempo);
}

// ===== BOTTOM SHEET: Tambah / Edit Tagihan =====

function _showTagihanSheet(id = null) {
  const tagihan = getTagihan();
  const wallets = getWallets();
  const isEdit  = id !== null;
  const t       = isEdit ? tagihan.find(x => x.id === id) : null;
  if (isEdit && !t) return;

  let recurringVal = t ? t.isRecurring !== false : true;

  _openBottomSheet({
    title: isEdit ? 'Edit Tagihan' : 'Tambah Tagihan',
    fields: `
      <div class="bottom-sheet-field">
        <label class="input-label">Nama tagihan</label>
        <input type="text" id="bs-nama" class="input-field"
          placeholder="contoh: Netflix, BPJS, Cicilan HP"
          value="${escHtml(t?.nama || '')}" maxlength="50" />
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix">${getCurrencySymbol()}</span>
          <input type="text" id="bs-nominal" class="input-nominal"
            placeholder="0"
            value="${t ? formatNominalInput(t.nominal) : ''}"
            inputmode="numeric" />
        </div>
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Tanggal jatuh tempo</label>
        <input type="date" id="bs-jatuh-tempo" class="input-field"
          value="${t?.jatuhTempo || ''}" />
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Muncul setiap bulan?</label>
        <p class="bottom-sheet-hint" style="margin-bottom:8px;">Rutin: Netflix, listrik. Sekali: hutang ke teman.</p>
        <div class="jenis-toggle" style="margin-top:0;">
          <button type="button" class="jenis-btn ${recurringVal ? 'active' : ''}" id="bs-recurring-ya">Ya</button>
          <button type="button" class="jenis-btn ${!recurringVal ? 'active' : ''}" id="bs-recurring-tidak">Tidak</button>
        </div>
      </div>
      ${wallets.length > 1 ? `
      <div class="bottom-sheet-field">
        <label class="input-label">Biasanya bayar dari</label>
        <p class="bottom-sheet-hint" style="margin-bottom:8px;">Bisa diubah saat bayar nanti.</p>
        <div class="wallet-chip-wrap" id="bs-wallet-chips">
          ${wallets.map(w => `
            <button type="button" class="chip wallet-chip ${(t?.preferred_wallet_id || wallets[0].id) === w.id ? 'active' : ''}"
              data-wallet-id="${w.id}">${w.icon} ${escHtml(w.nama)}</button>`).join('')}
        </div>
      </div>` : ''}`,
    confirmText: isEdit ? 'Simpan' : 'Tambah Tagihan',
    onOpen: () => {
      document.getElementById('bs-nominal').addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
      });
      document.getElementById('bs-recurring-ya').addEventListener('click', () => {
        recurringVal = true;
        document.getElementById('bs-recurring-ya').classList.add('active');
        document.getElementById('bs-recurring-tidak').classList.remove('active');
      });
      document.getElementById('bs-recurring-tidak').addEventListener('click', () => {
        recurringVal = false;
        document.getElementById('bs-recurring-tidak').classList.add('active');
        document.getElementById('bs-recurring-ya').classList.remove('active');
      });
      // Wallet preferred chips
      document.querySelectorAll('#bs-wallet-chips .wallet-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('#bs-wallet-chips .wallet-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        });
      });
    },
    onConfirm: () => {
      const nama      = document.getElementById('bs-nama').value.trim();
      const nominal   = parseNominal(document.getElementById('bs-nominal').value);
      const jatuhTempo = document.getElementById('bs-jatuh-tempo').value || null;
      if (!nama)            return 'Nama tidak boleh kosong.';
      if (!nominal || nominal <= 0) return 'Nominal tidak valid.';

      const preferredWallet = document.querySelector('#bs-wallet-chips .wallet-chip.active')?.dataset.walletId
        || (wallets.length === 1 ? wallets[0].id : null);

      if (isEdit) {
        const idx = tagihan.findIndex(x => x.id === id);
        tagihan[idx] = { ...t, nama, nominal, jatuhTempo, isRecurring: recurringVal, preferred_wallet_id: preferredWallet };
        saveTagihan(tagihan);
        showToast('Tagihan diperbarui.');
      } else {
        tagihan.push({ id: generateId(), nama, nominal, jatuhTempo, isRecurring: recurringVal, paidMonths: [], preferred_wallet_id: preferredWallet });
        saveTagihan(tagihan);
        showToast('Tagihan ditambahkan!');
      }
      renderTabunganContent();
      renderOnboardingChecklist('onboarding-checklist-wrap');
      return null;
    },
  });
}

// ===== BOTTOM SHEET: Konfirmasi Bayar =====

function _showBayarSheet(id) {
  const tagihan = getTagihan();
  const t       = tagihan.find(x => x.id === id);
  if (!t) return;
  const { year, month } = getCurrentMonthYear();
  const wallets = getWallets();
  const singleWallet = wallets.length <= 1;
  const defaultWalletId = t.preferred_wallet_id || wallets[0]?.id || DEFAULT_WALLET_ID;

  // Wallet picker — hanya tampil kalau > 1 wallet
  const walletPickerHTML = !singleWallet ? `
    <div class="bottom-sheet-field">
      <label class="input-label">Bayar dari dompet <span style="color:var(--red)">*</span></label>
      <div class="wallet-chip-wrap" id="bs-bayar-wallet-chips">
        ${wallets.map(w => `
          <button type="button" class="chip wallet-chip ${w.id === defaultWalletId ? 'active' : ''}"
            data-wallet-id="${w.id}">${w.icon} ${escHtml(w.nama)}</button>`).join('')}
      </div>
      <p class="bottom-sheet-hint" id="bs-bayar-wallet-error" style="color:var(--red);min-height:16px;"></p>
    </div>` : '';

  _openBottomSheet({
    title: 'Konfirmasi pembayaran',
    subtitle: t.nama,
    fields: `
      ${walletPickerHTML}
      <div class="bottom-sheet-field">
        <label class="input-label">Nominal</label>
        <div class="nominal-wrap">
          <span class="nominal-prefix">${getCurrencySymbol()}</span>
          <input type="text" id="bs-nominal" class="input-nominal"
            value="${formatNominalInput(t.nominal)}" inputmode="numeric" />
        </div>
        <p class="bottom-sheet-hint">Sesuaikan kalau nominalnya berbeda dari biasanya.</p>
      </div>
      <div class="bottom-sheet-field">
        <label class="input-label">Tanggal bayar</label>
        <input type="date" id="bs-tanggal" class="input-field"
          value="${getTodayStr()}" max="${getTodayStr()}" />
      </div>`,
    confirmText: 'Bayar & Catat',
    onOpen: () => {
      document.getElementById('bs-nominal').addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        e.target.value = raw ? formatNominalInput(Math.min(parseInt(raw, 10), MAX_NOMINAL)) : '';
      });
      // Wallet chip toggle
      document.querySelectorAll('#bs-bayar-wallet-chips .wallet-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('#bs-bayar-wallet-chips .wallet-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          document.getElementById('bs-bayar-wallet-error').textContent = '';
        });
      });
    },
    onConfirm: () => {
      const nominal  = parseNominal(document.getElementById('bs-nominal').value);
      const tanggal  = document.getElementById('bs-tanggal').value || getTodayStr();
      if (!nominal || nominal <= 0) return 'Nominal tidak valid.';

      // Validasi wallet — wajib kalau multi wallet
      let walletId;
      if (singleWallet) {
        walletId = wallets[0]?.id || DEFAULT_WALLET_ID;
      } else {
        const selected = document.querySelector('#bs-bayar-wallet-chips .wallet-chip.active');
        if (!selected) {
          document.getElementById('bs-bayar-wallet-error').textContent = 'Pilih dompet dulu.';
          return 'Pilih dompet dulu.';
        }
        walletId = selected.dataset.walletId;
      }

      // Catat sebagai transaksi keluar
      const txList = getTransaksi();
      txList.push({
        id: generateId(),
        jenis: 'keluar',
        nominal,
        kategori: 'lainnya_keluar',
        tanggal,
        catatan: t.nama,
        wallet_id: walletId,
        timestamp: new Date(tanggal + 'T12:00:00').getTime(),
      });
      saveTransaksi(txList);
      invalidateTransaksiCache();

      markTagihanPaid(id, year, month);

      if (t.isRecurring === false) {
        saveTagihan(getTagihan().filter(x => x.id !== id));
      }

      showToast(`${t.nama} tercatat sebagai pengeluaran ✓`);
      renderTabunganContent();
      return null;
    },
  });
}

function _hapusTagihan(id) {
  const tagihan = getTagihan();
  const t = tagihan.find(x => x.id === id);
  if (!t) return;
  showModal(`Hapus tagihan "${t.nama}"?`, () => {
    saveTagihan(tagihan.filter(x => x.id !== id));
    showToast('Tagihan dihapus.');
    renderTabunganContent();
  }, 'Ya, Hapus');
}

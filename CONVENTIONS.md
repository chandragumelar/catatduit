# CatatDuit — Conventions

Panduan ini adalah sumber kebenaran untuk semua keputusan coding di project ini. Berlaku untuk semua contributor.

---

## 1. Function Naming

| Prefix | Makna | Contoh |
|--------|-------|--------|
| `_` | Private — file-scoped, tidak boleh dipanggil dari luar | `_buildCard()`, `_calcStreak()` |
| (tanpa prefix) | Public — bisa dipanggil dari file lain | `renderDashboard()`, `saveTransaksi()` |

**Rules:**
- Jika function hanya dipakai dalam satu file → wajib prefix `_`
- Jika function dipanggil dari file lain → tanpa prefix, harus terdokumentasi di header file
- Jangan export object/namespace — cukup function global (sesuai pattern vanilla JS project ini)

---

## 2. File Naming

Pattern: `feature.submodule.js`

```
dashboard.calc.js       ✓
dashboard.cards.js      ✓
cerita.slides.render.js ✓
dashboardCalc.js        ✗  (camelCase tidak dipakai)
dashboard_calc.js       ✗  (underscore tidak dipakai)
```

File tunggal per feature (tidak ada sub-module): gunakan nama feature saja.
```
budget.js       ✓
input.js        ✓
```

---

## 3. State Management

**Kapan pakai `state.*`:**
- Data yang berubah during runtime dan memengaruhi render: `state.currentPage`, `state.inputJenis`, `state.selectedWalletId`
- Data sementara yang tidak perlu persist: `state.chartInstances`, `state.inputPreserve`

**Kapan pakai localStorage langsung (via storage.js):**
- Data yang harus persist antar session: transaksi, wallet, settings, kategori
- Selalu akses via fungsi di `storage.js`, **jangan** panggil `localStorage.getItem/setItem` langsung dari feature files

**Rule:** Feature files → `storage.js` functions → localStorage. Tidak boleh skip layer.

---

## 4. DOM Manipulation

- **Wajib:** semua query DOM (`document.getElementById`, `querySelector`) harus ada di dalam fungsi `init` atau event handler — tidak boleh di top-level script
- **Alasan:** script di-load sebelum DOM fully rendered; query di top-level akan return `null`
- **Pattern yang benar:**
  ```js
  function initInput() {
    const el = document.getElementById('input-nominal'); // ✓ dalam fungsi
    el.addEventListener('input', _handleNominalInput);
  }
  ```
- **Pattern yang salah:**
  ```js
  const el = document.getElementById('input-nominal'); // ✗ top-level
  ```

---

## 5. Error Handling

**Storage errors:**
```js
function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // QuotaExceededError atau SecurityError
    showToast('Penyimpanan penuh. Hapus data lama.', 'error');
    return false;
  }
}
```

**Pattern untuk feature files:**
- Selalu cek return value dari `setData` / `saveTransaksi` jika critical
- Gunakan `showToast(pesan, 'error')` untuk error yang user perlu tahu
- Gunakan `console.warn` untuk non-critical errors (debug only)
- **Jangan** `console.log` di production code — gunakan debug panel

**Toast types:** `'success'` | `'error'` | `'info'`

---

## 6. Kapan Extract ke `utils.js`

Pindahkan function ke `utils.js` jika memenuhi **semua** kriteria berikut:
1. Pure function — tidak ada side effects (tidak ubah state, tidak akses DOM, tidak tulis localStorage)
2. Tidak ada dependency ke variabel global selain standard JS
3. Dipakai di **lebih dari satu** feature file

Contoh yang tepat untuk utils.js: `generateId()`, `formatRupiah()`, `groupBy()`, `clamp()`

Contoh yang **tidak** tepat: `renderCard()` (DOM side effect), `getSaldoWallet()` (akses storage)

---

## 7. File Headers

Setiap file JS harus dimulai dengan header standar:

```js
// =============================================================================
// NAMA-FILE.JS
// Tanggung jawab: [satu kalimat yang jelas]
// Depends on: [daftar file yang harus di-load sebelum ini]
// =============================================================================
```

Jika tidak ada dependency (selain browser globals): tulis `Depends on: (none)`

---

## 8. Script Load Order

Urutan di `index.html` harus selalu:

1. `lib/` (third-party, paling awal)
2. `src/core/` — state → utils → storage → debug
3. `src/shared/` — ui → bottom-sheet → pwa → quick-capture
4. `src/features/` — dependency sebelum dependent (contoh: cerita.persona sebelum cerita.js)
5. `src/app.js` — paling terakhir

Jangan pernah load feature file sebelum core dan shared selesai.

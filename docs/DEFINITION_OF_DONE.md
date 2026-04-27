# DEFINITION_OF_DONE.md — CatatDuit v3

> Sebuah fitur atau task dianggap DONE hanya jika semua kriteria di bawah terpenuhi.
> Tidak ada pengecualian tanpa persetujuan eksplisit.

---

## 1. CODE QUALITY

- [ ] Mengikuti semua rules di `CLAUDE.md`
- [ ] Tidak ada `any` type di TypeScript
- [ ] Tidak ada magic number atau hardcoded string
- [ ] Tidak ada duplicate logic (>2x)
- [ ] Tidak ada unused import, variable, atau export
- [ ] Function <50 baris, component <150 baris, file <300 baris
- [ ] Semua nama variabel dan function self-explanatory
- [ ] Comment hanya untuk business reason / tradeoff, bukan penjelasan kode

---

## 2. FUNGSIONALITAS

- [ ] Fitur berjalan sesuai spesifikasi di `INFORMATION_ARCHITECTURE.md`
- [ ] Semua edge case yang didefinisikan di `DATA_ARCHITECTURE.md` di-handle
- [ ] Validasi input lengkap — tidak bisa submit data invalid
- [ ] Error state ditampilkan dengan pesan yang jelas (bukan hanya merah)
- [ ] Empty state ada dan punya CTA yang relevan
- [ ] Loading state ada untuk operasi async (Supabase, push notif permission)

---

## 3. DATA & STORAGE

- [ ] Schema sesuai `DATA_ARCHITECTURE.md` — tidak ada field tambahan tanpa update dokumen
- [ ] Semua akses localStorage melalui `StorageAdapter` — tidak ada akses langsung
- [ ] Semua localStorage key menggunakan konstanta dari `storage-keys.ts`
- [ ] Data tersimpan dengan benar dan bisa dibaca ulang setelah refresh
- [ ] Tidak ada data corruption ketika storage penuh atau operasi gagal

---

## 4. DESIGN & UI

- [ ] Mengikuti semua token dari `DESIGN_SYSTEM.md` — tidak ada hardcode warna atau ukuran
- [ ] Semua teks tidak overflow — ellipsis teraplikasi di tempat yang benar
- [ ] Komponen sejenis konsisten — toggle sama semua, tombol hapus sama semua, dll
- [ ] Dark theme benar — tidak ada area putih atau abu terang yang tidak disengaja
- [ ] Spacing dan layout menggunakan token `--space-*` dan `--radius-*`

---

## 5. MOBILE & RESPONSIF

- [ ] Tampil dengan benar di viewport 390px (iPhone 14) dan 360px (Android mid-range)
- [ ] Bottom navigation fixed — tidak bisa discroll ke atas oleh konten
- [ ] Konten tidak tertutup bottom navigation — padding bottom teraplikasi
- [ ] Touch target semua elemen interaktif minimal 40x40px
- [ ] Tidak ada horizontal scroll yang tidak disengaja
- [ ] Safe area inset teraplikasi (notch support)

---

## 6. BOTTOM SHEET

- [ ] Bisa ditutup dengan tap overlay di luar sheet
- [ ] Bisa ditutup dengan swipe down (velocity threshold terpenuhi)
- [ ] Snap back ke posisi semula jika swipe tidak cukup kuat
- [ ] Animasi buka dan tutup smooth — 250ms ease-out
- [ ] Internal scroll berfungsi jika konten melebihi max height

---

## 7. CURRENCY & MULTI-WALLET

- [ ] Currency filter mempengaruhi semua data finansial yang tampil
- [ ] Dompet dengan currency berbeda tidak tercampur dalam kalkulasi
- [ ] Simbol currency muncul sesuai dompet yang dipilih di semua form transaksi
- [ ] Validasi max 10 dompet dan max 2 currency berbeda berfungsi
- [ ] Currency filter pill hanya muncul jika user punya 2 currency berbeda

---

## 8. TESTING

- [ ] Unit test ada untuk semua logic di `core/utils/`
- [ ] Unit test ada untuk semua custom hook (useFeature.ts)
- [ ] Test cover: happy path, empty data, boundary case, threshold case
- [ ] Semua test yang berhubungan waktu menggunakan `TestClock`
- [ ] Semua test lulus (`vitest run` clean)
- [ ] Tidak ada test yang di-skip tanpa alasan yang didokumentasikan

---

## 9. PWA

- [ ] App bisa diinstall di Android dan iOS (via "Add to Home Screen")
- [ ] App bisa dipakai penuh dalam mode offline
- [ ] Service worker terdaftar dan aktif
- [ ] Manifest valid (Lighthouse PWA check hijau)

---

## 10. PERFORMA

- [ ] Tidak ada re-render yang tidak perlu (cek dengan React DevTools)
- [ ] Lazy loading teraplikasi untuk Insight page (Recharts)
- [ ] Bundle size tidak melebihi budget di `TECHNICAL_DESIGN.md` section 15
- [ ] Tidak ada console.error atau console.warn yang tidak ditangani di production build

---

## 11. AKSESIBILITAS MINIMUM

- [ ] Semua input field punya label (bukan hanya placeholder)
- [ ] Error message muncul sebagai teks, bukan hanya warna
- [ ] Contrast ratio teks utama vs background minimal 4.5:1
- [ ] Focus ring visible untuk elemen interaktif

---

## 12. OPEN SOURCE & DOKUMENTASI

- [ ] Tidak ada secret atau credential di kode (semua via `.env`)
- [ ] Perubahan yang affect arsitektur sudah diupdate di dokumen terkait
- [ ] Komponen baru yang reusable sudah didokumentasikan di `DESIGN_SYSTEM.md`
- [ ] `README.md` masih akurat setelah perubahan ini

---

## 13. CHECKLIST KHUSUS — FITUR BARU

Berlaku tambahan jika task adalah fitur baru (bukan bug fix atau refactor):

- [ ] Fitur ada di scope `PROJECT_BRIEF.md` — tidak ada feature creep
- [ ] Schema baru atau perubahan schema sudah diupdate di `DATA_ARCHITECTURE.md`
- [ ] Flow baru sudah sesuai `INFORMATION_ARCHITECTURE.md`
- [ ] Komponen baru menggunakan token dari `DESIGN_SYSTEM.md`
- [ ] Empty state dan error state sudah diimplementasi

---

## 14. CHECKLIST KHUSUS — BUG FIX

- [ ] Root cause sudah diidentifikasi dan didokumentasikan di PR/commit message
- [ ] Fix tidak menimbulkan regression di fitur lain
- [ ] Test case baru ditambahkan untuk reproduce bug yang di-fix

---

*Semua item wajib terpenuhi sebelum merge ke `main`.*
*Jika ada item yang tidak relevan untuk task tertentu, coret dengan alasan yang jelas di PR description.*

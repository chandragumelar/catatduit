# DESIGN_SYSTEM.md — CatatDuit v3

> Dokumen ini adalah sumber kebenaran tunggal untuk semua keputusan visual.
> Semua komponen, warna, tipografi, dan spacing harus mengacu ke sini.
> Jangan hardcode nilai di luar token yang sudah didefinisikan.

---

## 1. PRINSIP DESAIN

1. **Dark-first** — semua komponen didesain untuk dark theme. Tidak ada light mode di V1.
2. **Freestyle-friendly** — sistem harus tetap kohesif meski card-card punya visual ekspresif dan beragam.
3. **Konsistensi komponen** — satu jenis aksi = satu bentuk visual. Tidak ada tombol "hapus" yang bentuknya beda-beda.
4. **Readable di angka** — tipografi dan kontras dioptimalkan untuk angka finansial.
5. **Mobile-first** — semua ukuran dan spacing diasumsikan layar ~390px width.

---

## 2. COLOR TOKENS

### 2.1 Background

| Token | Hex | Kegunaan |
|-------|-----|----------|
| `--color-bg-base` | `#0F1117` | Background utama app |
| `--color-bg-surface` | `#1A1D27` | Card, sheet, modal |
| `--color-bg-elevated` | `#22263A` | Input field, dropdown, toggle track |
| `--color-bg-overlay` | `#2A2E42` | Hover state, selected state |

### 2.2 Brand & Accent

| Token | Hex | Kegunaan |
|-------|-----|----------|
| `--color-brand-primary` | `#4F8EF7` | CTA utama, link, progress aktif |
| `--color-brand-secondary` | `#7C5CFC` | Aksen sekunder, gradient pair |
| `--color-brand-gradient` | `linear-gradient(135deg, #4F8EF7, #7C5CFC)` | FAB, highlight card |

### 2.3 Semantic

| Token | Hex | Kegunaan |
|-------|-----|----------|
| `--color-success` | `#34D399` | Pemasukan, aman, lunas |
| `--color-danger` | `#F87171` | Pengeluaran, over budget, terlambat |
| `--color-warning` | `#FBBF24` | Hampir habis, H-1 jatuh tempo |
| `--color-info` | `#60A5FA` | Informasi netral |

### 2.4 Text

| Token | Hex | Kegunaan |
|-------|-----|----------|
| `--color-text-primary` | `#F1F5F9` | Teks utama, angka penting |
| `--color-text-secondary` | `#94A3B8` | Label, subtitle, keterangan |
| `--color-text-disabled` | `#475569` | Placeholder, disabled state |
| `--color-text-inverse` | `#0F1117` | Teks di atas background terang |

### 2.5 Border

| Token | Hex | Kegunaan |
|-------|-----|----------|
| `--color-border-default` | `#2A2E42` | Border card, divider |
| `--color-border-focus` | `#4F8EF7` | Focus ring input |
| `--color-border-danger` | `#F87171` | Input error |

---

## 3. TIPOGRAFI

**Font:** `Plus Jakarta Sans` — load dari Google Fonts.

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root {
  font-family: 'Plus Jakarta Sans', sans-serif;
}
```

### 3.1 Type Scale

| Token | Size | Weight | Line Height | Kegunaan |
|-------|------|--------|-------------|----------|
| `--text-display` | 28px | 700 | 1.2 | Nominal besar (saldo utama) |
| `--text-heading-1` | 22px | 700 | 1.3 | Judul halaman |
| `--text-heading-2` | 18px | 600 | 1.3 | Judul card |
| `--text-heading-3` | 16px | 600 | 1.4 | Judul section, tab aktif |
| `--text-body` | 14px | 400 | 1.5 | Teks utama, list item |
| `--text-body-medium` | 14px | 500 | 1.5 | Label field, nama dompet |
| `--text-caption` | 12px | 400 | 1.4 | Keterangan, timestamp |
| `--text-caption-medium` | 12px | 500 | 1.4 | Badge, chip, tag |
| `--text-micro` | 10px | 500 | 1.3 | Label sangat kecil (min size) |

> **Aturan overflow:** Semua teks yang berpotensi panjang wajib pakai `text-overflow: ellipsis` dengan `max-width` yang didefinisikan. Tidak boleh ada teks yang memotong layout.

### 3.2 Angka Finansial

Angka nominal selalu pakai weight **700** dan size minimal `--text-body` (14px). Angka besar (saldo utama) pakai `--text-display`.

---

## 4. SPACING & LAYOUT

### 4.1 Spacing Scale

| Token | Value | Kegunaan Umum |
|-------|-------|---------------|
| `--space-1` | 4px | Gap antar icon dan label |
| `--space-2` | 8px | Padding internal chip, badge |
| `--space-3` | 12px | Gap antar elemen dalam list item |
| `--space-4` | 16px | Padding card, padding page |
| `--space-5` | 20px | Gap antar card |
| `--space-6` | 24px | Padding sheet header |
| `--space-8` | 32px | Section gap |
| `--space-10` | 40px | Padding bottom (above nav bar) |

### 4.2 Layout

- Page padding horizontal: `--space-4` (16px) kiri dan kanan
- Card border radius: `--radius-lg` (16px)
- Sheet border radius top: `--radius-xl` (24px)
- Bottom nav height: 64px
- FAB size: 56px
- Safe area bottom: ikuti `env(safe-area-inset-bottom)` untuk notch support

### 4.3 Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |
| `--radius-full` | 9999px |

---

## 5. KOMPONEN — ATURAN KONSISTENSI

> Satu jenis aksi = satu tampilan. Semua instance komponen sejenis harus identik.

---

### 5.1 Tombol

#### Primary Button (Save / Simpan)
```
Background : --color-brand-primary
Text       : --color-text-inverse, --text-body-medium
Height     : 48px
Radius     : --radius-md
Width      : full-width di dalam sheet/form
```

#### Secondary Button (Cancel / Batal)
```
Background : transparent
Border     : 1px solid --color-border-default
Text       : --color-text-secondary, --text-body-medium
Height     : 48px
Radius     : --radius-md
Width      : full-width di dalam sheet/form
```

> Di dalam form/sheet: Primary dan Secondary selalu berpasangan, Primary di kanan atau di bawah Secondary.

#### Destructive Button (Hapus — standalone, di luar list)
```
Background : transparent
Border     : 1px solid --color-danger
Text       : --color-danger, --text-body-medium
Height     : 48px
Radius     : --radius-md
```

#### Icon Button Remove (di dalam list item)
```
Icon       : Phosphor `Trash` size 20px
Color      : --color-danger
Background : transparent
Tap area   : 40x40px minimum
```

> Semua tombol hapus di dalam list item selalu pakai bentuk ini. Tidak ada variasi lain.

#### Icon Button Edit (di dalam list item)
```
Icon       : Phosphor `PencilSimple` size 20px
Color      : --color-text-secondary
Background : transparent
Tap area   : 40x40px minimum
```

#### FAB (Floating Action Button)
```
Background : --color-brand-gradient
Icon       : Phosphor `Plus` size 28px, --color-text-inverse
Size       : 56x56px
Radius     : --radius-full
Shadow     : 0 4px 20px rgba(79, 142, 247, 0.4)
Position   : paling kanan bottom nav
```

#### Add Button (+ Tambah di bawah list)
```
Style      : text button
Icon       : Phosphor `Plus` size 16px
Text       : "Tambah [item]", --color-brand-primary, --text-body-medium
Background : transparent
Alignment  : left, padding kiri sejajar list item
```

---

### 5.2 Toggle / Segmented Control

Semua toggle di app (Budget periode, Insight periode, FAB expand) menggunakan komponen yang sama.

```
Container  : --color-bg-elevated, --radius-full, padding 4px
Active pill : --color-brand-primary, --radius-full, padding 6px 16px
Inactive   : transparent
Text aktif  : --color-text-inverse, --text-caption-medium
Text inaktif: --color-text-secondary, --text-caption-medium
Transition  : 150ms ease
```

> Tidak ada toggle yang pakai underline, border bawah, atau bentuk lain. Semua segmented control.

---

### 5.3 Input Field

```
Background : --color-bg-elevated
Border     : 1px solid --color-border-default
Radius     : --radius-md
Height     : 48px
Padding    : 0 --space-4
Text       : --color-text-primary, --text-body
Placeholder: --color-text-disabled, --text-body

Focus state:
  Border   : 1px solid --color-border-focus

Error state:
  Border   : 1px solid --color-border-danger
  Helper   : --color-danger, --text-caption, muncul di bawah field
```

---

### 5.4 Dropdown / Select

```
Tampilan default : sama dengan Input Field
Icon kanan       : Phosphor `CaretDown` size 16px, --color-text-secondary
Saat buka        : bottom sheet dengan list pilihan (bukan native select)
List item        : height 48px, --text-body, icon kiri opsional
Selected item    : --color-brand-primary icon check kanan
```

> Semua dropdown di app menggunakan bottom sheet — tidak ada native `<select>` HTML.

---

### 5.5 Card

```
Background : --color-bg-surface
Border     : 1px solid --color-border-default
Radius     : --radius-lg
Padding    : --space-4
```

**Freestyle card:** Card dengan visual ekspresif (gradient, ilustrasi, chart) tetap menggunakan container yang sama. Visual bebas di dalam, container konsisten di luar.

---

### 5.6 Bottom Sheet / Modal

```
Overlay    : rgba(0, 0, 0, 0.6)
Container  : --color-bg-surface, radius top --radius-xl
Handle bar : 4px x 32px, --color-border-default, centered, margin-top 12px
Max height : 90vh
Scroll     : internal scroll jika konten melebihi max height

Exit behavior:
  - Tap overlay di luar sheet → tutup
  - Swipe down sheet → tutup (dengan velocity threshold)
  - Animasi: slide up saat buka, slide down saat tutup, 250ms ease-out
```

---

### 5.7 Bottom Navigation Bar

```
Background : --color-bg-surface
Border top : 1px solid --color-border-default
Height     : 64px + safe-area-inset-bottom
Position   : fixed bottom 0, full width
z-index    : 100 (tidak bisa digeser atau ter-overlap konten)

Item aktif  : icon + label, --color-brand-primary
Item inaktif: icon only atau icon + label, --color-text-disabled
FAB        : posisi paling kanan, tidak punya label
```

> Bottom nav **tidak boleh bisa discroll atau digeser** oleh konten di atasnya. Wajib `position: fixed` dengan `z-index` yang cukup.

---

### 5.8 Progress Bar

```
Track      : --color-bg-elevated, height 8px, --radius-full
Fill       : --color-brand-primary (normal)
           : --color-warning (>75%)
           : --color-danger (>100%)
Radius     : --radius-full
```

---

### 5.9 Badge / Status Chip

```
Radius     : --radius-full
Padding    : 2px 8px
Text       : --text-caption-medium

Variant success : bg rgba(52,211,153,0.15), text --color-success
Variant warning : bg rgba(251,191,36,0.15), text --color-warning
Variant danger  : bg rgba(248,113,113,0.15), text --color-danger
Variant neutral : bg --color-bg-elevated, text --color-text-secondary
```

---

### 5.10 Currency Filter Pill

```
Container  : --color-bg-elevated, --radius-full, padding 4px
Pill aktif : --color-bg-overlay, --radius-full, padding 6px 14px
Text aktif : --color-text-primary, --text-caption-medium
Text inaktif: --color-text-disabled, --text-caption-medium
```

> Hanya muncul jika user punya dompet dengan 2 currency berbeda.

---

### 5.11 List Item (di Pengaturan, Tagihan, dll)

```
Height     : min 56px
Padding    : --space-3 --space-4
Border bottom : 1px solid --color-border-default (kecuali item terakhir)
Layout     : icon kiri + teks tengah + aksi kanan (edit/hapus/chevron)
Tap area   : full row
```

---

## 6. AVATAR

**Library:** DiceBear — style `bottts` dan `dylan`.

- Avatar di-generate dari nama panggilan user sebagai seed
- User bisa scroll pilih avatar dari koleksi yang di-generate dengan variasi seed
- Format: SVG inline atau `<img>` dari DiceBear CDN
- Ukuran di profil: 64x64px
- Ukuran di greeting card: 40x40px
- Container: `--radius-full`, border `2px solid --color-brand-primary`

```
DiceBear URL pattern:
https://api.dicebear.com/7.x/bottts/svg?seed={nama}
https://api.dicebear.com/7.x/dylan/svg?seed={nama}
```

---

## 7. ICON SYSTEM

**Library:** Phosphor Icons — gunakan weight `regular` untuk UI umum, `fill` untuk state aktif.

```
Install: npm install @phosphor-icons/web
atau CDN: https://unpkg.com/@phosphor-icons/web
```

### 7.1 Ukuran Standar

| Konteks | Size |
|---------|------|
| Bottom nav | 24px |
| Card header | 20px |
| List item | 20px |
| Input field (trailing) | 16px |
| Badge / chip | 12px |

### 7.2 Icon Mapping Standar

| Aksi / Konsep | Icon Phosphor |
|---------------|---------------|
| Beranda | `House` |
| Perencanaan | `CalendarBlank` |
| Insight | `ChartBar` |
| Pengaturan | `Gear` |
| Tambah | `Plus` |
| Hapus | `Trash` |
| Edit | `PencilSimple` |
| Simpan | `FloppyDisk` |
| Tutup / Batal | `X` |
| Dompet | `Wallet` |
| Pengeluaran | `ArrowUpRight` |
| Pemasukan | `ArrowDownLeft` |
| Nabung | `PiggyBank` |
| Tagihan | `Receipt` |
| Budget | `Gauge` |
| Kategori | `Tag` |
| Notifikasi | `Bell` |
| Profil | `User` |
| Export | `Export` |
| Logout | `SignOut` |
| FAQ | `Question` |
| Support | `Heart` |
| Chevron kanan | `CaretRight` |
| Chevron bawah | `CaretDown` |
| Check | `Check` |
| Info | `Info` |

---

## 8. ILUSTRASI — EMPTY STATE & ONBOARDING

**Library:** Open Peeps (open source, hand-drawn style).

- Digunakan di: empty states, onboarding slides
- Ukuran ilustrasi di empty state: max 160px height
- Warna ilustrasi disesuaikan agar cocok dengan dark background (gunakan versi dengan stroke terang atau tint sesuai `--color-brand-primary`)
- Jangan gunakan ilustrasi untuk state yang sudah punya data — hanya untuk kosong/onboarding

---

## 9. MOTION & ANIMASI

| Konteks | Duration | Easing |
|---------|----------|--------|
| Sheet buka / tutup | 250ms | ease-out |
| FAB expand | 200ms | ease-out |
| Toggle/segmented | 150ms | ease |
| Progress bar fill | 400ms | ease-out |
| Page transition | 200ms | ease |
| Fade in card | 150ms | ease |

> Tidak ada animasi yang melebihi 400ms. Animasi adalah feedback, bukan pertunjukan.

---

## 10. ACCESSIBILITY MINIMUM

- Contrast ratio teks utama vs background: minimum **4.5:1**
- Tap area minimum semua elemen interaktif: **40x40px**
- Semua input field punya label (bukan hanya placeholder)
- Error message muncul sebagai teks, tidak hanya warna merah
- Focus ring visible untuk keyboard navigation: `--color-border-focus`

---

## 11. CATATAN UNTUK IMPLEMENTASI

- Semua token didefinisikan sebagai CSS custom properties di `:root`
- Komponen Svelte menggunakan token, tidak hardcode hex atau px langsung
- Visual "freestyle" di dalam card diizinkan selama container card tetap konsisten
- Jika ada komponen baru yang belum ada di dokumen ini → definisikan dulu di sini sebelum implementasi
- Visual lama dari codebase lama dijadikan referensi gaya, bukan template yang dikopi mentah

---

*Dokumen ini approved sebagai dasar untuk TECHNICAL_DESIGN.md dan DATA_ARCHITECTURE.md.*
*Update dokumen ini setiap ada komponen baru yang disepakati.*

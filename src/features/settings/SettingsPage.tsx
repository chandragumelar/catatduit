// =============================================================================
// features/settings/SettingsPage.tsx
// =============================================================================

import { useState } from 'react'
import {
  User, Download, Trash2, Plus, Pencil, X, Check, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useWalletStore } from '@/store/wallet.store'
import { useTransaksiStore } from '@/store/transaksi.store'
import { useToast } from '@/hooks/useToast'
import {
  getNama, saveNama,
  getTransaksi, saveTransaksi,
  getKategori, saveKategori,
} from '@/storage'
import {
  STORAGE_KEYS, CURRENT_SCHEMA_VERSION, CURRENCY_OPTIONS,
  DEFAULT_WALLET_ID, HARDCODED_KATEGORI_IDS,
} from '@/constants'
import { formatRupiah, generateId } from '@/lib/format'
import type { Wallet, KategoriItem, KategoriMap } from '@/types'

import styles from './SettingsPage.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function exportCSV() {
  const transaksi = getTransaksi()
  const header = ['Tanggal', 'Jenis', 'Nominal', 'Kategori', 'Dompet', 'Catatan']
  const rows = transaksi
    .filter(tx => !tx.type)
    .map(tx => [
      tx.tanggal,
      tx.jenis,
      tx.nominal,
      tx.kategori,
      tx.wallet_id,
      `"${(tx.catatan ?? '').replace(/"/g, '""')}"`,
    ])
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `catatduit-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportAndReset() {
  exportCSV()
  setTimeout(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
    window.location.reload()
  }, 400)
}

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Apakah data saya aman?',
    a: 'Ya. Data tersimpan langsung di perangkat kamu — bukan di server kami. Kami tidak bisa mengakses, melihat, atau mengambil data kamu dalam kondisi apapun.',
  },
  {
    q: 'Apakah CatatDuit bisa dipakai offline?',
    a: 'Ya. CatatDuit adalah PWA yang bisa diinstall dan dipakai sepenuhnya tanpa koneksi internet.',
  },
  {
    q: 'Cara install ke homescreen',
    a: 'Di iPhone: ketuk tombol Share (kotak dengan panah ke atas) → pilih "Add to Home Screen". Di Android: ketuk menu titik tiga di browser → pilih "Add to Home Screen" atau "Install App". Setelah diinstall, CatatDuit bisa dibuka langsung dari homescreen seperti aplikasi biasa dan bisa dipakai offline.',
  },
  {
    q: 'Apa itu Uang Bebas?',
    a: 'Uang Bebas = total saldo dikurangi tagihan yang belum dibayar bulan ini dan total tabungan yang sudah disisihkan. Ini angka yang realistis bisa kamu pakai untuk kebutuhan sehari-hari.',
  },
  {
    q: 'Bagaimana cara pindah dompet / transfer antar dompet?',
    a: 'Ketuk tombol "Antar Dompet" di card Keuangan, atau gunakan shortcut di header halaman utama.',
  },
  {
    q: 'Bagaimana cara mencatat tagihan sebagai sudah dibayar?',
    a: 'Buka tab Tagihan di halaman Planning, lalu ketuk tagihan yang ingin ditandai lunas.',
  },
  {
    q: 'Kenapa saldo saya tidak sesuai?',
    a: 'Saldo dihitung otomatis dari saldo awal dompet ditambah semua pemasukan dikurangi pengeluaran. Pastikan semua transaksi sudah tercatat dengan benar dan dompet yang dipilih sudah sesuai.',
  },
  {
    q: 'Apakah data hilang kalau saya clear browser atau ganti HP?',
    a: 'Ya. Karena data tersimpan di perangkat, clear browser cache atau ganti HP tanpa backup akan menghilangkan data. Rutin ekspor data dari Pengaturan sebagai cadangan.',
  },
  {
    q: 'Apakah CatatDuit bisa dipakai di beberapa perangkat sekaligus?',
    a: 'Belum. Data tidak tersinkronisasi antar perangkat — setiap perangkat punya data sendiri.',
  },
  {
    q: 'Bagaimana cara backup data saya?',
    a: 'Buka Pengaturan → Ekspor Data. File CSV akan otomatis terunduh ke perangkat kamu. Simpan file ini di tempat yang aman.',
  },
  {
    q: 'Bagaimana cara reset aplikasi?',
    a: 'Buka Pengaturan → Reset Aplikasi. Data akan diekspor otomatis sebelum reset sebagai cadangan. Setelah reset, aplikasi kembali ke kondisi awal.',
  },
  {
    q: 'Apakah CatatDuit gratis?',
    a: 'Ya, gratis selamanya. Tidak ada fitur berbayar, tidak ada iklan, tidak ada subscription.',
  },
  {
    q: 'Kenapa aplikasi tiba-tiba minta update?',
    a: 'Kami sesekali merilis pembaruan untuk perbaikan bug atau fitur baru. Update tidak otomatis — kamu yang menentukan kapan mau memperbarui.',
  },
  {
    q: 'Ada bug atau mau kasih masukan?',
    a: 'Hubungi kami lewat X (Twitter) @win32_icang atau buka issue di GitHub. Kami baca semua pesan yang masuk.',
  },
]


// ── Emoji icon options for kategori ──────────────────────────────────────────

const KATEGORI_ICONS = [
  '🍴','🚗','🛒','📱','💡','💧','🏠','🏥','🎮','📚',
  '✈️','👗','💄','🐾','🎓','⚽','🎵','📷','🛠️','🎁',
  '💼','💻','🏪','📈','💰','🏦','🛡️','📦',
]

// ── Kategori Section ─────────────────────────────────────────────────────────

type KategoriTab = 'keluar' | 'masuk'
const HARDCODED_SET = new Set<string>(HARDCODED_KATEGORI_IDS)

interface KategoriSectionProps {
  showToast: (msg: string) => void
  allTx: ReturnType<typeof getTransaksi>
}

function KategoriSection({ showToast, allTx }: KategoriSectionProps) {
  const [aktifTab, setAktifTab] = useState<KategoriTab>('keluar')
  const [kategoriMap, setKategoriMap] = useState<KategoriMap>(() => getKategori())
  const [showForm, setShowForm] = useState(false)
  const [formNama, setFormNama] = useState('')
  const [formIcon, setFormIcon] = useState('📦')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const list = kategoriMap[aktifTab].filter(k => !k.id.startsWith('transfer_'))

  function handleTambah() {
    const nama = formNama.trim()
    if (!nama) return
    const id = `custom_${Date.now()}`
    const newItem: KategoriItem = { id, nama, icon: formIcon }
    const next: KategoriMap = {
      ...kategoriMap,
      [aktifTab]: [...kategoriMap[aktifTab], newItem],
    }
    saveKategori(next)
    setKategoriMap(next)
    setFormNama('')
    setFormIcon('📦')
    setShowForm(false)
    showToast('Kategori ditambahkan')
  }

  function handleHapus(id: string) {
    const usedInTx = allTx.some(tx => tx.kategori === id)
    if (usedInTx) {
      const count = allTx.filter(tx => tx.kategori === id).length
      showToast(`Kategori ini dipakai di ${count} catatan. Hapus catatannya dulu.`)
      setConfirmDeleteId(null)
      return
    }
    const next: KategoriMap = {
      ...kategoriMap,
      [aktifTab]: kategoriMap[aktifTab].filter(k => k.id !== id),
    }
    saveKategori(next)
    setKategoriMap(next)
    setConfirmDeleteId(null)
    showToast('Kategori dihapus')
  }

  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>Kategori</span>
      <div className={styles.card}>
        <div className={styles.kategoriTabBar}>
          {(['keluar', 'masuk'] as KategoriTab[]).map(tab => (
            <button
              key={tab}
              className={[styles.kategoriTab, aktifTab === tab ? styles.kategoriTabActive : ''].join(' ')}
              onClick={() => { setAktifTab(tab); setShowForm(false); setConfirmDeleteId(null) }}
            >
              {tab === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}
            </button>
          ))}
        </div>

        {list.map(k => {
          const isHardcoded = HARDCODED_SET.has(k.id)
          return (
            <div key={k.id}>
              <div className={styles.kategoriRow}>
                <span className={styles.kategoriIcon}>{k.icon}</span>
                <span className={styles.kategoriNama}>{k.nama}</span>
                {!isHardcoded && (
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => setConfirmDeleteId(confirmDeleteId === k.id ? null : k.id)}
                    aria-label="Hapus"
                  >
                    <X size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              {confirmDeleteId === k.id && (
                <div className={styles.inlineConfirm}>
                  <span className={styles.inlineConfirmText}>
                    Hapus kategori "{k.nama}"?
                  </span>
                  <div className={styles.inlineConfirmActions}>
                    <button className={styles.confirmCancelBtn} onClick={() => setConfirmDeleteId(null)}>Batal</button>
                    <button className={styles.confirmResetBtn} onClick={() => handleHapus(k.id)}>Hapus</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {showForm ? (
          <div className={styles.kategoriForm}>
            <div className={styles.kategoriIconPicker}>
              {KATEGORI_ICONS.map(ic => (
                <button
                  key={ic}
                  className={[styles.kategoriIconOption, formIcon === ic ? styles.kategoriIconActive : ''].join(' ')}
                  onClick={() => setFormIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
            <input
              className={styles.walletFormInput}
              placeholder="Nama kategori"
              value={formNama}
              onChange={e => setFormNama(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <div className={styles.walletFormActions}>
              <button className={styles.walletFormCancel} onClick={() => { setShowForm(false); setFormNama(''); setFormIcon('📦') }}>Batal</button>
              <button className={styles.walletFormSave} onClick={handleTambah} disabled={!formNama.trim()}>Tambah</button>
            </div>
          </div>
        ) : (
          <button className={styles.addWalletBtn} onClick={() => setShowForm(true)}>
            <Plus size={15} strokeWidth={1.5} />
            Tambah Kategori
          </button>
        )}
      </div>
    </div>
  )
}

// ── Wallet form (add / edit) ──────────────────────────────────────────────────

interface WalletFormProps {
  initial?: Wallet
  onSave: (w: Wallet) => void
  onCancel: () => void
}

function WalletForm({ initial, onSave, onCancel }: WalletFormProps) {
  const [nama, setNama] = useState(initial?.nama ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? 'IDR')
  const [saldoAwal, setSaldoAwal] = useState(
    initial ? String(initial.saldo_awal) : ''
  )
  const isEdit = !!initial

  function handleSave() {
    const trimmed = nama.trim()
    if (!trimmed) return
    const nominalVal = parseInt(saldoAwal.replace(/\D/g, ''), 10) || 0
    onSave({
      id: initial?.id ?? generateId(),
      nama: trimmed,
      icon: initial?.icon ?? '👛',
      saldo_awal: nominalVal,
      currency,
    })
  }

  return (
    <div className={styles.walletForm}>
      <div className={styles.walletFormTitle}>{isEdit ? 'Edit Dompet' : 'Tambah Dompet'}</div>
      <div className={styles.walletFormField}>
        <label className={styles.walletFormLabel}>Nama dompet</label>
        <input
          className={styles.walletFormInput}
          value={nama}
          onChange={e => setNama(e.target.value)}
          placeholder="Contoh: Dompet Utama"
          maxLength={30}
          autoFocus
        />
      </div>
      <div className={styles.walletFormField}>
        <label className={styles.walletFormLabel}>Mata uang</label>
        <select
          className={styles.walletFormSelect}
          value={currency}
          onChange={e => setCurrency(e.target.value)}
        >
          {CURRENCY_OPTIONS.map(opt => (
            <option key={opt.code} value={opt.code}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.walletFormField}>
        <label className={styles.walletFormLabel}>
          {isEdit ? 'Saldo awal' : 'Saldo awal'}
        </label>
        <input
          className={styles.walletFormInput}
          value={saldoAwal}
          onChange={e => setSaldoAwal(e.target.value)}
          placeholder="0"
          inputMode="numeric"
        />
      </div>
      <div className={styles.walletFormActions}>
        <button className={styles.walletFormCancel} onClick={onCancel}>Batal</button>
        <button
          className={styles.walletFormSave}
          onClick={handleSave}
          disabled={!nama.trim()}
        >
          {isEdit ? 'Simpan' : 'Tambah'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const wallets = useWalletStore(s => s.wallets)
  const saveWallets = useWalletStore(s => s.save)
  const hydrateTx = useTransaksiStore(s => s.hydrate)
  const { toasts, showToast } = useToast()

  const [nama, setNama] = useState(() => getNama())
  const [namaDirty, setNamaDirty] = useState(false)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)

  // Wallet CRUD state
  const [walletFormMode, setWalletFormMode] = useState<'none' | 'add' | 'edit'>('none')
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // ── Saldo per wallet ───────────────────────────────────────────────────────
  const allTx = getTransaksi()

  function walletSaldo(w: Wallet): number {
    const masuk = allTx.filter(tx => tx.wallet_id === w.id && tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
    const keluar = allTx.filter(tx => tx.wallet_id === w.id && tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0)
    const nabung = allTx.filter(tx => tx.wallet_id === w.id && tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0)
    return w.saldo_awal + masuk - keluar - nabung
  }

  // ── Nama ──────────────────────────────────────────────────────────────────

  function handleNamaSave() {
    const trimmed = nama.trim()
    if (!trimmed) return
    saveNama(trimmed)
    setNamaDirty(false)
    showToast('Tersimpan')
  }

  // ── Wallet handlers ───────────────────────────────────────────────────────

  function handleWalletSave(w: Wallet) {
    if (walletFormMode === 'add') {
      saveWallets([...wallets, w])
      showToast('Dompet ditambahkan')
    } else if (walletFormMode === 'edit' && editingWallet) {
      saveWallets(wallets.map(existing => existing.id === w.id ? w : existing))
      showToast('Tersimpan')
    }
    setWalletFormMode('none')
    setEditingWallet(null)
  }

  function handleWalletDelete(id: string) {
    if (id === DEFAULT_WALLET_ID && wallets.length === 1) {
      showToast('Harus ada minimal satu dompet')
      setConfirmDeleteId(null)
      return
    }
    // Migrate transaksi ke dompet utama atau dompet pertama yang tersisa
    const fallbackId = wallets.find(w => w.id !== id)?.id ?? DEFAULT_WALLET_ID
    const migratedTx = allTx.map(tx =>
      tx.wallet_id === id ? { ...tx, wallet_id: fallbackId } : tx
    )
    saveTransaksi(migratedTx)
    hydrateTx()
    saveWallets(wallets.filter(w => w.id !== id))
    setConfirmDeleteId(null)
    showToast('Dompet dihapus')
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleResetConfirm() {
    if (resetStep === 1) setResetStep(2)
    else if (resetStep === 2) exportAndReset()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {toasts.length > 0 && (
        <div className={styles.toastStack}>
          {toasts.map(t => <div key={t.id} className={styles.toast}>{t.message}</div>)}
        </div>
      )}

      <div className={styles.header}>
        <span className={styles.headerTitle}>Pengaturan</span>
      </div>

      {/* ── Profil ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Profil</span>
        <div className={styles.card}>
          <div className={styles.namaForm}>
            <div className={styles.rowIcon}><User size={16} strokeWidth={1.5} /></div>
            <input
              className={styles.namaInput}
              value={nama}
              onChange={e => { setNama(e.target.value); setNamaDirty(true) }}
              onKeyDown={e => e.key === 'Enter' && handleNamaSave()}
              placeholder="Nama kamu"
              maxLength={40}
            />
            {namaDirty && nama.trim() && (
              <button className={styles.namaSaveBtn} onClick={handleNamaSave}>Simpan</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Dompet ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Dompet</span>
        <div className={styles.card}>
          {wallets.map(w => (
            <div key={w.id}>
              <div className={styles.walletRow}>
                <span className={styles.walletEmoji}>{w.icon}</span>
                <div className={styles.rowBody}>
                  <div className={styles.rowLabel}>{w.nama}</div>
                  <div className={styles.rowSub}>{w.currency} · {formatRupiah(walletSaldo(w))}</div>
                </div>
                <div className={styles.rowRight}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => { setEditingWallet(w); setWalletFormMode('edit') }}
                    aria-label="Edit"
                  >
                    <Pencil size={15} strokeWidth={1.5} />
                  </button>
                  {wallets.length > 1 && (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => setConfirmDeleteId(w.id)}
                      aria-label="Hapus"
                    >
                      <X size={15} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* Konfirmasi hapus dompet */}
              {confirmDeleteId === w.id && (
                <div className={styles.inlineConfirm}>
                  <span className={styles.inlineConfirmText}>
                    Transaksi di dompet ini akan dipindah ke dompet lain. Lanjutkan?
                  </span>
                  <div className={styles.inlineConfirmActions}>
                    <button className={styles.confirmCancelBtn} onClick={() => setConfirmDeleteId(null)}>Batal</button>
                    <button className={styles.confirmResetBtn} onClick={() => handleWalletDelete(w.id)}>Hapus</button>
                  </div>
                </div>
              )}

              {/* Edit form inline */}
              {walletFormMode === 'edit' && editingWallet?.id === w.id && (
                <WalletForm
                  initial={w}
                  onSave={handleWalletSave}
                  onCancel={() => { setWalletFormMode('none'); setEditingWallet(null) }}
                />
              )}
            </div>
          ))}

          {/* Add form inline */}
          {walletFormMode === 'add' ? (
            <WalletForm
              onSave={handleWalletSave}
              onCancel={() => setWalletFormMode('none')}
            />
          ) : (
            <button
              className={styles.addWalletBtn}
              onClick={() => setWalletFormMode('add')}
            >
              <Plus size={15} strokeWidth={1.5} />
              Tambah Dompet
            </button>
          )}
        </div>
      </div>

      {/* ── Kategori ── */}
      <KategoriSection showToast={showToast} allTx={allTx} />

      {/* ── Ekspor & Reset ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Data</span>
        <div className={styles.card}>
          <button className={styles.rowBtn} onClick={() => { exportCSV(); showToast('Data diekspor') }}>
            <div className={styles.rowIcon}><Download size={16} strokeWidth={1.5} /></div>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Ekspor Data</div>
              <div className={styles.rowSub}>Unduh semua transaksi sebagai file CSV</div>
            </div>
          </button>
          <button
            className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
            onClick={() => setResetStep(1)}
          >
            <div className={styles.rowIcon}><Trash2 size={16} strokeWidth={1.5} /></div>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Reset Aplikasi</div>
              <div className={styles.rowSub}>Hapus semua data, mulai dari awal</div>
            </div>
          </button>
        </div>

        {resetStep === 1 && (
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>Hapus semua data?</div>
            <div className={styles.confirmBody}>
              Semua transaksi, dompet, tagihan, dan target menabung akan dihapus permanen. Data akan diekspor otomatis sebagai CSV sebelum reset.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setResetStep(0)}>Batal</button>
              <button className={styles.confirmResetBtn} onClick={handleResetConfirm}>Lanjutkan</button>
            </div>
          </div>
        )}

        {resetStep === 2 && (
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>Yakin? Ini tidak bisa dibatalkan.</div>
            <div className={styles.confirmBody}>
              Data akan diekspor dulu, lalu semua data dihapus dan aplikasi mulai ulang dari awal.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setResetStep(0)}>Batal</button>
              <button className={styles.confirmResetBtn} onClick={handleResetConfirm}>Hapus Sekarang</button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAQ ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Pertanyaan Umum</span>
        <div className={styles.card}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className={styles.faqQuestionText}>{item.q}</span>
                {openFaq === i
                  ? <ChevronUp size={15} strokeWidth={1.5} className={styles.faqChevron} />
                  : <ChevronDown size={15} strokeWidth={1.5} className={styles.faqChevron} />
                }
              </button>
              {openFaq === i && (
                <div className={styles.faqAnswer}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Support / Sponsor ── */}
      <div className={styles.section}>
        <div className={styles.supportCard}>
          <div className={styles.supportTitle}>☕ CatatDuit gratis selamanya</div>
          <div className={styles.supportDesc}>
            Kalau aplikasi ini membantu, kamu bisa traktir kopi buat pengembangnya.
          </div>
          <div className={styles.supportActions}>
            <a href="https://trakteer.id/win32_icang/gift" target="_blank" rel="noopener noreferrer" className={styles.supportBtn}>
              Trakteer
            </a>
            <a href="https://saweria.co/win32icang" target="_blank" rel="noopener noreferrer" className={styles.supportBtn}>
              Saweria
            </a>
          </div>
        </div>
      </div>

      {/* ── Developer info ── */}
      <div className={styles.devInfo}>
        <span className={styles.devName}>Chandra Gumelar</span>
        <div className={styles.devLinks}>
          <a
            href="https://github.com/chandragumelar/catatduit"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.devLink}
            aria-label="GitHub"
          >
            {/* GitHub icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <a
            href="https://x.com/win32_icang"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.devLink}
            aria-label="X (Twitter)"
          >
            {/* X icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
        <span className={styles.appVersion}>v4 · Schema v{CURRENT_SCHEMA_VERSION}</span>
      </div>

    </div>
  )
}

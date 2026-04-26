// =============================================================================
// features/settings/SettingsPage.tsx
// =============================================================================

import { useState } from 'react'
import { Plus, Lock } from 'lucide-react'
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
      tx.tanggal, tx.jenis, tx.nominal, tx.kategori, tx.wallet_id,
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

type FaqTag = 'privasi' | 'fitur' | 'teknis' | 'umum'

const FAQ_ITEMS: { q: string; a: string; tag: FaqTag }[] = [
  { tag: 'privasi', q: 'Apakah data saya aman?', a: 'Ya. Data tersimpan langsung di perangkat kamu — bukan di server kami. Kami tidak bisa mengakses, melihat, atau mengambil data kamu dalam kondisi apapun.' },
  { tag: 'privasi', q: 'Data hilang kalau clear browser atau ganti HP?', a: 'Ya. Karena data tersimpan di perangkat, clear cache atau ganti HP tanpa backup akan menghilangkan data. Rutin ekspor data dari Pengaturan sebagai cadangan.' },
  { tag: 'privasi', q: 'Bisa dipakai di beberapa perangkat sekaligus?', a: 'Belum. Data tidak tersinkronisasi antar perangkat — setiap perangkat punya data sendiri.' },
  { tag: 'fitur', q: 'Apa itu Uang Bebas?', a: 'Uang Bebas = total saldo dikurangi tagihan yang belum dibayar bulan ini dan total tabungan yang sudah disisihkan. Ini angka yang realistis bisa kamu pakai untuk kebutuhan sehari-hari.' },
  { tag: 'fitur', q: 'Cara pindah dompet / transfer antar dompet?', a: 'Ketuk tombol "Antar Dompet" di card Keuangan, atau gunakan shortcut di header halaman utama.' },
  { tag: 'fitur', q: 'Cara mencatat tagihan sebagai sudah dibayar?', a: 'Buka tab Tagihan di halaman Planning, lalu ketuk tagihan yang ingin ditandai lunas.' },
  { tag: 'fitur', q: 'Cara backup data saya?', a: 'Buka Pengaturan → Ekspor Data. File CSV akan otomatis terunduh ke perangkat kamu. Simpan file ini di tempat yang aman.' },
  { tag: 'teknis', q: 'Apakah CatatDuit bisa dipakai offline?', a: 'Ya. CatatDuit adalah PWA yang bisa diinstall dan dipakai sepenuhnya tanpa koneksi internet.' },
  { tag: 'teknis', q: 'Cara install ke homescreen?', a: 'Di iPhone: ketuk tombol Share → pilih "Add to Home Screen". Di Android: ketuk menu titik tiga → pilih "Install App". Setelah diinstall, CatatDuit bisa dibuka langsung dari homescreen seperti aplikasi biasa.' },
  { tag: 'teknis', q: 'Kenapa saldo tidak sesuai?', a: 'Saldo dihitung otomatis dari saldo awal dompet ditambah semua pemasukan dikurangi pengeluaran. Pastikan semua transaksi sudah tercatat dengan benar dan dompet yang dipilih sudah sesuai.' },
  { tag: 'umum', q: 'Apakah CatatDuit gratis?', a: 'Ya, gratis selamanya. Tidak ada fitur berbayar, tidak ada iklan, tidak ada subscription.' },
  { tag: 'umum', q: 'Kenapa aplikasi tiba-tiba minta update?', a: 'Kami sesekali merilis pembaruan untuk perbaikan bug atau fitur baru. Update tidak otomatis — kamu yang menentukan kapan mau memperbarui.' },
  { tag: 'umum', q: 'Ada bug atau mau kasih masukan?', a: 'Hubungi kami lewat X (Twitter) @win32_icang atau buka issue di GitHub. Kami baca semua pesan yang masuk.' },
]

const FAQ_TAGS: { id: FaqTag; label: string }[] = [
  { id: 'privasi', label: 'Privasi & data' },
  { id: 'fitur',   label: 'Fitur' },
  { id: 'teknis',  label: 'Teknis' },
  { id: 'umum',    label: 'Umum' },
]

// ── Avatar options ────────────────────────────────────────────────────────────

const AVATAR_OPTIONS = [
  '🙂','😎','🤓','🧑','👩','🧔','👨','🙋','🤗','😄',
  '🥳','😊','🧘','🏃','🧗','🤑','🎯','🌟','🦊','🐼',
]

// ── Kategori icon options ─────────────────────────────────────────────────────

const KATEGORI_ICONS = [
  '🍴','🚗','🛒','📱','💡','💧','🏠','🏥','🎮','📚',
  '✈️','👗','💄','🐾','🎓','⚽','🎵','📷','🛠️','🎁',
  '💼','💻','🏪','📈','💰','🏦','🛡️','📦',
]

// ── FAQ Section ───────────────────────────────────────────────────────────────

function FaqSection() {
  const [activeTag, setActiveTag] = useState<FaqTag>('privasi')
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const filtered = FAQ_ITEMS.filter(item => item.tag === activeTag)

  const tagStyle: Record<FaqTag, string> = {
    privasi: styles.tagPrivasi,
    fitur:   styles.tagFitur,
    teknis:  styles.tagTeknis,
    umum:    styles.tagUmum,
  }

  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>FAQ</span>
      <div className={styles.faqChips}>
        {FAQ_TAGS.map(t => (
          <button
            key={t.id}
            className={[styles.faqChip, activeTag === t.id ? styles.faqChipActive : ''].join(' ')}
            onClick={() => { setActiveTag(t.id); setOpenIdx(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.card}>
        {filtered.map((item, i) => (
          <div key={i} className={[styles.faqItem, openIdx === i ? styles.faqItemExpanded : ''].join(' ')}>
            <button className={styles.faqRow} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
              <span className={[styles.faqTag, tagStyle[item.tag]].join(' ')}>
                {item.tag === 'privasi' ? 'Privasi' : item.tag === 'fitur' ? 'Fitur' : item.tag === 'teknis' ? 'Teknis' : 'Umum'}
              </span>
              <span className={styles.faqQ}>{item.q}</span>
              <span className={styles.faqChevron}>{openIdx === i ? '▴' : '▾'}</span>
            </button>
            {openIdx === i && <div className={styles.faqAnswer}>{item.a}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Kategori Section ──────────────────────────────────────────────────────────

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
    const next: KategoriMap = { ...kategoriMap, [aktifTab]: [...kategoriMap[aktifTab], newItem] }
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
      showToast(`Kategori ini dipakai di ${allTx.filter(tx => tx.kategori === id).length} catatan. Hapus catatannya dulu.`)
      setConfirmDeleteId(null)
      return
    }
    const next: KategoriMap = { ...kategoriMap, [aktifTab]: kategoriMap[aktifTab].filter(k => k.id !== id) }
    saveKategori(next)
    setKategoriMap(next)
    setConfirmDeleteId(null)
    showToast('Kategori dihapus')
  }

  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>Kategori</span>
      <div className={styles.katTabSwitch}>
        {(['keluar', 'masuk'] as KategoriTab[]).map(tab => (
          <button
            key={tab}
            className={[styles.katTabBtn, aktifTab === tab ? styles.katTabBtnActive : ''].join(' ')}
            onClick={() => { setAktifTab(tab); setShowForm(false); setConfirmDeleteId(null) }}
          >
            {tab === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}
          </button>
        ))}
      </div>
      <div className={styles.card}>
        {list.map(k => {
          const isHardcoded = HARDCODED_SET.has(k.id)
          return (
            <div key={k.id}>
              {confirmDeleteId === k.id ? (
                <div className={styles.katConfirmStrip}>
                  <span className={styles.katConfirmText}>Hapus "{k.nama}"?</span>
                  <div className={styles.katConfirmActions}>
                    <button className={styles.katConfirmYes} onClick={() => handleHapus(k.id)}>Hapus</button>
                    <button className={styles.katConfirmNo} onClick={() => setConfirmDeleteId(null)}>Batal</button>
                  </div>
                </div>
              ) : (
                <div className={styles.katRow}>
                  <div className={styles.katBadge}>{k.icon}</div>
                  <span className={styles.katNama}>{k.nama}</span>
                  {isHardcoded
                    ? <Lock size={14} strokeWidth={1.5} className={styles.katLock} />
                    : <button className={styles.katDelBtn} onClick={() => setConfirmDeleteId(k.id)} aria-label="Hapus">✕</button>
                  }
                </div>
              )}
            </div>
          )
        })}
        {!showForm && (
          <button className={styles.katAddRow} onClick={() => setShowForm(true)}>
            <div className={styles.katAddIcon}><Plus size={14} strokeWidth={2} /></div>
            <span className={styles.katAddLabel}>Tambah kategori</span>
          </button>
        )}
      </div>
      {showForm && (
        <div className={styles.katForm}>
          <div className={styles.katFormTop}>
            <div className={styles.katFormPreview}>{formIcon}</div>
            <input
              className={styles.katFormInput}
              placeholder="Nama kategori"
              value={formNama}
              onChange={e => setFormNama(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>
          <div className={styles.katIconGrid}>
            {KATEGORI_ICONS.map(ic => (
              <button
                key={ic}
                className={[styles.katIconOpt, formIcon === ic ? styles.katIconSel : ''].join(' ')}
                onClick={() => setFormIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>
          <div className={styles.katFormFooter}>
            <button className={styles.katFormCancel} onClick={() => { setShowForm(false); setFormNama(''); setFormIcon('📦') }}>Batal</button>
            <button className={styles.katFormSave} onClick={handleTambah} disabled={!formNama.trim()}>Tambah</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Wallet form ───────────────────────────────────────────────────────────────

interface WalletFormProps {
  initial?: Wallet
  onSave: (w: Wallet) => void
  onCancel: () => void
}

function WalletForm({ initial, onSave, onCancel }: WalletFormProps) {
  const [nama, setNama] = useState(initial?.nama ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? 'IDR')
  const [saldoAwal, setSaldoAwal] = useState(initial ? String(initial.saldo_awal) : '')
  const isEdit = !!initial

  function handleSave() {
    const trimmed = nama.trim()
    if (!trimmed) return
    onSave({
      id: initial?.id ?? generateId(),
      nama: trimmed,
      icon: initial?.icon ?? '👛',
      saldo_awal: parseInt(saldoAwal.replace(/\D/g, ''), 10) || 0,
      currency,
    })
  }

  return (
    <div className={styles.walletEditForm}>
      <div className={styles.walletFormField}>
        <label className={styles.walletFormLabel}>Nama dompet</label>
        <input className={styles.walletFormInput} value={nama} onChange={e => setNama(e.target.value)} placeholder="Contoh: Dompet Utama" maxLength={30} autoFocus />
      </div>
      <div className={styles.walletFormField}>
        <label className={styles.walletFormLabel}>Mata uang</label>
        <select className={styles.walletFormSelect} value={currency} onChange={e => setCurrency(e.target.value)}>
          {CURRENCY_OPTIONS.map(opt => <option key={opt.code} value={opt.code}>{opt.label}</option>)}
        </select>
      </div>
      <div className={styles.walletFormField}>
        <label className={styles.walletFormLabel}>Saldo awal</label>
        <input className={styles.walletFormInput} value={saldoAwal} onChange={e => setSaldoAwal(e.target.value)} placeholder="0" inputMode="numeric" />
      </div>
      <div className={styles.walletFormActions}>
        <button className={styles.walletFormCancel} onClick={onCancel}>Batal</button>
        <button className={styles.walletFormSave} onClick={handleSave} disabled={!nama.trim()}>{isEdit ? 'Simpan' : 'Tambah'}</button>
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
  const allTx = getTransaksi()

  // Profil
  const [nama, setNama] = useState(() => getNama())
  const [namaEditing, setNamaEditing] = useState(false)
  const [namaDraft, setNamaDraft] = useState('')
  const [avatar, setAvatar] = useState('🙂')
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  // Wallet
  const [walletFormMode, setWalletFormMode] = useState<'none' | 'add' | 'edit'>('none')
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [walletConfirmDeleteId, setWalletConfirmDeleteId] = useState<string | null>(null)

  // Data
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const [eksporSuccess, setEksporSuccess] = useState(false)

  function walletSaldo(w: Wallet): number {
    const masuk  = allTx.filter(tx => tx.wallet_id === w.id && tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
    const keluar = allTx.filter(tx => tx.wallet_id === w.id && tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0)
    const nabung = allTx.filter(tx => tx.wallet_id === w.id && tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0)
    return w.saldo_awal + masuk - keluar - nabung
  }

  function startNamaEdit() {
    setNamaDraft(nama)
    setNamaEditing(true)
    setAvatarPickerOpen(false)
  }

  function saveNamaHandler() {
    const trimmed = namaDraft.trim()
    if (!trimmed) return
    saveNama(trimmed)
    setNama(trimmed)
    setNamaEditing(false)
    showToast('Tersimpan')
  }

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
      setWalletConfirmDeleteId(null)
      return
    }
    const fallbackId = wallets.find(w => w.id !== id)?.id ?? DEFAULT_WALLET_ID
    saveTransaksi(allTx.map(tx => tx.wallet_id === id ? { ...tx, wallet_id: fallbackId } : tx))
    hydrateTx()
    saveWallets(wallets.filter(w => w.id !== id))
    setWalletConfirmDeleteId(null)
    showToast('Dompet dihapus')
  }

  function handleResetConfirm() {
    if (resetStep === 1) setResetStep(2)
    else if (resetStep === 2) exportAndReset()
  }

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
        <div className={styles.profilCard}>
          <div className={styles.profilTop}>
            <button
              className={styles.avatar}
              onClick={() => { setAvatarPickerOpen(p => !p); setNamaEditing(false) }}
              aria-label="Pilih avatar"
            >
              <span className={styles.avatarEmoji}>{avatar}</span>
              <span className={styles.avatarEditBadge}>✎</span>
            </button>
            <div className={styles.profilMeta}>
              <span className={styles.profilGreeting}>Halo,</span>
              {namaEditing ? (
                <div className={styles.namaEditRow}>
                  <input
                    className={styles.namaEditInput}
                    value={namaDraft}
                    onChange={e => setNamaDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveNamaHandler()}
                    maxLength={40}
                    placeholder="Nama kamu"
                    autoFocus
                  />
                  <button className={styles.namaSaveBtn} onClick={saveNamaHandler}>Simpan</button>
                  <button className={styles.namaCancelBtn} onClick={() => setNamaEditing(false)}>Batal</button>
                </div>
              ) : (
                <div className={styles.namaViewRow}>
                  <span
                    className={nama ? styles.namaDisplay : styles.namaPlaceholder}
                    onClick={startNamaEdit}
                  >
                    {nama || 'Siapa namamu?'}
                  </span>
                  <button className={styles.namaEditBtn} onClick={startNamaEdit} aria-label="Edit nama">✎</button>
                </div>
              )}
            </div>
          </div>
          {avatarPickerOpen && (
            <div className={styles.avatarPicker}>
              <span className={styles.avatarPickerLabel}>Pilih avatar</span>
              <div className={styles.avatarGrid}>
                {AVATAR_OPTIONS.map(em => (
                  <button
                    key={em}
                    className={[styles.avatarOpt, avatar === em ? styles.avatarOptSel : ''].join(' ')}
                    onClick={() => { setAvatar(em); setAvatarPickerOpen(false) }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dompet ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Dompet</span>
        <div className={styles.dompetList}>
          {wallets.map(w => (
            <div key={w.id} className={styles.dompetCard}>
              <div className={styles.dompetMain}>
                <div className={styles.dompetIcon}>{w.icon}</div>
                <div className={styles.dompetBody}>
                  <div className={styles.dompetNama}>{w.nama}</div>
                  <div className={styles.dompetSub}>{w.currency}</div>
                </div>
                <div className={styles.dompetSaldo}>{formatRupiah(walletSaldo(w))}</div>
                <div className={styles.dompetActions}>
                  <button
                    className={styles.dompetEditBtn}
                    onClick={() => { setEditingWallet(w); setWalletFormMode('edit'); setWalletConfirmDeleteId(null) }}
                    aria-label="Edit"
                  >✎</button>
                  {wallets.length > 1 && (
                    <button
                      className={styles.dompetDelBtn}
                      onClick={() => { setWalletConfirmDeleteId(w.id); setWalletFormMode('none'); setEditingWallet(null) }}
                      aria-label="Hapus"
                    >✕</button>
                  )}
                </div>
              </div>
              {walletConfirmDeleteId === w.id && (
                <div className={styles.dompetConfirmStrip}>
                  <span className={styles.dompetConfirmText}>Transaksi akan dipindah ke dompet lain. Lanjutkan?</span>
                  <div className={styles.dompetConfirmActions}>
                    <button className={styles.dompetConfirmYes} onClick={() => handleWalletDelete(w.id)}>Hapus</button>
                    <button className={styles.dompetConfirmNo} onClick={() => setWalletConfirmDeleteId(null)}>Batal</button>
                  </div>
                </div>
              )}
              {walletFormMode === 'edit' && editingWallet?.id === w.id && (
                <WalletForm initial={w} onSave={handleWalletSave} onCancel={() => { setWalletFormMode('none'); setEditingWallet(null) }} />
              )}
            </div>
          ))}
          {walletFormMode === 'add' ? (
            <div className={styles.dompetCard}>
              <div className={styles.dompetAddHeader}>Dompet baru</div>
              <WalletForm onSave={handleWalletSave} onCancel={() => setWalletFormMode('none')} />
            </div>
          ) : (
            <button
              className={styles.dompetAddCard}
              onClick={() => { setWalletFormMode('add'); setEditingWallet(null); setWalletConfirmDeleteId(null) }}
            >
              <div className={styles.dompetAddIcon}><Plus size={16} strokeWidth={2} /></div>
              <span className={styles.dompetAddLabel}>Tambah dompet</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Kategori ── */}
      <KategoriSection showToast={showToast} allTx={allTx} />

      {/* ── Data ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Data</span>
        <div className={styles.dataGrid}>
          <button
            className={styles.dataTile}
            onClick={() => { exportCSV(); setEksporSuccess(true); showToast('Data diekspor'); setTimeout(() => setEksporSuccess(false), 4000) }}
          >
            <span className={styles.dataTileIcon}>⬇</span>
            <div>
              <div className={styles.dataTileLabel}>Ekspor Data</div>
              <div className={styles.dataTileSub}>Unduh semua transaksi sebagai CSV</div>
            </div>
          </button>
          <button
            className={`${styles.dataTile} ${styles.dataTileDanger}`}
            onClick={() => { setResetStep(1); setEksporSuccess(false) }}
          >
            <span className={styles.dataTileIcon}>🗑</span>
            <div>
              <div className={styles.dataTileLabel}>Reset Aplikasi</div>
              <div className={styles.dataTileSub}>Hapus semua data, mulai dari awal</div>
            </div>
          </button>
        </div>
        {eksporSuccess && (
          <div className={styles.eksporSuccess}>
            <span className={styles.eksporSuccessIcon}>✓</span>
            <span className={styles.eksporSuccessText}>Data berhasil diekspor. Cek folder unduhan kamu.</span>
          </div>
        )}
        {resetStep === 1 && (
          <div className={styles.confirmBox}>
            <div className={styles.confirmStep}>Langkah 1 dari 2</div>
            <div className={styles.confirmTitle}>Hapus semua data?</div>
            <div className={styles.confirmBody}>Semua transaksi, dompet, tagihan, dan target menabung akan dihapus permanen. Data akan diekspor otomatis sebagai CSV sebelum reset.</div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setResetStep(0)}>Batal</button>
              <button className={styles.confirmResetBtn} onClick={handleResetConfirm}>Lanjutkan</button>
            </div>
          </div>
        )}
        {resetStep === 2 && (
          <div className={styles.confirmBox}>
            <div className={styles.confirmStep}>Langkah 2 dari 2</div>
            <div className={styles.confirmTitle}>Yakin? Ini tidak bisa dibatalkan.</div>
            <div className={styles.confirmBody}>Data akan diekspor dulu, lalu semua data dihapus dan aplikasi mulai ulang dari awal.</div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setResetStep(0)}>Batal</button>
              <button className={styles.confirmResetBtn} onClick={handleResetConfirm}>Hapus Sekarang</button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── Support ── */}
      <div className={styles.section}>
        <div className={styles.supportCard}>
          <span className={styles.supportDeco}>☕</span>
          <div className={styles.supportTop}>
            <div className={styles.supportTag}>Open &amp; gratis</div>
            <div className={styles.supportTitle}>CatatDuit<br />dibuat dengan<br />sepenuh hati.</div>
          </div>
          <div className={styles.supportBody}>
            <p className={styles.supportDesc}>Tidak ada iklan, tidak ada subscription, tidak ada jebakan. Kalau CatatDuit membantu, traktir kopi buat pengembangnya.</p>
            <div className={styles.supportBtns}>
              <a href="https://trakteer.id/win32_icang/gift" target="_blank" rel="noopener noreferrer" className={`${styles.supportBtn} ${styles.supportBtnPrimary}`}>Trakteer</a>
              <a href="https://saweria.co/win32icang" target="_blank" rel="noopener noreferrer" className={`${styles.supportBtn} ${styles.supportBtnSecondary}`}>Saweria</a>
            </div>
          </div>
          <div className={styles.devRow}>
            <div className={styles.devAvatar}>CG</div>
            <span className={styles.devName}>Chandra Gumelar</span>
            <div className={styles.devLinks}>
              <a href="https://github.com/chandragumelar/catatduit" target="_blank" rel="noopener noreferrer" className={styles.devLink} aria-label="GitHub">GH</a>
              <a href="https://x.com/win32_icang" target="_blank" rel="noopener noreferrer" className={styles.devLink} aria-label="X">𝕏</a>
            </div>
            <span className={styles.appVersion}>v4 · Schema v{CURRENT_SCHEMA_VERSION}</span>
          </div>
        </div>
      </div>

    </div>
  )
}

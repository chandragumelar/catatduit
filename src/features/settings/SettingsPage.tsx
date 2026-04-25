// =============================================================================
// features/settings/SettingsPage.tsx
// =============================================================================

import { useState, useRef } from 'react'
import { User, Download, Trash2 } from 'lucide-react'
import { useWalletStore } from '@/store/wallet.store'
import { useToast } from '@/hooks/useToast'
import {
  getNama, saveNama,
  getTransaksi,
  getTagihan,
  getGoals,
} from '@/storage'
import { STORAGE_KEYS, CURRENT_SCHEMA_VERSION } from '@/constants'
import { formatRupiah } from '@/lib/format'

import styles from './SettingsPage.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function exportData() {
  const data: Record<string, unknown> = {}
  Object.entries(STORAGE_KEYS).forEach(([, key]) => {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
    }
  })
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `catatduit-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function resetApp() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  window.location.reload()
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const wallets = useWalletStore(s => s.wallets)
  const { toasts, showToast } = useToast()

  const [nama, setNama] = useState(() => getNama())
  const [namaDirty, setNamaDirty] = useState(false)
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0)
  const namaInputRef = useRef<HTMLInputElement>(null)

  // ── Stats ringkas ──────────────────────────────────────────────────────────
  const allTx = getTransaksi()
  const txCount = allTx.filter(tx => !tx.type).length  // exclude transfer pairs
  const tagihanCount = getTagihan().length
  const goalsCount = getGoals().length

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNamaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNama(e.target.value)
    setNamaDirty(true)
  }

  function handleNamaSave() {
    const trimmed = nama.trim()
    if (!trimmed) return
    saveNama(trimmed)
    setNama(trimmed)
    setNamaDirty(false)
    showToast('Tersimpan')
  }

  function handleNamaKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleNamaSave()
  }

  function handleExport() {
    exportData()
    showToast('Data diekspor')
  }

  function handleResetClick() {
    setResetStep(1)
  }

  function handleResetConfirm() {
    if (resetStep === 1) setResetStep(2)
    else if (resetStep === 2) resetApp()
  }

  function handleResetCancel() {
    setResetStep(0)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Toast */}
      {toasts.length > 0 && (
        <div className={styles.toastStack}>
          {toasts.map(t => (
            <div key={t.id} className={styles.toast}>{t.message}</div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Pengaturan</span>
      </div>

      {/* ── Profil ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Profil</span>
        <div className={styles.card}>
          <div className={styles.namaForm}>
            <div className={styles.rowIcon}>
              <User size={16} strokeWidth={1.5} />
            </div>
            <input
              ref={namaInputRef}
              className={styles.namaInput}
              value={nama}
              onChange={handleNamaChange}
              onKeyDown={handleNamaKeyDown}
              placeholder="Nama kamu"
              maxLength={40}
            />
            {namaDirty && nama.trim() && (
              <button className={styles.namaSaveBtn} onClick={handleNamaSave}>
                Simpan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Dompet ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Dompet</span>
        <div className={styles.card}>
          {wallets.map(w => {
            const masuk = allTx
              .filter(tx => tx.wallet_id === w.id && tx.jenis === 'masuk')
              .reduce((s, tx) => s + tx.nominal, 0)
            const keluar = allTx
              .filter(tx => tx.wallet_id === w.id && tx.jenis === 'keluar')
              .reduce((s, tx) => s + tx.nominal, 0)
            const saldo = w.saldo_awal + masuk - keluar
            return (
              <div key={w.id} className={styles.row}>
                <div className={styles.rowIcon}>
                  <span className={styles.walletIcon}>{w.icon}</span>
                </div>
                <div className={styles.rowBody}>
                  <div className={styles.rowLabel}>{w.nama}</div>
                  <div className={styles.rowSub}>{w.currency}</div>
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.rowValue}>{formatRupiah(saldo)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Data ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Data</span>
        <div className={styles.card}>
          <div className={styles.row}>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Transaksi tercatat</div>
            </div>
            <span className={styles.rowValue}>{txCount}</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Dompet</div>
            </div>
            <span className={styles.rowValue}>{wallets.length}</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Tagihan</div>
            </div>
            <span className={styles.rowValue}>{tagihanCount}</span>
          </div>
          <div className={styles.row}>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Target menabung</div>
            </div>
            <span className={styles.rowValue}>{goalsCount}</span>
          </div>
        </div>
      </div>

      {/* ── Ekspor & Reset ── */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Lainnya</span>
        <div className={styles.card}>
          <button className={styles.rowBtn} onClick={handleExport}>
            <div className={styles.rowIcon}>
              <Download size={16} strokeWidth={1.5} />
            </div>
            <div className={styles.rowBody}>
              <div className={styles.rowLabel}>Ekspor Data</div>
              <div className={styles.rowSub}>Unduh semua data sebagai file JSON</div>
            </div>
          </button>
          <button
            className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
            onClick={handleResetClick}
          >
            <div className={styles.rowIcon}>
              <Trash2 size={16} strokeWidth={1.5} />
            </div>
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
              Semua transaksi, dompet, tagihan, dan target menabung akan dihapus permanen. Data tidak bisa dikembalikan.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={handleResetCancel}>Batal</button>
              <button className={styles.confirmResetBtn} onClick={handleResetConfirm}>Lanjutkan</button>
            </div>
          </div>
        )}

        {resetStep === 2 && (
          <div className={styles.confirmBox}>
            <div className={styles.confirmTitle}>Yakin? Ini tidak bisa dibatalkan.</div>
            <div className={styles.confirmBody}>
              Tekan "Hapus Sekarang" untuk menghapus semua data dan memulai ulang dari awal.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={handleResetCancel}>Batal</button>
              <button className={styles.confirmResetBtn} onClick={handleResetConfirm}>Hapus Sekarang</button>
            </div>
          </div>
        )}
      </div>

      {/* App info */}
      <div className={styles.appInfo}>
        CatatDuit v4 · Schema v{CURRENT_SCHEMA_VERSION}
      </div>

    </div>
  )
}

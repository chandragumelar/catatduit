// =============================================================================
// features/transfer/TransferBottomSheet.tsx
// Bottom sheet transfer antar dompet.
// Entry point: tombol "⇄ Antar Dompet" di header HomePage.
// Constraint: hanya antar wallet dengan currency yang sama.
// Simpan 2 transaksi sekaligus (transfer_out + transfer_in) dengan group_id sama.
// =============================================================================

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useTransferStore } from '@/store/transfer.store'
import { useTransaksiStore } from '@/store/transaksi.store'
import { useWalletStore } from '@/store/wallet.store'
import { generateId, getTodayString } from '@/lib/format'
import { MAX_NOMINAL, CURRENCY_OPTIONS } from '@/constants'
import s from './TransferBottomSheet.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCurrencySymbol(code: string): string {
  return CURRENCY_OPTIONS.find(c => c.code === code)?.symbol ?? code
}

function formatNominalDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransferBottomSheet() {
  const { isOpen, close } = useTransferStore()
  const navigate = useNavigate()
  const addPair = useTransaksiStore(s => s.addPair)
  const wallets = useWalletStore(s => s.wallets)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [walletAsalId, setWalletAsalId] = useState('')
  const [walletTujuanId, setWalletTujuanId] = useState('')
  const [nominalRaw, setNominalRaw] = useState('')
  const [tanggal, setTanggal] = useState(getTodayString())
  const [catatan, setCatatan] = useState('')

  // Wallet tujuan: hanya wallet dengan currency sama dengan wallet asal, exclude asal itu sendiri
  const walletAsal = wallets.find(w => w.id === walletAsalId)
  const walletTujuanOptions = wallets.filter(
    w => w.id !== walletAsalId && w.currency === walletAsal?.currency
  )

  // Reset form setiap kali sheet dibuka
  useEffect(() => {
    if (isOpen) {
      const defaultWallet = wallets[0]?.id ?? ''
      setWalletAsalId(defaultWallet)
      setWalletTujuanId('')
      setNominalRaw('')
      setTanggal(getTodayString())
      setCatatan('')
    }
  }, [isOpen, wallets])

  // Reset wallet tujuan saat wallet asal berubah
  useEffect(() => {
    setWalletTujuanId('')
  }, [walletAsalId])

  // ── Nominal ─────────────────────────────────────────────────────────────────
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    if (Number(digits) > MAX_NOMINAL) return
    setNominalRaw(digits)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const nominal = Number(nominalRaw)
  const canSubmit = nominal > 0 && walletAsalId && walletTujuanId

  const handleSubmit = () => {
    if (!canSubmit) return

    const groupId = generateId()
    const tanggalStr = tanggal
    const catatanStr = catatan.trim()
    const now = Date.now()

    addPair(
      {
        id: generateId(),
        jenis: 'keluar',
        type: 'transfer_out',
        group_id: groupId,
        peer_wallet_id: walletTujuanId,
        nominal,
        kategori: 'transfer_keluar',
        tanggal: tanggalStr,
        catatan: catatanStr,
        wallet_id: walletAsalId,
        timestamp: now,
      },
      {
        id: generateId(),
        jenis: 'masuk',
        type: 'transfer_in',
        group_id: groupId,
        peer_wallet_id: walletAsalId,
        nominal,
        kategori: 'transfer_masuk',
        tanggal: tanggalStr,
        catatan: catatanStr,
        wallet_id: walletTujuanId,
        timestamp: now,
      }
    )

    close()
  }

  if (!isOpen) return null

  const currencySymbol = walletAsal
    ? getCurrencySymbol(walletAsal.currency)
    : 'Rp'

  const noTujuanAvailable = walletAsal !== undefined && walletTujuanOptions.length === 0

  return (
    <>
      {/* Overlay */}
      <div className={s.overlay} onClick={close} aria-hidden />

      {/* Sheet */}
      <div
        className={s.sheet}
        role="dialog"
        aria-modal
        aria-label="Transfer antar dompet"
      >
        {/* Handle */}
        <div className={s.handle} />

        {/* Header */}
        <div className={s.header}>
          <span className={s.title}>Antar Dompet</span>
        </div>

        {/* Form body */}
        <div className={s.body}>

          {/* Wallet Asal */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Dari dompet</span>
            {wallets.length === 0 ? (
              <p className={s.emptyNote}>Belum ada dompet.</p>
            ) : (
              <div className={s.selectWrapper}>
                <select
                  className={s.select}
                  value={walletAsalId}
                  onChange={e => setWalletAsalId(e.target.value)}
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.nama}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className={s.selectChevron} />
              </div>
            )}
          </div>

          {/* Wallet Tujuan */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Ke dompet</span>
            {noTujuanAvailable ? (
              <div className={s.emptyState}>
                <p className={s.emptyNote}>Tidak ada dompet lain dengan mata uang yang sama.</p>
                <button
                  className={s.addWalletBtn}
                  onClick={() => { close(); navigate('/settings') }}
                >
                  + Tambah dompet
                </button>
              </div>
            ) : (
              <div className={s.selectWrapper}>
                <select
                  className={s.select}
                  value={walletTujuanId}
                  onChange={e => setWalletTujuanId(e.target.value)}
                  disabled={!walletAsalId}
                >
                  <option value="" disabled>Pilih dompet tujuan</option>
                  {walletTujuanOptions.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.nama}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className={s.selectChevron} />
              </div>
            )}
          </div>

          {/* Nominal */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Nominal</span>
            <div className={s.nominalWrapper}>
              <span className={s.currencySymbol}>{currencySymbol}</span>
              <input
                className={s.nominalInput}
                inputMode="numeric"
                placeholder="0"
                value={formatNominalDisplay(nominalRaw)}
                onChange={handleNominalChange}
              />
            </div>
          </div>

          {/* Tanggal */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Tanggal</span>
            <input
              type="date"
              className={s.input}
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
            />
          </div>

          {/* Catatan */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Catatan (opsional)</span>
            <textarea
              className={s.textarea}
              placeholder="Tambah catatan..."
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              maxLength={200}
            />
          </div>

        </div>

        {/* Footer */}
        <div className={s.footer}>
          <button
            className={s.submitBtn}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Pindahkan
          </button>
        </div>
      </div>
    </>
  )
}

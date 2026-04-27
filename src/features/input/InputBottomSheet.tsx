// =============================================================================
// features/input/InputBottomSheet.tsx
// Bottom sheet input transaksi — Keluar / Masuk / Nabung
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TransaksiJenis, Goal } from '@/types'
import { useInputStore } from '@/store/input.store'
import { useTransaksiStore } from '@/store/transaksi.store'
import { useWalletStore } from '@/store/wallet.store'
import { getKategori, getGoals, saveGoals } from '@/storage'
import { generateId, getTodayString } from '@/lib/format'
import { MAX_NOMINAL, CURRENCY_OPTIONS } from '@/constants'
import s from './InputBottomSheet.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCurrencySymbol(code: string): string {
  return CURRENCY_OPTIONS.find(c => c.code === code)?.symbol ?? code
}

function formatNominalDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { jenis: TransaksiJenis; label: string }[] = [
  { jenis: 'keluar', label: 'Uang Keluar' },
  { jenis: 'masuk',  label: 'Uang Masuk'  },
  { jenis: 'nabung', label: 'Nabung' },
]

// ── Default kategori per jenis ────────────────────────────────────────────────

const DEFAULT_KATEGORI: Record<TransaksiJenis, string> = {
  keluar: 'lainnya_keluar',
  masuk:  'lainnya_masuk',
  nabung: 'lainnya_nabung',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InputBottomSheet() {
  const { isOpen, initialJenis, close } = useInputStore()
  const addTransaksi = useTransaksiStore(s => s.add)
  const wallets = useWalletStore(s => s.wallets)
  const activeWalletId = useWalletStore(s => s.activeWalletId)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [jenis, setJenis] = useState<TransaksiJenis>(initialJenis)
  const [nominalRaw, setNominalRaw] = useState('')   // digit string tanpa separator
  const [kategoriId, setKategoriId] = useState(DEFAULT_KATEGORI[initialJenis])
  const [walletId, setWalletId] = useState(activeWalletId)
  const [tanggal, setTanggal] = useState(getTodayString())
  const [catatan, setCatatan] = useState('')
  const [bayarDariTabungan, setBayarDariTabungan] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [goals, setGoals] = useState<Goal[]>([])

  const kategoriMap = getKategori()

  // Tampilkan semua wallet — symbol mengikuti wallet yang dipilih user

  // Reset form setiap kali sheet dibuka
  useEffect(() => {
    if (isOpen) {
      setJenis(initialJenis)
      setNominalRaw('')
      setKategoriId(DEFAULT_KATEGORI[initialJenis])
      setWalletId(activeWalletId)
      setTanggal(getTodayString())
      setCatatan('')
      setBayarDariTabungan(false)
      setSelectedGoalId('')
      const loadedGoals = getGoals().filter(g => g.terkumpul > 0)
      setGoals(loadedGoals)
      setSelectedGoalId(loadedGoals[0]?.id ?? '')
    }
  }, [isOpen, initialJenis, activeWalletId])

  // Reset kategori saat ganti tab
  const handleJenisChange = useCallback((j: TransaksiJenis) => {
    setJenis(j)
    setKategoriId(DEFAULT_KATEGORI[j])
    setBayarDariTabungan(false)
    setSelectedGoalId('')
  }, [])

  // ── Nominal input ───────────────────────────────────────────────────────────
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const num = Number(digits)
    if (num > MAX_NOMINAL) return
    setNominalRaw(digits)
  }

  // ── Wallet currency ─────────────────────────────────────────────────────────
  const selectedWallet = wallets.find(w => w.id === walletId) ?? wallets[0]
  const currencySymbol = selectedWallet
    ? getCurrencySymbol(selectedWallet.currency)
    : 'Rp'

  // ── Submit ──────────────────────────────────────────────────────────────────
  const nominal = Number(nominalRaw)
  const canSubmit = nominal > 0 && walletId

  const handleSubmit = () => {
    if (!canSubmit) return

    const isDariTabungan = jenis === 'keluar' && bayarDariTabungan
    const goalTarget = isDariTabungan && selectedGoalId
      ? goals.find(g => g.id === selectedGoalId)
      : null

    addTransaksi({
      id: generateId(),
      jenis,
      nominal,
      kategori: kategoriId,
      tanggal,
      catatan: catatan.trim(),
      wallet_id: walletId,
      timestamp: Date.now(),
      ...(isDariTabungan && {
        dari_tabungan: true,
        ...(selectedGoalId && { goal_id: selectedGoalId }),
      }),
    })

    if (goalTarget) {
      const updatedGoals = goals.map(g =>
        g.id === selectedGoalId
          ? { ...g, terkumpul: Math.max(0, g.terkumpul - nominal) }
          : g
      )
      saveGoals(updatedGoals)
    }

    close()
  }

  if (!isOpen) return null

  const kategoriList = kategoriMap[jenis] ?? []
  const isNabung = jenis === 'nabung'

  return (
    <>
      {/* Overlay */}
      <div className={s.overlay} onClick={close} aria-hidden />

      {/* Sheet */}
      <div
        className={s.sheet}
        role="dialog"
        aria-modal
        aria-label="Catat transaksi"
      >
        {/* Handle */}
        <div className={s.handle} />

        {/* Tabs */}
        <div className={s.tabs} role="tablist">
          {TABS.map(({ jenis: j, label }) => (
            <button
              key={j}
              role="tab"
              aria-selected={jenis === j}
              onClick={() => handleJenisChange(j)}
              className={[
                s.tab,
                jenis === j ? s.tabActive : '',
                j === 'nabung' && jenis === j ? s.tabNabung : '',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className={s.body}>

          {/* Wallet — di atas karena menentukan currency symbol */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Dompet</span>
            <div className={s.selectWrapper}>
              <select
                className={s.select}
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.icon} {w.nama} · {w.currency}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className={s.selectChevron} />
            </div>
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
                autoFocus
              />
            </div>
          </div>

          {/* Kategori */}
          <div className={s.fieldGroup}>
            <span className={s.label}>Kategori</span>
            <div className={s.selectWrapper}>
              <select
                className={s.select}
                value={kategoriId}
                onChange={e => setKategoriId(e.target.value)}
              >
                {kategoriList.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.icon} {k.nama}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className={s.selectChevron} />
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

          {/* Flag: Bayar dari tabungan — hanya untuk keluar, hanya kalau ada goals */}
          {jenis === 'keluar' && goals.length > 0 && (
            <>
              <div className={s.flagRow}>
                <div>
                  <div className={s.flagLabel}>Bayar dari tabungan</div>
                  <div className={s.flagSub}>Tandai kalau ini diambil dari dana tabungan</div>
                </div>
                <button
                  type="button"
                  aria-pressed={bayarDariTabungan}
                  className={[s.toggle, bayarDariTabungan ? s.toggleActive : ''].join(' ')}
                  onClick={() => setBayarDariTabungan(v => !v)}
                >
                  <span
                    className={[s.toggleThumb, bayarDariTabungan ? s.toggleThumbActive : ''].join(' ')}
                  />
                </button>
              </div>
              {bayarDariTabungan && (
                <div className={s.fieldGroup}>
                  <span className={s.label}>Kurangi dari target</span>
                  <div className={s.selectWrapper}>
                    <select
                      className={s.select}
                      value={selectedGoalId}
                      onChange={e => setSelectedGoalId(e.target.value)}
                    >
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.icon ?? '🎯'} {g.nama}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={s.selectChevron} />
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className={s.footer}>
          <button
            className={[s.submitBtn, isNabung ? s.submitBtnNabung : ''].join(' ')}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isNabung ? 'Simpan Tabungan' : 'Simpan'}
          </button>
        </div>
      </div>
    </>
  )
}

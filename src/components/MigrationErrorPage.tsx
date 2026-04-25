// =============================================================================
// components/MigrationErrorPage.tsx
// Ditampilkan kalau runMigrations() throw error.
// User bisa export data atau reset app — tidak ada readonly mode.
// =============================================================================

import { clearAllData, getTransaksi, getWallets } from '@/storage'

export function MigrationErrorPage() {
  function handleExport() {
    const data = {
      transaksi: getTransaksi(),
      wallets: getWallets(),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `catatduit-backup-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    const step1 = confirm('Yakin ingin menghapus semua data? Langkah ini tidak bisa dibatalkan.')
    if (!step1) return
    const step2 = confirm('Konfirmasi sekali lagi: semua data akan terhapus permanen.')
    if (!step2) return
    clearAllData()
    window.location.reload()
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 16, background: 'var(--bg-base)',
    }}>
      <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
        Terjadi masalah saat memperbarui data kamu.
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 320 }}>
        Data kamu masih aman. Coba export dulu sebelum melakukan reset.
      </p>
      <button onClick={handleExport} style={{
        width: '100%', maxWidth: 320, height: 44, borderRadius: 'var(--radius-md)',
        background: 'var(--accent)', color: '#fff', border: 'none',
        fontSize: 16, fontWeight: 500, cursor: 'pointer',
      }}>
        Export Data
      </button>
      <button onClick={handleReset} style={{
        width: '100%', maxWidth: 320, height: 44, borderRadius: 'var(--radius-md)',
        background: 'transparent', color: 'var(--status-danger)',
        border: '1px solid var(--status-danger)',
        fontSize: 16, fontWeight: 500, cursor: 'pointer',
      }}>
        Reset Aplikasi
      </button>
    </div>
  )
}

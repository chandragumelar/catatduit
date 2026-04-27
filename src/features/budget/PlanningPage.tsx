// =============================================================================
// features/budget/PlanningPage.tsx
// Tab: Budget · Tagihan · Tabungan
// =============================================================================

import { useState, useMemo } from "react";
import {
  Plus,
  X,
  ChevronDown,
  AlertCircle,
  Trash2,
  Pencil,
  Check,
  Calendar,
} from "lucide-react";

import { useWalletStore } from "@/store/wallet.store";
import { useTransaksiStore } from "@/store/transaksi.store";
import {
  getTagihan,
  saveTagihan,
  getBudgets,
  saveBudgets,
  getGoals,
  saveGoals,
  getKategori,
} from "@/storage";
import { KATEGORI_DEFAULT, MAX_GOALS, CURRENCY_OPTIONS } from "@/constants";
import { formatRupiah, getCurrentMonthKey, generateId, getTodayString } from "@/lib/format";
import { useToast } from "@/hooks/useToast";
import type { Tagihan, Goal } from "@/types";

import styles from "./PlanningPage.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Tab = "budget" | "tagihan" | "tabungan";

function fmt(n: number, currency = "IDR") {
  const sym = CURRENCY_OPTIONS.find((c) => c.code === currency)?.symbol ?? "Rp";
  return formatRupiah(n, sym);
}

function parseNominal(s: string): number {
  return parseInt(s.replace(/\D/g, "") || "0", 10);
}

function fmtInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function getDueDateLabel(tanggal: number): string {
  const today = new Date().getDate();
  const daysLeft = tanggal - today;
  if (daysLeft < 0) return "Sudah lewat";
  if (daysLeft === 0) return "Hari ini";
  if (daysLeft <= 3) return `${daysLeft} hari lagi`;
  return `Tgl ${tanggal} setiap bulan`;
}

function isDueSoon(tanggal: number): boolean {
  const today = new Date().getDate();
  return tanggal >= today && tanggal - today <= 3;
}

function isOverdue(tanggal: number): boolean {
  return tanggal < new Date().getDate();
}

// ── Tab Budget ────────────────────────────────────────────────────────────────

function TabBudget() {
  const wallets = useWalletStore((s) => s.wallets);
  const transaksi = useTransaksiStore((s) => s.transaksi);
  const { showToast } = useToast();

  const currentMonth = getCurrentMonthKey();
  const kategoriMap = useMemo(() => getKategori() ?? KATEGORI_DEFAULT, []);
  const kategoriKeluar = kategoriMap.keluar.filter(
    (k) => !k.id.startsWith("transfer_"),
  );

  const currencies = useMemo(() => {
    const seen = new Set<string>();
    return wallets.filter((w) => {
      if (seen.has(w.currency)) return false;
      seen.add(w.currency);
      return true;
    });
  }, [wallets]);

  const [activeCurrency, setActiveCurrency] = useState(
    currencies[0]?.currency ?? "IDR",
  );
  const [budgets, setBudgets] = useState(() => getBudgets());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const currBudget = budgets[activeCurrency] ?? {};

  const walletIds = useMemo(
    () =>
      new Set(
        wallets.filter((w) => w.currency === activeCurrency).map((w) => w.id),
      ),
    [wallets, activeCurrency],
  );

  const spendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    transaksi.forEach((tx) => {
      if (!tx.tanggal.startsWith(currentMonth)) return;
      if (tx.jenis !== "keluar") return;
      if (!walletIds.has(tx.wallet_id)) return;
      map[tx.kategori] = (map[tx.kategori] ?? 0) + tx.nominal;
    });
    return map;
  }, [transaksi, currentMonth, walletIds]);

  function startEdit(kategoriId: string) {
    const existing = currBudget[kategoriId] ?? 0;
    setEditingId(kategoriId);
    setEditValue(existing > 0 ? existing.toLocaleString("id-ID") : "");
  }

  function saveEdit(kategoriId: string) {
    const val = parseNominal(editValue);
    const next = { ...budgets };
    if (!next[activeCurrency]) next[activeCurrency] = {};
    if (val > 0) {
      next[activeCurrency][kategoriId] = val;
    } else {
      delete next[activeCurrency][kategoriId];
    }
    saveBudgets(next);
    setBudgets(next);
    setEditingId(null);
    setEditValue("");
    showToast(val > 0 ? "Budget disimpan" : "Budget dihapus");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  const budgetRows = kategoriKeluar.map((k) => ({
    ...k,
    limit: currBudget[k.id] ?? 0,
    spent: spendingMap[k.id] ?? 0,
  }));

  const setRows = budgetRows.filter((r) => r.limit > 0);
  const unsetRows = budgetRows.filter((r) => r.limit === 0);

  return (
    <div className={styles.tabContent}>
      {/* Currency toggle — gaya homepage */}
      {currencies.length > 1 && (
        <div className={styles.currencyToggleWrap}>
          {currencies.map((w) => (
            <button
              key={w.currency}
              className={[
                styles.currencyToggleBtn,
                activeCurrency === w.currency ? styles.currencyToggleBtnActive : '',
              ].join(' ')}
              onClick={() => setActiveCurrency(w.currency)}
            >
              <span className={styles.currencyToggleCode}>{w.currency}</span>
              <span className={styles.currencyToggleSub}>
                {wallets.filter(x => x.currency === w.currency).length} dompet
              </span>
            </button>
          ))}
        </div>
      )}

      {setRows.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Sudah diatur</div>
          {setRows.map((row) => {
            const pct = row.limit > 0 ? row.spent / row.limit : 0
            const isOver = pct >= 1
            const isWarn = pct >= 0.75 && pct < 1
            const editing = editingId === row.id
            return (
              <div
                key={row.id}
                className={[
                  styles.budgetCard,
                  isOver ? styles.budgetCardOver : isWarn ? styles.budgetCardWarn : '',
                ].join(' ')}
              >
                <div className={styles.budgetRowTop}>
                  <span className={styles.budgetRowIcon}>{row.icon}</span>
                  <div className={styles.budgetRowInfo}>
                    <span className={styles.budgetRowNama}>{row.nama}</span>
                    <span className={styles.budgetRowMeta}>
                      {fmt(row.spent, activeCurrency)} dari {fmt(row.limit, activeCurrency)}
                    </span>
                  </div>
                  <span className={[
                    styles.budgetPct,
                    isOver ? styles.budgetPctOver : isWarn ? styles.budgetPctWarn : styles.budgetPctOk,
                  ].join(' ')}>
                    {Math.round(pct * 100)}%
                  </span>
                  {!editing && (
                    <button className={styles.editBtn} onClick={() => startEdit(row.id)}>
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className={styles.budgetBar}>
                  <div
                    className={[
                      styles.budgetBarFill,
                      isOver ? styles.budgetBarOver : isWarn ? styles.budgetBarWarn : '',
                    ].join(' ')}
                    style={{ width: `${Math.min(pct, 1) * 100}%` }}
                  />
                </div>
                {editing && (
                  <div className={styles.editRow}>
                    <input
                      className={styles.editInput}
                      type="text"
                      inputMode="numeric"
                      placeholder="Limit budget"
                      value={editValue}
                      onChange={(e) => setEditValue(fmtInput(e.target.value))}
                      autoFocus
                    />
                    <button className={styles.editSaveBtn} onClick={() => saveEdit(row.id)}>
                      <Check size={16} />
                    </button>
                    <button className={styles.editCancelBtn} onClick={cancelEdit}>
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {unsetRows.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Belum diatur</div>
          {unsetRows.map((row) => {
            const editing = editingId === row.id
            return (
              <div key={row.id} className={styles.budgetCardUnset}>
                <span className={styles.budgetRowIcon}>{row.icon}</span>
                <span className={styles.budgetRowNama}>{row.nama}</span>
                {!editing && (
                  <button className={styles.aturBtn} onClick={() => startEdit(row.id)}>
                    <Plus size={12} strokeWidth={2.5} />
                    Atur
                  </button>
                )}
                {editing && (
                  <div className={styles.editRow} style={{ flex: 1 }}>
                    <input
                      className={styles.editInput}
                      type="text"
                      inputMode="numeric"
                      placeholder="Limit budget"
                      value={editValue}
                      onChange={(e) => setEditValue(fmtInput(e.target.value))}
                      autoFocus
                    />
                    <button className={styles.editSaveBtn} onClick={() => saveEdit(row.id)}>
                      <Check size={16} />
                    </button>
                    <button className={styles.editCancelBtn} onClick={cancelEdit}>
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {budgetRows.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Belum ada kategori pengeluaran</div>
          <div className={styles.emptyDesc}>
            Tambah kategori dulu di Pengaturan, lalu kembali ke sini untuk atur budget.
          </div>
        </div>
      )}
    </div>
  )
}

function TabTagihan() {
  const wallets = useWalletStore((s) => s.wallets);
  const addTransaksi = useTransaksiStore((s) => s.add);
  const { toasts, showToast } = useToast();

  const currentMonth = getCurrentMonthKey();
  const kategoriMap = useMemo(() => getKategori() ?? KATEGORI_DEFAULT, []);

  const [tagihan, setTagihanState] = useState<Tagihan[]>(() => getTagihan());
  const [showForm, setShowForm] = useState(false);
  const [formNama, setFormNama] = useState("");
  const [formNominal, setFormNominal] = useState("");
  const [formTanggal, setFormTanggal] = useState(1);
  const [formWallet, setFormWallet] = useState(wallets[0]?.id ?? "");
  const [formKategori, setFormKategori] = useState("lainnya_keluar");
  const [formRecurring, setFormRecurring] = useState(true);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Bayar sheet state ──
  const [bayarTagihan, setBayarTagihan] = useState<Tagihan | null>(null);
  const [bayarNominal, setBayarNominal] = useState("");
  const [bayarWallet, setBayarWallet] = useState("");
  const [bayarTanggal, setBayarTanggal] = useState(getTodayString());

  function openBayar(t: Tagihan) {
    setBayarTagihan(t);
    setBayarNominal(t.nominal.toLocaleString("id-ID"));
    setBayarWallet(t.wallet_id);
    setBayarTanggal(getTodayString());
  }

  function closeBayar() {
    setBayarTagihan(null);
  }

  function handleBayar() {
    if (!bayarTagihan) return;
    const nominal = parseNominal(bayarNominal);
    if (nominal <= 0) return;

    // Catat sebagai transaksi uang keluar
    addTransaksi({
      id: generateId(),
      jenis: "keluar",
      nominal,
      kategori: bayarTagihan.kategori,
      tanggal: bayarTanggal,
      catatan: `Bayar tagihan: ${bayarTagihan.nama}`,
      wallet_id: bayarWallet,
      timestamp: Date.now(),
    });

    // Tandai lunas bulan ini
    const next = tagihan.map((t) =>
      t.id === bayarTagihan.id
        ? { ...t, paidMonths: [...t.paidMonths, currentMonth] }
        : t
    );
    saveTagihan(next);
    setTagihanState(next);
    closeBayar();
    showToast(`${bayarTagihan.nama} dicatat sebagai lunas`);
  }

  function resetForm() {
    setFormNama(""); setFormNominal(""); setFormTanggal(1);
    setFormWallet(wallets[0]?.id ?? ""); setFormKategori("lainnya_keluar");
    setFormRecurring(true); setEditingTagihan(null); setShowForm(false);
  }

  function openAdd() {
    setEditingTagihan(null); setFormNama(""); setFormNominal("");
    setFormTanggal(1); setFormWallet(wallets[0]?.id ?? "");
    setFormKategori("lainnya_keluar"); setFormRecurring(true); setShowForm(true);
  }

  function openEdit(t: Tagihan) {
    setEditingTagihan(t); setFormNama(t.nama);
    setFormNominal(t.nominal.toLocaleString("id-ID")); setFormTanggal(t.tanggal);
    setFormWallet(t.wallet_id); setFormKategori(t.kategori);
    setFormRecurring(t.isRecurring); setShowForm(true);
  }

  function handleSave() {
    const nominal = parseNominal(formNominal);
    if (!formNama.trim() || nominal <= 0) return;
    let next: Tagihan[];
    if (editingTagihan) {
      next = tagihan.map((t) =>
        t.id === editingTagihan.id
          ? { ...t, nama: formNama.trim(), nominal, tanggal: formTanggal, wallet_id: formWallet, kategori: formKategori, isRecurring: formRecurring }
          : t
      );
      showToast("Tagihan diperbarui");
    } else {
      next = [...tagihan, { id: generateId(), nama: formNama.trim(), nominal, tanggal: formTanggal, wallet_id: formWallet, kategori: formKategori, isRecurring: formRecurring, paidMonths: [] }];
      showToast("Tagihan ditambahkan");
    }
    saveTagihan(next); setTagihanState(next); resetForm();
  }

  function handleDelete(id: string) {
    const next = tagihan.filter((t) => t.id !== id);
    saveTagihan(next); setTagihanState(next);
    setConfirmDeleteId(null); showToast("Tagihan dihapus");
  }

  const unpaid = tagihan.filter((t) => !t.paidMonths.includes(currentMonth));
  const paid   = tagihan.filter((t) =>  t.paidMonths.includes(currentMonth));
  const totalUnpaid = unpaid.reduce((s, t) => s + t.nominal, 0);

  function getWalletCurrency(walletId: string) {
    return wallets.find((w) => w.id === walletId)?.currency ?? "IDR";
  }
  function getWalletLabel(walletId: string) {
    const w = wallets.find((w) => w.id === walletId);
    return w ? `${w.icon} ${w.nama}` : walletId;
  }

  const formValid = formNama.trim().length > 0 && parseNominal(formNominal) > 0;

  return (
    <div className={styles.tabContent}>
      {toasts.length > 0 && (
        <div className={styles.toastStack}>
          {toasts.map((t) => <div key={t.id} className={styles.toast}>{t.message}</div>)}
        </div>
      )}

      {/* Summary strip */}
      {tagihan.length > 0 && (
        <div className={styles.summaryStrip}>
          <div>
            <div className={styles.summaryLabel}>Belum bayar</div>
            <div className={styles.summaryValue}>{unpaid.length} tagihan</div>
          </div>
          <div className={styles.summaryDivider} />
          <div>
            <div className={styles.summaryLabel}>Total tagihan</div>
            <div className={[styles.summaryValue, unpaid.length > 0 ? styles.summaryDanger : ""].join(" ")}>
              {fmt(totalUnpaid)}
            </div>
          </div>
        </div>
      )}

      {/* Belum dibayar */}
      {unpaid.length > 0 && (
        <div className={styles.section}>
          <div className={styles.secRow}>
            <div className={styles.sectionLabel}>Belum dibayar</div>
            <button className={styles.tambahBtn} onClick={openAdd}>
              <Plus size={11} strokeWidth={2.5} />
              Tambah
            </button>
          </div>
          {unpaid.map((t) => {
            const soon = isDueSoon(t.tanggal);
            const over = isOverdue(t.tanggal);
            return (
              <div
                key={t.id}
                className={[
                  styles.tagihanCard,
                  over ? styles.tagihanCardOver : soon ? styles.tagihanCardSoon : "",
                ].join(" ")}
              >
                <div className={styles.tagihanInfo} onClick={() => openEdit(t)}>
                  <div className={styles.tagihanNama}>{t.nama}</div>
                  <div className={styles.tagihanMeta}>
                    <span className={[styles.tagihanDue, over ? styles.metaDanger : soon ? styles.metaWarn : ""].join(" ")}>
                      {over || soon ? <AlertCircle size={11} strokeWidth={2} /> : <Calendar size={11} strokeWidth={1.5} />}
                      {getDueDateLabel(t.tanggal)}
                    </span>
                    <span className={styles.metaDot}>·</span>
                    <span className={styles.tagihanWallet}>{getWalletLabel(t.wallet_id)}</span>
                  </div>
                </div>
                <div className={styles.tagihanRight}>
                  <div className={styles.tagihanNominal}>{fmt(t.nominal, getWalletCurrency(t.wallet_id))}</div>
                  <button className={styles.bayarBtn} onClick={() => openBayar(t)}>Bayar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sudah dibayar */}
      {paid.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Sudah dibayar bulan ini</div>
          {paid.map((t) => (
            <div key={t.id} className={[styles.tagihanCard, styles.tagihanCardPaid].join(" ")}>
              <div className={styles.tagihanPaidCheck}>
                <Check size={13} strokeWidth={2.5} />
              </div>
              <div className={styles.tagihanInfo}>
                <div className={[styles.tagihanNama, styles.tagihanNamaPaid].join(" ")}>{t.nama}</div>
                <div className={styles.tagihanMeta}>
                  <span className={styles.tagihanWallet}>{getWalletLabel(t.wallet_id)}</span>
                </div>
              </div>
              <div className={styles.tagihanRight}>
                <div className={[styles.tagihanNominal, styles.tagihanNominalPaid].join(" ")}>
                  {fmt(t.nominal, getWalletCurrency(t.wallet_id))}
                </div>
                <button className={styles.deleteBtn} onClick={() => setConfirmDeleteId(t.id)}>
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state + tambah button */}
      {tagihan.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Belum ada tagihan</div>
          <div className={styles.emptyDesc}>
            Tambah tagihan rutin seperti listrik, sewa, atau langganan biar kamu tahu kapan harus bayar.
          </div>
          <button className={styles.tambahBtnEmpty} onClick={openAdd}>
            <Plus size={13} strokeWidth={2.5} />
            Tambah tagihan
          </button>
        </div>
      )}

      {/* Tombol tambah jika sudah ada tagihan tapi unpaid sudah ada (letaknya di luar section kosong) */}
      {tagihan.length > 0 && unpaid.length === 0 && (
        <div className={styles.secRow} style={{ paddingTop: 4 }}>
          <div className={styles.sectionLabel}>Belum dibayar</div>
          <button className={styles.tambahBtn} onClick={openAdd}>
            <Plus size={11} strokeWidth={2.5} />
            Tambah
          </button>
        </div>
      )}

      {/* Bottom sheet: form tambah/edit tagihan */}
      {showForm && (
        <div className={styles.overlay} onClick={resetForm}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>{editingTagihan ? "Edit Tagihan" : "Tambah Tagihan"}</h2>
              <button className={styles.sheetClose} onClick={resetForm}><X size={20} /></button>
            </div>
            <div className={styles.sheetBody}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nama tagihan</label>
                <input className={styles.fieldInput} type="text" placeholder="cth. Sewa kos, Listrik PLN" value={formNama} onChange={(e) => setFormNama(e.target.value)} maxLength={50} autoFocus />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nominal</label>
                <input className={styles.fieldInput} type="text" inputMode="numeric" placeholder="0" value={formNominal} onChange={(e) => setFormNominal(fmtInput(e.target.value))} />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label className={styles.fieldLabel}>Jatuh tempo</label>
                  <div className={styles.selectWrap}>
                    <select className={styles.fieldSelect} value={formTanggal} onChange={(e) => setFormTanggal(Number(e.target.value))}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Tgl {d}</option>)}
                    </select>
                    <ChevronDown size={14} className={styles.selectChevron} />
                  </div>
                </div>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label className={styles.fieldLabel}>Dompet</label>
                  <div className={styles.selectWrap}>
                    <select className={styles.fieldSelect} value={formWallet} onChange={(e) => setFormWallet(e.target.value)}>
                      {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.nama}</option>)}
                    </select>
                    <ChevronDown size={14} className={styles.selectChevron} />
                  </div>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Kategori</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={formKategori} onChange={(e) => setFormKategori(e.target.value)}>
                    {kategoriMap.keluar.filter((k) => !k.id.startsWith("transfer_")).map((k) => <option key={k.id} value={k.id}>{k.icon} {k.nama}</option>)}
                  </select>
                  <ChevronDown size={14} className={styles.selectChevron} />
                </div>
              </div>
              <label className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Tagihan rutin (otomatis reset tiap bulan)</span>
                <button role="switch" aria-checked={formRecurring} className={[styles.toggle, formRecurring ? styles.toggleOn : ""].join(" ")} onClick={() => setFormRecurring((v) => !v)} />
              </label>
            </div>
            <div className={styles.sheetFooter}>
              <button className={styles.btnPrimary} disabled={!formValid} onClick={handleSave}>
                {editingTagihan ? "Simpan Perubahan" : "Tambah Tagihan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet: konfirmasi bayar */}
      {bayarTagihan && (
        <div className={styles.overlay} onClick={closeBayar}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>Catat pembayaran</h2>
              <button className={styles.sheetClose} onClick={closeBayar}><X size={20} /></button>
            </div>
            <div className={styles.sheetTagihanName}>{bayarTagihan.nama}</div>
            <div className={styles.sheetBody}>
              {/* Nominal */}
              <div className={styles.bayarAmountBlock}>
                <div className={styles.bayarAmountLabel}>jumlah bayar</div>
                <div className={styles.bayarAmountRow}>
                  <span className={styles.bayarAmountSym}>
                    {CURRENCY_OPTIONS.find(c => c.code === (wallets.find(w => w.id === bayarWallet)?.currency ?? "IDR"))?.symbol ?? "Rp"}
                  </span>
                  <input
                    className={styles.bayarAmountInput}
                    type="text"
                    inputMode="numeric"
                    value={bayarNominal}
                    onChange={(e) => setBayarNominal(fmtInput(e.target.value))}
                    autoFocus
                  />
                </div>
              </div>
              {/* Dompet */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Dompet</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={bayarWallet} onChange={(e) => setBayarWallet(e.target.value)}>
                    {wallets.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.nama} · {w.currency}</option>)}
                  </select>
                  <ChevronDown size={14} className={styles.selectChevron} />
                </div>
              </div>
              {/* Tanggal */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Tanggal bayar</label>
                <input type="date" className={styles.fieldInput} value={bayarTanggal} onChange={(e) => setBayarTanggal(e.target.value)} />
              </div>
            </div>
            <div className={styles.sheetFooter}>
              <button className={styles.btnBayar} disabled={parseNominal(bayarNominal) <= 0} onClick={handleBayar}>
                Simpan pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <div className={styles.overlay} onClick={() => setConfirmDeleteId(null)}>
          <div className={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.confirmTitle}>Hapus tagihan?</h3>
            <p className={styles.confirmDesc}>Data ini tidak bisa dikembalikan.</p>
            <button className={styles.btnDanger} onClick={() => handleDelete(confirmDeleteId)}>Hapus</button>
            <button className={styles.btnSecondary} onClick={() => setConfirmDeleteId(null)}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Tabungan ──────────────────────────────────────────────────────────────

function TabTabungan() {
  const { toasts, showToast } = useToast();
  const [goals, setGoalsState] = useState<Goal[]>(() => getGoals());
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const ICONS = [
    "🎯",
    "✈️",
    "🏠",
    "🚗",
    "💻",
    "📱",
    "👗",
    "🎓",
    "💍",
    "🏖️",
    "🎮",
    "📷",
  ];

  const wallets = useWalletStore(s => s.wallets)
  const uniqueCurrencies = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const w of wallets) {
      if (!seen.has(w.currency)) { seen.add(w.currency); result.push(w.currency) }
    }
    return result
  }, [wallets])

  const [formNama, setFormNama] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formIcon, setFormIcon] = useState("🎯");
  const [formCurrency, setFormCurrency] = useState(() => uniqueCurrencies[0] ?? "IDR");

  function resetForm() {
    setFormNama("");
    setFormTarget("");
    setFormIcon("🎯");
    setFormCurrency(uniqueCurrencies[0] ?? "IDR");
    setEditingGoal(null);
    setShowForm(false);
  }

  function openAdd() {
    setEditingGoal(null);
    setFormNama("");
    setFormTarget("");
    setFormIcon("🎯");
    setFormCurrency(uniqueCurrencies[0] ?? "IDR");
    setShowForm(true);
  }

  function openEdit(g: Goal) {
    setEditingGoal(g);
    setFormNama(g.nama);
    setFormTarget(g.target.toLocaleString("id-ID"));
    setFormIcon(g.icon ?? "🎯");
    setFormCurrency(g.currency ?? uniqueCurrencies[0] ?? "IDR");
    setShowForm(true);
  }

  function handleSave() {
    const target = parseNominal(formTarget);
    if (!formNama.trim() || target <= 0) return;
    let next: Goal[];
    if (editingGoal) {
      next = goals.map((g) =>
        g.id === editingGoal.id
          ? { ...g, nama: formNama.trim(), target, icon: formIcon, currency: formCurrency }
          : g,
      );
      showToast("Target diperbarui");
    } else {
      if (goals.length >= MAX_GOALS) {
        showToast(`Maksimal ${MAX_GOALS} target`);
        return;
      }
      next = [
        ...goals,
        {
          id: generateId(),
          nama: formNama.trim(),
          target,
          currency: formCurrency,
          terkumpul: 0,
          icon: formIcon,
        },
      ];
      showToast("Target ditambahkan");
    }
    try {
      saveGoals(next);
      setGoalsState(next);
      resetForm();
    } catch {
      showToast("Gagal menyimpan, coba lagi");
    }
  }

  function handleDelete(id: string) {
    const next = goals.filter((g) => g.id !== id);
    saveGoals(next);
    setGoalsState(next);
    setConfirmDeleteId(null);
    showToast("Target dihapus");
  }

  const formValid = formNama.trim().length > 0 && parseNominal(formTarget) > 0;

  return (
    <div className={styles.tabContent}>
      {toasts.length > 0 && (
        <div className={styles.toastStack}>
          {toasts.map((t) => (
            <div key={t.id} className={styles.toast}>
              {t.message}
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Belum ada target tabungan</div>
          <div className={styles.emptyDesc}>
            Buat tujuan menabung biar lebih terarah — liburan, gadget, atau
            apapun yang kamu inginkan.
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          {goals.map((goal) => (
            <div key={goal.id} className={styles.goalCard}>
              <div className={styles.goalCardTop}>
                <span className={styles.goalIcon}>{goal.icon ?? "🎯"}</span>
                <div className={styles.goalInfo}>
                  <div className={styles.goalNama}>{goal.nama}</div>
                  <div className={styles.goalTarget}>{fmt(goal.target, goal.currency ?? 'IDR')} <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>{goal.currency ?? 'IDR'}</span></div>
                </div>
                <div className={styles.goalActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => openEdit(goal)}
                  >
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => setConfirmDeleteId(goal.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {goals.length < MAX_GOALS && (
        <button className={styles.fabAdd} onClick={openAdd}>
          <Plus size={22} strokeWidth={2} />
        </button>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={resetForm}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>
                {editingGoal ? "Edit Target" : "Tambah Target"}
              </h2>
              <button className={styles.sheetClose} onClick={resetForm}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.sheetBody}>
              <div className={styles.iconPicker}>
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    className={[
                      styles.iconOption,
                      formIcon === ic ? styles.iconOptionActive : "",
                    ].join(" ")}
                    onClick={() => setFormIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nama target</label>
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="cth. Liburan Bali, Laptop baru"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Mata uang target</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {uniqueCurrencies.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={[styles.currencyTab, formCurrency === c ? styles.currencyTabActive : ''].join(' ')}
                      onClick={() => setFormCurrency(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Target nominal</label>
                <input
                  className={styles.fieldInput}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formTarget}
                  onChange={(e) => setFormTarget(fmtInput(e.target.value))}
                />
              </div>
            </div>
            <div className={styles.sheetFooter}>
              <button
                className={styles.btnPrimary}
                disabled={!formValid}
                onClick={handleSave}
              >
                {editingGoal ? "Simpan Perubahan" : "Tambah Target"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div
          className={styles.overlay}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className={styles.confirmSheet}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.sheetHandle} />
            <h3 className={styles.confirmTitle}>Hapus target?</h3>
            <p className={styles.confirmDesc}>
              Data ini tidak bisa dikembalikan.
            </p>
            <button
              className={styles.btnDanger}
              onClick={() => handleDelete(confirmDeleteId)}
            >
              Hapus
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => setConfirmDeleteId(null)}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [activeTab, setActiveTab] = useState<Tab>("budget");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Perencanaan</span>
      </div>
      <div className={styles.tabBar}>
        {(["budget", "tagihan", "tabungan"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={[
              styles.tabBtn,
              activeTab === tab ? styles.tabBtnActive : "",
            ].join(" ")}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "budget"
              ? "Budget"
              : tab === "tagihan"
                ? "Tagihan"
                : "Tabungan"}
          </button>
        ))}
      </div>
      {activeTab === "budget" && <TabBudget />}
      {activeTab === "tagihan" && <TabTagihan />}
      {activeTab === "tabungan" && <TabTabungan />}
    </div>
  );
}

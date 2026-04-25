// =============================================================================
// features/onboarding/OnboardingPage.tsx
// 3-step onboarding: Nama → Pilih Dompet → Saldo & Currency
// =============================================================================

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Check, ChevronDown } from "lucide-react";
import { saveNama, setOnboardingDone, saveWallets } from "@/storage";
import { useWalletStore } from "@/store/wallet.store";
import { CURRENCY_OPTIONS, DEFAULT_WALLET_ID } from "@/constants";
import type { Wallet } from "@/types";
import styles from "./OnboardingPage.module.css";

// ── Preset dompet ─────────────────────────────────────────────────────────────

interface WalletPreset {
  id: string;
  nama: string;
  icon: string;
}

const WALLET_PRESETS: WalletPreset[] = [
  { id: "tunai", nama: "Tunai", icon: "💵" },
  { id: "bca", nama: "BCA", icon: "🏦" },
  { id: "bri", nama: "BRI", icon: "🏦" },
  { id: "mandiri", nama: "Mandiri", icon: "🏦" },
  { id: "bni", nama: "BNI", icon: "🏦" },
  { id: "gopay", nama: "GoPay", icon: "💚" },
  { id: "ovo", nama: "OVO", icon: "💜" },
  { id: "dana", nama: "DANA", icon: "💙" },
  { id: "shopeepay", nama: "ShopeePay", icon: "🧡" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingWallet {
  presetId: string | null;
  nama: string;
  icon: string;
  saldo: string;
  currency: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(
  presetId: string | null,
  nama: string,
  isFirst: boolean,
): string {
  if (isFirst) return DEFAULT_WALLET_ID;
  if (presetId) return presetId;
  return `wallet_${nama.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
}

function formatRupiah(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function parseNominal(formatted: string): number {
  return parseInt(formatted.replace(/\D/g, "") || "0", 10);
}

// ── Step 1: Nama ──────────────────────────────────────────────────────────────

function StepNama({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepText}>
        <h1 className={styles.stepTitle}>Halo! Siapa namamu?</h1>
        <p className={styles.stepSub}>
          Buat menyapa kamu aja. Bisa diganti kapan saja.
        </p>
      </div>
      <input
        ref={inputRef}
        className={styles.textInput}
        type="text"
        placeholder="Nama kamu"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onNext()}
        maxLength={40}
        autoComplete="off"
      />
      <button
        className={styles.btnPrimary}
        onClick={onNext}
        disabled={!value.trim()}
      >
        Lanjut
      </button>
    </div>
  );
}

// ── Step 2: Pilih Dompet ──────────────────────────────────────────────────────

function StepDompet({
  selected,
  onToggle,
  onAddCustom,
  onNext,
  onBack,
}: {
  selected: OnboardingWallet[];
  onToggle: (preset: WalletPreset) => void;
  onAddCustom: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const selectedIds = new Set(selected.map((w) => w.presetId));

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepText}>
        <h1 className={styles.stepTitle}>Kamu simpan uang di mana?</h1>
        <p className={styles.stepSub}>
          Pilih yang kamu punya. Bisa tambah lebih dari satu.
        </p>
      </div>

      <div className={styles.presetGrid}>
        {WALLET_PRESETS.map((preset) => {
          const active = selectedIds.has(preset.id);
          return (
            <button
              key={preset.id}
              className={`${styles.presetChip} ${active ? styles.presetChipActive : ""}`}
              onClick={() => onToggle(preset)}
            >
              <span className={styles.presetIcon}>{preset.icon}</span>
              <span className={styles.presetNama}>{preset.nama}</span>
              {active && (
                <Check
                  size={14}
                  className={styles.presetCheck}
                  strokeWidth={2.5}
                />
              )}
            </button>
          );
        })}
        <button className={styles.presetChipAdd} onClick={onAddCustom}>
          <Plus size={16} />
          <span>Dompet lain</span>
        </button>
      </div>

      {selected.length > 0 && (
        <p className={styles.selectedCount}>{selected.length} dompet dipilih</p>
      )}

      <div className={styles.navRow}>
        <button className={styles.btnBack} onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <button
          className={styles.btnPrimary}
          style={{ flex: 1 }}
          onClick={onNext}
          disabled={selected.length === 0}
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Saldo ─────────────────────────────────────────────────────────────

function StepSaldo({
  wallets,
  onChange,
  onFinish,
  onBack,
}: {
  wallets: OnboardingWallet[];
  onChange: (index: number, field: "saldo" | "currency", value: string) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [openCurrencyIdx, setOpenCurrencyIdx] = useState<number | null>(null);
  const allValid = wallets.every((w) => parseNominal(w.saldo) > 0);

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepText}>
        <h1 className={styles.stepTitle}>
          {wallets.length === 1
            ? `Berapa saldo ${wallets[0].nama} sekarang?`
            : "Berapa saldo masing-masing dompet?"}
        </h1>
        <p className={styles.stepSub}>
          Ini buat ngitung uang kamu. Bisa diubah nanti di halaman Dompet.
        </p>
      </div>

      <div className={styles.saldoList}>
        {wallets.map((w, i) => (
          <div key={i} className={styles.saldoCard}>
            <div className={styles.saldoCardHeader}>
              <span className={styles.saldoIcon}>{w.icon}</span>
              <span className={styles.saldoNama}>{w.nama}</span>
            </div>
            <div className={styles.saldoInputRow}>
              <div className={styles.currencyWrapper}>
                <button
                  className={styles.currencyBtn}
                  onClick={() =>
                    setOpenCurrencyIdx(openCurrencyIdx === i ? null : i)
                  }
                >
                  <span>{w.currency}</span>
                  <ChevronDown size={14} />
                </button>
                {openCurrencyIdx === i && (
                  <div className={styles.currencyDropdown}>
                    {CURRENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        className={`${styles.currencyOption} ${w.currency === opt.code ? styles.currencyOptionActive : ""}`}
                        onClick={() => {
                          onChange(i, "currency", opt.code);
                          setOpenCurrencyIdx(null);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                className={styles.nominalInput}
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={w.saldo}
                onChange={(e) =>
                  onChange(i, "saldo", formatRupiah(e.target.value))
                }
              />
            </div>
            {w.saldo !== "" && parseNominal(w.saldo) === 0 && (
              <p className={styles.saldoError}>Saldo harus lebih dari 0</p>
            )}
          </div>
        ))}
      </div>

      <div className={styles.navRow}>
        <button className={styles.btnBack} onClick={onBack}>
          <ChevronLeft size={20} />
        </button>
        <button
          className={styles.btnPrimary}
          style={{ flex: 1 }}
          onClick={onFinish}
          disabled={!allValid}
        >
          Selesai
        </button>
      </div>
    </div>
  );
}

// ── Custom wallet sheet ────────────────────────────────────────────────────────

function CustomWalletSheet({
  onAdd,
  onClose,
}: {
  onAdd: (nama: string, icon: string) => void;
  onClose: () => void;
}) {
  const [nama, setNama] = useState("");
  const [icon, setIcon] = useState("💳");
  const ICONS = ["💳", "🏦", "💰", "🪙", "📱", "🛍️", "✈️", "🎯"];

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <h2 className={styles.sheetTitle}>Tambah dompet</h2>
        <div className={styles.iconPicker}>
          {ICONS.map((ic) => (
            <button
              key={ic}
              className={`${styles.iconOption} ${icon === ic ? styles.iconOptionActive : ""}`}
              onClick={() => setIcon(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
        <input
          className={styles.textInput}
          type="text"
          placeholder="Nama dompet"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          maxLength={30}
          autoFocus
        />
        <button
          className={styles.btnPrimary}
          disabled={!nama.trim()}
          onClick={() => {
            if (nama.trim()) {
              onAdd(nama.trim(), icon);
              onClose();
            }
          }}
        >
          Tambah
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const navigate = useNavigate();
  const hydrateWallets = useWalletStore((s) => s.hydrate);

  const [step, setStep] = useState(1);
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);
  const [nama, setNama] = useState("");
  const [wallets, setWallets] = useState<OnboardingWallet[]>([]);
  const [showCustomSheet, setShowCustomSheet] = useState(false);

  function goTo(next: number, dir: "forward" | "back") {
    setAnimDir(dir);
    setAnimKey((k) => k + 1);
    setStep(next);
  }

  function togglePreset(preset: WalletPreset) {
    const exists = wallets.find((w) => w.presetId === preset.id);
    if (exists) {
      setWallets(wallets.filter((w) => w.presetId !== preset.id));
    } else {
      setWallets([
        ...wallets,
        {
          presetId: preset.id,
          nama: preset.nama,
          icon: preset.icon,
          saldo: "",
          currency: "IDR",
        },
      ]);
    }
  }

  function addCustom(nama: string, icon: string) {
    setWallets([
      ...wallets,
      { presetId: null, nama, icon, saldo: "", currency: "IDR" },
    ]);
  }

  function updateSaldo(
    index: number,
    field: "saldo" | "currency",
    value: string,
  ) {
    const next = [...wallets];
    next[index] = { ...next[index], [field]: value };
    setWallets(next);
  }

  function finish() {
    saveNama(nama.trim());
    const entities: Wallet[] = wallets.map((w, i) => ({
      id: generateId(w.presetId, w.nama, i === 0),
      nama: w.nama,
      icon: w.icon,
      saldo_awal: parseNominal(w.saldo),
      currency: w.currency,
    }));
    saveWallets(entities);
    setOnboardingDone();
    hydrateWallets();
    onComplete();
    navigate("/", { replace: true });
  }

  const progressPct = ((step - 1) / 2) * 100;

  return (
    <div className={styles.root}>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div
        key={animKey}
        className={`${styles.stepWrapper} ${animDir === "forward" ? styles.slideInForward : styles.slideInBack}`}
      >
        {step === 1 && (
          <StepNama
            value={nama}
            onChange={setNama}
            onNext={() => goTo(2, "forward")}
          />
        )}
        {step === 2 && (
          <StepDompet
            selected={wallets}
            onToggle={togglePreset}
            onAddCustom={() => setShowCustomSheet(true)}
            onNext={() => goTo(3, "forward")}
            onBack={() => goTo(1, "back")}
          />
        )}
        {step === 3 && (
          <StepSaldo
            wallets={wallets}
            onChange={updateSaldo}
            onFinish={finish}
            onBack={() => goTo(2, "back")}
          />
        )}
      </div>

      {showCustomSheet && (
        <CustomWalletSheet
          onAdd={addCustom}
          onClose={() => setShowCustomSheet(false)}
        />
      )}
    </div>
  );
}

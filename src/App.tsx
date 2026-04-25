// =============================================================================
// App.tsx
// Router, layout shell, migration runner, update banner.
// =============================================================================

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { runMigrations } from "@/storage";
import { useTransaksiStore } from "@/store/transaksi.store";
import { useWalletStore } from "@/store/wallet.store";
import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";
import { getOnboardingDone } from "@/storage";

import { PageLayout } from "@/components/layout/PageLayout";
import { MigrationErrorPage } from "@/components/MigrationErrorPage";

// Lazy load semua feature pages
import { lazy, Suspense } from "react";
const OnboardingPage = lazy(
  () => import("@/features/onboarding/OnboardingPage"),
);
const HomePage = lazy(() => import("@/features/home/HomePage"));
const PlanningPage = lazy(() => import("@/features/budget/PlanningPage"));
const InsightPage = lazy(() => import("@/features/insight/InsightPage"));
const RiwayatPage = lazy(() => import("@/features/riwayat/RiwayatPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));

type AppStatus = "loading" | "error" | "ready";

export default function App() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [onboardingDone, setOnboardingDone] = useState(() =>
    getOnboardingDone(),
  );
  const hydrateTransaksi = useTransaksiStore((s) => s.hydrate);
  const hydrateWallets = useWalletStore((s) => s.hydrate);
  const { updateAvailable, applyUpdate } = useUpdateAvailable();

  useEffect(() => {
    try {
      runMigrations();
      hydrateTransaksi();
      hydrateWallets();
      setStatus("ready");
    } catch (err) {
      console.error("[App] Migration failed:", err);
      setStatus("error");
    }
  }, [hydrateTransaksi, hydrateWallets]);

  if (status === "loading") return null;

  if (status === "error") return <MigrationErrorPage />;

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {onboardingDone ? (
            <>
              <Route
                element={
                  <PageLayout
                    updateAvailable={updateAvailable}
                    onApplyUpdate={applyUpdate}
                  />
                }
              >
                <Route path="/" element={<HomePage />} />
                <Route path="/planning" element={<PlanningPage />} />
                <Route path="/insight" element={<InsightPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="/riwayat" element={<RiwayatPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route
              path="*"
              element={
                <OnboardingPage onComplete={() => setOnboardingDone(true)} />
              }
            />
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

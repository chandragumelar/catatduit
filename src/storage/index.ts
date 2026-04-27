// =============================================================================
// storage/index.ts
// Satu-satunya entry point untuk semua akses localStorage.
// Import dari sini, bukan dari file storage individual.
// =============================================================================

export * from "./storage.base";
export * from "./storage.transaksi";
export * from "./storage.wallet";
export * from "./storage.tagihan";
export * from "./storage.goals";
export * from "./storage.budget";
export * from "./storage.kategori";
export * from "./storage.settings";
export { runMigrations } from "./migration/runner";

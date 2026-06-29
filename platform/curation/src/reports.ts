// Denuncias de usuarios (off-chain). Solo platformId del denunciante + target + motivo.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultStore = resolve(here, "..", ".reports-store.json");

function storePath(): string {
  return process.env.REPORTS_STORE ?? defaultStore;
}

export type ReportKind = "post" | "reply" | "article" | "user";

export interface UserReport {
  reporterPlatformId: string;
  kind: ReportKind;
  targetId: string;
  reason: string;
  ts: number;
}

interface ReportsStore {
  items: UserReport[];
}

function load(): ReportsStore {
  const path = storePath();
  if (!existsSync(path)) return { items: [] };
  return JSON.parse(readFileSync(path, "utf8")) as ReportsStore;
}

function save(store: ReportsStore): void {
  writeFileSync(storePath(), JSON.stringify(store, null, 2));
}

function key(reporterPlatformId: string, kind: ReportKind, targetId: string): string {
  return `${reporterPlatformId}:${kind}:${targetId}`;
}

/** Registra denuncia. Devuelve false si el mismo usuario ya denunció el mismo target. */
export function recordReport(input: Omit<UserReport, "ts">): boolean {
  const store = load();
  const k = key(input.reporterPlatformId, input.kind, input.targetId);
  if (store.items.some((r) => key(r.reporterPlatformId, r.kind, r.targetId) === k)) {
    return false;
  }
  store.items.push({ ...input, ts: Date.now() });
  save(store);
  return true;
}

export function hasReported(
  reporterPlatformId: string,
  kind: ReportKind,
  targetId: string,
): boolean {
  const k = key(reporterPlatformId, kind, targetId);
  return load().items.some((r) => key(r.reporterPlatformId, r.kind, r.targetId) === k);
}

/** Cantidad de denuncias distintas sobre un target (varios usuarios). */
export function countReports(kind: ReportKind, targetId: string): number {
  return load().items.filter((r) => r.kind === kind && r.targetId === targetId).length;
}

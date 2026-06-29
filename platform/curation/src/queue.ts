// Nivel 2 — cola de moderación humana. Store local (JSON, gitignored).
// ⚠️ Guarda SOLO contenido + seudónimo (platformId/handle) + motivo. NUNCA address ni PII.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReportKind } from "./reports.js";

const here = dirname(fileURLToPath(import.meta.url));
const defaultStore = resolve(here, "..", ".moderation-queue.json");

function storePath(): string {
  return process.env.MODERATION_QUEUE ?? defaultStore;
}

export type ModerationSource = "agent" | "report";

export interface ModerationItem {
  id: string;
  platformId: string;
  handle: string;
  content: string;
  reason: string;
  ts: number;
  /** Origen del caso en cola. */
  source?: ModerationSource | "both";
  /** Denuncias de usuarios acumuladas (si aplica). */
  reportCount?: number;
  kind?: ReportKind;
}

function load(): ModerationItem[] {
  const path = storePath();
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as ModerationItem[];
}

function save(items: ModerationItem[]): void {
  writeFileSync(storePath(), JSON.stringify(items, null, 2));
}

function mergeSource(
  prev?: ModerationSource | "both",
  next?: ModerationSource,
): ModerationSource | "both" | undefined {
  if (!next) return prev;
  if (!prev) return next;
  if (prev === next) return prev;
  return "both";
}

/** Inserta o actualiza un caso en cola (agente, denuncia o ambos). */
export function upsertModerationItem(item: Omit<ModerationItem, "ts"> & { ts?: number }): void {
  const q = load();
  const idx = q.findIndex((i) => i.id === item.id);
  const ts = item.ts ?? Date.now();
  if (idx === -1) {
    q.push({ ...item, ts });
  } else {
    const prev = q[idx];
    q[idx] = {
      ...prev,
      ...item,
      source: mergeSource(prev.source, item.source),
      reportCount: item.reportCount ?? prev.reportCount,
      reason: item.reason || prev.reason,
      ts: Math.max(prev.ts, ts),
    };
  }
  save(q);
}

/** Encola escalado del agente (compat). */
export function escalateToModeration(item: Omit<ModerationItem, "ts" | "source">): void {
  upsertModerationItem({ ...item, source: "agent" });
}

export function getModerationQueue(): ModerationItem[] {
  return load().sort((a, b) => b.ts - a.ts);
}

/** Resuelve (saca de la cola) un caso por id. Devuelve true si existía. */
export function resolveModeration(id: string): boolean {
  const q = load();
  const next = q.filter((i) => i.id !== id);
  if (next.length === q.length) return false;
  save(next);
  return true;
}

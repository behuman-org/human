import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { countReports, hasReported, recordReport } from "./reports.js";
import { getModerationQueue, upsertModerationItem } from "./queue.js";

describe("denuncias de usuarios", () => {
  let reportsPath: string;
  let queuePath: string;

  beforeEach(() => {
    reportsPath = resolve(process.cwd(), `.reports-store.test.${Date.now()}.json`);
    queuePath = resolve(process.cwd(), `.moderation-queue.test.${Date.now()}.json`);
    process.env.REPORTS_STORE = reportsPath;
    process.env.MODERATION_QUEUE = queuePath;
  });

  afterEach(() => {
    if (existsSync(reportsPath)) rmSync(reportsPath);
    if (existsSync(queuePath)) rmSync(queuePath);
  });

  it("deduplica por denunciante + target", () => {
    expect(
      recordReport({
        reporterPlatformId: "0xaaa",
        kind: "post",
        targetId: "p1",
        reason: "spam",
      }),
    ).toBe(true);
    expect(
      recordReport({
        reporterPlatformId: "0xaaa",
        kind: "post",
        targetId: "p1",
        reason: "spam otra vez",
      }),
    ).toBe(false);
    expect(countReports("post", "p1")).toBe(1);
    expect(hasReported("0xaaa", "post", "p1")).toBe(true);
  });

  it("cuenta denuncias de distintos usuarios", () => {
    recordReport({ reporterPlatformId: "0x1", kind: "post", targetId: "p1", reason: "a" });
    recordReport({ reporterPlatformId: "0x2", kind: "post", targetId: "p1", reason: "b" });
    expect(countReports("post", "p1")).toBe(2);
  });

  it("upsert en cola fusiona agente + denuncia", () => {
    upsertModerationItem({
      id: "p1",
      platformId: "0xauth",
      handle: "auth1",
      content: "texto",
      reason: "ilegal",
      source: "agent",
    });
    upsertModerationItem({
      id: "p1",
      platformId: "0xauth",
      handle: "auth1",
      content: "texto",
      reason: "Denuncia: spam",
      source: "report",
      reportCount: 2,
      kind: "post",
    });
    const q = getModerationQueue();
    expect(q).toHaveLength(1);
    expect(q[0].source).toBe("both");
    expect(q[0].reportCount).toBe(2);
  });
});

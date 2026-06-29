import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  articleReviewBody,
  buildReviewPrompt,
  createCurator,
  type LlmClient,
} from "./agent.js";
import { SYSTEM_RUBRIC, parseVerdict } from "./rubric.js";

function mockClient(text: string, spy?: (system: string, user: string) => void): LlmClient {
  return {
    chat: async (system, user) => {
      spy?.(system, user);
      return text;
    },
  };
}

const input = { platformId: "0xabc12345", handle: "12345", content: "El asado es lo más." };

describe("SYSTEM_RUBRIC", () => {
  it("prioriza detección acotada: ilegal, PII ajena, off-topic", () => {
    expect(SYSTEM_RUBRIC).toMatch(/ILEGAL|\+18|GORE/i);
    expect(SYSTEM_RUBRIC).toMatch(/SENSIBLE|doxxing|PII/i);
    expect(SYSTEM_RUBRIC).toMatch(/PIERDE EL HILO/i);
  });
});

describe("articleReviewBody", () => {
  it("elimina data URLs del markdown", () => {
    const md = "Hola ![x](data:image/png;base64,abc) fin";
    expect(articleReviewBody("Título", md)).not.toContain("data:image");
  });
});

describe("buildReviewPrompt", () => {
  it("incluye contexto del padre en respuestas", () => {
    const prompt = buildReviewPrompt({
      ...input,
      content: "Comprá mi curso acá",
      parentContent: "¿Qué opinan del asado argentino?",
      contentKind: "reply",
    });
    expect(prompt).toContain("Comprá mi curso acá");
    expect(prompt).toContain("asado argentino");
    expect(prompt).toContain("reply");
  });

  it("incluye título en artículos", () => {
    const prompt = buildReviewPrompt({
      ...input,
      title: "Mi ensayo",
      content: "Cuerpo del artículo",
      contentKind: "article",
    });
    expect(prompt).toContain("Mi ensayo");
    expect(prompt).toContain("article");
  });

  it("no incluye platformId ni handle en el prompt", () => {
    const prompt = buildReviewPrompt({ platformId: "0xSECRET", handle: "ABCDE", content: "hola" });
    expect(prompt).not.toContain("0xSECRET");
    expect(prompt).not.toContain("ABCDE");
  });
});

describe("parseVerdict", () => {
  it("escala ante JSON inválido (fail-safe)", () => {
    expect(parseVerdict("no json").status).toBe("escalated");
  });
});

describe("createCurator.reviewPost (LLM mockeado)", () => {
  it("aprueba una opinión legítima", async () => {
    const c = createCurator({ client: mockClient('{"status":"approved","reason":"opinión legítima"}') });
    expect(await c.reviewPost(input)).toEqual({ status: "approved", reason: "opinión legítima" });
  });

  it("etiqueta off-topic claro", async () => {
    const c = createCurator({ client: mockClient('{"status":"flagged","reason":"pierde el hilo"}') });
    expect((await c.reviewPost(input)).status).toBe("flagged");
  });

  it("escala contenido ilegal o +18", async () => {
    const c = createCurator({ client: mockClient('{"status":"escalated","reason":"contenido +18"}') });
    expect((await c.reviewPost(input)).status).toBe("escalated");
  });

  it("escala doxxing / PII de terceros", async () => {
    const c = createCurator({ client: mockClient('{"status":"escalated","reason":"datos sensibles de tercero"}') });
    expect((await c.reviewPost(input)).status).toBe("escalated");
  });

  it("extrae JSON aunque venga con texto alrededor", async () => {
    const c = createCurator({ client: mockClient('Claro:\n{"status":"approved","reason":"ok"}\n¡Listo!') });
    expect((await c.reviewPost(input)).status).toBe("approved");
  });

  it("ante status inválido, ESCALA (fail-safe)", async () => {
    const c = createCurator({ client: mockClient('{"status":"banned"}') });
    expect((await c.reviewPost(input)).status).toBe("escalated");
  });

  it("NO envía address ni platformId al LLM", async () => {
    let userPrompt = "";
    const c = createCurator({
      client: mockClient('{"status":"approved"}', (_s, user) => {
        userPrompt = user;
      }),
    });
    await c.reviewPost({ platformId: "0xSECRET_PID", handle: "ABCDE", content: "hola mundo" });
    expect(userPrompt).toContain("hola mundo");
    expect(userPrompt).not.toContain("0xSECRET_PID");
    expect(userPrompt).not.toContain("ABCDE");
  });

  it("envía parentContent al LLM para detectar off-topic", async () => {
    let userPrompt = "";
    const c = createCurator({
      client: mockClient('{"status":"flagged"}', (_s, user) => {
        userPrompt = user;
      }),
    });
    await c.reviewPost({
      platformId: "0xabc",
      handle: "abc12",
      content: "spam irrelevante",
      parentContent: "tema original del hilo",
      contentKind: "reply",
    });
    expect(userPrompt).toContain("tema original del hilo");
    expect(userPrompt).toContain("spam irrelevante");
  });

  it("usa el modelo configurado", () => {
    expect(createCurator({ client: mockClient("{}"), model: "llama-3.1-8b-instant" }).model).toBe(
      "llama-3.1-8b-instant",
    );
  });

  it("pasa la rúbrica como system prompt", async () => {
    let systemPrompt = "";
    const c = createCurator({
      client: mockClient('{"status":"approved"}', (system) => {
        systemPrompt = system;
      }),
    });
    await c.reviewPost(input);
    expect(systemPrompt).toBe(SYSTEM_RUBRIC);
  });
});

describe("cola de moderación", () => {
  const STORE = resolve(process.cwd(), ".moderation-queue.test.json");
  process.env.MODERATION_QUEUE = STORE;

  beforeEach(() => {
    if (existsSync(STORE)) rmSync(STORE);
  });

  it("encola, lista y resuelve sin guardar address/PII", async () => {
    const { escalateToModeration, getModerationQueue, resolveModeration } = await import("./queue.js");
    escalateToModeration({ id: "p1", platformId: "0xabc12345", handle: "12345", content: "dudoso", reason: "ambiguo" });
    escalateToModeration({ id: "p1", platformId: "0xabc12345", handle: "12345", content: "dudoso", reason: "ambiguo" });
    const q = getModerationQueue();
    expect(q).toHaveLength(1);
    expect(q[0].content).toBe("dudoso");
    expect(JSON.stringify(q[0])).not.toMatch(/address|G[A-Z0-9]{55}/);
    expect(resolveModeration("p1")).toBe(true);
    expect(getModerationQueue()).toHaveLength(0);
  });
});

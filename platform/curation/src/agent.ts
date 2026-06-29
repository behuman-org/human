// Nivel 1 — agente moderador vía Groq (chat completions).
import Groq from "groq-sdk";
import type { CurationInput, CurationVerdict } from "@behuman/shared";
import { SYSTEM_RUBRIC, parseVerdict } from "./rubric.js";

/** Cliente LLM inyectable (tests). */
export interface LlmClient {
  chat(system: string, user: string): Promise<string>;
}

export interface CuratorOptions {
  client?: LlmClient;
  model?: string;
}

export interface Curator {
  readonly model: string;
  reviewPost(input: CurationInput): Promise<CurationVerdict>;
}

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/** Arma el prompt de usuario. Exportado para tests. */
export function buildReviewPrompt(input: CurationInput): string {
  const kind = input.contentKind ?? (input.parentContent ? "reply" : "post");
  const lines = [`Tipo: ${kind}.`];

  if (input.title) {
    lines.push("", `Título: ${input.title}`);
  }

  lines.push("", "Contenido a revisar:", `"""${input.content}"""`);

  if (input.parentContent) {
    lines.push(
      "",
      "Contexto del mensaje padre (evaluar si la respuesta pierde el hilo):",
      `"""${input.parentContent}"""`,
    );
  }

  return lines.join("\n");
}

export function createGroqClient(model: string, apiKey = process.env.GROQ_API_KEY): LlmClient {
  const groq = new Groq({ apiKey });
  return {
    async chat(system, user) {
      const res = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 512,
        temperature: 0,
      });
      return res.choices[0]?.message?.content ?? "";
    },
  };
}

export function createCurator(opts: CuratorOptions = {}): Curator {
  const model = opts.model ?? process.env.CURATION_MODEL ?? DEFAULT_MODEL;
  const client = opts.client ?? createGroqClient(model);

  async function reviewPost(input: CurationInput): Promise<CurationVerdict> {
    const text = await client.chat(SYSTEM_RUBRIC, buildReviewPrompt(input));
    return parseVerdict(text);
  }

  return { model, reviewPost };
}

/** Texto revisable de un artículo (sin data URLs de banner/imágenes embebidas). */
export function articleReviewBody(title: string, markdown: string): string {
  const body = markdown
    .replace(/!\[[^\]]*]\(data:[^)]+\)/gi, "[imagen]")
    .replace(/\[([^\]]*)\]\(data:[^)]+\)/gi, "$1")
    .slice(0, 6000);
  return body;
}

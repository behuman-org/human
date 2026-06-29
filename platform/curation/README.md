# platform/curation · Agente moderador (Groq) + cola humana

Moderación **proactiva**: cada publicación pasa por el agente **antes** de aparecer en el feed.
No depende de denuncias de usuarios.

**Proveedor:** [Groq](https://groq.com) (`groq-sdk`). Variables: `GROQ_API_KEY`, `CURATION_MODEL`.

**Dev sin Groq:** `CURATION_DISABLED=true` auto-aprueba (solo local).

## Qué detecta el agente

1. Pierde el hilo (respuestas off-topic)
2. PII / datos sensibles de terceros
3. Ilegal, +18 explícito, gore → `escalated` (oculto hasta revisión humana)

## Cobertura

| Ruta | Curaduría |
|------|-----------|
| `POST /content` | ✅ |
| `POST /posts/:id/replies` | ✅ (+ contexto padre) |
| `POST /articles` | ✅ |
| `POST /articles/:id/opinions` | ✅ |

`escalated` → no visible en feed/listados; entra a cola humana (`/app/moderation`).

Denuncias: `POST /reports` — ver [docs/moderation-agent.md](../../docs/moderation-agent.md).

```bash
GROQ_API_KEY=gsk_... npm run serve -w @behuman/api
npm test -w @behuman/curation
```

// CAPA 3 — Funding ZK: donar anónimo (gateado por personhood), panel validador
// (aprobar hitos + release 2-de-3), y opiniones por campaña (anti-Sybil por nullifier).
// Cero PII: la wallet de donación es un seudónimo efímero; las opiniones usan platformId
// scopeado a la campaña. NUNCA se usa el address del KYC.
import { useEffect, useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import type { Campaign, CampaignOpinion, Sentiment } from "@behuman/shared";
import { loadAnyCredential, type StoredCredential } from "../kyc/credentialStore";
import { generatePlatformProof } from "../platform/zk2";
import {
  donate,
  getOpinions,
  getPosition,
  listCampaigns,
  postOpinion,
  release as releaseCampaign,
  approveMilestone,
  refund as refundCampaign,
  type Position,
} from "./api";
import { generateFundingOpinionProof, handleOfCampaign } from "./zk3";

const txUrl = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
const fmt = (n: string | number) => Number(n).toLocaleString("es-AR", { maximumFractionDigits: 4 });

export function Funding({ onBack }: { onBack: () => void }) {
  const [cred] = useState<StoredCredential | null>(() => loadAnyCredential());
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sel, setSel] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // donación
  const [amount, setAmount] = useState("100");
  const [donorWallet, setDonorWallet] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  // opiniones
  const [opinion, setOpinion] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("support");
  const [opinions, setOpinions] = useState<CampaignOpinion[]>([]);
  const [counts, setCounts] = useState({ support: 0, oppose: 0 });

  // validador
  const [signers, setSigners] = useState<string[]>([]);

  useEffect(() => {
    listCampaigns().then(setCampaigns).catch((e) => setError((e as Error).message));
  }, []);

  async function open(c: Campaign) {
    setSel(c);
    setError(null);
    setLastTx(null);
    setPosition(null);
    setSigners([]);
    const o = await getOpinions(c.id).catch(() => ({ opinions: [], sentiment: { support: 0, oppose: 0 } }));
    setOpinions(o.opinions);
    setCounts(o.sentiment);
  }

  async function membership() {
    if (!cred) throw new Error("Sin credencial de Capa 1 en este dispositivo");
    const p = await generatePlatformProof(cred, "0");
    return { proof: p.proof, publicSignals: p.publicSignals };
  }

  async function doDonate() {
    if (!sel) return;
    setError(null);
    try {
      setBusy("Generando prueba de personhood (ZK) en tu dispositivo…");
      const mp = await membership();
      // Wallet de donación = seudónimo efímero (no el address del KYC).
      const wallet = donorWallet ?? StellarSdk.Keypair.random().publicKey();
      setDonorWallet(wallet);
      setBusy("Donando (entra al vault Blend para generar yield)…");
      const r = await donate(sel.id, wallet, amount, mp);
      if (r.raisedAmount) setSel({ ...sel, raisedAmount: r.raisedAmount });
      setCampaigns((cs) => cs.map((c) => (c.id === sel.id ? { ...c, raisedAmount: r.raisedAmount ?? c.raisedAmount } : c)));
      setPosition(await getPosition(sel.id, wallet));
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function publishOpinion() {
    if (!sel || !cred || !opinion.trim()) return;
    setError(null);
    try {
      setBusy("Generando prueba de opinión por campaña (ZK)…");
      const p = await generateFundingOpinionProof(cred, sel.id, opinion.trim());
      setBusy("Publicando opinión anónima…");
      await postOpinion(sel.id, opinion.trim(), sentiment, { proof: p.proof, publicSignals: p.publicSignals });
      setOpinion("");
      const o = await getOpinions(sel.id);
      setOpinions(o.opinions);
      setCounts(o.sentiment);
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function approve(milestoneId: string) {
    if (!sel) return;
    setError(null);
    try {
      setBusy("Aprobando hito (firma de la plataforma)…");
      await approveMilestone(sel.id, milestoneId, sel.signers.platform);
      setSel({
        ...sel,
        milestones: sel.milestones.map((m) => (m.id === milestoneId ? { ...m, status: "approved" } : m)),
      });
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function doRelease() {
    if (!sel) return;
    setError(null);
    try {
      setBusy("Liberando fondos a la causa (release 2-de-3 + meta)…");
      const r = await releaseCampaign(sel.id, signers);
      setLastTx(r.txHash);
      setSel({ ...sel, state: "released" });
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function doRefund() {
    if (!sel || !donorWallet) return;
    setError(null);
    try {
      setBusy("Reembolsando tu aporte (todo-o-nada)…");
      const r = await refundCampaign(sel.id, donorWallet);
      setPosition(null);
      setBusy(null);
      setError(null);
      alert(`Reembolsado ${fmt(r.amount)} ${sel.asset} a tu wallet anónima.`);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  if (!cred) {
    return (
      <section className="app__card">
        <h2>Funding ZK</h2>
        <p>Necesitás una identidad verificada (Capa 1) en este dispositivo para participar.</p>
        <button type="button" onClick={onBack}>Volver</button>
      </section>
    );
  }

  const toggleSigner = (addr: string) =>
    setSigners((s) => (s.includes(addr) ? s.filter((x) => x !== addr) : [...s, addr]));

  const allApproved = sel?.milestones.every((m) => m.status === "approved") ?? false;
  const goalReached = sel ? Number(sel.raisedAmount) >= Number(sel.goalAmount) : false;

  return (
    <section className="app__card">
      <h2>Funding ZK (donación anónima + opinión por campaña)</h2>

      {!sel ? (
        <>
          <p>Elegí una campaña. Donás como humano verificado sin revelar quién sos.</p>
          {campaigns.length === 0 && <p>No hay campañas todavía.</p>}
          {campaigns.map((c) => (
            <div key={c.id} style={{ borderTop: "1px solid #eee", padding: "8px 0" }}>
              <strong>{c.title}</strong> <span style={{ opacity: 0.6 }}>· {c.state}</span>
              <p style={{ margin: "4px 0" }}>{c.summary}</p>
              <p style={{ fontSize: "0.85em" }}>
                {fmt(c.raisedAmount)} / {fmt(c.goalAmount)} {c.asset}
              </p>
              <button type="button" onClick={() => open(c)}>Abrir</button>
            </div>
          ))}
        </>
      ) : (
        <>
          <button type="button" onClick={() => setSel(null)} style={{ marginBottom: 8 }}>← Campañas</button>
          <h3>{sel.title}</h3>
          <p>{sel.summary}</p>
          <p>
            <strong>{fmt(sel.raisedAmount)} / {fmt(sel.goalAmount)} {sel.asset}</strong>
            {" · "}estado: <strong>{sel.state}</strong>
            {" · "}cierra: {new Date(sel.deadline).toLocaleDateString("es-AR")}
          </p>

          {/* Donación */}
          {sel.state === "fundraising" && (
            <fieldset style={{ margin: "10px 0" }}>
              <legend>Donar (anónimo, genera yield en Blend)</legend>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric"
                style={{ width: 120 }} /> {sel.asset}
              <button type="button" onClick={doDonate} disabled={!!busy || Number(amount) <= 0} style={{ marginLeft: 8 }}>
                Donar (gateado por ZK)
              </button>
              {position && (
                <p style={{ fontSize: "0.85em", color: "#137333" }}>
                  Tu posición: {fmt(position.underlying)} {sel.asset} (APY {(position.apy * 100).toFixed(1)}%) ·
                  wallet anónima <code>{donorWallet?.slice(0, 6)}…</code>
                  <br />
                  <button type="button" onClick={doRefund} disabled={!!busy} style={{ marginTop: 4 }}>
                    Recuperar mi aporte (si la campaña falla)
                  </button>
                </p>
              )}
            </fieldset>
          )}

          {/* Panel validador */}
          <fieldset style={{ margin: "10px 0" }}>
            <legend>Panel validador (hitos + release 2-de-3)</legend>
            {sel.milestones.length === 0 && <p style={{ fontSize: "0.85em" }}>Sin hitos.</p>}
            {sel.milestones.map((m) => (
              <div key={m.id} style={{ fontSize: "0.9em" }}>
                {m.status === "approved" ? "✅" : "⏳"} {m.title}
                {m.status !== "approved" && (
                  <button type="button" onClick={() => approve(m.id)} disabled={!!busy} style={{ marginLeft: 8 }}>
                    Aprobar
                  </button>
                )}
              </div>
            ))}
            <p style={{ fontSize: "0.85em", marginTop: 8 }}>Firmantes (2-de-3 para liberar):</p>
            {(["cause", "platform", "neutral"] as const).map((role) => {
              const addr = sel.signers[role];
              return (
                <label key={role} style={{ display: "block", fontSize: "0.8em" }}>
                  <input type="checkbox" checked={signers.includes(addr)} onChange={() => toggleSigner(addr)} />{" "}
                  {role}: <code>{addr.slice(0, 8)}…</code>
                </label>
              );
            })}
            <button
              type="button"
              onClick={doRelease}
              disabled={!!busy || sel.state !== "fundraising" || signers.length < 2 || !allApproved || !goalReached}
              style={{ marginTop: 8 }}
            >
              Liberar a la causa (capital + yield)
            </button>
            {(!allApproved || !goalReached) && sel.state === "fundraising" && (
              <p style={{ fontSize: "0.75em", opacity: 0.7 }}>
                Requiere todos los hitos aprobados y meta alcanzada.
              </p>
            )}
          </fieldset>

          {/* Opiniones */}
          <fieldset style={{ margin: "10px 0" }}>
            <legend>Opiniones (1 humano = 1 voz por campaña)</legend>
            <p style={{ fontSize: "0.85em" }}>
              Sentimiento: 👍 {counts.support} · 👎 {counts.oppose}
            </p>
            <textarea value={opinion} onChange={(e) => setOpinion(e.target.value)} rows={2}
              style={{ width: "100%" }} placeholder="Tu opinión sobre esta campaña…" />
            <div>
              <select value={sentiment} onChange={(e) => setSentiment(e.target.value as Sentiment)}>
                <option value="support">A favor</option>
                <option value="oppose">En contra</option>
                <option value="neutral">Neutral</option>
              </select>
              <button type="button" onClick={publishOpinion} disabled={!!busy || !opinion.trim()} style={{ marginLeft: 8 }}>
                Opinar (gateado por ZK)
              </button>
            </div>
            {opinions.map((o) => (
              <div key={o.id} style={{ borderTop: "1px solid #eee", padding: "6px 0", fontSize: "0.9em" }}>
                <strong>@{handleOfCampaign(o.platformId)}</strong>{" "}
                <span style={{ opacity: 0.6 }}>
                  {o.sentiment === "support" ? "👍" : o.sentiment === "oppose" ? "👎" : "·"}
                </span>
                <p style={{ margin: "2px 0" }}>{o.content}</p>
              </div>
            ))}
          </fieldset>
        </>
      )}

      {busy && <p>⏳ {busy}</p>}
      {error && <p style={{ color: "#c5221f" }}>Error: {error}</p>}
      {lastTx && (
        <p style={{ color: "#137333" }}>
          ✅ Fondos liberados.{" "}
          <a href={txUrl(lastTx)} target="_blank" rel="noreferrer">Ver la transacción</a>
        </p>
      )}

      <button type="button" onClick={onBack} style={{ marginTop: 12 }}>Volver</button>
    </section>
  );
}

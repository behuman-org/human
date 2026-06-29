// Capa 3 — Detalle de causa: portada + stats grandes + panel de donación guiado (anónimo),
// panel validador (aprobar hitos + release 2-de-3) y opiniones por campaña (1 voz por humano).
// Cero PII: la donación usa una wallet EFÍMERA nueva (RT-05); la opinión usa el platformId
// scopeado a la campaña. El gating es por prueba de pertenencia, nunca por is_verified(address).
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Campaign, CampaignOpinion, Sentiment } from "@behuman/shared";
import { Button } from "../components/ui/Button";
import { loadAnyCredential } from "../kyc/credentialStore";
import { generatePlatformProof } from "../platform/zk2";
import { createFundedEphemeral } from "../platform/ephemeral";
import {
  approveMilestone,
  donate,
  getCampaign,
  getOpinions,
  getPosition,
  postOpinion,
  refund as refundCampaign,
  release as releaseCampaign,
  type Position,
} from "../funding/api";
import {
  fundingChallenge,
  generateFundingOpinionProof,
  handleOfCampaign,
  signFundingAction,
} from "../funding/zk3";
import { daysLeft, fmtAmount, fmtApy, fundedPct, humanState, isRealTx, txUrl } from "../funding/causeView";
import { useI18n } from "../i18n/I18nProvider";
import "../styles/behuman-ui.css";
import "./Causes.css";

const PRESETS = ["10", "50", "100"];
type DonateStep = null | "proof" | "wallet" | "sending" | "done";
const STEP_ORDER: Record<Exclude<DonateStep, null>, number> = { proof: 0, wallet: 1, sending: 2, done: 3 };

export function CampaignDetailPage() {
  const { id = "" } = useParams();
  const { t, locale } = useI18n();
  const cpy = t.social.causes;
  const d = cpy.detail;
  const common = t.social.common;
  const steps = [
    { key: "proof" as const, label: d.stepProof },
    { key: "wallet" as const, label: d.stepWallet },
    { key: "sending" as const, label: d.stepSending },
  ];
  const [cred] = useState(() => loadAnyCredential());
  const [c, setC] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("50");
  const [donorWallet, setDonorWallet] = useState<string | null>(null);
  const [donorSecret, setDonorSecret] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [donateStep, setDonateStep] = useState<DonateStep>(null);
  const [lastDonationTx, setLastDonationTx] = useState<string | null>(null);
  const [lastReleaseTx, setLastReleaseTx] = useState<string | null>(null);

  const [opinion, setOpinion] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("support");
  const [opinions, setOpinions] = useState<CampaignOpinion[]>([]);
  const [counts, setCounts] = useState({ support: 0, oppose: 0 });

  const [signers, setSigners] = useState<string[]>([]);

  useEffect(() => {
    getCampaign(id)
      .then(setC)
      .catch((e) => setError((e as Error).message));
    getOpinions(id)
      .then((o) => {
        setOpinions(o.opinions);
        setCounts(o.sentiment);
      })
      .catch(() => {});
  }, [id]);

  async function membership() {
    if (!cred) throw new Error(d.needVerifyParticipate);
    const p = await generatePlatformProof(cred, "0");
    return { proof: p.proof, publicSignals: p.publicSignals };
  }

  async function doDonate() {
    if (!c) return;
    setError(null);
    setLastDonationTx(null);
    setDonateStep("proof");
    try {
      const mp = await membership();
      // RT-05: wallet efímera NUEVA por donación, fondeada por friendbot (testnet). Nunca el
      // address del KYC ni el platformId → sin rastro identidad ↔ donación.
      setDonateStep("wallet");
      const kp = await createFundedEphemeral();
      setDonorWallet(kp.publicKey());
      setDonorSecret(kp.secret());

      setDonateStep("sending");
      const r = await donate(c.id, kp.publicKey(), amount, mp);
      if (r.raisedAmount) {
        setC({ ...c, raisedAmount: r.raisedAmount, donorCount: (c.donorCount ?? 0) + 1 });
      }
      setLastDonationTx(r.donation?.txHash ?? null);

      const sig = signFundingAction(kp.secret(), fundingChallenge("refund", c.id, `position:${kp.publicKey()}`));
      setPosition(await getPosition(c.id, kp.publicKey(), sig.signature));
      setDonateStep("done");
    } catch (e) {
      setDonateStep(null);
      setError((e as Error).message);
    }
  }

  async function doRefund() {
    if (!c || !donorWallet || !donorSecret) return;
    setError(null);
    try {
      setBusy(d.busyRefund);
      const sig = signFundingAction(donorSecret, fundingChallenge("refund", c.id, donorWallet));
      const r = await refundCampaign(c.id, donorWallet, sig);
      setPosition(null);
      setBusy(null);
      alert(
        d.refundAlert
          .replace("{amount}", fmtAmount(r.amount, locale))
          .replace("{asset}", c.asset),
      );
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function publishOpinion() {
    if (!c || !cred || !opinion.trim()) return;
    setError(null);
    try {
      setBusy(d.busyOpinionProof);
      const p = await generateFundingOpinionProof(cred, c.id, opinion.trim());
      setBusy(d.busyOpinionPublish);
      await postOpinion(c.id, opinion.trim(), sentiment, { proof: p.proof, publicSignals: p.publicSignals });
      setOpinion("");
      const o = await getOpinions(c.id);
      setOpinions(o.opinions);
      setCounts(o.sentiment);
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function approve(milestoneId: string) {
    if (!c) return;
    setError(null);
    try {
      setBusy(d.busyApprove);
      const sec = c.signerSecretsDev?.platform;
      if (!sec) throw new Error(d.noValidatorPerm);
      const sig = signFundingAction(sec, fundingChallenge("approve", c.id, milestoneId));
      await approveMilestone(c.id, milestoneId, sig);
      setC({
        ...c,
        milestones: c.milestones.map((m) => (m.id === milestoneId ? { ...m, status: "approved" } : m)),
      });
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  async function doRelease() {
    if (!c) return;
    setError(null);
    try {
      setBusy(d.busyRelease);
      const secrets = c.signerSecretsDev;
      if (!secrets) throw new Error(d.noValidatorPerm);
      const byAddr: Record<string, string> = {
        [c.signers.cause]: secrets.cause,
        [c.signers.platform]: secrets.platform,
        [c.signers.neutral]: secrets.neutral,
      };
      const challenge = fundingChallenge("release", c.id, c.raisedAmount);
      const signatures = signers.filter((a) => byAddr[a]).map((a) => signFundingAction(byAddr[a], challenge));
      const r = await releaseCampaign(c.id, signatures);
      setLastReleaseTx(r.txHash);
      setC({ ...c, state: "released" });
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  if (error && !c) return <div className="bh app-page"><p className="bh-note bh-note--err">{error}</p></div>;
  if (!c) return <div className="bh app-page"><p className="bh-note">{common.loading}</p></div>;

  const s = humanState(c, cpy.states);
  const pct = fundedPct(c);
  const left = daysLeft(c.deadline);
  const allApproved = c.milestones.every((m) => m.status === "approved");
  const goalReached = Number(c.raisedAmount) >= Number(c.goalAmount);
  const donating = donateStep !== null && donateStep !== "done";
  const toggleSigner = (a: string) =>
    setSigners((x) => (x.includes(a) ? x.filter((y) => y !== a) : [...x, a]));

  return (
    <div className="bh app-page cause-detail">
      <Link to="/app/causes" className="bh-back">← {cpy.back}</Link>

      {/* Portada */}
      <header className="cause-cover">
        <span className={`bh-state bh-state--${s.cls}`}>{s.label}</span>
        <h1 className="bh-h1 cause-cover__title">{c.title}</h1>
        <p className="cause-cover__story">{c.summary || d.noDescription}</p>

        <div className="bh-progress cause-cover__progress">
          <div className="bh-progress__bar" style={{ width: `${pct}%` }} />
        </div>

        {/* Stats grandes */}
        <div className="cause-stats">
          <div className="cause-stat">
            <span className="cause-stat__value">{fmtAmount(c.raisedAmount, locale)}</span>
            <span className="cause-stat__label">
              {d.raised} ({c.asset})
            </span>
          </div>
          <div className="cause-stat">
            <span className="cause-stat__value">{fmtAmount(c.goalAmount, locale)}</span>
            <span className="cause-stat__label">{d.goal}</span>
          </div>
          <div className="cause-stat">
            <span className="cause-stat__value">{Math.round(pct)}%</span>
            <span className="cause-stat__label">{d.funded}</span>
          </div>
          <div className="cause-stat">
            <span className="cause-stat__value">{c.donorCount ?? 0}</span>
            <span className="cause-stat__label">{d.donors}</span>
          </div>
          <div className="cause-stat">
            <span className="cause-stat__value">{left > 0 ? left : 0}</span>
            <span className="cause-stat__label">{d.daysLeft}</span>
          </div>
          {typeof c.estApy === "number" && c.estApy > 0 && (
            <div className="cause-stat cause-stat--yield">
              <span className="cause-stat__value">{fmtApy(c.estApy)}</span>
              <span className="cause-stat__label">{d.yieldPerYear}</span>
            </div>
          )}
        </div>
      </header>

      {!cred && (
        <div className="bh-card">
          <p className="bh-p">
            {d.verifyToParticipate}{" "}
            <Link to="/onboarding" className="bh-back">
              {common.verifyLink}
            </Link>
            .
          </p>
        </div>
      )}

      {/* Panel de donación */}
      {cred && c.state === "fundraising" && (
        <div className="bh-card donate-panel">
          <h2 className="bh-h2">{d.donateTitle}</h2>
          <p className="donate-panel__anon">🛡️ {d.donateAnon}</p>

          <div className="donate-presets" role="group" aria-label={d.suggestedAmounts}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`donate-chip ${amount === p ? "is-active" : ""}`}
                onClick={() => setAmount(p)}
                disabled={donating}
              >
                {p} {c.asset}
              </button>
            ))}
          </div>
          <label className="donate-amount">
            <span className="bh-label">{d.otherAmount}</span>
            <div className="donate-amount__row">
              <input
                className="bh-input"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={donating}
              />
              <span className="donate-amount__asset">{c.asset}</span>
            </div>
          </label>

          <Button onClick={doDonate} disabled={donating || Number(amount) <= 0} className="donate-cta">
            {donating
              ? d.processing
              : `${d.donate} ${fmtAmount(amount, locale)} ${c.asset}`}
          </Button>

          {donateStep && (
            <ol className="donate-flow">
              {steps.map((step) => {
                const active = donateStep !== "done" ? STEP_ORDER[donateStep] : 3;
                const idx = STEP_ORDER[step.key];
                const status = idx < active ? "done" : idx === active ? "active" : "pending";
                return (
                  <li key={step.key} className={`donate-flow__step is-${status}`}>
                    <span className="donate-flow__icon">
                      {status === "done" ? "✓" : status === "active" ? <span className="donate-flow__spin" /> : ""}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Confirmación */}
          {donateStep === "done" && (
            <div className="donate-done">
              <p className="bh-note bh-note--ok" style={{ margin: 0 }}>
                ✅{" "}
                {d.thankYou
                  .replace("{amount}", fmtAmount(amount, locale))
                  .replace("{asset}", c.asset)}
              </p>
              {position && (
                <p className="bh-muted" style={{ margin: "0.4rem 0 0", fontSize: "0.85rem" }}>
                  {d.positionToday
                    .replace("{amount}", fmtAmount(position.underlying, locale))
                    .replace("{asset}", c.asset)
                    .replace("{apy}", fmtApy(position.apy))}
                </p>
              )}
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem" }}>
                {isRealTx(lastDonationTx) ? (
                  <a href={txUrl(lastDonationTx!)} target="_blank" rel="noreferrer" className="bh-back">
                    {d.viewTx}
                  </a>
                ) : (
                  <span className="bh-muted">{d.txSimulated}</span>
                )}
              </p>
              <div className="bh-actions" style={{ marginTop: "0.5rem" }}>
                <Button variant="ghost" onClick={doRefund} disabled={!!busy}>
                  {d.refund}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel validador (dev/demo) */}
      <details className="bh-card validator-panel">
        <summary className="bh-h2 validator-panel__summary">{d.validatorPanel}</summary>
        {c.milestones.length === 0 && <p className="bh-note">{d.noMilestones}</p>}
        {c.milestones.map((m) => (
          <div key={m.id} className="bh-milestone">
            <span>{m.status === "approved" ? "✅" : "⏳"}</span>
            <span style={{ flex: 1 }}>{m.title}</span>
            {m.status !== "approved" && (
              <Button variant="ghost" onClick={() => approve(m.id)} disabled={!!busy}>
                {d.approve}
              </Button>
            )}
          </div>
        ))}
        <p className="bh-note">{d.releaseSigners}</p>
        {(["cause", "platform", "neutral"] as const).map((role) => {
          const addr = c.signers[role];
          const label =
            role === "cause" ? d.signerCause : role === "platform" ? d.signerPlatform : d.signerNeutral;
          return (
            <label key={role} className="bh-signer">
              <input type="checkbox" checked={signers.includes(addr)} onChange={() => toggleSigner(addr)} />
              {label}
            </label>
          );
        })}
        <div className="bh-actions">
          <Button
            onClick={doRelease}
            disabled={!!busy || c.state !== "fundraising" || signers.length < 2 || !allApproved || !goalReached}
          >
            {d.releaseFunds}
          </Button>
        </div>
        {c.state === "fundraising" && (!allApproved || !goalReached) && (
          <p className="bh-note">{d.releaseRequires}</p>
        )}
        {lastReleaseTx && (
          <p className="bh-note bh-note--ok">
            ✅ {d.fundsReleased}{" "}
            {isRealTx(lastReleaseTx) ? (
              <a href={txUrl(lastReleaseTx)} target="_blank" rel="noreferrer" className="bh-back">
                {d.viewReleaseTx}
              </a>
            ) : (
              <span>{d.txSimulated}</span>
            )}
          </p>
        )}
      </details>

      <div className="bh-card">
        <h2 className="bh-h2">{d.opinionsTitle}</h2>
        <div className="bh-sentiment">
          <span>👍 {counts.support}</span>
          <span>👎 {counts.oppose}</span>
        </div>
        {cred && (
          <>
            <textarea
              className="bh-textarea"
              rows={2}
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder={d.opinionPlaceholder}
            />
            <div className="bh-actions">
              <select
                className="bh-select bh-input--sm"
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value as Sentiment)}
              >
                <option value="support">{d.sentimentSupport}</option>
                <option value="oppose">{d.sentimentOppose}</option>
                <option value="neutral">{d.sentimentNeutral}</option>
              </select>
              <Button onClick={publishOpinion} disabled={!!busy || !opinion.trim()}>
                {d.publishOpinion}
              </Button>
            </div>
          </>
        )}
        {opinions.map((o) => (
          <div key={o.id} className="bh-opinion">
            <span className="bh-opinion__handle">@{handleOfCampaign(o.platformId)}</span>
            <span className="bh-opinion__sentiment">
              {o.sentiment === "support" ? "👍" : o.sentiment === "oppose" ? "👎" : "·"}
            </span>
            <p style={{ margin: "0.2rem 0 0" }}>{o.content}</p>
          </div>
        ))}
      </div>

      {busy && <p className="bh-note">⏳ {busy}</p>}
      {error && <p className="bh-note bh-note--err">{error}</p>}
    </div>
  );
}

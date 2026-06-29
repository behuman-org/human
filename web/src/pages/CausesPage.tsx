// Capa 3 — Explorar causas. Tarjetas claras con progreso, % financiado, días restantes,
// donantes, asset y rendimiento. Doná como humano verificado, sin revelar quién sos.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "@behuman/shared";
import { listCampaigns } from "../funding/api";
import { daysLeft, fmtAmount, fmtApy, fundedPct, humanState } from "../funding/causeView";
import { useI18n } from "../i18n/useI18n";
import "../styles/behuman-ui.css";
import "./Causes.css";
import "./SocialShell.css";

function CauseCard({ c }: { c: Campaign }) {
  const { t, locale } = useI18n();
  const cpy = t.social.causes;
  const pct = fundedPct(c);
  const s = humanState(c, cpy.states);
  const left = daysLeft(c.deadline);
  const donorCount = c.donorCount ?? 0;

  return (
    <Link to={`/app/causes/${c.id}`} className="cause-card">
      <div className="cause-card__top">
        <span className={`bh-state bh-state--${s.cls}`}>{s.label}</span>
        {typeof c.estApy === "number" && c.estApy > 0 && (
          <span className="cause-card__yield" title={cpy.estApyTitle}>
            ↑ {fmtApy(c.estApy)} APY
          </span>
        )}
      </div>

      <h3 className="cause-card__title">{c.title}</h3>
      <p className="cause-card__summary">{c.summary}</p>

      <div className="cause-card__progress">
        <div className="bh-progress">
          <div className="bh-progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="cause-card__amounts">
          <strong>
            {fmtAmount(c.raisedAmount, locale)} {c.asset}
          </strong>
          <span>
            {cpy.ofGoal} {fmtAmount(c.goalAmount, locale)}
          </span>
        </div>
      </div>

      <div className="cause-card__meta">
        <span>
          <strong>{Math.round(pct)}%</strong> {cpy.funded}
        </span>
        <span>·</span>
        <span>
          {donorCount} {donorCount === 1 ? cpy.donor : cpy.donors}
        </span>
        <span>·</span>
        <span>
          {left > 0 ? `${left} ${left === 1 ? cpy.day : cpy.days}` : cpy.closed}
        </span>
      </div>

      <span className="cause-card__cta">{cpy.viewCause}</span>
    </Link>
  );
}

type LoadState = "loading" | "ready" | "error";

export function CausesPage() {
  const { t } = useI18n();
  const cpy = t.social.causes;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let alive = true;
    listCampaigns()
      .then((cs) => alive && (setCampaigns(cs), setState("ready")))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="causes-page">
      <header className="feed-column__top">
        <p className="feed-column__subtitle" style={{ marginTop: 0 }}>
          {cpy.eyebrow}
        </p>
        <h1 className="feed-column__title">{cpy.title}</h1>
        <p className="feed-column__subtitle">{cpy.subtitle}</p>
      </header>

      <div className="shell-page__body">
        {state === "loading" && (
          <div className="bh-grid causes-page__grid" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="cause-card cause-card--skeleton" />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="bh-card causes-empty causes-page__empty">
            <p className="bh-note bh-note--err">{cpy.loadError}</p>
            <p className="bh-muted">{cpy.loadErrorHint}</p>
          </div>
        )}

        {state === "ready" && campaigns.length === 0 && (
          <div className="bh-card causes-empty causes-page__empty">
            <h2 className="bh-h2">{cpy.emptyTitle}</h2>
            <p className="bh-muted">{cpy.emptyBody}</p>
          </div>
        )}

        {state === "ready" && campaigns.length > 0 && (
          <div className="bh-grid causes-page__grid">
            {campaigns.map((c) => (
              <CauseCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

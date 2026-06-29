import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { formatTimeAgo } from "../feed/feedApi";
import {
  getModerationQueue,
  resolveModeration,
  type ModerationQueueItem,
} from "../feed/platformApi";
import { useI18n } from "../i18n/useI18n";
import "./ModerationPage.css";
import "./SocialShell.css";

export function ModerationPage() {
  const { t } = useI18n();
  const m = t.social.moderation;
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setQueue(await getModerationQueue());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function resolve(id: string, status: "approved" | "flagged") {
    setBusyId(id);
    try {
      await resolveModeration(id, status);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="moderation-page">
      <header className="feed-column__top page-header-split">
        <div>
          <h1 className="feed-column__title">{m.title}</h1>
          <p className="feed-column__subtitle">{m.subtitle}</p>
        </div>
        <div className="page-header-split__actions">
          <button type="button" className="moderation-page__refresh" onClick={() => void refresh()}>
            {m.refresh}
          </button>
        </div>
      </header>

      <p className="moderation-page__privacy">{m.privacyNote}</p>

      {error && <p className="moderation-page__error" role="alert">{error}</p>}

      <ul className="moderation-page__list" aria-label={m.queueLabel}>
        {queue.length === 0 ? (
          <li className="feed-empty">{m.empty}</li>
        ) : (
          queue.map((item) => (
            <li key={item.id} className="moderation-page__card">
              <div className="moderation-page__meta">
                <span className="moderation-page__handle">@{item.handle}</span>
                {item.source && (
                  <span className="moderation-page__badge">
                    {item.source === "both"
                      ? m.sourceBoth
                      : item.source === "report"
                        ? m.sourceReport
                        : m.sourceAgent}
                  </span>
                )}
                {(item.reportCount ?? 0) > 0 && (
                  <span className="moderation-page__badge moderation-page__badge--count">
                    {m.reportsCount.replace("{count}", String(item.reportCount))}
                  </span>
                )}
                <time className="moderation-page__time">{formatTimeAgo(item.ts)}</time>
              </div>
              {item.reason && (
                <p className="moderation-page__reason">
                  <strong>{m.agentReason}:</strong> {item.reason}
                </p>
              )}
              <p className="moderation-page__content">{item.content}</p>
              <div className="moderation-page__actions">
                <Button
                  variant="primary"
                  disabled={busyId === item.id}
                  onClick={() => void resolve(item.id, "approved")}
                >
                  {m.approve}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void resolve(item.id, "flagged")}
                >
                  {m.flag}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <p style={{ marginTop: "1.25rem" }}>
        <Link to="/app/settings" className="settings-page__link-btn">
          {m.backSettings}
        </Link>
      </p>
    </div>
  );
}

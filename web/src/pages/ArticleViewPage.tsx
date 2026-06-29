// Capa 2 — Vista de artículo: banner + markdown renderizado + prueba on-chain (Stellar Expert)
// + opiniones anónimas (cada opinión también se ancla on-chain, igual que un tweet).
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Markdown } from "../components/markdown/Markdown";
import { loadAnyCredential } from "../kyc/credentialStore";
import { anchorOpinion } from "../identity/post";
import {
  getArticle,
  listArticleOpinions,
  postArticleOpinion,
  type Article,
  type ArticleOpinion,
} from "../feed/articlesApi";
import { formatTimeAgo } from "../feed/feedApi";
import { useI18n } from "../i18n/I18nProvider";
import "../styles/behuman-ui.css";
import "./Articles.css";

const isRealTx = (h?: string) => !!h && /^[0-9a-f]{64}$/i.test(h);
const txUrl = (h: string) => `https://stellar.expert/explorer/testnet/tx/${h}`;

export function ArticleViewPage() {
  const { id = "" } = useParams();
  const { locale, t } = useI18n();
  const a = t.social.articles;
  const v = a.view;
  const common = t.social.common;
  const [cred] = useState(() => loadAnyCredential());
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opinions, setOpinions] = useState<ArticleOpinion[]>([]);
  const [opinion, setOpinion] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getArticle(id).then(setArticle).catch((e) => setError((e as Error).message));
    listArticleOpinions(id).then(setOpinions).catch(() => {});
  }, [id]);

  async function publishOpinion() {
    if (!article || !cred || !opinion.trim()) return;
    setError(null);
    try {
      setBusy(v.busyOpinion);
      const anchored = await anchorOpinion(opinion.trim());
      await postArticleOpinion(article.id, {
        platformId: anchored.platformId,
        content: opinion.trim(),
        contentHash: anchored.contentHash,
        txHash: anchored.txHash,
      });
      setOpinion("");
      setOpinions(await listArticleOpinions(article.id));
      setBusy(null);
    } catch (e) {
      setBusy(null);
      setError((e as Error).message);
    }
  }

  if (error && !article) {
    return (
      <div className="bh app-page articles">
        <p className="bh-note bh-note--err">{error}</p>
      </div>
    );
  }
  if (!article) {
    return (
      <div className="bh app-page articles">
        <p className="bh-note">{common.loading}</p>
      </div>
    );
  }

  return (
    <div className="bh app-page articles">
      <Link to="/app/articles" className="bh-back">
        ← {a.back}
      </Link>

      {article.banner && (
        <div
          className="article-banner article-view__banner"
          style={{ backgroundImage: `url(${article.banner})` }}
        />
      )}

      <header className="article-view__head">
        <h1 className="bh-h1">{article.title}</h1>
        <div className="article-view__meta">
          <span>@{article.handle}</span>
          <span>·</span>
          <span>{formatTimeAgo(article.ts, locale)}</span>
          {isRealTx(article.txHash) ? (
            <a
              className="article-card__chip article-card__chip--link"
              href={txUrl(article.txHash)}
              target="_blank"
              rel="noreferrer"
            >
              🔗 {a.onChainExpert}
            </a>
          ) : (
            <span className="article-card__chip">{a.onChainPending}</span>
          )}
        </div>
      </header>

      <article className="article-view__body">
        <Markdown>{article.content}</Markdown>
      </article>

      <div className="bh-card" style={{ marginTop: "1.5rem" }}>
        <h2 className="bh-h2">{v.opinions}</h2>
        {cred ? (
          <>
            <textarea
              className="bh-textarea"
              rows={2}
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder={v.opinionPlaceholder}
            />
            <div className="bh-actions">
              <Button onClick={publishOpinion} disabled={!!busy || !opinion.trim()}>
                {v.opinionButton}
              </Button>
            </div>
          </>
        ) : (
          <p className="bh-p">
            {v.verifyToOpine}{" "}
            <Link to="/onboarding" className="bh-back">
              {common.verifyLink}
            </Link>
            .
          </p>
        )}
        {busy && <p className="bh-note">⏳ {busy}</p>}
        {error && <p className="bh-note bh-note--err">{error}</p>}

        {opinions.map((o) => (
          <div key={o.id} className="bh-opinion">
            <span className="bh-opinion__handle">@{o.handle}</span>
            {isRealTx(o.txHash) && (
              <a
                className="bh-opinion__sentiment"
                href={txUrl(o.txHash)}
                target="_blank"
                rel="noreferrer"
                title={v.viewOnChain}
              >
                🔗
              </a>
            )}
            <p style={{ margin: "0.2rem 0 0" }}>{o.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

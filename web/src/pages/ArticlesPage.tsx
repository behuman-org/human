// Capa 2 — Artículos (long-form). Cada artículo se ancla on-chain (igual que un tweet) y su
// contentHash lo hace inmutable. Listado con banner + extracto.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { listArticles, type ArticleListItem } from "../feed/articlesApi";
import { formatTimeAgo } from "../feed/feedApi";
import { useI18n } from "../i18n/I18nProvider";
import "./Articles.css";
import "./SocialShell.css";

export function ArticlesPage() {
  const { locale, t } = useI18n();
  const a = t.social.articles;
  const navigate = useNavigate();
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listArticles()
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="articles-page">
      <header className="feed-column__top page-header-split">
        <div>
          <p className="feed-column__subtitle" style={{ marginTop: 0 }}>
            {a.eyebrow}
          </p>
          <h1 className="feed-column__title">{a.title}</h1>
          <p className="feed-column__subtitle">{a.subtitle}</p>
        </div>
        <div className="page-header-split__actions">
          <Button onClick={() => navigate("/app/articles/new")}>{a.write}</Button>
        </div>
      </header>

      <div className="shell-page__body">
        {error && (
          <p className="bh-note bh-note--err articles-page__empty">
            {a.loadError}: {error}
          </p>
        )}
        {items.length === 0 && !error && <p className="bh-note articles-page__empty">{a.empty}</p>}

        <div className="articles-page__list">
          {items.map((item) => (
            <Link key={item.id} to={`/app/articles/${item.id}`} className="article-card">
              {item.banner && (
                <div className="article-card__banner" style={{ backgroundImage: `url(${item.banner})` }} />
              )}
              <div className="article-card__body">
                <h3 className="article-card__title">{item.title}</h3>
                <p className="article-card__excerpt">{item.excerpt}</p>
                <p className="article-card__meta">
                  <span>@{item.handle}</span>
                  <span>·</span>
                  <span>{formatTimeAgo(item.ts, locale)}</span>
                  {item.txHash && /^[0-9a-f]{64}$/i.test(item.txHash) && (
                    <span className="article-card__chip">{a.onChainChip}</span>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

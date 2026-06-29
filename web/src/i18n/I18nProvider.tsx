import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "./types";
import { I18nContext, messages, readStoredLocale, STORAGE_KEY } from "./I18nContext";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = messages[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.siteMeta.htmlTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t.siteMeta.description);
  }, [locale, t]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

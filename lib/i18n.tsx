'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

/**
 * Lightweight Hindi/English i18n powered by the Google Cloud Translation API
 * (via /api/translate). Source strings live in English in the JSX; when the user
 * flips to Hindi, `t(text)` returns the cached Devanagari translation, lazily
 * fetching any it hasn't seen yet and re-rendering once it arrives.
 *
 * Translations are memoized for the session (and persisted to localStorage) so
 * each unique string costs at most one API call per language.
 */

export type Lang = 'en' | 'hi';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (text: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORE_KEY = 'urbanpulse_hi_cache';
const LANG_KEY = 'urbanpulse_lang';

function loadCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [, force] = useReducer((x) => x + 1, 0);
  const cacheRef = useRef<Record<string, string>>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const batchRef = useRef<string[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cacheRef.current = loadCache();
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved === 'hi' || saved === 'en') {
      setLangState(saved);
      force();
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem(LANG_KEY, l);
  }, []);

  const toggle = useCallback(
    () => setLang(lang === 'en' ? 'hi' : 'en'),
    [lang, setLang],
  );

  // Debounced batch fetch so a render that touches many strings makes one call.
  const flush = useCallback(() => {
    const texts = batchRef.current;
    batchRef.current = [];
    if (texts.length === 0) return;

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target: 'hi', source: 'en' }),
    })
      .then((r) => r.json())
      .then((d: { translations?: string[] }) => {
        const out = d.translations ?? texts;
        texts.forEach((src, i) => {
          cacheRef.current[src] = out[i] ?? src;
          pendingRef.current.delete(src);
        });
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(cacheRef.current));
        } catch {
          /* quota — fine to skip persistence */
        }
        force();
      })
      .catch(() => texts.forEach((src) => pendingRef.current.delete(src)));
  }, []);

  const enqueue = useCallback(
    (text: string) => {
      if (pendingRef.current.has(text) || cacheRef.current[text]) return;
      pendingRef.current.add(text);
      batchRef.current.push(text);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, 60);
    },
    [flush],
  );

  const t = useCallback(
    (text: string) => {
      if (lang === 'en' || !text) return text;
      const hit = cacheRef.current[text];
      if (hit) return hit;
      enqueue(text); // fire-and-forget; re-renders when it lands
      return text; // show English until the Hindi arrives
    },
    [lang, enqueue],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}

/** Convenience: translate inline text. <T>Civic action for all</T> */
export function T({ children }: { children: string }) {
  const { t } = useI18n();
  return <>{t(children)}</>;
}

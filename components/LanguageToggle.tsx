'use client';

import { useI18n } from '@/lib/i18n';
import { Languages } from '@/components/icons';

/**
 * EN ⇄ हिं switch for the bilingual UI. Flipping it re-renders every <T>-wrapped
 * string through the Google Cloud Translation API (cached after first fetch).
 */
export default function LanguageToggle() {
  const { lang, toggle } = useI18n();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language between English and Hindi"
      title={lang === 'en' ? 'हिंदी में देखें' : 'View in English'}
      className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-sm font-semibold text-ink/75 backdrop-blur transition hover:bg-white/80 hover:text-ink"
    >
      <Languages className="h-4 w-4 text-sarvam-blue" />
      <span className={lang === 'en' ? 'text-ink' : 'text-ink/40'}>EN</span>
      <span className="text-ink/30">/</span>
      <span className={lang === 'hi' ? 'text-ink' : 'text-ink/40'}>हिं</span>
    </button>
  );
}

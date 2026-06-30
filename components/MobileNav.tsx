'use client';

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Map, Plus, Radar, UserCircle, Bot } from '@/components/icons';

// Hindi labels are hardcoded so the bottom nav stays bilingual even without the
// Cloud Translation key. `en`/`hi` are chosen from the language toggle.
const ITEMS = [
  { href: '/map', en: 'Map', hi: 'नक्शा', Icon: Map },
  { href: '/agent', en: 'Agent', hi: 'एजेंट', Icon: Bot },
  { href: '/report', en: 'Report', hi: 'रिपोर्ट', Icon: Plus, primary: true },
  { href: '/command', en: 'Command', hi: 'कमांड', Icon: Radar },
  { href: '/profile', en: 'Profile', hi: 'प्रोफ़ाइल', Icon: UserCircle },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { lang } = useI18n();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/80 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.en}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition ${
                active ? 'text-ink' : 'text-ink/50'
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  it.primary
                    ? 'bg-ink text-white shadow'
                    : active
                      ? 'bg-sarvam-peach/40'
                      : ''
                }`}
              >
                <it.Icon className="h-[20px] w-[20px]" />
              </span>
              {lang === 'hi' ? it.hi : it.en}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, Plus, Radar, UserCircle } from '@/components/icons';

const ITEMS = [
  { href: '/map', label: 'Map', Icon: Map },
  { href: '/dashboard', label: 'Stats', Icon: BarChart3 },
  { href: '/report', label: 'Report', Icon: Plus, primary: true },
  { href: '/command', label: 'Command', Icon: Radar },
  { href: '/profile', label: 'Profile', Icon: UserCircle },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/80 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active ? 'text-ink' : 'text-ink/50'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  it.primary
                    ? 'bg-ink text-white shadow'
                    : active
                      ? 'bg-sarvam-peach/40'
                      : ''
                }`}
              >
                <it.Icon className="h-[18px] w-[18px]" />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

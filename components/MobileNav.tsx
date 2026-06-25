'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/map', label: 'Map', icon: '🗺️' },
  { href: '/dashboard', label: 'Stats', icon: '📊' },
  { href: '/report', label: 'Report', icon: '➕', primary: true },
  { href: '/command', label: 'Command', icon: '🛰️' },
  { href: '/profile', label: 'Profile', icon: '🦸' },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                  it.primary
                    ? 'bg-blue-600 text-white shadow'
                    : active
                      ? 'bg-blue-50'
                      : ''
                }`}
              >
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

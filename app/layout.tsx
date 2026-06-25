import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AuthNav from '@/components/AuthNav';
import MobileNav from '@/components/MobileNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Community Hero — Report. Resolve. Reward.',
  description:
    'Hyperlocal civic issue reporting powered by Gemini Vision. Photograph a problem, let AI triage it, and track it to resolution.',
};

const NAV = [
  { href: '/map', label: 'Map' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/command', label: 'Command' },
  { href: '/profile', label: 'Profile' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50`}>
        <AuthProvider>
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-slate-900"
              >
                <span className="text-xl">🦸</span> Community Hero
              </Link>
              <nav className="flex items-center gap-1">
                <div className="hidden items-center gap-1 sm:flex">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      {n.label}
                    </Link>
                  ))}
                  <Link
                    href="/report"
                    className="ml-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    + Report
                  </Link>
                </div>
                <span className="ml-2">
                  <AuthNav />
                </span>
              </nav>
            </div>
          </header>
          <main className="pb-20 md:pb-0">{children}</main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}

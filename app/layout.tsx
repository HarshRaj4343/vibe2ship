import type { Metadata } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import AuthNav from '@/components/AuthNav';
import MobileNav from '@/components/MobileNav';
import LanguageToggle from '@/components/LanguageToggle';
import StatusNotifier from '@/components/StatusNotifier';
import Onboarding from '@/components/Onboarding';

const inter = Inter({ subsets: ['latin'] });
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'UrbanPulse — Report. Resolve. Reward.',
  description:
    'Hyperlocal civic issue reporting powered by Gemini Vision. Photograph a problem, let AI triage it, and track it to resolution.',
};

const NAV = [
  { href: '/map', label: 'Map' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agent', label: 'Agent' },
  { href: '/command', label: 'Command' },
  { href: '/admin', label: 'Depts' },
  { href: '/whatsapp', label: 'WhatsApp' },
  { href: '/profile', label: 'Profile' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body className={`${inter.className} min-h-screen text-ink`}>
        <AuthProvider>
         <I18nProvider>
          <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-white/60 bg-gradient-to-r from-sarvam-sky/40 via-sarvam-peach/50 to-sarvam-sky/40 px-4 py-2.5 shadow-[0_8px_30px_-12px_rgba(28,27,46,0.25)] backdrop-blur-xl sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="UrbanPulse"
                  className="h-7 w-7 object-contain"
                />
                UrbanPulse
              </Link>
              <nav className="flex items-center gap-2">
                <div className="hidden items-center gap-1 md:flex">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-white/50 hover:text-ink"
                    >
                      {n.label}
                    </Link>
                  ))}
                  <Link
                    href="/report"
                    className="ml-1 rounded-full bg-ink px-5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90"
                  >
                    + Report
                  </Link>
                </div>
                <span className="hidden sm:block">
                  <LanguageToggle />
                </span>
                <span className="ml-1">
                  <AuthNav />
                </span>
              </nav>
            </div>
          </header>
          <main className="pb-20 md:pb-0">{children}</main>
          <MobileNav />
          <StatusNotifier />
          <Onboarding />
         </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

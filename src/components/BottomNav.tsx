'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; icon: string };

const ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/groups', label: 'Groups', icon: '🗂️' },
  { href: '/matches', label: 'Matches', icon: '⚽' },
  { href: '/leaderboard', label: 'Table', icon: '🏆' },
  { href: '/my-teams', label: 'My Teams', icon: '👤' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-1 md:justify-center md:gap-2 md:px-4">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors md:flex-row md:gap-2 md:px-3 md:text-sm ${
                  active ? 'text-brand-dark' : 'text-muted hover:text-ink'
                }`}
              >
                <span className="text-lg leading-none md:text-base" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

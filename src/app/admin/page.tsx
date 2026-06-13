import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

const SECTIONS = [
  { href: '/admin/players', title: 'Players', desc: 'Add, edit & set display codes' },
  { href: '/admin/assign', title: 'Team assignments', desc: 'Assign teams & random draw' },
  { href: '/admin/results', title: 'Result overrides', desc: 'Manually correct match results' },
  { href: '/admin/sync', title: 'Live scores', desc: 'Sync real results from football-data.org' },
  { href: '/admin/settings', title: 'Settings', desc: 'Tournament name & scoring' },
];

export default function AdminPage() {
  return (
    <div>
      <PageHeader title="Admin" subtitle="Manage the sweepstake" />
      <div className="grid gap-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
          >
            <p className="font-semibold text-ink">{s.title}</p>
            <p className="text-sm text-muted">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

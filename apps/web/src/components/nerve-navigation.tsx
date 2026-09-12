'use client';
import { usePathname } from 'next/navigation';

export function NerveNavigation({ missionId = '' }: { missionId?: string }) {
  const pathname = usePathname();
  return <aside className="nerve-sidebar">
    <a className="nerve-brand" href="/missions" aria-label="Nerve mission workspace">
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M3 26h10l7-20 9 36 7-16h9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>Nerve<small>AI ATTENTION ROUTER</small></span>
    </a>
    <nav aria-label="Main navigation">
      <a href="/missions" aria-current={pathname === '/missions' ? 'page' : undefined}><span aria-hidden="true">⌂</span>Workspace</a>
      <a href="/" aria-current={pathname === '/' ? 'page' : undefined}><span aria-hidden="true">◇</span>Launch demo</a>
      <a href={missionId ? `/attention?id=${encodeURIComponent(missionId)}` : '/attention'} aria-current={pathname === '/attention' ? 'page' : undefined}><span aria-hidden="true">◎</span>Attention</a>
    </nav>
    <div className="nerve-sidebar-note"><span className="nerve-label">RIGHT ATTENTION</span><p>Higher impact.</p><small>One human. Many agents.</small></div>
  </aside>;
}

import type { MissionRun } from '@/lib/mission-runtime-types';
import { KRAKO_GOAL, KRAKO_SECTIONS, krakoSections, krakoSummary, krakoResultSections } from '@/lib/krako-demo';
import { MissionMarkdown } from './mission-markdown';

export function KrakoIdentity({ compact = false }: { compact?: boolean }) {
  return <section className={`krako-identity${compact ? ' is-compact' : ''}`} aria-label="Krako mystery apparel mission">
    <img src="/demo/krako-logo.png" alt="Krako logo" width={150} height={150}/>
    <div><p className="nerve-kicker">KRAKO / MYSTERY APPAREL</p><h2>krako.wtf</h2><p className="krako-goal">One identity. One first drop.<br/>A launch built around the unknown.</p>{!compact && <p className="nerve-muted">{KRAKO_GOAL}</p>}</div>
  </section>;
}

export function KrakoDecision({ draft }: { draft: string }) {
  const parts = krakoSections(draft);
  const judgment = parts.find(s => /founder judgment/i.test(s.title));
  const brand = parts.find(s => /brand direction/i.test(s.title));
  const drop = parts.find(s => /drop 0*1/i.test(s.title));
  return <div className="krako-decision">
    <p className="nerve-kicker">FOUNDER JUDGMENT</p><h3>Make this Krako’s first identity?</h3>
    {!judgment && <p>Back the proposed direction and Drop 001. The decision is how much mystery to preserve while giving people enough product clarity to trust the brand.</p>}
    {judgment && <MissionMarkdown>{judgment.body}</MissionMarkdown>}
    {[brand, drop].filter(s => !!s).map(s => <details key={s.title}><summary>{s.title} · proposed</summary><MissionMarkdown>{s.body}</MissionMarkdown></details>)}
    <p className="nerve-muted">Approval finalizes this creative package. Manufacturing, spending and publication remain outside this decision.</p>
  </div>;
}

export function KrakoResult({ run }: { run: MissionRun }) {
  const parts = krakoResultSections(run);
  const summary = krakoSummary(run);
  const missing = KRAKO_SECTIONS.filter(title => !parts.some(s => s.title.toLowerCase() === title.toLowerCase()));
  return <div className="krako-result">
    <div className="krako-summary" aria-label="Actual mission summary"><span><strong>1</strong> goal</span><span><strong>{summary.specialists}</strong> specialists</span><span><strong>{summary.decisions}</strong> human {summary.decisions === 1 ? 'decision' : 'decisions'}</span></div>
    <div className="krako-launch-board" aria-label="Krako launch visual concepts">
      <div className="krako-poster"><p>KRAKO / APPAREL PLACEMENT STUDY</p><div className="krako-shirt"><img src="/demo/krako-logo.png" alt="Supplied Krako logo on an illustrative tee silhouette" width={55} height={55}/></div><strong>krako.wtf</strong><span>DROP 001 · CREATIVE CONCEPT</span></div>
      <div className="krako-social"><p>INSTAGRAM / COVER STUDY</p><div><span>001</span><img src="/demo/krako-logo.png" alt="Krako Instagram cover concept" width={100} height={100}/></div><strong>KRAKO</strong><span>MYSTERY APPAREL</span></div>
      <div className="krako-landing"><p>KRAKO.WTF / LANDING STUDY</p><img src="/demo/krako-logo.png" alt="Krako landing page logo" width={60} height={60}/><strong>DROP<br/>001</strong><span>MYSTERY APPAREL</span><div className="krako-cta-preview">Explore the first drop ↗</div></div>
    </div>
    <p className="nerve-muted">App-rendered visual studies using the supplied logo. The model’s creative direction, proposed product and publication copy are below.</p>
    {missing.length > 0 && <p role="status" className="mission-error">Output review: dedicated sections missing for {missing.join(', ')}. The complete generated content is retained below.</p>}
    <div className="krako-deliverables">{parts.map((section, index) => <article className="krako-deliverable" key={`${index}-${section.title}`}><p className="nerve-kicker">{String(index + 1).padStart(2, '0')} / LAUNCH PACKAGE</p><h3>{section.title}</h3><MissionMarkdown>{section.body}</MissionMarkdown></article>)}</div>
  </div>;
}

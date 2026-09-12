'use client';
import { useEffect, useState, useCallback } from 'react';
import type { MissionRun, LearnedPathway } from '@/lib/mission-runtime-types';
import type { MissionState } from '@/lib/mission';

export function MissionWorkspace({ attentionOnly = false }: { attentionOnly?: boolean }) {
  const [run, setRun] = useState<MissionRun | null>(null);
  const [missionId, setMissionId] = useState('');
  const [goal, setGoal] = useState('Analyze the supplied project metrics and prepare a reviewable result');
  const [source, setSource] = useState('[{"project":"Alpha","users":120,"revenue":600},{"project":"Beta","users":80,"revenue":320}]');
  const [mode, setMode] = useState<'local' | 'openai'>('local');
  const [review, setReview] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [pathways, setPathways] = useState<LearnedPathway[]>([]);
  const [pathwayId, setPathwayId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedNode, setSelectedNode] = useState('');
  const [composerOpen, setComposerOpen] = useState(true);

  const loadCatalog = useCallback(async () => {
    const response = await fetch('/api/missions', { cache: 'no-store' });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    setPathways(value.pathways); setConfigured(value.openai);
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') || (attentionOnly ? '' : localStorage.getItem('nerve-current-mission')) || '';
    setMissionId(id); setComposerOpen(!id);
    void loadCatalog().catch(e => setError(e.message));
  }, [attentionOnly, loadCatalog]);
  useEffect(() => {
    if (!missionId) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/missions?id=${encodeURIComponent(missionId)}`, { cache: 'no-store' });
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        if (active) setRun(current => current && current.state.spec.id !== missionId ? current : !current || value.run.revision >= current.revision ? value.run : current);
      } catch (e) { if (active) setError((e as Error).message); }
    };
    void refresh(); const timer = setInterval(refresh, 700);
    return () => { active = false; clearInterval(timer); };
  }, [missionId]);

  async function act(input: Record<string, unknown>) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/missions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      if (value.run) {
        setRun(value.run); setMissionId(value.run.state.spec.id);
        if (input.operation === 'create') { setComposerOpen(false); setSelectedNode(''); }
        localStorage.setItem('nerve-current-mission', value.run.state.spec.id);
        history.replaceState(null, '', `${attentionOnly ? '/attention' : '/missions'}?id=${value.run.state.spec.id}`);
      }
      if (value.pathway) { await loadCatalog(); setNotice('Successful pathway saved. Select it for a new mission with fresh context.'); }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const pending = run?.state.attention.find(a => a.status === 'pending');
  const selectedTask = run?.tasks.find(t => t.capabilityId === selectedNode);
  const working = run?.tasks.filter(t => t.status === 'complete').length ?? 0;

  return <main className="nerve-shell mission-shell">
    <header className="nerve-hero"><div><p className="nerve-kicker">{attentionOnly ? 'Human attention inbox' : 'Mission runtime'}</p><h1>Nerve</h1><p className="nerve-tagline">One Human, Many Agents.</p></div>
      <nav className="mission-nav"><a href={attentionOnly && missionId ? `/missions?id=${missionId}` : '/'}>{attentionOnly ? 'Open workspace' : 'P0 demo'}</a>{run && <span className="nerve-state" data-state={run.state.status}>{run.state.status}</span>}</nav>
    </header>
    {error && <p role="alert" className="mission-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!attentionOnly && <details className="mission-composer" open={composerOpen} onToggle={e => setComposerOpen(e.currentTarget.open)}><summary>New mission</summary>
      <form onSubmit={e => { e.preventDefault(); void act({ operation: 'create', goal, source, mode, requireReview: review, ...(pathwayId ? { pathwayId } : {}) }); }}>
        <label>Desired outcome<input value={goal} onChange={e => setGoal(e.target.value)} required minLength={3} maxLength={1000}/></label>
        <label>Source context<textarea value={source} onChange={e => setSource(e.target.value)} required maxLength={24000} rows={5}/></label>
        <div className="mission-form-row"><label>Execution mode<select value={mode} onChange={e => { setMode(e.target.value as 'local' | 'openai'); setPathwayId(''); }}><option value="local">Local tools · source analysis</option><option value="openai" disabled={!configured}>OpenAI specialists{configured ? '' : ' · key required'}</option></select></label>
          <label>Pathway<select aria-label="Pathway" value={pathwayId} onChange={e => setPathwayId(e.target.value)}><option value="">Compose from context</option>{pathways.filter(p => p.mode === mode).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
        <label className="mission-check"><input type="checkbox" checked={review} onChange={e => setReview(e.target.checked)}/>Require my review before finalizing this result</label>
        <p className="nerve-muted">{mode === 'local' ? 'Local mode computes source statistics and packages context. It does not use an LLM.' : 'OpenAI specialists analyze and produce a deliverable using supplied context. No external actions.'}</p>
        <button disabled={busy} className="nerve-button nerve-button-primary" type="submit">Start mission</button>
      </form></details>}
    {run ? <>
      <section className="nerve-taskbar"><div><span className="nerve-label">ACTIVE MISSION · {run.mode === 'local' ? 'LOCAL TOOLS' : 'OPENAI SPECIALISTS'}</span><strong>{run.state.spec.goal}</strong><p>{run.error || run.state.events.at(-1)?.message}</p></div><div><strong>{working} / {run.tasks.length} tasks</strong><span>{run.state.attention.length} human requests · {run.state.artifacts.length} artifacts</span></div></section>
      {run.state.status === 'failed' && <button className="nerve-button" disabled={busy} onClick={() => void act({ operation: 'retry', id: missionId })}>Retry failed task</button>}
      <div className={attentionOnly ? '' : 'mission-layout'}>
        {!attentionOnly && <section className="mission-card"><h2>Dynamic Nerve Graph</h2><p className="nerve-muted">Select a capability to inspect its actual work. Edges reflect runtime handoffs.</p><NerveGraph state={run.state} select={setSelectedNode}/>
          {selectedTask && <details open className="mission-node-detail"><summary>{selectedTask.name} · {selectedTask.status}</summary><pre>{selectedTask.output || selectedTask.instruction}</pre></details>}
          {selectedNode === 'memory' && <details open><summary>Shared mission / work / decision memory</summary><pre>{JSON.stringify(run.memory, null, 2)}</pre></details>}
        </section>}
        <section className="mission-card" aria-live="polite"><h2>{pending ? 'Your decision is needed' : 'Human attention'}</h2>
          {!attentionOnly && <a className="nerve-button mission-handoff" href={`/attention?id=${missionId}`} target="_blank" rel="noreferrer">Open separate attention screen ↗</a>}
          {pending ? <><span className="nerve-class">{pending.class}</span><h3>{pending.title}</h3><p>{pending.detail}</p>
            <details open={attentionOnly}><summary>Review actual draft</summary><pre>{run.memory.work.draft}</pre></details>
            {run.memory.work.validate && <p>{run.memory.work.validate}</p>}
            <label>Decision note (optional)<textarea value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} rows={2}/></label>
            <div className="mission-form-row"><button disabled={busy} className="nerve-button nerve-button-primary" onClick={() => void act({ operation: 'decide', id: missionId, attentionId: pending.id, approved: true, comment })}>Approve result</button><button disabled={busy} className="nerve-button" onClick={() => void act({ operation: 'decide', id: missionId, attentionId: pending.id, approved: false, comment })}>Decline & cancel</button></div>
          </> : <p>{run.state.status === 'cancelled' ? 'Mission cancelled. No final artifact was created.' : 'No pending decision. Routine work proceeds without you.'}</p>}
          {run.memory.decisions.map((d, i) => <p key={i} className="nerve-resolution">{d}</p>)}
        </section>
      </div>
      {run.result && <section className="mission-card"><h2>Mission result</h2><div className="mission-form-row"><a className="nerve-button" href={`/api/missions?id=${missionId}&artifact=1`}>Download Markdown</a><button disabled={busy} className="nerve-button" onClick={() => void act({ operation: 'promote', id: missionId })}>Save successful pathway</button></div><pre className="mission-result">{run.result}</pre></section>}
      {!attentionOnly && <section className="mission-card"><h2>Execution & topology trace</h2><a href={`/api/missions?id=${missionId}&trace=1`}>Download full trace and memory</a><ol className="mission-trace">{[...run.state.events].reverse().map(event => <li key={event.id}><time>{event.at.slice(11, 19)}</time><span className="nerve-label">{event.type.replaceAll('_', ' ')}</span><p>{event.message}</p></li>)}</ol></section>}
    </> : attentionOnly ? <p>Open this screen from a mission to receive its decisions.</p> : <p>Describe an outcome and supply context. Nerve composes the working topology as the context is inspected.</p>}
  </main>;
}

function NerveGraph({ state, select }: { state: MissionState; select: (id: string) => void }) {
  const nodes = Object.values(state.nodes);
  // Top-down depth layout from dependencies; shared memory stays on a separate rail.
  const depth: Record<string, number> = { memory: 0 };
  for (let pass = 0; pass < nodes.length; pass++) for (const node of nodes) {
    if (node.capabilityId === 'memory') continue;
    const parents = state.edges.filter(e => e.to === node.capabilityId && e.from !== 'memory');
    depth[node.capabilityId] = Math.min(nodes.length, parents.length ? 1 + Math.max(...parents.map(e => depth[e.from] || 0)) : 1);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    const level = depth[node.capabilityId] || 0;
    const siblings = nodes.filter(n => (depth[n.capabilityId] || 0) === level);
    positions[node.capabilityId] = { x: (siblings.findIndex(n => n.capabilityId === node.capabilityId) + 1) * 600 / (siblings.length + 1), y: 40 + level * 92 };
  }
  const height = 85 + Math.max(0, ...Object.values(depth)) * 92;
  return <svg className="mission-graph" viewBox={`0 0 600 ${height}`} role="group" aria-label="Live mission capability graph">
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
    {state.edges.map(edge => { const from = positions[edge.from], to = positions[edge.to]; return <g key={edge.id}><path className={`mission-edge ${edge.status}`} d={`M${from.x},${from.y + 23} C${from.x},${from.y + 55} ${to.x},${to.y - 55} ${to.x},${to.y - 23}`} fill="none" markerEnd="url(#arrow)"><title>{edge.from} → {edge.to}: {edge.label} ({edge.status})</title></path></g>; })}
    {nodes.map(node => { const position = positions[node.capabilityId], capability = state.capabilities[node.capabilityId]; return <g key={node.capabilityId} role="button" tabIndex={0} aria-label={`${capability.name}: ${node.status}`} onClick={() => select(node.capabilityId)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(node.capabilityId); } }} className={`mission-graph-node ${node.status}`} transform={`translate(${position.x - 86},${position.y - 23})`}><rect width="172" height="46" rx="10"/><text x="86" y="19" textAnchor="middle">{capability.name}</text><text className="mission-graph-status" x="86" y="35" textAnchor="middle">{capability.kind} · {node.status}</text><title>{node.reason}</title></g>; })}
  </svg>;
}

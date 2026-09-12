'use client';
import { useEffect, useState, useCallback } from 'react';
import type { MissionRun, LearnedPathway } from '@/lib/mission-runtime-types';
import { NerveGraph } from './nerve-graph';
import { MissionMarkdown } from './mission-markdown';
import { NerveNavigation } from './nerve-navigation';
import { KrakoIdentity, KrakoDecision, KrakoResult } from './krako-demo';
import { KRAKO_GOAL, KRAKO_SOURCE, isKrakoRun } from '@/lib/krako-demo';

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
  const [krakoPreset, setKrakoPreset] = useState(false);

  function applyKrakoPreset() {
    setKrakoPreset(true); setGoal(KRAKO_GOAL); setSource(KRAKO_SOURCE);
    setMode('openai'); setReview(true); setPathwayId(''); setComposerOpen(true);
  }

  const loadCatalog = useCallback(async () => {
    const response = await fetch('/api/missions', { cache: 'no-store' });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    setPathways(value.pathways); setConfigured(value.openai);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = !attentionOnly && params.get('demo') === 'krako';
    if (demo) applyKrakoPreset();
    const id = params.get('id') || (attentionOnly || demo ? '' : localStorage.getItem('nerve-current-mission')) || '';
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
  const krako = isKrakoRun(run);
  const pending = run?.state.attention.find(a => a.status === 'pending');
  const selectedTask = run?.tasks.find(t => t.capabilityId === selectedNode);
  const working = run?.tasks.filter(t => t.status === 'complete').length ?? 0;

  return <main className={`nerve-shell mission-shell nerve-ui3${krako && attentionOnly ? ' krako-attention-surface' : ''}`}>
    <NerveNavigation missionId={missionId} />
    <header className="nerve-hero"><div><p className="nerve-kicker">{attentionOnly ? 'Human attention inbox' : 'Mission runtime'}</p><h1>Nerve</h1><p className="nerve-tagline">One Human, Many Agents.</p></div>
      <nav className="mission-nav"><a href={attentionOnly && missionId ? `/missions?id=${missionId}` : '/'}>{attentionOnly ? 'Open workspace' : 'P0 demo'}</a>{run && <span className="nerve-state" data-state={run.state.status}>{run.state.status}</span>}</nav>
    </header>
    {error && <p role="alert" className="mission-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {krako && <KrakoIdentity compact/>}
    {!attentionOnly && !krakoPreset && <a className="nerve-button krako-demo-link" href="/missions?demo=krako">Krako mystery apparel demo ↗</a>}
    {!attentionOnly && <details className="mission-composer" open={composerOpen} onToggle={e => setComposerOpen(e.currentTarget.open)}><summary>New mission</summary>
      {krakoPreset && <KrakoIdentity/>}
      <form onSubmit={e => { e.preventDefault(); if (krakoPreset && !configured) return; void act({ operation: 'create', goal, source, mode: krakoPreset ? 'openai' : mode, requireReview: krakoPreset || review, ...(pathwayId ? { pathwayId } : {}) }); }}>
        <label>Desired outcome<textarea value={goal} onChange={e => setGoal(e.target.value)} required minLength={3} maxLength={1000} rows={krakoPreset ? 6 : 2}/></label>
        <details open={!krakoPreset}><summary>{krakoPreset ? 'Creative brief & execution settings' : 'Mission settings'}</summary><label>Source context<textarea value={source} onChange={e => setSource(e.target.value)} required maxLength={24000} rows={5}/></label>
        <div className="mission-form-row"><label>Execution mode<select disabled={krakoPreset} value={mode} onChange={e => { setMode(e.target.value as 'local' | 'openai'); setPathwayId(''); }}><option value="local">Local tools · source analysis</option><option value="openai" disabled={!configured}>OpenAI specialists{configured ? '' : ' · key required'}</option></select></label>
          <label>Pathway<select disabled={krakoPreset} aria-label="Pathway" value={pathwayId} onChange={e => setPathwayId(e.target.value)}><option value="">Compose from context</option>{pathways.filter(p => p.mode === mode).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
        <label className="mission-check"><input type="checkbox" disabled={krakoPreset} checked={review} onChange={e => setReview(e.target.checked)}/>Require my review before finalizing this result</label>
        <p className="nerve-muted">{mode === 'local' ? 'Local mode computes source statistics and packages context. It does not use an LLM.' : 'OpenAI specialists analyze and produce a deliverable using supplied context. No external actions.'}</p>
        </details><button disabled={busy || (krakoPreset && !configured)} className="nerve-button nerve-button-primary" type="submit">{krakoPreset ? 'Launch Krako mission' : 'Start mission'}</button>
        {krakoPreset && !configured && <p role="status">This demo needs OpenAI configured on this server.</p>}
      </form></details>}
    {run ? <>
      <section className="nerve-taskbar"><div><span className="nerve-label">ACTIVE MISSION · {run.mode === 'local' ? 'LOCAL TOOLS' : 'OPENAI SPECIALISTS'}</span><strong>{krako ? 'Krako · Mystery apparel launch' : run.state.spec.goal}</strong>{krako && <details><summary>Mission goal</summary><p>{run.state.spec.goal}</p></details>}<p>{run.error || run.state.events.at(-1)?.message}</p></div><div><strong>{working} / {run.tasks.length} tasks</strong><span>{run.state.attention.length} human requests · {run.state.artifacts.length} artifacts</span></div></section>
      {run.state.status === 'failed' && <button className="nerve-button" disabled={busy} onClick={() => void act({ operation: 'retry', id: missionId })}>Retry failed task</button>}
      <div className={attentionOnly ? 'mission-attention-only' : `mission-layout${pending ? ' has-attention' : ''}`}>
        {!attentionOnly && <section className="mission-card"><h2>Dynamic Nerve Graph</h2><p className="nerve-muted">Select a capability to inspect its actual work. Edges reflect runtime handoffs.</p><NerveGraph key={run.state.spec.id} state={run.state} select={setSelectedNode}/>
          {selectedTask && <details open className="mission-node-detail"><summary>{selectedTask.name} · {selectedTask.status}</summary><MissionMarkdown>{selectedTask.output || selectedTask.instruction}</MissionMarkdown></details>}
          {selectedNode === 'memory' && <details open><summary>Shared mission / work / decision memory</summary><pre>{JSON.stringify(run.memory, null, 2)}</pre></details>}
        </section>}
        <section className={`mission-card mission-attention${pending ? ' is-pending' : ''}`} aria-live="polite"><h2>{pending ? 'Your decision is needed' : 'Human attention'}</h2>
          {!attentionOnly && <a className="nerve-button mission-handoff" href={`/attention?id=${missionId}`} target="_blank" rel="noreferrer">{krako ? 'Open mobile attention surface ↗' : 'Open separate attention screen ↗'}</a>}
          {pending ? <><span className="nerve-class">{pending.class}</span>{krako ? <KrakoDecision draft={run.memory.work.draft || ''}/> : <><h3>{pending.title}</h3><p>{pending.detail}</p></>}
            <details open={attentionOnly && !krako}><summary>Review actual draft</summary><MissionMarkdown>{run.memory.work.draft}</MissionMarkdown></details>
            {run.memory.work.validate && <p>{run.memory.work.validate}</p>}
            {(!krako || attentionOnly) && <><details open={!krako}><summary>Add a decision note</summary><label>Decision note (optional)<textarea value={comment} maxLength={krako ? 1800 : 2000} onChange={e => setComment(e.target.value)} rows={2}/></label></details>
            <div className="mission-form-row"><button disabled={busy} className="nerve-button nerve-button-primary" onClick={() => void act({ operation: 'decide', id: missionId, attentionId: pending.id, approved: true, comment: krako ? `Founder backs the proposed brand direction and Drop 001 for creative-package finalization only.${comment ? ` ${comment}` : ''}` : comment })}>{krako ? 'Approve direction & finalize' : 'Approve result'}</button><button disabled={busy} className="nerve-button" onClick={() => void act({ operation: 'decide', id: missionId, attentionId: pending.id, approved: false, comment })}>Decline & cancel</button></div></>}
          </> : <p>{run.state.status === 'cancelled' ? 'Mission cancelled. No final artifact was created.' : 'No pending decision. Routine work proceeds without you.'}</p>}
          {run.memory.decisions.map((d, i) => <p key={i} className="nerve-resolution">{d}</p>)}
        </section>
      </div>
      {run.result && <section className="mission-card"><h2>Mission result</h2><div className="mission-form-row"><a className="nerve-button" href={`/api/missions?id=${missionId}&artifact=1`}>Download Markdown</a><button disabled={busy} className="nerve-button" onClick={() => void act({ operation: 'promote', id: missionId })}>Save successful pathway</button></div><>{krako ? <KrakoResult run={run}/> : <MissionMarkdown>{run.result}</MissionMarkdown>}</><details><summary>View Markdown source</summary><pre>{run.result}</pre></details></section>}
      {!attentionOnly && <details className="mission-card mission-trace-panel"><summary>Execution & topology trace</summary><a href={`/api/missions?id=${missionId}&trace=1`}>Download full trace and memory</a><ol className="mission-trace">{[...run.state.events].reverse().map(event => <li key={event.id}><time>{event.at.slice(11, 19)}</time><span className="nerve-label">{event.type.replaceAll('_', ' ')}</span><p>{event.message}</p></li>)}</ol></details>}
    </> : attentionOnly ? <p>Open this screen from a mission to receive its decisions.</p> : <p>Describe an outcome and supply context. Nerve composes the working topology as the context is inspected.</p>}
  </main>;
}

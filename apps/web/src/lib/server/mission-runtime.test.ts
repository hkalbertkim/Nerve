import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MissionRuntime, MissionError, type ModelCall } from './mission-runtime';
import { missionHandler } from './mission-http';

async function fixture(t: { after: (fn: () => Promise<void>) => void }, model?: ModelCall) {
  const directory = await mkdtemp(join(tmpdir(), 'nerve-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return new MissionRuntime(directory, model);
}
async function finish(engine: MissionRuntime, id: string) {
  for (let i = 0; i < 12; i++) {
    const run = await engine.step(id);
    if (run.state.status !== 'running') return run;
  }
  throw new Error('Mission did not settle');
}
const input = { goal: 'Analyze revenue', source: '[{"revenue":10},{"revenue":20}]', mode: 'local' as const, requireReview: false };

test('context composes distinct graphs; actual numeric result survives a new runtime', async t => {
  const engine = await fixture(t);
  const a = await engine.create(input), b = await engine.create({ ...input, source: 'Customers ask for better documentation.' });
  assert.equal(a.tasks.length, 1);
  const data = await finish(engine, a.state.spec.id), text = await finish(engine, b.state.spec.id);
  assert.equal(data.state.status, 'complete'); assert.match(data.result!, /sum 30/);
  assert.equal(data.tasks.length, 5); assert.equal(text.tasks.length, 4);
  assert.ok(data.state.nodes['data-analyst']); assert.ok(text.state.nodes['text-analyst']);
  assert.equal(data.state.attention.length, 0);
  assert.deepEqual((await new MissionRuntime(engine.directory).get(a.state.spec.id)).result, data.result);
  assert.equal(new Set(data.state.events.map(e => e.id)).size, data.state.events.length);
});
test('approval blocks artifact, survives reload, resumes exactly once; decline cancels', async t => {
  const engine = await fixture(t);
  const start = await engine.create({ ...input, requireReview: true });
  const paused = await finish(engine, start.state.spec.id);
  assert.equal(paused.state.status, 'paused'); assert.equal(paused.state.artifacts.length, 0);
  const reopened = new MissionRuntime(engine.directory);
  const pending = paused.state.attention[0];
  const results = await Promise.allSettled([
    reopened.decide(start.state.spec.id, pending.id, true, 'Reviewed totals'),
    reopened.decide(start.state.spec.id, pending.id, true, 'Duplicate'),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const done = await finish(reopened, start.state.spec.id);
  assert.equal(done.state.artifacts.length, 1); assert.match(done.result!, /Reviewed totals/);
  const cancelled = await engine.create({ ...input, requireReview: true });
  const p = await finish(engine, cancelled.state.spec.id);
  await engine.decide(p.state.spec.id, p.state.attention[0].id, false, 'Do not finalize');
  const stopped = await engine.step(p.state.spec.id);
  assert.equal(stopped.state.status, 'cancelled'); assert.equal(stopped.state.artifacts.length, 0);
  await assert.rejects(engine.promote(p.state.spec.id));
});
test('failed model step retries without repeating completed analysis', async t => {
  let calls = 0;
  const engine = await fixture(t, async (instruction) => { if (instruction.startsWith('Plan specialist')) return JSON.stringify({ specialists: [{ name: 'Revenue analyst', instruction: 'Analyze revenue metrics from context.' }] }); calls++; if (calls === 2) throw new MissionError('Temporary failure'); return `Model output ${calls}`; });
  const start = await engine.create({ ...input, mode: 'openai' });
  const failed = await finish(engine, start.state.spec.id);
  assert.equal(failed.state.status, 'failed'); assert.equal(failed.memory.work['specialist-1'], 'Model output 1');
  await engine.retry(start.state.spec.id);
  const done = await finish(engine, start.state.spec.id);
  assert.equal(done.state.status, 'complete'); assert.equal(calls, 3);
});
test('pathway reuses execution pattern but never inherits data, decisions or outputs', async t => {
  const engine = await fixture(t);
  const first = await engine.create(input); await finish(engine, first.state.spec.id);
  const pathway = await engine.promote(first.state.spec.id);
  const second = await engine.create({ ...input, source: '[{"revenue":99}]', requireReview: true, pathwayId: pathway.id });
  assert.equal(second.tasks.length, 5); assert.equal(second.memory.decisions.length, 0);
  assert.ok(second.tasks.every(task => !task.output));
  const paused = await finish(engine, second.state.spec.id);
  assert.equal(paused.state.status, 'paused'); assert.match(paused.memory.work.draft, /sum 99/);
});
test('HTTP rejects foreign origin and non-loopback host; validates requests and missing artifacts', async t => {
  const engine = await fixture(t), handler = missionHandler(engine);
  const post = (body: unknown, origin = 'http://localhost:3100') => new Request('http://localhost:3100/api/missions', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await handler(post({ operation: 'create', ...input }, 'https://evil.example'))).status, 403);
  assert.equal((await handler(new Request('https://evil.example/api/missions'))).status, 403);
  assert.equal((await handler(post({ operation: 'create', ...input, source: '' }))).status, 400);
  assert.equal((await handler(new Request('http://localhost:3100/api/missions?id=../bad'))).status, 400);
  const a = await engine.create(input);
  assert.equal((await handler(new Request(`http://localhost:3100/api/missions?id=${a.state.spec.id}&artifact=1`))).status, 409);
  await finish(engine, a.state.spec.id);
  const result = await handler(new Request(`http://localhost:3100/api/missions?id=${a.state.spec.id}&artifact=1`));
  assert.equal(result.status, 200); assert.match(await result.text(), /sum 30/);
});
test('model planner chooses different role topologies for different goals and rejects malformed plans', async t => {
  const engine = await fixture(t, async (instruction, context) => {
    if (!instruction.startsWith('Plan specialist')) return 'Grounded specialist output';
    const goal = JSON.parse(context).goal;
    if (goal === 'Invalid planner') return 'not JSON';
    return JSON.stringify({ specialists: goal === 'Assess launch risk' ? [
      { name: 'Risk analyst', instruction: 'Identify risks in the supplied project context.' },
      { name: 'Operations analyst', instruction: 'Evaluate operational readiness from supplied evidence.' },
    ] : [{ name: 'Editor', instruction: 'Assess writing quality in the supplied context.' }] });
  });
  const a = await engine.create({ ...input, mode: 'openai', source: 'A small product team.', goal: 'Assess launch risk' });
  const b = await engine.create({ ...input, mode: 'openai', source: 'A small product team.', goal: 'Edit copy' });
  const aa = await engine.step(a.state.spec.id), bb = await engine.step(b.state.spec.id);
  assert.equal(aa.tasks.filter(t => t.operation === 'analyze').length, 2);
  assert.equal(bb.tasks.filter(t => t.operation === 'analyze').length, 1);
  assert.equal(aa.state.capabilities['specialist-1'].name, 'Risk analyst');
  const invalid = await engine.create({ ...input, mode: 'openai', goal: 'Invalid planner' });
  const failed = await engine.step(invalid.state.spec.id);
  assert.equal(failed.state.status, 'failed'); assert.equal(failed.tasks.length, 1);
});

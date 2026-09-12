import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KRAKO_GOAL, KRAKO_SOURCE, KRAKO_SECTIONS, isKrakoRun, krakoSections, krakoSummary, krakoResultSections } from './krako-demo';
import { MissionRuntime } from './server/mission-runtime';

test('Krako presentation preserves fenced code, numbered headings and unmatched content', () => {
  const sections = krakoSections('```markdown\n# Launch\n\n## 1. **Brand direction**\nQuiet identity.\n\n~~~js\n## not a section\n~~~\n\n## Appendix\nRetain this.\n```');
  assert.deepEqual(sections.map(s => s.title), ['Launch overview', 'Brand direction', 'Appendix']);
  assert.match(sections[1].body, /## not a section/);
  assert.equal(sections[2].body, 'Retain this.');
});

test('Krako uses unchanged runtime: goal-specific agents, one review, same ID, one artifact', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'nerve-krako-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const draft = KRAKO_SECTIONS.map(title => `## ${title}\n\nTest fixture: ${title}`).join('\n\n');
  const engine = new MissionRuntime(directory, async instruction => instruction.startsWith('Plan specialist')
    ? JSON.stringify({ specialists: [{ name: 'Apparel strategist', instruction: 'Develop an original mystery apparel direction.' }, { name: 'Launch editor', instruction: 'Prepare the Instagram and landing-page package.' }] }) : draft);
  assert.ok(KRAKO_GOAL.length <= 1000 && KRAKO_SOURCE.length <= 24000);
  const first = await engine.create({ goal: KRAKO_GOAL, source: KRAKO_SOURCE, mode: 'openai', requireReview: true });
  let run = first;
  for (let i = 0; i < 12 && run.state.status === 'running'; i++) run = await engine.step(first.state.spec.id);
  assert.equal(isKrakoRun(run), true);
  assert.equal(run.state.status, 'paused');
  assert.equal(run.state.artifacts.length, 0);
  assert.deepEqual(krakoSummary(run), { specialists: 2, requests: 1, decisions: 0 });
  await engine.decide(run.state.spec.id, run.state.attention[0].id, true, 'Test approval to finalize creative package only.');
  run = await engine.step(run.state.spec.id);
  assert.equal(run.state.spec.id, first.state.spec.id);
  assert.equal(run.state.status, 'complete');
  assert.equal(run.state.artifacts.length, 1);
  assert.deepEqual(krakoSummary(run), { specialists: 2, requests: 1, decisions: 1 });
  assert.deepEqual(krakoSections(run.result!).slice(0, 5).map(s => s.title), [...KRAKO_SECTIONS]);
  const fenced = structuredClone(run);
  fenced.memory.work.draft = `\`\`\`markdown\n${draft}\n\`\`\``;
  fenced.result = `${fenced.memory.work.draft}\n\n## Decision record\n${fenced.memory.decisions.join('\n')}`;
  assert.deepEqual(krakoResultSections(fenced).slice(0, 5).map(s => s.title), [...KRAKO_SECTIONS]);
  assert.match(krakoResultSections(fenced).at(-1)!.body, /Test approval/);
  assert.equal((await new MissionRuntime(directory).get(run.state.spec.id)).result, run.result);
});

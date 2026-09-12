import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MissionRuntime, MissionError } from '../src/lib/server/mission-runtime';

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error('Live check blocked: set OPENAI_API_KEY in the repository root .env, then rerun npm run check:missions:live --workspace web. The key is never printed.');
    process.exitCode = 2;
    return;
  }
  const directory = resolve(process.env.NERVE_DATA_DIR || '.nerve-data');
  const engine = new MissionRuntime(directory);
  const initial = await engine.create({
    goal: 'Prepare a concise operational review of these two projects. Compare user adoption and delivery blockers, and propose one practical next step per project. Use only the supplied data.',
    source: JSON.stringify([
      { project: 'Alpha', users: 120, blocker: 'Documentation is incomplete', owner: 'Product team' },
      { project: 'Beta', users: 80, blocker: 'Onboarding has two confusing steps', owner: 'Design team' },
    ]), mode: 'openai', requireReview: true,
  });
  const id = initial.state.spec.id;
  console.log(`Started live OpenAI mission ${id}. This check authorizes local test-artifact finalization only.`);
  let run = initial;
  // The plan is capped at three specialists: at most five model calls total.
  for (let step = 0; step < 12 && run.state.status === 'running'; step++) {
    run = await engine.step(id);
    console.log(`Completed tasks: ${run.tasks.filter(task => task.status === 'complete').length}/${run.tasks.length}; mission: ${run.state.status}`);
  }
  if (run.state.status === 'failed') throw new MissionError(run.error || 'Live mission failed.');
  assert.equal(run.state.status, 'paused', 'Mission must wait at its review gate.');
  assert.equal(run.state.artifacts.length, 0, 'No final artifact is allowed before approval.');
  const specialists = run.tasks.filter(task => task.operation === 'analyze');
  assert.ok(specialists.length >= 1 && specialists.length <= 3);
  assert.ok(specialists.every(task => task.output && task.status === 'complete'));
  assert.ok(run.memory.work.draft?.length > 50, 'The actual model draft must be inspectable.');
  const pending = run.state.attention.find(request => request.status === 'pending');
  assert.ok(pending);
  await engine.decide(id, pending.id, true, 'Automated smoke-test authorization: finalize this local test artifact only.');
  run = await engine.step(id);
  assert.equal(run.state.status, 'complete');
  assert.equal(run.state.artifacts.length, 1);
  const reopened = await new MissionRuntime(directory).get(id);
  assert.equal(reopened.result, run.result);
  const pathway = await engine.promote(id);
  const report = {
    passed: true, checkedAt: new Date().toISOString(), liveOpenAI: true,
    model: process.env.NERVE_MODEL || process.env.MODEL || 'gpt-4.1-mini',
    missionId: id, specialistCount: specialists.length, pathwayId: pathway.id,
    checks: ['live specialist planning and outputs', 'approval gate', 'local finalization', 'disk read-back', 'pathway promotion'],
    semanticQuality: 'Requires human inspection of the generated result; this test checks execution, not editorial quality.',
  };
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, `live-qc-${id}.json`), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  console.log(`Inspect the actual result at /missions?id=${id} on the app using the same data directory.`);
}
main().catch(error => {
  console.error(error instanceof MissionError ? error.message : 'Live verification failed. Inspect the saved mission state; no successful live check is claimed.');
  process.exitCode = 1;
});

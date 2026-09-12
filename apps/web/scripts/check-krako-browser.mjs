// Root invocation. Prepare --fixture into NERVE_DATA_DIR first, or prepare one live run.
// This check approves that mission for QC; it never makes a second model run.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.env.NERVE_BROWSER_MODULE_ROOT || '.', 'package.json'));
const { chromium } = require('playwright-core');
const binary = (await import(require.resolve('@sparticuz/chromium'))).default;
const directory = resolve(process.env.NERVE_DATA_DIR || '.nerve-data');
const prepared = JSON.parse(await readFile(resolve(directory, 'krako-demo.json'), 'utf8'));
const id = prepared.id;
const base = 'http://127.0.0.1:3211';
const evidence = resolve('docs/qc/krako-demo');
await mkdir(evidence, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', 'apps/web', '--turbopack', '-p', '3211', '-H', '127.0.0.1'], {
  env: { ...process.env, NERVE_DATA_DIR: directory, COPILOTKIT_TELEMETRY_DISABLED: 'true', DO_NOT_TRACK: '1', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let log = ''; server.stdout.on('data', data => { log += data; }); server.stderr.on('data', data => { log += data; });
let browser;
try {
  for (let i = 0; i < 120 && !log.includes('Ready in'); i++) {
    if (server.exitCode !== null) throw new Error('QC server exited');
    await new Promise(r => setTimeout(r, 500));
  }
  browser = await chromium.launch({ executablePath: await binary.executablePath(), args: binary.args.filter(a => !['--disable-web-security', '--allow-running-insecure-content'].includes(a)), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  context.setDefaultNavigationTimeout(120000);
  const errors = [];
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  const page = await context.newPage();
  await page.goto(`${base}/missions?demo=krako`);
  const start = page.getByRole('button', { name: 'Launch Krako mission' });
  await start.waitFor();
  await page.getByRole('heading', { name: 'krako.wtf', exact: true }).waitFor();
  await page.waitForFunction(() => [...document.images].some(i => i.alt === 'Krako logo' && i.complete && i.naturalWidth > 0));
  assert.match(await page.getByLabel('Desired outcome').inputValue(), /Turn Krako and krako.wtf/);
  assert.equal(await page.getByLabel('Execution mode').inputValue(), 'openai');
  assert.equal(await page.getByLabel('Require my review').isChecked(), true);
  await page.screenshot({ path: `${evidence}/composer.png`, fullPage: true });
  // Verify the actual composer payload without spending another model run.
  await page.route('**/api/missions', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { pathways: [], openai: true } });
    const body = route.request().postDataJSON();
    assert.equal(body.mode, 'openai'); assert.equal(body.requireReview, true); assert.ok(!body.pathwayId);
    assert.match(body.source, /^KRAKO MYSTERY APPAREL/);
    const response = await context.request.get(`${base}/api/missions?id=${id}`);
    await route.fulfill({ json: await response.json() });
  });
  await page.reload(); await start.waitFor();
  await start.click();
  await page.waitForURL(url => url.searchParams.get('id') === id);
  await page.getByRole('heading', { name: 'Your decision is needed' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve direction & finalize' }).count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Download Markdown' }).count(), 0);
  const before = (await (await context.request.get(`${base}/api/missions?id=${id}`)).json()).run;
  assert.equal(before.state.status, 'paused'); assert.equal(before.state.attention.length, 1);
  const specialists = before.tasks.filter(t => t.operation === 'analyze');
  for (const task of specialists) {
    assert.ok(await page.locator(`[data-node-id="${task.capabilityId}"]`).count());
  }
  await page.screenshot({ path: `${evidence}/workspace-paused.png`, fullPage: true });
  const attention = await context.newPage();
  await attention.setViewportSize({ width: 390, height: 844 });
  const handoff = await page.getByRole('link', { name: 'Open mobile attention surface' }).getAttribute('href');
  assert.equal(handoff, `/attention?id=${id}`);
  await attention.goto(`${base}${handoff}`);
  const approve = attention.getByRole('button', { name: 'Approve direction & finalize' });
  await approve.waitFor();
  assert.ok(await attention.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await attention.screenshot({ path: `${evidence}/attention-mobile.png`, fullPage: true });
  await approve.click();
  await page.getByRole('heading', { name: 'Mission result', exact: true }).waitFor({ timeout: 30000 });
  const after = (await (await context.request.get(`${base}/api/missions?id=${id}`)).json()).run;
  assert.equal(after.state.spec.id, id); assert.equal(after.state.status, 'complete');
  assert.equal(after.state.attention.length, 1); assert.equal(after.memory.decisions.length, 1);
  assert.equal(after.state.artifacts.length, 1);
  assert.equal(after.memory.work.draft, before.memory.work.draft);
  assert.match(after.memory.decisions[0], /Founder backs the proposed brand direction/);
  for (const title of ['Brand direction', 'Drop 001', 'Apparel concept', 'Instagram launch package', 'Landing-page concept']) {
    await page.locator('.krako-deliverables').getByRole('heading', { name: title, exact: true }).waitFor();
  }
  const summary = page.getByLabel('Actual mission summary');
  assert.match(await summary.innerText(), new RegExp(`${specialists.length}\\s+specialists`));
  assert.match(await summary.innerText(), /1\s+human decision/);
  await page.getByRole('heading', { name: 'Mission result', exact: true }).evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: `${evidence}/final-result.png` });
  await page.locator('.krako-result').screenshot({ path: `${evidence}/final-package.png` });
  const downloaded = await context.request.get(`${base}/api/missions?id=${id}&artifact=1`);
  assert.equal(downloaded.status(), 200); assert.equal(await downloaded.text(), after.result);
  await page.unroute('**/api/missions');
  await page.reload(); await page.locator('.krako-result').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('heading', { name: 'Mission result', exact: true }).evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: `${evidence}/final-mobile.png` });
  assert.deepEqual(errors, []);
  const result = { passed: true, liveOpenAI: prepared.liveOpenAI, composerCreateInterceptedForQC: true, missionId: id, specialists: specialists.length, humanDecisions: 1, artifacts: 1, sameMissionResumed: true, fiveSections: true, logoLoaded: true, mobileOverflow: false, pageErrors: errors };
  await writeFile(`${evidence}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (browser) await browser.close(); server.kill('SIGTERM'); }

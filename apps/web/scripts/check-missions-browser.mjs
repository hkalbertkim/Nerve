// Optional browser verification. Install playwright-core and @sparticuz/chromium
// in a temporary directory and set NERVE_BROWSER_MODULE_ROOT to that directory.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(resolve(process.env.NERVE_BROWSER_MODULE_ROOT || '.', 'package.json'));
const { chromium } = require('playwright-core');
const binary = (await import(require.resolve('@sparticuz/chromium'))).default;
const base = 'http://127.0.0.1:3210';
const evidence = resolve('docs/qc/mission-runtime');
await mkdir(evidence, { recursive: true });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', 'apps/web', '--turbopack', '-p', '3210', '-H', '127.0.0.1'], {
  env: { ...process.env, COPILOTKIT_TELEMETRY_DISABLED: 'true', DO_NOT_TRACK: '1', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = ''; server.stdout.on('data', chunk => { serverLog += chunk; }); server.stderr.on('data', chunk => { serverLog += chunk; });
let browser;
try {
  for (let i = 0; i < 90; i++) {
    if (serverLog.includes('Ready in')) break;
    if (server.exitCode !== null) throw new Error(serverLog);
    await new Promise(r => setTimeout(r, 500));
  }
  browser = await chromium.launch({ executablePath: await binary.executablePath(), args: binary.args.filter(arg => !['--disable-web-security', '--allow-running-insecure-content'].includes(arg)), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  // No telemetry or third-party page resources are needed for this offline check.
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  context.setDefaultNavigationTimeout(120000);
  const errors = []; const page = await context.newPage();
  page.on('response', async response => { if (response.url().includes('/api/missions') && response.status() >= 400) console.log('Mission HTTP error', response.status(), await response.text(), { origin: response.request().headers().origin, contentType: response.request().headers()['content-type'] }); }); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/missions`); await page.getByRole('button', { name: 'Start mission' }).waitFor();
  await page.getByLabel('Require my review').check();
  await page.getByRole('button', { name: 'Start mission' }).click();
  await page.getByRole('heading', { name: 'Your decision is needed' }).waitFor({ timeout: 45000 });
  assert.equal(await page.getByRole('link', { name: 'Download Markdown' }).count(), 0);
  const missionId = new URL(page.url()).searchParams.get('id'); assert.ok(missionId);
  const producer = page.locator('[data-node-id="producer"]');
  const originalPosition = await producer.getAttribute('transform');
  const edge = page.locator('[data-edge-id="data-analyst->producer"]');
  const originalEdge = await edge.getAttribute('d');
  const box = await producer.boundingBox(); assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 - 20, { steps: 8 }); await page.mouse.up();
  const movedPosition = await producer.getAttribute('transform');
  assert.notEqual(movedPosition, originalPosition); assert.notEqual(await edge.getAttribute('d'), originalEdge);
  await page.waitForTimeout(900); assert.equal(await producer.getAttribute('transform'), movedPosition);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const camera = page.locator('[data-graph-camera]');
  assert.match(await camera.getAttribute('transform'), /scale\(1.25\)/);
  const cameraBefore = await camera.getAttribute('transform');
  const canvas = await page.locator('.mission-graph-interactive').boundingBox(); assert.ok(canvas);
  await page.mouse.move(canvas.x + 10, canvas.y + 10); await page.mouse.down();
  await page.mouse.move(canvas.x + 40, canvas.y + 35, { steps: 5 }); await page.mouse.up();
  assert.notEqual(await camera.getAttribute('transform'), cameraBefore);
  await page.getByRole('button', { name: 'Reset layout' }).click();
  assert.equal(await producer.getAttribute('transform'), originalPosition);
  await producer.click(); await page.getByText('Result producer · complete', { exact: true }).waitFor();
  await page.screenshot({ path: `${evidence}/workspace-paused.png`, fullPage: true });
  const attention = await context.newPage(); attention.on('pageerror', e => errors.push(e.message));
  await attention.goto(`${base}/attention?id=${missionId}`);
  await attention.getByRole('button', { name: 'Approve result' }).waitFor();
  await attention.setViewportSize({ width: 390, height: 844 });
  assert.ok(await attention.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await attention.screenshot({ path: `${evidence}/ui3-attention-pending-mobile.png`, fullPage: true });
  await attention.getByLabel('Decision note').fill('Reviewed from the separate attention surface.');
  await attention.getByRole('button', { name: 'Approve result' }).click();
  await page.getByRole('heading', { name: 'Mission result', exact: true }).waitFor({ timeout: 15000 });
  const download = await context.request.get(`${base}/api/missions?id=${missionId}&artifact=1`);
  assert.equal(download.status(), 200); assert.match(await download.text(), /sum 920/);
  await page.reload(); await page.getByRole('heading', { name: 'Mission result', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save successful pathway' }).click();
  await page.getByRole('status').filter({ hasText: 'Successful pathway saved' }).waitFor();
  await page.screenshot({ path: `${evidence}/workspace-complete.png`, fullPage: true });
  await attention.setViewportSize({ width: 390, height: 844 });
  await attention.screenshot({ path: `${evidence}/attention-mobile.png`, fullPage: true });
  assert.ok(await attention.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.goto(`${base}/missions`); await page.getByRole('heading', { name: 'Mission result', exact: true }).waitFor(); await page.getByText('New mission', { exact: true }).click();
  await page.getByLabel('Pathway', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Source context').fill('[{"revenue":99}]');
  await page.getByLabel('Require my review').uncheck();
  await page.getByRole('button', { name: 'Start mission' }).click();
  await page.waitForURL(url => !!url.searchParams.get('id') && url.searchParams.get('id') !== missionId);
  await page.getByRole('heading', { name: 'Mission result', exact: true }).waitFor({ timeout: 15000 });
  const secondId = new URL(page.url()).searchParams.get('id'); assert.notEqual(secondId, missionId);
  const second = await context.request.get(`${base}/api/missions?id=${secondId}`);
  const secondRun = (await second.json()).run;
  assert.ok(secondRun.reusedPathwayId); assert.equal(secondRun.state.attention.length, 0); assert.match(secondRun.result, /sum 99/);
  // View-only fixture exercises four sibling nodes and rich/untrusted Markdown.
  const fixture = structuredClone(secondRun);
  fixture.state.spec.id = 'layout-fixture'; fixture.state.attention = [];
  fixture.result = '# Formatted result\n\n**Strong text**\n\n| Project | Users |\n| --- | ---: |\n| Alpha | 120 |\n\n- First action\n\n```js\nconst count = 120;\n```\n\n<script>window.nerveInjected=true</script>\n\n[Unsafe](javascript:alert(1))';
  for (const id of ['extra-1', 'extra-2']) {
    fixture.state.capabilities[id] = { id, name: id, kind: 'agent', source: 'internal' };
    fixture.state.nodes[id] = { capabilityId: id, status: 'complete', joinedAt: new Date().toISOString() };
    fixture.state.edges.push({ id: 'data-analyst->' + id, from: 'data-analyst', to: id, status: 'proven' });
  }
  const layout = await context.newPage(); layout.on('pageerror', e => errors.push(e.message));
  await layout.route('**/api/missions?id=layout-fixture', route => route.fulfill({ json: { run: fixture } }));
  await layout.goto(`${base}/missions?id=layout-fixture`);
  await layout.getByRole('heading', { name: 'Formatted result', exact: true }).waitFor();
  assert.equal(await layout.locator('.mission-markdown table').count(), 1);
  assert.equal(await layout.locator('.mission-markdown strong').innerText(), 'Strong text');
  assert.equal(await layout.locator('.mission-markdown pre code').innerText(), 'const count = 120;\n');
  assert.equal(await layout.locator('.mission-markdown script').count(), 0);
  assert.equal(await layout.locator('.mission-markdown a[href^="javascript:"]').count(), 0);
  const siblings = await layout.locator('[data-node-id="producer"], [data-node-id="validator"], [data-node-id="extra-1"], [data-node-id="extra-2"]').evaluateAll(elements => elements.map(el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right }; }).sort((a, b) => a.left - b.left));
  for (let i = 1; i < siblings.length; i++) assert.ok(siblings[i].left > siblings[i - 1].right, 'Sibling nodes must not overlap');
  await layout.close();
  // Preserve the existing P0 workflow: both required decisions still complete 42 events.
  await page.goto(base); await page.getByRole('button', { name: 'Run demo', exact: true }).click();
  await page.locator('.nerve-option').first().waitFor({ timeout: 15000 });
  assert.equal(await page.getByRole('button', { name: 'Confirm decision' }).isEnabled(), false);
  await page.locator('.nerve-option').first().click();
  assert.equal(await page.locator('.nerve-state').getAttribute('data-state'), 'paused');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidence}/ui3-decision-${await page.locator(".nerve-option").first().innerText().then(t => t.startsWith("Use") ? "pricing" : "launch")}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Confirm decision' }).click();
  await page.locator('.nerve-option').first().waitFor({ timeout: 15000 });
  assert.equal(await page.getByRole('button', { name: 'Confirm decision' }).isEnabled(), false);
  await page.locator('.nerve-option').first().click();
  assert.equal(await page.locator('.nerve-state').getAttribute('data-state'), 'paused');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidence}/ui3-decision-${await page.locator(".nerve-option").first().innerText().then(t => t.startsWith("Use") ? "pricing" : "launch")}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Confirm decision' }).click();
  await page.getByText('Nerve knew which two.', { exact: true }).waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.nerve-state').getAttribute('data-state'), 'complete');
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0);
  assert.deepEqual(errors, []);
  const report = { passed: true, checks: ['node drag updates edges and survives polling', 'zoom, background pan and reset', 'four sibling nodes do not overlap', 'Markdown headings, tables, lists and code render without embedded scripts', 'separate attention approval resumes original mission', 'downloaded real totals', 'reload persistence', 'successful pathway saves and reuses fresh source without old approvals', 'mobile attention has no horizontal overflow', 'UI 3 selection does not resolve until confirmed', 'original 42-event P0 completes', 'no JavaScript page errors'], liveOpenAI: false };
  await writeFile(`${evidence}/browser-result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error); console.error(serverLog.slice(-3500)); process.exitCode = 1;
} finally {
  await browser?.close(); server.kill('SIGTERM');
}

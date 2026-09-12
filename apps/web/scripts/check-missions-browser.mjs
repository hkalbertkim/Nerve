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
  browser = await chromium.launch({ executablePath: await binary.executablePath(), args: binary.args, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  // No telemetry or third-party page resources are needed for this offline check.
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  context.setDefaultNavigationTimeout(120000);
  const errors = []; const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/missions`); await page.getByRole('button', { name: 'Start mission' }).waitFor();
  await page.getByLabel('Require my review').check();
  await page.getByRole('button', { name: 'Start mission' }).click();
  await page.getByRole('heading', { name: 'Your decision is needed' }).waitFor({ timeout: 45000 });
  assert.equal(await page.getByRole('link', { name: 'Download Markdown' }).count(), 0);
  const missionId = new URL(page.url()).searchParams.get('id'); assert.ok(missionId);
  await page.screenshot({ path: `${evidence}/workspace-paused.png`, fullPage: true });
  const attention = await context.newPage(); attention.on('pageerror', e => errors.push(e.message));
  await attention.goto(`${base}/attention?id=${missionId}`);
  await attention.getByRole('button', { name: 'Approve result' }).waitFor();
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
  await page.goto(`${base}/missions`); await page.getByText('New mission', { exact: true }).click();
  await page.getByLabel('Pathway', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Source context').fill('[{"revenue":99}]');
  await page.getByLabel('Require my review').uncheck();
  await page.getByRole('button', { name: 'Start mission' }).click();
  await page.getByRole('heading', { name: 'Mission result', exact: true }).waitFor({ timeout: 15000 });
  const secondId = new URL(page.url()).searchParams.get('id'); assert.notEqual(secondId, missionId);
  const second = await context.request.get(`${base}/api/missions?id=${secondId}`);
  const secondRun = (await second.json()).run;
  assert.ok(secondRun.reusedPathwayId); assert.equal(secondRun.state.attention.length, 0); assert.match(secondRun.result, /sum 99/);
  // Preserve the existing P0 workflow: both required decisions still complete 42 events.
  await page.goto(base); await page.getByRole('button', { name: 'Run demo', exact: true }).click();
  await page.locator('.nerve-option').first().waitFor({ timeout: 15000 }); await page.locator('.nerve-option').first().click();
  await page.locator('.nerve-option').first().waitFor({ timeout: 15000 }); await page.locator('.nerve-option').first().click();
  await page.getByText('Nerve knew which two.', { exact: true }).waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.nerve-state').innerText(), 'complete');
  assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0);
  assert.deepEqual(errors, []);
  const report = { passed: true, checks: ['separate attention approval resumes original mission', 'downloaded real totals', 'reload persistence', 'successful pathway saves and reuses fresh source without old approvals', 'mobile attention has no horizontal overflow', 'original 42-event P0 completes', 'no JavaScript page errors'], liveOpenAI: false };
  await writeFile(`${evidence}/browser-result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error); console.error(serverLog.slice(-3500)); process.exitCode = 1;
} finally {
  await browser?.close(); server.kill('SIGTERM');
}

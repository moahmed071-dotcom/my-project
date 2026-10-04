// End-to-end test: builds nothing itself — run `npm run test:e2e` (which builds first).
// Starts a fake Anthropic API plus two app servers (one with a key, one without),
// then drives the real UI in Chromium.
//
//   CHROMIUM_PATH=/path/to/chrome  optional, to use an existing Chromium binary
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startFakeAnthropic } from './fake-anthropic.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_KEY = 'test-key-e2e-not-real';
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

function startApp(port, env) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts', '--production'], {
    cwd: root,
    // Start from a clean slate so a developer's real .env/key never leaks into tests.
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port), ANTHROPIC_API_KEY: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  const ready = (async () => {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${base}/api/health`)).ok) return;
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`server on ${port} did not start:\n${log}`);
  })();
  return { base, ready, child, log: () => log };
}

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first (npm run test:e2e does this).');
  process.exit(1);
}

const fake = await startFakeAnthropic({ delayMs: 700 });
const app = startApp(8790, { ANTHROPIC_API_KEY: TEST_KEY, ANTHROPIC_BASE_URL: fake.url });
const noKey = startApp(8791, { ANTHROPIC_BASE_URL: fake.url });
const badKey = startApp(8792, { ANTHROPIC_API_KEY: 'sk-invalid', ANTHROPIC_BASE_URL: fake.url });
await Promise.all([app.ready, noKey.ready, badKey.ready]);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];

try {
  // ── Security: the key never reaches the browser bundle ─────────────────────
  const bundle = fs
    .readdirSync(path.join(root, 'dist', 'assets'))
    .map((f) => fs.readFileSync(path.join(root, 'dist', 'assets', f), 'utf8'))
    .join('\n');
  // Real Anthropic keys start with "sk-ant-"; none may ever be bundled for the browser.
  ok(!bundle.includes('sk-ant-') && !bundle.includes('process.env.ANTHROPIC'), 'Frontend bundle contains no API key');

  // ── Backend API ────────────────────────────────────────────────────────────
  const status = await (await fetch(`${app.base}/api/ai/status`)).json();
  ok(status.status === 'connected' && status.provider === 'anthropic' && status.model, `Status endpoint: connected (${status.model})`);
  ok(!JSON.stringify(status).includes(TEST_KEY), 'Status endpoint never returns the key');
  const nk = await (await fetch(`${noKey.base}/api/ai/status`)).json();
  ok(nk.status === 'not_configured' && nk.configured === false, 'Status endpoint: not_configured without key');
  const bk = await (await fetch(`${badKey.base}/api/ai/status?refresh=1`)).json();
  ok(bk.status === 'invalid_key', 'Status endpoint: invalid_key for a rejected key');
  const nkGen = await fetch(`${noKey.base}/api/generate/brief`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: { client: 'A', projectName: 'B' } }) });
  ok(nkGen.status === 503 && (await nkGen.json()).error.code === 'not_configured', 'Generate without key → 503 not_configured');
  const bkGen = await fetch(`${badKey.base}/api/generate/campaign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: { brand: 'A', product: 'B' } }) });
  ok((await bkGen.json()).error?.code === 'invalid_key', 'Generate with rejected key → invalid_key');
  const bad = await fetch(`${app.base}/api/generate/prompts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: { idea: 'x', types: [] } }) });
  ok(bad.status === 400, 'Invalid input → 400');
  ok(fake.requests.length === 0, 'Invalid or unconfigured requests never reach Anthropic');

  // ── UI with Claude connected ───────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: app.base });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const B = app.base;

  await page.goto(B);
  await page.waitForSelector('text=Quick tools');
  ok(/Mohamed/.test(await page.locator('h1').first().textContent()), 'Dashboard renders');
  await page.waitForSelector('header >> text=Claude · Connected');
  ok(true, 'Header shows Claude · Connected');

  for (const [label, url, heading] of [
    ['Projects', '/projects', 'Projects'],
    ['Clients', '/clients', 'Clients'],
    ['Creative Brief', '/brief', 'Creative Brief Generator'],
    ['Campaign Generator', '/campaign', 'Campaign Generator'],
    ['Prompt Generator', '/prompts', 'AI Prompt Generator'],
    ['Settings', '/settings', 'Settings'],
  ]) {
    await page.locator('aside nav').getByRole('link', { name: label }).click();
    await page.waitForURL(B + url);
    ok(await page.getByRole('heading', { level: 1, name: heading }).isVisible(), `Nav → ${label}`);
  }

  // Settings AI engine section
  const ai = page.locator('#ai-engine');
  ok(await ai.getByText('Anthropic', { exact: true }).isVisible(), 'Settings: provider Anthropic');
  ok(await ai.getByText('claude-opus-5-5').isVisible(), 'Settings: model from server');
  ok(await ai.getByText('Connected', { exact: true }).isVisible(), 'Settings: Connected');
  ok(!(await page.content()).includes(TEST_KEY), 'Settings page never shows the key');

  // Projects CRUD (unchanged behaviour)
  await page.goto(`${B}/projects`);
  const before = await page.locator('article[id^="project-"]').count();
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Project name').fill('E2E Tower');
  await dlg.getByLabel('Category', { exact: true }).selectOption('Real Estate');
  await dlg.getByRole('button', { name: 'Create project' }).click();
  await page.waitForSelector('text=E2E Tower');
  ok((await page.locator('article[id^="project-"]').count()) === before + 1, 'Project created');
  await page.reload();
  ok(await page.getByRole('heading', { name: 'E2E Tower' }).isVisible(), 'Project persisted after reload');
  await page.getByRole('button', { name: 'Delete E2E Tower' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await page.waitForTimeout(300);
  ok((await page.getByRole('heading', { name: 'E2E Tower' }).count()) === 0, 'Project deleted');

  // Brief via Claude
  await page.goto(`${B}/brief`);
  await page.getByRole('button', { name: 'Use example' }).click();
  await page.getByRole('button', { name: 'Generate brief' }).click();
  ok(await page.getByText('Claude is writing your brief').isVisible(), 'Brief: Claude loading state');
  await page.waitForSelector('text=Copy brief', { timeout: 15000 });
  for (const s of ['Project Overview', 'Objective', 'Target Audience', 'Core Message', 'Creative Concept', 'Creative Direction', 'Tone of Voice', 'Visual Direction', 'Deliverables', 'Success Criteria']) {
    ok((await page.locator('article h3', { hasText: new RegExp(`^\\d+${s}$`) }).count()) === 1, `Brief section: ${s}`);
  }
  ok(await page.getByText('[FAKE-CLAUDE] Project Overview body text.').isVisible(), 'Brief content comes from the backend');
  const briefReq = fake.requests.at(-1).body;
  ok(briefReq.messages[0].content.includes('Output language: English'), 'Brief request carries the language choice');
  await page.getByRole('button', { name: 'Copy brief' }).click();
  ok((await page.evaluate(() => navigator.clipboard.readText())).includes('CREATIVE CONCEPT'), 'Brief copy works');

  // Arabic brief renders right-to-left
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByLabel('Client').fill('شركة أزور');
  await page.getByLabel('Project name').fill('ريزيدنس النخيل');
  await page.getByLabel('Objective').fill('توليد عملاء محتملين');
  await page.getByLabel('Output language').selectOption('ar');
  await page.getByRole('button', { name: 'Generate brief' }).click();
  await page.waitForSelector('text=الجمهور المستهدف', { timeout: 15000 });
  const dir = await page.locator('article section div[dir="auto"]').first().evaluate((el) => getComputedStyle(el).direction);
  ok(dir === 'rtl', `Arabic brief renders right-to-left (${dir})`);

  // Campaign via Claude
  await page.goto(`${B}/campaign`);
  await page.getByRole('button', { name: 'Use example' }).click();
  await page.getByRole('button', { name: 'Generate campaign' }).click();
  await page.waitForSelector('text=Copy campaign', { timeout: 15000 });
  ok(await page.getByText('“Summer, Unhurried”').isVisible(), 'Campaign big idea from backend');
  ok((await page.locator('article ol li span.text-lg').count()) === 5, 'Campaign: exactly 5 taglines (extra trimmed)');
  ok((await page.getByText(/^Social idea \d$/).count()) === 5, 'Campaign: 5 social ideas');
  ok((await page.getByText(/^Film \d$/).count()) === 3, 'Campaign: 3 video concepts');
  for (const s of ['Campaign concept', 'Key visual direction', 'Art direction', 'Call to action', 'Suggested content pillars']) {
    ok((await page.locator('article h3', { hasText: s }).count()) >= 1, `Campaign section: ${s}`);
  }

  // Prompts via Claude
  await page.goto(`${B}/prompts`);
  await page.getByLabel('Creative idea or brief').fill('A sunset villa terrace on the North Coast with an infinity pool');
  await page.getByRole('button', { name: 'Clear all' }).click();
  for (const t of ['Image', 'Video', 'Product', 'Real Estate', 'Social']) await page.locator('fieldset button', { hasText: new RegExp(`^${t}$`) }).click();
  await page.getByRole('button', { name: /Generate 5 prompts/ }).click();
  await page.waitForSelector('button:has-text("Copy prompt")', { timeout: 15000 });
  const tabs = await page.locator('div.animate-fade-up > div button.rounded-full').allTextContents();
  ok(tabs.join(',') === 'Image,Video,Product,Real Estate,Social', `Prompts: only requested types, in order (${tabs.join(',')})`);
  for (const f of ['Subject', 'Environment', 'Composition', 'Camera', 'Lighting', 'Materials', 'Color Direction', 'Mood', 'Style', 'Aspect Ratio', 'Negative Prompt']) {
    ok((await page.locator('dt', { hasText: new RegExp(`^${f}$`) }).count()) === 1, `Prompt field: ${f}`);
  }
  ok(await page.getByText('[FAKE-CLAUDE] image compiled prompt').isVisible(), 'Prompt content comes from the backend');

  // Local Creative Engine (offline demo) still works
  await page.goto(`${B}/settings`);
  await page.getByRole('button', { name: /Local Creative Engine/ }).click();
  await page.goto(`${B}/campaign`);
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Use example' }).click();
  const reqsBefore = fake.requests.length;
  await page.getByRole('button', { name: 'Generate campaign' }).click();
  await page.waitForSelector('text=Copy campaign', { timeout: 15000 });
  ok(fake.requests.length === reqsBefore && !(await page.getByText('“Summer, Unhurried”').isVisible()), 'Local Creative Engine still generates without the backend');
  await page.goto(`${B}/settings`);
  await page.getByRole('button', { name: /Claude \(Anthropic\)/ }).click();

  // Global search + 404 (unchanged behaviour)
  await page.goto(B);
  await page.getByLabel('Global search').fill('marina');
  await page.waitForSelector('#global-search-results [role=option]');
  ok(true, 'Global search shows results');
  await page.goto(`${B}/nope`);
  ok(await page.getByText('404').isVisible(), '404 page');

  // ── UI without a key: clear not-configured state ──────────────────────────
  const np = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  np.on('pageerror', (e) => errors.push(`pageerror(no key): ${e.message}`));
  await np.goto(`${noKey.base}/brief`);
  await np.waitForSelector('header >> text=Claude · Not configured');
  ok(true, 'Header shows Claude · Not configured');
  await np.getByRole('button', { name: 'Use example' }).click();
  await np.getByRole('button', { name: 'Generate brief' }).click();
  await np.waitForSelector('text=Claude isn’t connected yet', { timeout: 10000 });
  ok(await np.getByText('ANTHROPIC_API_KEY is not set on the server').isVisible(), 'Missing-key message shown');
  ok(await np.getByRole('button', { name: 'Try again' }).isVisible(), 'Retry button shown');
  await np.getByRole('button', { name: 'Try again' }).click();
  await np.waitForSelector('text=Claude isn’t connected yet');
  ok(true, 'Retry re-runs and keeps the clear message');
  await np.getByRole('link', { name: 'Open AI settings' }).click();
  await np.waitForURL(/\/settings#ai-engine$/);
  ok(await np.locator('#ai-engine').getByText('Not configured', { exact: true }).isVisible(), 'Settings shows Not configured');
  await np.waitForTimeout(800);
  ok(await np.locator('#ai-engine').evaluate((el) => el.getBoundingClientRect().top < window.innerHeight / 2), 'Open AI settings scrolls to the AI engine section');
  await np.screenshot({ path: path.join(root, 'tests', 'output', 'not-configured-settings.png') }).catch(() => {});

  // ── Mobile layout ──────────────────────────────────────────────────────────
  const m = await (await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', (e) => errors.push(`pageerror(mobile): ${e.message}`));
  for (const url of ['/', '/projects', '/clients', '/brief', '/campaign', '/prompts', '/settings']) {
    await m.goto(B + url);
    await m.waitForTimeout(900);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - 375);
    ok(overflow <= 0, `Mobile ${url} no horizontal overflow (${overflow}px)`);
  }
} catch (err) {
  failures++;
  console.error('FAIL (exception)', err);
} finally {
  await browser.close();
  for (const s of [app, noKey, badKey]) s.child.kill();
  await fake.close();
}

console.log(`\nPage errors: ${errors.length ? errors.join('\n') : 'none'}`);
console.log(failures || errors.length ? `${failures} FAILURE(S)` : 'ALL PASSED');
process.exit(failures || errors.length ? 1 : 0);

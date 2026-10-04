// Design Studio end-to-end test. Run `npm run test:e2e` (builds first).
// Uses the production server with no API key: the studio is fully local.
//
//   CHROMIUM_PATH=/path/to/chrome  optional, to use an existing Chromium binary
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8794;
const B = `http://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first (npm run test:e2e does this).');
  process.exit(1);
}

const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts', '--production'], {
  cwd: root,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(PORT), ANTHROPIC_API_KEY: '' },
  stdio: 'ignore',
});
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`${B}/api/health`)).ok) break;
  } catch {
    /* starting */
  }
  await new Promise((r) => setTimeout(r, 250));
}

// 2×2 PNG used as an "uploaded" photo.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

function pngSize(buf) {
  const sig = buf.subarray(0, 8).toString('hex');
  return { isPng: sig === '89504e470d0a1a0a', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];

async function download(page, trigger) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), trigger()]);
  const file = await dl.path();
  return { name: dl.suggestedFilename(), data: fs.readFileSync(file) };
}

const layerCount = (page) => page.locator('[data-testid=layers] li button').count();
const xValue = async (page) => Number(await page.getByRole('textbox', { name: 'X', exact: true }).inputValue());
const widthValue = async (page) => Number(await page.getByRole('textbox', { name: 'Width', exact: true }).inputValue());

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  // ── Home & navigation ─────────────────────────────────────────────────────
  await page.goto(B);
  await page.locator('aside nav').getByRole('link', { name: 'Design Studio' }).click();
  await page.waitForURL(`${B}/studio`);
  await page.getByRole('heading', { level: 1, name: 'Design Studio' }).waitFor(); // lazy-loaded route
  await page.locator('[data-testid=template-card]').first().waitFor();
  ok(await page.getByRole('heading', { level: 1, name: 'Design Studio' }).isVisible(), 'Sidebar → Design Studio');
  ok(await page.getByText('No designs yet').isVisible(), 'Empty state when no designs exist');
  ok((await page.locator('[data-testid=template-card]').count()) >= 8, 'Template library shows 8+ templates');
  await page.getByRole('button', { name: 'Add Split Image to favourites' }).first().click();
  ok(await page.getByRole('heading', { name: 'Favorite templates' }).isVisible() && (await page.locator('section', { hasText: 'Favorite templates' }).locator('[data-testid=template-card]').count()) === 1, 'Favourite template appears under Favorite templates');

  // ── New design + brand ───────────────────────────────────────────────────
  await page.getByRole('button', { name: 'New Design' }).click();
  await page.waitForURL(`${B}/studio/new`);
  await page.getByRole('button', { name: 'Generate Concepts' }).click();
  ok(await page.getByText('Give the design a name.').isVisible(), 'Design name is required');
  await page.getByLabel('Design name').fill('Marina Crest Launch');
  await page.getByLabel('Client').selectOption({ label: 'Harvest Kitchen' });
  ok(await page.getByTestId('brand-fields').isVisible(), 'Client without brand → manual brand fields');
  await page.getByLabel('Client').selectOption({ label: 'Azure Shores Developments' });
  ok(await page.getByTestId('brand-summary').isVisible() && (await page.getByTestId('brand-summary').getByText('#0F2A3A').isVisible()), 'Client brand kit shows logo, colours, fonts');
  ok(await page.getByTestId('brand-summary').getByText('Cormorant Garamond').isVisible() && (await page.getByTestId('brand-summary').getByText('Premium, warm, confident').isVisible()), 'Brand kit shows fonts and tone of voice');
  await page.getByLabel('Campaign').fill('Summer launch');
  await page.getByRole('radio', { name: 'Facebook' }).click();
  ok(await page.getByRole('radio', { name: /Landscape/ }).getAttribute('aria-checked') === 'true', 'Platform switches format presets (Facebook Landscape)');
  await page.getByRole('radio', { name: /Custom size/ }).click();
  await page.getByLabel('Custom width (px)').fill('50');
  await page.getByRole('button', { name: 'Generate Concepts' }).click();
  ok(await page.getByText(/must be between 100 and 4000/).isVisible(), 'Custom size is validated');
  await page.getByRole('radio', { name: 'Instagram' }).click();
  await page.getByRole('radio', { name: /Portrait/ }).click();
  await page.getByLabel('Brief').fill('Launch of a waterfront residential tower in New Cairo for families and investors');
  await page.getByLabel('Headline', { exact: true }).fill('Live above the ordinary');
  await page.getByLabel('Subheadline').fill('Waterfront residences with private terraces.');
  await page.getByLabel('CTA', { exact: true }).fill('Register your interest');
  await page.getByLabel('Visual direction').fill('Golden-hour façade');

  // ── Layout concepts ──────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Generate Concepts' }).click();
  await page.waitForSelector('[data-testid=concept-card]');
  const concepts = page.locator('[data-testid=concept-card]');
  ok((await concepts.count()) === 3, 'Generate Concepts → 3 layout concepts');
  const titles = await concepts.locator('h3').allTextContents();
  ok(new Set(titles).size === 3, `Concepts use 3 different layouts (${titles.join(', ')})`);
  ok((await page.getByText('LAYOUT CONCEPT 01').count()) === 1 && (await page.getByText('No AI is used').isVisible()), 'Concepts are labelled “Layout Concepts”, not AI');
  await page.getByRole('button', { name: 'Use concept 01' }).click();
  await page.waitForSelector('[data-testid=design-editor]');
  const designUrl = page.url();
  ok(/\/studio\/ds_/.test(designUrl), 'Creating a design opens the editor');
  ok((await page.getByLabel('Design name').inputValue()) === 'Marina Crest Launch', 'Editor shows the design name');
  ok(await page.getByText(/Instagram Portrait · 1080 × 1350/).first().isVisible(), 'Editor shows the format');

  // ── Template selection ───────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: 'Apply template Full Bleed' }).click();
  await page.waitForTimeout(300);
  ok(await page.locator('[data-testid=layers]').getByText('Gradient overlay').isVisible(), 'Selecting a template re-lays out the design (Full Bleed)');
  await page.getByRole('button', { name: 'Undo' }).click();
  ok((await page.locator('[data-testid=layers]').getByText('Gradient overlay').count()) === 0, 'Undo reverts the template');

  // Concepts inside the editor too.
  await page.getByRole('button', { name: 'Generate Concepts' }).click();
  await page.waitForSelector('[data-testid=concepts] button');
  ok((await page.locator('[data-testid=concepts] button').count()) === 3, 'Editor: Generate Concepts → 3 concepts');

  // ── Add & edit text ──────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  const before = await layerCount(page);
  await page.getByRole('button', { name: 'Heading', exact: true }).click();
  ok((await layerCount(page)) === before + 1, 'Add text: Heading element added');
  const content = page.getByLabel('Text content');
  ok((await content.inputValue()) === 'Add a headline', 'New text is selected with its content in Properties');
  await content.fill('Edited by test');
  await content.blur();
  ok((await page.locator('[data-stage] svg text', { hasText: 'Edited by test' }).count()) === 1, 'Edit text: canvas updates from the Properties panel');

  // In-place editing via double-click.
  const selectedBox = page.locator('[data-element-type=text]').last();
  await selectedBox.dblclick();
  const inline = page.getByTestId('inline-text-editor');
  ok(await inline.isVisible(), 'Double-click opens inline text editing');
  await inline.fill('Edited inline');
  await page.keyboard.press('Escape');
  ok((await page.locator('[data-stage] svg text', { hasText: 'Edited inline' }).count()) === 1, 'Inline edit updates the canvas');

  // Colour, size, opacity on the selected text.
  await page.locator('[data-testid=layers]').getByText('Edited inline').click();
  await page.getByRole('textbox', { name: 'Font size' }).fill('96');
  await page.getByRole('textbox', { name: 'Font size' }).press('Enter');
  ok((await page.locator('[data-stage] svg text[font-size="96"]').count()) === 1, 'Change font size');
  await page.getByRole('textbox', { name: 'Text colour', exact: true }).fill('#FF3366');
  await page.getByRole('textbox', { name: 'Text colour', exact: true }).press('Enter');
  ok((await page.locator('[data-stage] svg text[fill="#FF3366"]').count()) === 1, 'Change text colour');
  await page.getByLabel('Opacity').fill('0.5');
  ok((await page.locator('[data-stage] svg g[opacity="0.5"] text').count()) === 1, 'Change opacity');

  // ── Move ─────────────────────────────────────────────────────────────────
  const x0 = await xValue(page);
  const sel = page.getByTestId('selection');
  const bb = await sel.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 + 140, { steps: 8 });
  await page.mouse.up();
  const x1 = await xValue(page);
  ok(x1 > x0 + 50, `Move element by dragging (X ${x0} → ${x1})`);

  // ── Resize ───────────────────────────────────────────────────────────────
  const w0 = await widthValue(page);
  const handle = page.locator('[data-handle=e]');
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 80, hb.y + hb.height / 2, { steps: 6 });
  await page.mouse.up();
  const w1 = await widthValue(page);
  ok(w1 > w0 + 50, `Resize element with a handle (W ${w0} → ${w1})`);

  // ── Layers, duplicate, delete, undo, redo ────────────────────────────────
  const z0 = Number(await page.getByRole('textbox', { name: 'Layer (z-index)' }).inputValue());
  await page.getByRole('button', { name: 'Send backward' }).click();
  const z1 = Number(await page.getByRole('textbox', { name: 'Layer (z-index)' }).inputValue());
  ok(z1 === z0 - 1, `Change layer order (z ${z0} → ${z1})`);
  const n0 = await layerCount(page);
  await page.getByRole('button', { name: 'Duplicate element' }).click();
  ok((await layerCount(page)) === n0 + 1, 'Duplicate element');
  await page.locator('[data-testid=canvas-viewport]').click({ position: { x: 5, y: 5 } });
  await page.locator('[data-testid=layers]').getByText('Edited inline').first().click();
  await page.keyboard.press('Delete');
  ok((await layerCount(page)) === n0, 'Delete element (Delete key)');
  await page.getByRole('button', { name: 'Undo' }).click();
  ok((await layerCount(page)) === n0 + 1, 'Undo restores the deleted element');
  await page.getByRole('button', { name: 'Redo' }).click();
  ok((await layerCount(page)) === n0, 'Redo deletes it again');
  await page.keyboard.press('Control+z');
  ok((await layerCount(page)) === n0 + 1, 'Ctrl+Z undo shortcut');

  // ── Shapes ───────────────────────────────────────────────────────────────
  for (const shape of ['Rectangle', 'Circle', 'Line', 'Gradient overlay']) {
    const n = await layerCount(page);
    await page.getByRole('button', { name: `Add ${shape}` }).click();
    ok((await layerCount(page)) === n + 1, `Add ${shape}`);
  }

  // ── Uploads → image element ──────────────────────────────────────────────
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.getByTestId('upload-input').setInputFiles({ name: 'facade.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('[data-testid=uploads] img');
  await page.locator('[data-testid=canvas-viewport]').click({ position: { x: 5, y: 5 } });
  const nImg = await layerCount(page);
  await page.getByRole('button', { name: 'Place facade.png' }).click();
  ok((await layerCount(page)) === nImg + 1 && (await page.locator('[data-stage] svg image').count()) >= 1, 'Upload an image and place it on the canvas');
  ok(await page.getByRole('radio', { name: 'Contain' }).isVisible(), 'Image supports cover / contain');

  // ── Save & reload persistence ────────────────────────────────────────────
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForSelector('text=Design saved');
  ok((await page.getByTestId('save-status').textContent()) === 'Saved', 'Save');
  const layersBeforeReload = await layerCount(page);
  await page.reload();
  await page.waitForSelector('[data-testid=design-editor]');
  await page.waitForTimeout(500);
  ok((await layerCount(page)) === layersBeforeReload, `Reload persistence: ${layersBeforeReload} elements survive refresh`);
  ok((await page.locator('[data-stage] svg text', { hasText: 'Edited inline' }).count()) >= 1, 'Reload persistence: edited text survives refresh');
  ok((await page.locator('[data-stage] svg image').count()) >= 1, 'Reload persistence: uploaded image survives refresh (IndexedDB)');

  // ── Zoom ─────────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Zoom in' }).click();
  ok((await page.getByLabel('Zoom', { exact: true }).inputValue()) !== 'fit', 'Zoom control');
  await page.getByLabel('Zoom', { exact: true }).selectOption('fit');

  // ── Exports ──────────────────────────────────────────────────────────────
  const openExport = () => page.getByRole('button', { name: 'Export' }).click();
  const json = await download(page, async () => {
    await openExport();
    await page.getByRole('menuitem', { name: /Export JSON/ }).click();
  });
  const parsed = JSON.parse(json.data.toString('utf8'));
  ok(json.name.endsWith('.design.json') && parsed.format === 'mcos.design' && parsed.version === 1, `Export JSON (${json.name})`);
  const d = parsed.design;
  ok(['id', 'name', 'clientId', 'campaign', 'platform', 'width', 'height', 'elements', 'brand', 'createdAt', 'updatedAt', 'templateId'].every((k) => k in d), 'JSON has the complete design structure');
  ok(d.elements.length === layersBeforeReload && d.elements.every((e) => typeof e.zIndex === 'number' && typeof e.rotation === 'number'), 'JSON keeps every element separate and editable');
  ok(d.elements.some((e) => e.type === 'image' && String(e.src).startsWith('data:image/')), 'JSON embeds uploaded images');

  const svg = await download(page, async () => {
    await openExport();
    await page.getByRole('menuitem', { name: /Export SVG/ }).click();
  });
  const svgText = svg.data.toString('utf8');
  ok(svg.name.endsWith('.svg') && svgText.includes('<svg') && svgText.includes('width="1080"') && svgText.includes('height="1350"'), `Export SVG (${svg.name}) at 1080×1350`);
  ok(svgText.includes('<text') && svgText.includes('<tspan') && svgText.includes('Edited inline'), 'SVG keeps live, editable text');
  ok(svgText.includes('<rect') && svgText.includes('<ellipse') && svgText.includes('linearGradient'), 'SVG keeps vector shapes and gradients');

  const png = await download(page, async () => {
    await openExport();
    await page.getByRole('menuitem', { name: /Export PNG/ }).click();
  });
  const size = pngSize(png.data);
  ok(png.name.endsWith('.png') && size.isPng && size.width === 1080 && size.height === 1350, `Export PNG at exact size (${size.width}×${size.height}, ${Math.round(png.data.length / 1024)} KB)`);
  ok(png.data.length > 5000, 'PNG has real image content');

  // ── Preview mode ─────────────────────────────────────────────────────────
  await page.getByRole('radio', { name: 'Preview' }).click();
  ok(!(await page.getByTestId('properties').isVisible()) && (await page.getByTestId('preview-caption').isVisible()), 'Preview hides editor panels');
  ok((await page.locator('[data-testid^=el-]').count()) === 0 && (await page.getByTestId('selection').count()) === 0, 'Preview hides selection and handles');
  await page.getByRole('radio', { name: 'Editor' }).click();
  ok(await page.getByTestId('properties').isVisible(), 'Switch back to Editor');

  // ── Duplicate design ─────────────────────────────────────────────────────
  await openExport();
  await page.getByRole('menuitem', { name: 'Duplicate Design' }).click();
  await page.waitForURL((u) => u.toString() !== designUrl && /\/studio\/ds_/.test(u.toString()));
  ok((await page.getByLabel('Design name').inputValue()) === 'Marina Crest Launch (copy)', 'Duplicate Design opens the copy');
  await page.goto(`${B}/studio`);
  await page.waitForSelector('[data-testid=design-card]');
  const cards = page.locator('[data-testid=design-card]');
  ok((await cards.count()) === 2, 'Home lists both designs');
  const card = cards.first();
  ok((await card.getByText('Azure Shores Developments').isVisible()) && (await card.getByText(/Instagram Portrait · 1080 × 1350/).isVisible()) && (await card.locator('dd', { hasText: /^Edited / }).isVisible()) && (await card.getByRole('link', { name: 'Open', exact: true }).isVisible()) && (await card.locator('svg').count()) > 0, 'Design card: thumbnail, name, client, format, last edited, Open');

  // Global search finds designs.
  await page.getByLabel('Global search').fill('Marina Crest');
  await page.waitForSelector('#global-search-results [role=option]');
  ok((await page.locator('#global-search-results').getByText('Design · 1080 × 1350').count()) >= 1, 'Global search finds designs');

  // ── Mobile ───────────────────────────────────────────────────────────────
  const m = await (await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })).newPage();
  m.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
  // Same browser storage is not shared across contexts, so seed this one through the UI.
  await m.goto(`${B}/studio/new`);
  await m.waitForTimeout(600);
  let overflow = await m.evaluate(() => document.documentElement.scrollWidth - 375);
  ok(overflow <= 0, `Mobile: New design has no horizontal overflow (${overflow}px)`);
  await m.getByLabel('Design name').fill('Phone design');
  await m.getByRole('button', { name: 'Choose template' }).click();
  await m.getByRole('button', { name: 'Start with Property Showcase' }).click();
  await m.waitForSelector('[data-testid=mobile-editor]');
  ok(await m.getByTestId('mobile-preview').isVisible(), 'Mobile: simplified design preview');
  overflow = await m.evaluate(() => document.documentElement.scrollWidth - 375);
  ok(overflow <= 0, `Mobile: editor has no horizontal overflow (${overflow}px)`);
  const firstText = m.getByLabel('Edit Headline');
  await firstText.fill('Mobile headline edit');
  ok((await m.locator('[data-testid=mobile-preview] svg text', { hasText: 'Mobile headline edit' }).count()) === 1, 'Mobile: basic text editing updates the preview');
  await m.getByRole('tab', { name: 'Layout' }).click();
  await m.getByRole('button', { name: 'Apply template Minimal Premium' }).click();
  ok((await m.locator('[data-testid=mobile-preview] svg text', { hasText: 'Mobile headline edit' }).count()) === 1, 'Mobile: switch layout keeps the copy');
  ok(await m.getByRole('link', { name: 'Back to Design Studio' }).isVisible(), 'Mobile: navigation stays usable');
  await m.goto(`${B}/studio`);
  await m.waitForTimeout(800);
  overflow = await m.evaluate(() => document.documentElement.scrollWidth - 375);
  ok(overflow <= 0, `Mobile: Studio home has no horizontal overflow (${overflow}px)`);
} catch (err) {
  failures++;
  console.error('FAIL (exception)', err);
} finally {
  await browser.close();
  server.kill();
}

console.log(`\nPage errors: ${errors.length ? errors.join('\n') : 'none'}`);
console.log(failures || errors.length ? `${failures} FAILURE(S)` : 'ALL PASSED');
process.exit(failures || errors.length ? 1 : 0);

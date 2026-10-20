import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const screenshots = fileURLToPath(new URL('../../.artifacts/review/', import.meta.url));
const graph = async (page) => page.locator('.sidebar-project[data-id="portfolio"]').click();
const port = (page, id, direction) => page.locator(`.graph-port[data-id="${id}"][data-port="${direction}"]`);
const edge = (page, from, to) => page.locator(`.graph-edge[data-from="${from}"][data-to="${to}"]`);
const edgeSnapshot = (page) => page.locator('.graph-edge').evaluateAll((nodes) => nodes.map((node) => ({
  from: node.dataset.from, to: node.dataset.to, optional: node.classList.contains('optional-edge'),
})).sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`)));
const imageBuffer = async (page) => Buffer.from(await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 100;
  const context = canvas.getContext('2d');
  context.fillStyle = '#dae5c6';
  context.fillRect(0, 0, 160, 100);
  context.fillStyle = '#628354';
  context.beginPath();
  context.arc(45, 98, 70, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#e9d5a8';
  context.beginPath();
  context.arc(115, 27, 13, 0, Math.PI * 2);
  context.fill();
  return canvas.toDataURL('image/png').split(',')[1];
}), 'base64');

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('home is renamed and undated tasks precede both timeline layouts', async ({ page }) => {
  await expect(page.locator('.main-nav [data-view="upcoming"]')).toContainText('Dein Arbeitsbereich');
  await expect(page.locator('body')).not.toContainText('Demnächst');
  for (const mode of ['columns', 'list']) {
    await page.locator(`[data-action="layout"][data-layout="${mode}"]`).click();
    const undated = await page.locator('.unscheduled').boundingBox();
    const timeline = await page.locator('.timeline-scroll').boundingBox();
    expect(undated.y + undated.height).toBeLessThan(timeline.y);
  }
  await expect(page.locator('.progress-bar, .progress-ring')).toHaveCount(0);
});

test('list groups one compact single-line row per task under each day', async ({ page }) => {
  await page.locator('[data-layout="list"][data-action="layout"]').click();
  const today = page.locator('.agenda-day.is-today');
  await expect(today.locator('.task-row')).toHaveCount(4);
  await expect(today.locator('.task-card')).toHaveCount(0);
  const sizes = await today.locator('.task-row').evaluateAll((rows) => rows.map((row) => {
    const title = row.querySelector('.task-title').getBoundingClientRect();
    const badge = row.querySelector('.row-priority').getBoundingClientRect();
    return { height: row.getBoundingClientRect().height, alignment: Math.abs(title.y + title.height / 2 - badge.y - badge.height / 2) };
  }));
  for (const size of sizes) {
    expect(size.height).toBeLessThanOrEqual(60);
    expect(size.alignment).toBeLessThan(4);
  }
});

test('horizontal scrolling extends both ends without duplicate days or a visible prepend jump', async ({ page }) => {
  const timeline = page.locator('.board-scroll');
  const oldEnd = await timeline.getAttribute('data-end');
  await timeline.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await expect(timeline).not.toHaveAttribute('data-end', oldEnd);
  const oldStart = await timeline.getAttribute('data-start');
  await timeline.evaluate((element) => { element.scrollLeft = 0; });
  await expect(timeline).not.toHaveAttribute('data-start', oldStart);
  const offset = await page.locator(`.day-column[data-date="${oldStart}"]`).evaluate((element) => element.getBoundingClientRect().left - element.parentElement.getBoundingClientRect().left);
  expect(Math.abs(offset)).toBeLessThan(4);
  const dates = await page.locator('.day-column').evaluateAll((nodes) => nodes.map((node) => node.dataset.date));
  expect(new Set(dates).size).toBe(dates.length);
  expect(dates.length).toBeGreaterThan(42);
  await expect(page.locator('[data-action="week-shift"]')).toHaveCount(0);
});

test('vertical scrolling extends the list in both directions', async ({ page }) => {
  await page.locator('[data-layout="list"][data-action="layout"]').click();
  const timeline = page.locator('.agenda');
  const end = await timeline.getAttribute('data-end');
  await timeline.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(timeline).not.toHaveAttribute('data-end', end);
  const start = await timeline.getAttribute('data-start');
  await timeline.evaluate((element) => { element.scrollTop = 0; });
  await expect(timeline).not.toHaveAttribute('data-start', start);
  const offset = await page.locator(`.agenda-day[data-date="${start}"]`).evaluate((element) => element.getBoundingClientRect().top - element.parentElement.getBoundingClientRect().top);
  expect(Math.abs(offset)).toBeLessThan(4);
  await page.getByRole('button', { name: 'Zu heute', exact: true }).click();
  const today = await page.locator('.agenda-day.is-today').getAttribute('data-date');
  await expect(timeline).toHaveAttribute('data-anchor-date', today);
});

test('projects can be created with a local image and edited without progress indicators', async ({ page }) => {
  await page.getByRole('button', { name: 'Projekt in der Sidebar hinzufügen' }).click();
  await page.locator('#project-name').fill('Mein Garten');
  await page.locator('#project-description').fill('Ein eigener Platz im Grünen.');
  await page.locator('#project-image-file').setInputFiles({ name: 'garten.png', mimeType: 'image/png', buffer: await imageBuffer(page) });
  await expect(page.locator('#project-image-preview img')).toBeVisible();
  await expect(page.locator('#save-project')).toBeEnabled();
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}/08-projekt-anlegen.png` });
  await page.locator('#save-project').click();
  await expect(page.locator('.project-detail-heading h2')).toHaveText('Mein Garten');
  await expect(page.locator('.project-detail-heading img')).toBeVisible();
  await expect(page.locator('.graph-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Alle Projekte', exact: true }).click();
  await expect(page.locator('.project-card').filter({ hasText: 'Mein Garten' }).locator('img')).toBeVisible();
  await expect(page.locator('.progress-bar, .project-detail-progress, .mini-graph')).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/09-projekte.png`, fullPage: true });
  await page.getByRole('button', { name: 'Mein Garten bearbeiten' }).click();
  await page.locator('#project-name').fill('Unser Garten');
  await page.locator('#save-project').click();
  await expect(page.locator('.sidebar-project').filter({ hasText: 'Unser Garten' })).toBeVisible();
});

test('project overview provides its own create action and cancel discards a project draft', async ({ page }) => {
  await page.locator('.main-nav [data-view="projects"]').click();
  await page.getByRole('button', { name: 'Neues Projekt', exact: true }).click();
  await page.locator('#project-name').fill('Nicht anlegen');
  await page.locator('#project-dialog .close-project').last().click();
  await expect(page.locator('.project-card')).toHaveCount(3);
  await expect(page.locator('#app')).not.toContainText('Nicht anlegen');
  await page.locator('.project-create-card').click();
  await expect(page.locator('#project-dialog')).toBeVisible();
  await expect(page.locator('#project-name')).toHaveValue('');
});

test('invalid image types and corrupt images are rejected without external uploads', async ({ page }) => {
  await page.getByRole('button', { name: 'Projekt in der Sidebar hinzufügen' }).click();
  await page.locator('#project-image-file').setInputFiles({ name: 'drawing.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg></svg>') });
  await expect(page.locator('#image-error')).toContainText('PNG');
  await page.locator('#project-image-file').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#image-error')).toContainText('nicht geladen');
  await expect(page.locator('#save-project')).toBeEnabled();
  await expect(page.locator('#project-image-preview img')).toHaveCount(0);
});

test('project selection opens a graph placement popup and cancel restores the previous project', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  await page.locator('#task-title').fill('Neuer Schritt');
  await page.locator('#task-project').selectOption('portfolio');
  await expect(page.locator('#placement-dialog')).toBeVisible();
  await expect(page.locator('.placement-node')).toHaveCount(6);
  await page.locator('.placement-node[data-node="content"]').click();
  await page.locator('#placement-dialog .close-placement').last().click();
  await expect(page.locator('#task-project')).toHaveValue('');
  await expect(page.locator('#task-title')).toHaveValue('Neuer Schritt');
  await expect(page.locator('#task-placement')).not.toBeVisible();
});

test('placement supports three parents and three children, saved only with the task', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  await page.locator('#task-title').fill('Der neue Verbindungspunkt');
  await page.locator('#task-project').selectOption('portfolio');
  for (const id of ['vision', 'content', 'moodboard']) await page.locator(`.placement-node[data-node="${id}"]`).click();
  await page.locator('#placement-dialog [data-role="children"]').click();
  for (const id of ['homepage', 'animation', 'feedback']) await page.locator(`.placement-node[data-node="${id}"]`).click();
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}/10-einordnung.png` });
  await page.locator('#apply-placement').click();
  await expect(page.locator('#task-placement-summary')).toHaveText('3 Vorgänger · 3 Nachfolger');
  await page.locator('#save-task').click();
  await graph(page);
  const node = page.locator('.graph-node').filter({ hasText: 'Der neue Verbindungspunkt' });
  const id = await node.getAttribute('data-id');
  await expect(page.locator(`.graph-edge[data-to="${id}"]`)).toHaveCount(3);
  await expect(page.locator(`.graph-edge[data-from="${id}"]`)).toHaveCount(3);
});

test('a cancelled task does not leave behind draft graph links', async ({ page }) => {
  await graph(page);
  const before = await page.locator('.graph-edge').count();
  await page.getByRole('button', { name: 'To-do hinzufügen', exact: true }).click();
  await page.locator('.placement-node[data-node="content"]').click();
  await page.locator('#apply-placement').click();
  await page.locator('#task-title').fill('Verworfener Knoten');
  await page.locator('#task-dialog').getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(page.locator('.graph-edge')).toHaveCount(before);
  await expect(page.locator('.graph-node')).toHaveCount(6);
  await expect(page.locator('#app')).not.toContainText('Verworfener Knoten');
});

test('cycles in placement are rejected without changing the task', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  await page.locator('#task-project').selectOption('portfolio');
  await page.locator('.placement-node[data-node="feedback"]').click();
  await page.locator('#placement-dialog [data-role="children"]').click();
  await page.locator('.placement-node[data-node="vision"]').click();
  await page.locator('#apply-placement').click();
  await expect(page.locator('#placement-error')).toContainText('Kreis');
  await expect(page.locator('#placement-dialog')).toBeVisible();
});

test('dragging moves a node and its arrows without opening its task, and auto-layout is repeatable', async ({ page }) => {
  await graph(page);
  const node = page.locator('.graph-node[data-id="moodboard"]');
  const grip = node.locator('.graph-node-drag');
  const before = await node.evaluate((element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) }));
  const arrow = edge(page, 'moodboard', 'homepage').locator('.edge-line');
  const path = await arrow.getAttribute('d');
  const box = await grip.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 45, { steps: 6 });
  await expect(arrow).not.toHaveAttribute('d', path);
  await page.mouse.up();
  await expect(page.locator('#task-dialog')).not.toBeVisible();
  expect(await node.evaluate((element) => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) }))).toEqual({ x: before.x + 80, y: before.y + 45 });
  await page.locator('.main-nav [data-view="calendar"]').click();
  await page.locator('.main-nav [data-view="projects"]').click();
  expect(await node.evaluate((element) => parseFloat(element.style.left))).toBe(before.x + 80);
  await page.getByRole('button', { name: 'Autoformatieren' }).click();
  const firstLayout = await page.locator('.graph-node').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style')));
  await page.getByRole('button', { name: 'Autoformatieren' }).click();
  expect(await page.locator('.graph-node').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style')))).toEqual(firstLayout);
  await expect(page.locator('.graph-edge')).toHaveCount(6);
  await page.screenshot({ path: `${screenshots}/11-projektbaum-bearbeitbar.png`, fullPage: true });
});

test('hover plus creates a directly linked child without the global add button', async ({ page }) => {
  await graph(page);
  const parent = page.locator('.graph-node[data-id="moodboard"]');
  await parent.hover();
  await parent.locator('.node-add-child').click();
  await expect(page.locator('#placement-dialog')).not.toBeVisible();
  await expect(page.locator('#task-project')).toHaveValue('portfolio');
  await expect(page.locator('#task-placement-summary')).toHaveText('1 Vorgänger · 0 Nachfolger');
  await page.locator('#task-title').fill('Mein direkter Folgeschritt');
  await page.locator('#save-task').click();
  const id = await page.locator('.graph-node').filter({ hasText: 'Mein direkter Folgeschritt' }).getAttribute('data-id');
  await expect(edge(page, 'moodboard', id)).toHaveCount(1);
});

test('ports support multiple links, duplicate and cycle protection, and removal without opening a task', async ({ page }) => {
  await graph(page);
  for (const target of ['homepage', 'animation', 'feedback']) {
    await port(page, 'vision', 'out').click();
    await port(page, target, 'in').click();
    await expect(edge(page, 'vision', target)).toHaveCount(1);
  }
  await expect(page.locator('.graph-edge[data-from="vision"]')).toHaveCount(5);
  await expect(page.locator('#task-dialog')).not.toBeVisible();
  await port(page, 'vision', 'out').click();
  await port(page, 'feedback', 'in').click();
  await expect(page.locator('#connection-status')).toContainText('bereits');
  await port(page, 'feedback', 'out').click();
  await port(page, 'vision', 'in').click();
  await expect(page.locator('#connection-status')).toContainText('Kreis');
  await edge(page, 'vision', 'animation').locator('.edge-hit').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Verbindung entfernen' }).click();
  await expect(edge(page, 'vision', 'animation')).toHaveCount(0);
  await expect(page.locator('.graph-node')).toHaveCount(6);
});

test('a pointer-drawn connection follows the cursor and connects on release', async ({ page }) => {
  await graph(page);
  const source = await port(page, 'content', 'out').boundingBox();
  const target = await port(page, 'animation', 'in').boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await expect(page.locator('#connection-preview')).toBeVisible();
  await page.mouse.up();
  await expect(edge(page, 'content', 'animation')).toHaveCount(1);
  await expect(page.locator('#task-dialog')).not.toBeVisible();
});

test('mobile list stays row-based and project and placement dialogs remain usable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.locator('[data-layout="list"][data-action="layout"]').tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const rows = await page.locator('.agenda-day.is-today .task-row').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(rows.every((height) => height <= 60)).toBe(true);
  const widths = await page.locator('.agenda-day.is-today').evaluate((node) => ({
    day: node.getBoundingClientRect().width, container: node.parentElement.clientWidth,
  }));
  expect(widths.day).toBeGreaterThanOrEqual(widths.container - 8);
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}/12-mobile-liste.png`, fullPage: true });
  await page.locator('.main-nav [data-view="projects"]').tap();
  await page.getByRole('button', { name: 'Neues Projekt', exact: true }).tap();
  await page.locator('#project-name').fill('Unterwegs');
  await page.locator('#save-project').tap();
  await page.getByRole('button', { name: 'Erstes To-do anlegen' }).tap();
  await expect(page.locator('#placement-dialog')).toBeVisible();
  await page.locator('#apply-placement').tap();
  await page.locator('#task-title').fill('Mein erster mobiler Schritt');
  await page.locator('#save-task').tap();
  await expect(page.locator('.graph-node')).toHaveCount(1);
  await expect(page.locator('.node-add-child')).toBeVisible();
  await context.close();
});

test('a new project never inherits the previous projects selected connection', async ({ page }) => {
  await graph(page);
  await edge(page, 'vision', 'content').locator('.edge-hit').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#edge-selection')).toBeVisible();
  await page.getByRole('button', { name: 'Neues Projekt', exact: true }).click();
  await page.locator('#project-name').fill('Ein ganz anderer Weg');
  await page.locator('#save-project').click();
  await expect(page.locator('#edge-selection')).not.toBeVisible();
  await expect(page.locator('.graph-edge')).toHaveCount(0);
});

test('keyboard node movement and nested modal focus work without losing drafts', async ({ page }) => {
  await graph(page);
  const node = page.locator('.graph-node[data-id="moodboard"]');
  const before = await node.evaluate((element) => parseFloat(element.style.left));
  await node.locator('.graph-node-drag').focus();
  await page.keyboard.press('Shift+ArrowRight');
  expect(await node.evaluate((element) => parseFloat(element.style.left))).toBe(before + 40);
  await node.locator('.graph-node-open').focus();
  await page.keyboard.press('Enter');
  await page.locator('#edit-placement').click();
  await page.locator('#apply-placement').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement.closest('#placement-dialog')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#placement-dialog')).not.toBeVisible();
  await expect(page.locator('#task-dialog')).toBeVisible();
  await expect(page.locator('#edit-placement')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#task-dialog')).not.toBeVisible();
});

test('list is flat and full-width at every breakpoint, without day cards', async ({ page }) => {
  for (const width of [1920, 1440, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.locator('[data-action="layout"][data-layout="list"]').click();
    const layout = await page.locator('.agenda > section.is-today').evaluate((day) => {
      const style = getComputedStyle(day);
      return {
        width: day.getBoundingClientRect().width, available: day.parentElement.clientWidth,
        rowWidths: [...day.querySelectorAll('.task-row')].map((row) => row.getBoundingClientRect().width),
        border: style.borderLeftWidth, radius: style.borderRadius, shadow: style.boxShadow,
        margin: style.marginBottom, header: day.querySelector('header h3').textContent,
      };
    });
    expect(layout.width).toBeGreaterThanOrEqual(layout.available - 10);
    expect(layout.border).toBe('0px');
    expect(layout.radius).toBe('0px');
    expect(layout.shadow).toBe('none');
    expect(layout.margin).toBe('0px');
    expect(layout.header).not.toBe('');
    for (const width of layout.rowWidths) expect(width).toBeCloseTo(layout.width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

for (const action of ['auto-format', 'Escape']) {
  test(`${action} interrupts an active connection before release without adding arrows`, async ({ page }) => {
    await graph(page);
    const before = await edgeSnapshot(page);
    const source = await port(page, 'content', 'out').boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(source.x + 45, source.y + 35, { steps: 4 });
    if (action === 'auto-format') {
      await page.getByRole('button', { name: 'Autoformatieren' }).focus();
      await page.keyboard.press('Enter');
    } else {
      await page.keyboard.press('Escape');
    }
    const target = await port(page, 'animation', 'in').boundingBox();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 4 });
    await page.mouse.up();
    expect(await edgeSnapshot(page)).toEqual(before);
    await expect(page.locator('#connection-preview')).not.toBeVisible();
  });
}

test('auto-format preserves the exact edited connections and task contents', async ({ page }) => {
  await graph(page);
  await port(page, 'content', 'out').click();
  await port(page, 'animation', 'in').click();
  await edge(page, 'vision', 'content').locator('.edge-hit').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Verbindung entfernen' }).click();
  const before = await edgeSnapshot(page);
  const tasks = () => page.locator('.graph-node').evaluateAll((nodes) => nodes.map((node) => ({
    id: node.dataset.id, text: node.textContent, state: node.className,
  })));
  const beforeTasks = await tasks();
  await page.locator('.graph-node[data-id="moodboard"] .graph-node-drag').focus();
  await page.keyboard.press('Shift+ArrowDown');
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: 'Autoformatieren' }).click();
    expect(await edgeSnapshot(page)).toEqual(before);
    expect(await tasks()).toEqual(beforeTasks);
  }
  await expect(edge(page, 'vision', 'content')).toHaveCount(0);
  await expect(edge(page, 'content', 'animation')).toHaveCount(1);
});

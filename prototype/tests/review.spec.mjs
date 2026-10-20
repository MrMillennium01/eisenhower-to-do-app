import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const screenshots = fileURLToPath(new URL('../../.artifacts/review/', import.meta.url));
const openMoodboard = (page) => page.locator('[data-task-id="moodboard"] .task-open').click();
const dialog = (page) => page.locator('#task-dialog');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads an isolated prototype without runtime errors or external requests', async ({ page }) => {
  const errors = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url());
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dein nächster Schritt.' })).toBeVisible();
  await expect(page.locator('.day-column')).toHaveCount(42);
  await expect(page.locator('.board-scroll')).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('creates, reopens, and edits a task through the shared dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  await page.getByLabel('Was möchtest du angehen?', { exact: false }).fill('Mein nächster Testschritt');
  await page.locator('#task-description').fill('Eine Notiz für das Review.');
  await page.locator('#task-project').selectOption('portfolio');
  await page.locator('#apply-placement').click();
  await page.locator('#task-urgency').fill('22');
  await page.locator('#task-importance').fill('91');
  await page.getByRole('button', { name: 'To-do erstellen', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  const card = page.locator('.task-card').filter({ hasText: 'Mein nächster Testschritt' });
  await expect(card).toContainText('Einplanen');
  await card.locator('.task-open').click();
  await expect(page.locator('#task-title')).toHaveValue('Mein nächster Testschritt');
  await expect(page.locator('#task-description')).toHaveValue('Eine Notiz für das Review.');
  await expect(page.locator('#task-urgency')).toHaveValue('22');
  await expect(page.locator('#task-importance')).toHaveValue('91');
  await page.locator('#task-title').fill('Mein überarbeiteter Testschritt');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.locator('.task-card').filter({ hasText: 'Mein überarbeiteter Testschritt' })).toBeVisible();
});

test('matrix click and drag map correctly, with cancel leaving the original untouched', async ({ page }) => {
  await openMoodboard(page);
  const matrix = page.locator('#priority-matrix');
  const box = await matrix.boundingBox();
  await matrix.click({ position: { x: box.width * .8, y: box.height * .8 } });
  await expect(page.locator('#task-urgency')).toHaveValue('80');
  await expect(page.locator('#task-importance')).toHaveValue('20');
  await expect(page.locator('#priority-summary')).toContainText('Delegieren');
  const point = await page.locator('#priority-marker').boundingBox();
  await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 20, box.y - 20, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('#task-urgency')).toHaveValue('0');
  await expect(page.locator('#task-importance')).toHaveValue('100');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await openMoodboard(page);
  await expect(page.locator('#task-urgency')).toHaveValue('58');
  await expect(page.locator('#task-importance')).toHaveValue('85');
});

test('saved priorities are reflected in agenda, project graph, and calendar', async ({ page }) => {
  await openMoodboard(page);
  await page.locator('#task-urgency').fill('9');
  await page.locator('#task-importance').fill('93');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await page.getByRole('button', { name: 'Liste', exact: true }).click();
  await expect(page.locator('[data-task-id="moodboard"]')).toContainText('Einplanen');
  await page.locator('.sidebar-project[data-id="portfolio"]').click();
  await page.locator('.graph-node[data-id="moodboard"]').click();
  await expect(page.locator('#task-urgency')).toHaveValue('9');
  await expect(page.locator('#task-importance')).toHaveValue('93');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.locator('.main-nav [data-view="calendar"]').click();
  await page.locator('.calendar-task[data-id="moodboard"]').click();
  await expect(page.locator('#task-urgency')).toHaveValue('9');
  await expect(page.locator('#task-importance')).toHaveValue('93');
});

test('Escape and backdrop dismiss drafts and restore focus', async ({ page }) => {
  const trigger = page.locator('.task-card[data-task-id="moodboard"] .task-open');
  await trigger.click();
  await page.locator('#task-title').fill('Nicht speichern');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.locator('#task-title')).toHaveValue('Ein Moodboard gestalten');
  await page.locator('#task-urgency').fill('1');
  await page.mouse.click(5, 5);
  await expect(dialog(page)).not.toBeVisible();
  await trigger.click();
  await expect(page.locator('#task-urgency')).toHaveValue('58');
});

test('keyboard movement, focus containment, and boundary values work', async ({ page }) => {
  await page.keyboard.press('n');
  const marker = page.locator('#priority-marker');
  await page.locator('#task-urgency').fill('99');
  await page.locator('#task-importance').fill('99');
  await marker.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.locator('#task-urgency')).toHaveValue('100');
  await expect(page.locator('#task-importance')).toHaveValue('100');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#task-urgency')).toHaveValue('99');
  await expect(page.locator('#task-importance')).toHaveValue('99');
  await page.locator('#save-task').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement.closest('#task-dialog')))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#save-task')).toBeFocused();
});

test('blank titles and out-of-range numbers cannot be saved', async ({ page }) => {
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  await page.locator('#task-title').fill('   ');
  await page.getByRole('button', { name: 'To-do erstellen', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  expect(await page.locator('#task-title').evaluate((input) => input.validity.valid)).toBe(false);
  await page.locator('#task-title').fill('Ein gültiger Titel');
  await page.locator('#task-urgency').fill('101');
  await page.getByRole('button', { name: 'To-do erstellen', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  expect(await page.locator('#task-urgency').evaluate((input) => input.validity.rangeOverflow)).toBe(true);
});

test('user-entered markup is rendered as text, not executable HTML', async ({ page }) => {
  const title = '<img src=x onerror="window.reviewInjected=true">';
  await page.getByRole('button', { name: 'Neues To-do' }).click();
  await page.locator('#task-title').fill(title);
  await page.getByRole('button', { name: 'To-do erstellen', exact: true }).click();
  await expect(page.locator('.task-title').filter({ hasText: title })).toBeVisible();
  expect(await page.locator('#app img').count()).toBe(0);
  expect(await page.evaluate(() => window.reviewInjected)).toBeUndefined();
});

test('switching layouts and date basis does not mutate dates', async ({ page }) => {
  await openMoodboard(page);
  const planned = await page.locator('#task-planned').inputValue();
  const due = await page.locator('#task-due').inputValue();
  expect(planned).not.toEqual(due);
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.locator('#date-basis').selectOption('dueDate');
  await page.getByRole('button', { name: 'Liste', exact: true }).click();
  await openMoodboard(page);
  await expect(page.locator('#task-planned')).toHaveValue(planned);
  await expect(page.locator('#task-due')).toHaveValue(due);
});

test('adding from a deadline column sets that deadline, not an unrelated workday', async ({ page }) => {
  await page.locator('#date-basis').selectOption('dueDate');
  const addButton = page.locator('.day-column.is-today + .day-column .add-day');
  const expectedDate = await addButton.getAttribute('data-date');
  await addButton.click();
  await expect(page.locator('#task-due')).toHaveValue(expectedDate);
  await expect(page.locator('#task-planned')).toHaveValue('');
  await page.locator('#task-title').fill('Eine feste Frist');
  await page.getByRole('button', { name: 'To-do erstellen', exact: true }).click();
  await expect(page.locator(`.day-column[data-date="${expectedDate}"]`)).toContainText('Eine feste Frist');
});

test('calendar-to-agenda navigation retains date basis and project filter', async ({ page }) => {
  await page.locator('#project-filter').selectOption('portfolio');
  await page.locator('.main-nav [data-view="calendar"]').click();
  await expect(page.locator('#date-basis')).toHaveValue('dueDate');
  await page.locator('.calendar-date[aria-current="date"]').click();
  await expect(page.locator('.agenda')).toBeVisible();
  await expect(page.locator('#date-basis')).toHaveValue('dueDate');
  await expect(page.locator('#project-filter')).toHaveValue('portfolio');
  const today = await page.locator('.agenda-day.is-today').getAttribute('data-date');
  await expect(page.locator('.agenda')).toHaveAttribute('data-anchor-date', today);
});

test('demo changes reset on reload instead of persisting personal data', async ({ page }) => {
  await openMoodboard(page);
  await page.locator('#task-title').fill('Nur in dieser Sitzung');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await page.reload();
  await expect(page.locator('.task-card[data-task-id="moodboard"]')).toContainText('Ein Moodboard gestalten');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('review help makes the prototype limits discoverable', async ({ page }) => {
  await page.locator('.review-pill').click();
  await expect(page.locator('#review-dialog')).toBeVisible();
  await expect(page.locator('#review-dialog')).toContainText('Änderungen verschwinden beim Neuladen');
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.locator('#review-dialog')).not.toBeVisible();
});

test('server exposes only prototype assets', async ({ request }) => {
  expect((await request.get('/.git/config')).status()).toBe(404);
  expect((await request.get('/package.json')).status()).toBe(404);
  expect((await request.post('/')).status()).toBe(405);
  expect((await request.head('/')).status()).toBe(200);
});

test('desktop review screenshots', async ({ page }) => {
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}/01-tagesplanung.png`, fullPage: true });
  await openMoodboard(page);
  await page.screenshot({ path: `${screenshots}/02-prioritaetsdialog.png` });
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Liste', exact: true }).click();
  await page.screenshot({ path: `${screenshots}/03-tagesliste.png`, fullPage: true });
  await page.locator('.sidebar-project[data-id="portfolio"]').click();
  await page.screenshot({ path: `${screenshots}/04-projektbaum.png`, fullPage: true });
  await page.locator('.main-nav [data-view="calendar"]').click();
  await page.screenshot({ path: `${screenshots}/05-kalender.png`, fullPage: true });
});

test('narrow touch viewport supports creating and prioritizing without page overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}/06-mobil.png`, fullPage: true });
  await page.getByRole('button', { name: 'Neues To-do' }).tap();
  await page.locator('#task-title').fill('Mobil priorisieren');
  const matrix = page.locator('#priority-matrix');
  await matrix.scrollIntoViewIfNeeded();
  const box = await matrix.boundingBox();
  await matrix.tap({ position: { x: box.width * .9, y: box.height * .1 } });
  await expect(page.locator('#task-urgency')).toHaveValue('90');
  await expect(page.locator('#task-importance')).toHaveValue('90');
  expect(await dialog(page).evaluate((element) => element.getBoundingClientRect().width <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${screenshots}/07-mobil-matrix.png` });
  await page.getByRole('button', { name: 'To-do erstellen', exact: true }).tap();
  await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator('.task-title').filter({ hasText: 'Mobil priorisieren' })).toBeVisible();
  await context.close();
});

import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { loadEnvConfig } from '@next/env';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { componentFixture } from '../component-fixtures';
loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const email = `tt-design-${Date.now()}@example.invalid`;

test.afterAll(async () => {
  const client = new MongoClient(process.env.MONGODB_URI!);
  try {
    const db = (await client.connect()).db(process.env.MONGODB_DB || 'treasuretrove');
    const user = await db.collection('users').findOne({ email });
    if (user) {
      await db.collection('parts').deleteMany({ ownerId: user._id });
      await db.collection('sessions').deleteMany({ userId: user._id });
      await db.collection('users').deleteOne({ _id: user._id });
    }
  } finally {
    await client.close();
  }
});

test('group posters, drag selection, modal return position, stock arcs, pixel home and reduced motion', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const signup = await context.request.post(`${base}/api/auth/register`, {
    headers: { Origin: base },
    data: { email, password: 'Design-test-only-123!', remember: false },
  });
  expect(signup.status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.group-card')).toHaveCount(56);
  await expect(page.locator('.part-card')).toHaveCount(0);
  await expect(page.locator('.username')).toHaveText(email.split('@')[0]);
  await expect(page.locator('aside,.assembly,.first-part')).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(/lenis/);
  await mkdir('.local/screenshots', { recursive: true });
  await page.screenshot({ path: '.local/screenshots/catalog-empty.png' });

  // Exactly four fully visible posters; dragging must not accidentally open a group.
  const track = page.locator('.group-track').first();
  const rect = await track.boundingBox();
  expect(rect).toBeTruthy();
  const visible = await track.locator('.group-card').evaluateAll((cards) => {
    const outer = cards[0].parentElement!.getBoundingClientRect();
    return cards.filter((c) => {
      const r = c.getBoundingClientRect();
      return r.left >= outer.left - 1 && r.right <= outer.right + 1;
    }).length;
  });
  expect(visible).toBe(4);
  await page.mouse.move(rect!.x + rect!.width * 0.75, rect!.y + 130);
  await page.mouse.down();
  await page.mouse.move(rect!.x + rect!.width * 0.3, rect!.y + 130, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('.modal[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous Passive components groups' }).click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Open Resistors group' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Open Potentiometers group' })).toBeFocused();

  // A group can be found even when the inventory is empty.
  await page.getByRole('textbox', { name: 'Search components' }).fill('IMU');
  await page.getByRole('button', { name: 'Open IMUs group' }).click();
  await expect(page.getByRole('dialog', { name: 'IMUs', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search' }).click();

  // Fixtures exist only in this disposable account, never in the product's default inventory.
  for (const [partId, type, quantity, kind] of [
    ['LM7805', 'Linear regulator', 6, 'regulator'],
    ['NE555', 'Timer', 0, 'chip'],
  ] as const) {
    const buffer = await sharp(Buffer.from(componentFixture(kind, partId)))
      .png()
      .toBuffer();
    const r = await context.request.post(`${base}/api/parts`, {
      headers: { Origin: base },
      data: { partId, type, quantity, photo: `data:image/png;base64,${buffer.toString('base64')}` },
    });
    expect(r.status()).toBe(201);
    const part = (await r.json()).part;
    const stored = await context.request.get(`${base}/api/parts/${part.id}/photo`);
    expect((await sharp(await stored.body()).metadata()).hasAlpha).toBe(true);
  }
  await page.reload();
  const groupButton = page.getByRole('button', { name: 'Open Linear regulators group' });
  await groupButton.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect
    .poll(() => page.locator('.app-header').evaluate((el) => el.getBoundingClientRect().bottom))
    .toBeLessThan(0);
  await groupButton.scrollIntoViewIfNeeded();
  await groupButton.click();
  const group = page.getByRole('dialog', { name: 'Linear regulators', exact: true });
  await expect(group.locator('.part-card')).toHaveCount(1);
  const homeY = await page.evaluate(() => window.scrollY);
  await expect(group.locator('.card-photo')).toHaveCSS('border-top-width', '0px');
  await expect(group.locator('.card-photo')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await group.getByRole('button', { name: 'Add one LM7805' }).click();
  await expect(group.locator('.stock-flight')).toBeVisible();
  await expect(group.getByLabel('7 available')).toBeVisible();
  await group.getByRole('button', { name: 'Open LM7805', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Component details' });
  await expect(detail).toBeVisible();
  await expect(page.locator('.transition-curtain')).not.toBeVisible();
  await page.getByRole('button', { name: 'Zoom picture' }).click();
  await expect(detail.locator('.detail-photo img')).toHaveCSS(
    'transform',
    'matrix(2, 0, 0, 2, 0, 0)',
  );
  await page.getByRole('button', { name: 'Fit picture' }).click();
  await page.getByLabel('Pieces to add or use').fill('2');
  await page.getByRole('button', { name: 'Use parts', exact: true }).click();
  await expect(detail.locator('.stock-flight')).toBeVisible();
  await expect(detail.locator('.stock-number .quantity-window')).toHaveText('5');
  await page.screenshot({ path: '.local/screenshots/catalog-detail.png' });
  await page.keyboard.press('Escape');
  await expect(detail).not.toBeVisible();
  await expect(group).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(group).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(homeY, 0);
  await expect(groupButton).toBeFocused();

  // Pixel home from nested dialogs releases every scroll lock.
  await groupButton.click();
  await group.getByRole('button', { name: 'Open LM7805', exact: true }).click();
  await expect(page.locator('.transition-curtain')).not.toBeVisible();
  await detail.getByRole('button', { name: 'TreasureTrove home' }).click();
  await expect(page.locator('.pixel-curtain')).toBeVisible();
  await expect(page.locator('.modal[open]')).toHaveCount(0);
  await expect(page.locator('.transition-curtain')).not.toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(homeY, 0);

  await page.locator('.footer-reveal').scrollIntoViewIfNeeded();
  await expect(page.locator('.footer-content')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.local/screenshots/catalog-footer.png' });
  await page.getByRole('button', { name: 'Back to search' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await page.keyboard.press('n');
  const form = page.getByRole('dialog', { name: 'New component' });
  await expect(form.getByLabel('Component group')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(form).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  await page.getByRole('button', { name: /^All components/ }).click();
  const all = page.getByRole('dialog', { name: 'All components', exact: true });
  await all.getByRole('button', { name: 'Out of stock', exact: true }).click();
  await expect(all.locator('.part-card')).toHaveCount(1);
  await expect(all.getByRole('button', { name: 'Use one NE555' })).toBeDisabled();
  await all.getByRole('button', { name: 'All parts', exact: true }).click();
  await all.getByRole('button', { name: 'List view' }).click();
  await expect(all.getByRole('table')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: /^All components/ }).click();
  await expect(all.getByRole('button', { name: 'List view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

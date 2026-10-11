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

test('purpose shelf, transparent pictures, inspector, quick stock, keyboard and reduced motion', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const signup = await context.request.post(`${base}/api/auth/register`, {
    headers: { Origin: base },
    data: { email, password: 'Design-test-only-123!', remember: false },
  });
  expect(signup.status()).toBe(200);
  const entries = [
    ['ATMEGA328P', '8-bit microcontroller', 'Compute and control', 12, 'chip'],
    ['BME280', 'Temperature & humidity sensor', 'Sense the physical world', 4, 'sensor'],
    ['CAP-100UF', '100 μF electrolytic capacitor', 'Filter supply ripple', 24, 'capacitor'],
    ['LED-5MM', 'Diffused red LED', 'Light and display', 48, 'led'],
    ['LM7805', '5 V voltage regulator', 'Regulate power', 6, 'regulator'],
    ['R-220', '220 Ω carbon film resistor', 'Limit LED current', 80, 'resistor'],
    ['NE555', 'Precision timer', 'Signal timing', 0, 'chip'],
    ['IRF520', 'N-channel MOSFET', 'Switch a motor load', 7, 'regulator'],
  ] as const;
  for (const [partId, name, usage, quantity, kind] of entries) {
    const buffer = await sharp(Buffer.from(componentFixture(kind, partId)))
      .png()
      .toBuffer();
    const result = await context.request.post(`${base}/api/parts`, {
      headers: { Origin: base },
      data: {
        partId,
        name,
        usage,
        quantity,
        photo: `data:image/png;base64,${buffer.toString('base64')}`,
        location: 'Drawer A2',
      },
    });
    expect(result.status()).toBe(201);
    const part = (await result.json()).part;
    const stored = await context.request.get(`${base}/api/parts/${part.id}/photo`);
    expect((await sharp(await stored.body()).metadata()).hasAlpha).toBe(true);
  }
  await page.goto('/');
  await expect(page.locator('.part-card')).toHaveCount(8);
  await page.waitForLoadState('networkidle');
  await mkdir('.local/screenshots', { recursive: true });
  await page.screenshot({ path: '.local/screenshots/redesign-shelf.png', fullPage: true });
  await expect(page.locator('.card-photo').first()).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator('.card-photo').first()).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('aside')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sensing & measurement', exact: true }).click();
  await expect(page.locator('.part-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open BME280' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search components' }).fill('LM7805');
  await expect(page.getByRole('button', { name: 'Open LM7805' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search components' }).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('.detail-photo img')).toHaveCSS(
    'border-top-width',
    '0px',
  );
  await page.screenshot({ path: '.local/screenshots/redesign-inspector.png', fullPage: true });
  await page.getByRole('button', { name: 'Zoom picture' }).click();
  await expect(page.getByRole('button', { name: 'Fit picture' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('dialog').locator('.detail-photo img')).toHaveCSS(
    'transform',
    'matrix(2, 0, 0, 2, 0, 0)',
  );
  await page.getByRole('button', { name: 'Fit picture' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'All components', exact: true }).click();
  await page.getByRole('button', { name: 'Add one LM7805', exact: true }).click();
  await expect(page.getByLabel('LM7805 stock')).toContainText('7');
  await page.getByRole('button', { name: 'Out of stock', exact: true }).click();
  await expect(page.locator('.part-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Use one NE555' })).toBeDisabled();
  await page.getByRole('button', { name: 'All parts', exact: true }).click();
  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: '.local/screenshots/redesign-list.png', fullPage: true });
  await page.getByRole('button', { name: 'Grid view' }).click();
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog', { name: 'New component' })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/redesign-new.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Control & processing', exact: true }).click();
  await expect(page.locator('.part-card')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'All components', exact: true }).click();
  await expect(page.locator('.part-card')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});

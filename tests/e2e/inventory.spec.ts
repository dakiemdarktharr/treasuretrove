import { test, expect, type APIRequestContext } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { loadEnvConfig } from '@next/env';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
loadEnvConfig(process.cwd());
test.describe.configure({ mode: 'serial' });
const run = Date.now();
const email = `tt-test-${run}@example.invalid`;
const otherEmail = `tt-other-${run}@example.invalid`;
const password = 'Test-only-password-482!';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const headers = { Origin: base, 'x-forwarded-for': `192.0.2.${(run % 200) + 1}` };
let photo: string;
let owner: APIRequestContext;
let outsider: APIRequestContext;
let partId: string;
let recoveryKey: string;

test.beforeAll(async ({ playwright }) => {
  const buffer = await sharp({
    create: { width: 300, height: 200, channels: 3, background: '#d4dde9' },
  })
    .png()
    .toBuffer();
  photo = `data:image/png;base64,${buffer.toString('base64')}`;
  owner = await playwright.request.newContext({ baseURL: base, extraHTTPHeaders: headers });
  outsider = await playwright.request.newContext({ baseURL: base, extraHTTPHeaders: headers });
});
test.afterAll(async () => {
  await owner?.dispose();
  await outsider?.dispose();
  const client = new MongoClient(process.env.MONGODB_URI!);
  try {
    const db = (await client.connect()).db(process.env.MONGODB_DB || 'treasuretrove');
    const users = await db
      .collection('users')
      .find({ email: { $in: [email, otherEmail] } })
      .toArray();
    const ids = users.map((u) => u._id);
    await db.collection('parts').deleteMany({ ownerId: { $in: ids } });
    await db.collection('sessions').deleteMany({ userId: { $in: ids } });
    await db.collection('users').deleteMany({ _id: { $in: ids } });
  } finally {
    await client.close();
  }
});

test('accounts, remember me, validation, duplicates and private inventory isolation', async ({
  request,
}) => {
  expect((await request.get('/api/parts')).status()).toBe(401);
  const signup = await owner.post('/api/auth/register', {
    data: { email, password, remember: true },
  });
  expect(signup.status()).toBe(200);
  recoveryKey = (await signup.json()).recoveryKey;
  expect(signup.headers()['set-cookie']).toContain('Max-Age=2592000');
  expect(signup.headers()['set-cookie']).toContain('HttpOnly');
  expect(signup.headers()['set-cookie']).toContain('SameSite=lax');
  const other = await outsider.post('/api/auth/register', {
    data: { email: otherEmail, password, remember: false },
  });
  expect(other.status()).toBe(200);
  expect(other.headers()['set-cookie']).not.toContain('Max-Age');
  expect(
    (await owner.post('/api/parts', { data: { partId: 'LM7805', quantity: 3 } })).status(),
  ).toBe(400);
  expect(
    (await owner.post('/api/parts', { data: { partId: 'LM7805', quantity: -1, photo } })).status(),
  ).toBe(400);
  expect(
    (await owner.post('/api/parts', { data: { partId: 'LM7805', quantity: 1.5, photo } })).status(),
  ).toBe(400);
  expect(
    (
      await owner.post('/api/parts', {
        data: { partId: 'LM7805', quantity: 3, photo: 'data:image/png;base64,YmFk' },
      })
    ).status(),
  ).toBe(400);
  const created = await owner.post('/api/parts', {
    data: { partId: 'LM7805', quantity: 3, photo, usage: 'Regulate power supply', location: 'A3' },
  });
  expect(created.status()).toBe(201);
  const part = (await created.json()).part;
  partId = part.id;
  expect(part.group).toBe('Power & regulation');
  expect(part).not.toHaveProperty('photo');
  expect(part).not.toHaveProperty('ownerId');
  expect(
    (await owner.post('/api/parts', { data: { partId: 'lm-7805', quantity: 4, photo } })).status(),
  ).toBe(409);
  expect((await outsider.get('/api/parts')).ok()).toBeTruthy();
  expect((await (await outsider.get('/api/parts')).json()).parts).toHaveLength(0);
  expect((await outsider.get(`/api/parts/${partId}/photo`)).status()).toBe(404);
  expect((await outsider.patch(`/api/parts/${partId}`, { data: { delta: 1 } })).status()).toBe(404);
  expect((await outsider.delete(`/api/parts/${partId}`)).status()).toBe(404);
  expect((await owner.get(`/api/parts/${partId}/photo`)).headers()['content-type']).toBe(
    'image/webp',
  );
  const independent = await outsider.post('/api/parts', {
    data: { partId: 'LM7805', quantity: 88, photo },
  });
  expect(independent.status()).toBe(201);
  expect(
    (
      await owner.patch(`/api/parts/${partId}`, {
        headers: { Origin: 'https://evil.example' },
        data: { delta: 1 },
      })
    ).status(),
  ).toBe(403);
});

test('concurrent stock updates stay atomic, stop at zero, metadata cannot overwrite stock', async () => {
  const use = await Promise.all(
    Array.from({ length: 5 }, () => owner.patch(`/api/parts/${partId}`, { data: { delta: -1 } })),
  );
  expect(use.filter((r) => r.status() === 200)).toHaveLength(3);
  expect(use.filter((r) => r.status() === 409)).toHaveLength(2);
  const empty = (await (await owner.get('/api/parts')).json()).parts[0];
  expect(empty.quantity).toBe(0);
  const add = await owner.patch(`/api/parts/${partId}`, { data: { delta: 7 } });
  expect((await add.json()).part.quantity).toBe(7);
  const edit = await owner.patch(`/api/parts/${partId}`, {
    data: { ...empty, quantity: 0, usage: 'Battery power regulation', ownerId: 'injected' },
  });
  expect((await edit.json()).part.quantity).toBe(7);
});

test('desktop search, required picture, upload, quantity controls, keyboard dialog and persistence', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/login');
  await mkdir('.local/screenshots', { recursive: true });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '.local/screenshots/login.png', fullPage: true, caret: 'initial' });
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your components' })).toBeVisible();
  await expect(page.getByRole('button', { name: /LM7805 Component/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search components' }).fill('ESP32-WROOM-32');
  await expect(
    page.getByRole('heading', { name: 'No component matches “ESP32-WROOM-32”' }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Search components' }).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Part ID', exact: true })).toHaveValue(
    'ESP32-WROOM-32',
  );
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Add a picture');
  await page
    .getByLabel('Component picture', { exact: true })
    .setInputFiles({
      name: 'test-part.png',
      mimeType: 'image/png',
      buffer: Buffer.from(photo.split(',')[1], 'base64'),
    });
  await expect(page.getByAltText('Component preview')).toBeVisible();
  await page.getByLabel('Quantity', { exact: true }).fill('12');
  await page.getByText('More details', { exact: false }).click();
  await page.getByLabel('Name', { exact: true }).fill('Wi-Fi development board');
  await page.getByLabel('Usage', { exact: true }).fill('Wireless sensor measurements');
  await page.getByLabel('Location', { exact: true }).fill('Drawer B2');
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ESP32-WROOM-32', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/parts\//);
  await page.getByLabel('Pieces to add or use').fill('2');
  await page.getByRole('button', { name: 'Use parts', exact: true }).click();
  await expect(page.locator('.stock-number')).toHaveText('10pieces');
  await page.screenshot({ path: '.local/screenshots/detail.png', fullPage: true });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open ESP32-WROOM-32' })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/inventory.png', fullPage: true });
  await page.getByRole('button', { name: 'Grid view' }).click();
  await page.screenshot({ path: '.local/screenshots/grid.png', fullPage: true });
  // Image paste follows the same validation and upload path as file selection.
  await page.getByRole('button', { name: 'New component', exact: true }).click();
  await page.getByRole('textbox', { name: 'Part ID', exact: true }).fill('PASTED-TEST');
  await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data.split(',')[1]), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'pasted.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  }, photo);
  await expect(page.getByAltText('Component preview')).toBeVisible();
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'PASTED-TEST', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Server keeps the same user's inventory across independent login sessions.
  const browserState = await context.storageState();
  expect(browserState.cookies.find((c) => c.name === 'tt_session')?.httpOnly).toBe(true);
  expect((await (await owner.get('/api/parts')).json()).parts).toHaveLength(3);
  expect(errors).toEqual([]);
});

test('recovery revokes existing sessions, logout revokes the new session', async () => {
  const recover = await outsider.post('/api/auth/recover', {
    data: { email, password: 'Changed-test-password-483!', recovery: recoveryKey, remember: false },
  });
  expect(recover.status()).toBe(200);
  expect((await recover.json()).recoveryKey).not.toBe(recoveryKey);
  expect((await owner.get('/api/parts')).status()).toBe(401);
  const current = await outsider.get('/api/parts');
  expect((await current.json()).parts).toHaveLength(3);
  expect((await outsider.post('/api/auth/logout')).status()).toBe(200);
  expect((await outsider.get('/api/parts')).status()).toBe(401);
});

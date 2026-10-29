import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('kl-e2e')) { sessionStorage.setItem('kl-e2e', '1'); indexedDB.deleteDatabase('karol-learn'); } });
});

test('Heute lädt aus dem statischen Build ohne Server', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Heute' })).toBeVisible();
  await expect(page.getByTestId('start')).toContainText('Karten starten');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
});

test('Track-Segment wechselt den Akzent', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /Forward Deployed/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-track', 'fde');
  await expect(page.getByText('Forward Deployed Engineer', { exact: true })).toBeVisible();
});

test('Session per Tastatur: drehen, wissen, Lernstand übersteht Neuladen', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('start').click();
  const karte = page.getByTestId('lernkarte');
  await expect(karte).toBeVisible();
  await page.keyboard.press(' ');
  await expect(karte).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole('heading', { level: 1 }).filter({ hasText: /gewusst|gemacht|drangeblieben/ }).count()) break;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(450);
  }
  await expect(page.getByText(/von \d+ gewusst/).first()).toBeVisible();
  await page.reload();
  await page.goto('./#/');
  await expect(page.getByText(/[1-9]\d* zum Wiederholen/)).toBeVisible();
  await expect(page.getByText(/1 Tag in Folge/)).toBeVisible();
});

test('Swipe nach links mit der Maus zeigt „Nochmal“ und wertet', async ({ page }) => {
  await page.goto('./#/stapel/aie');
  const karte = page.getByTestId('lernkarte');
  const box = (await karte.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2, { steps: 5 });
  await expect(page.locator('.stempel--rot')).toHaveCSS('opacity', /0\.[5-9]|1/);
  await page.mouse.move(box.x - 140, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText(/^2\//)).toBeVisible();
});

test('Roadmap, Lexikon und Agent-Loop', async ({ page }) => {
  await page.goto('./#/roadmap/aie');
  await page.getByRole('button', { name: /^Modelle:/ }).click();
  await expect(page).toHaveURL(/#\/thema\/aie\/modelle$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Modelle' })).toBeVisible();
  await expect(page.getByRole('link', { name: /roadmap\.sh/ })).toHaveAttribute('href', /roadmap\.sh/);

  await page.goto('./#/lexikon');
  const t0 = Date.now();
  await page.getByRole('searchbox').fill('prompt caching');
  await expect(page.getByRole('status').filter({ hasText: 'Treffer' })).not.toHaveText('0 Treffer');
  expect(Date.now() - t0).toBeLessThan(3000);

  await page.goto('./#/skizze/agent-loop');
  await expect(page.getByText('Schritt 1 von 9')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Schritt 2 von 9')).toBeVisible();
  await page.mouse.wheel(0, 800);
  await page.getByRole('switch').uncheck();
  await expect(page.getByText(/von 8/)).toBeVisible();
  await page.getByRole('link', { name: /Im Lexikon/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('Eingang ist ohne Server ausgeblendet', async ({ page }) => {
  await page.goto('./#/mehr');
  await expect(page.getByRole('link', { name: /Einstellungen/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Eingang/ })).toHaveCount(0);
});

test('Reduced Motion: Karte blendet über statt zu drehen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/stapel/fde');
  await expect(page.getByTestId('lernkarte')).toBeVisible();
  await page.keyboard.press(' ');
  await expect(page.locator('.lernkarte__hinten')).toHaveClass(/ist-da/);
  const transform = await page.locator('.lernkarte__dreher').evaluate((el) => getComputedStyle(el).transform);
  expect(transform === 'none' || !transform.includes('matrix3d')).toBe(true);
});

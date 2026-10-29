import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('kl-e2e')) { sessionStorage.setItem('kl-e2e', '1'); indexedDB.deleteDatabase('karol-learn'); } });
});

test('Skizzen-Liste folgt dem Track-Umschalter', async ({ page }) => {
  await page.goto('./#/skizzen');
  await expect(page.getByRole('heading', { level: 1, name: 'Skizzen' })).toBeVisible();
  const liste = page.locator('.skizzenliste');
  await expect(liste.getByText('Agent-Loop')).toBeVisible();
  await expect(liste.getByText('Git: Branch bis Merge')).toHaveCount(0);
  await page.getByRole('radio', { name: /Forward Deployed/ }).click();
  await expect(liste.getByText('Git: Branch bis Merge')).toBeVisible();
  await expect(liste.getByText('Agent-Loop')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Skizzen' })).toHaveClass(/ist-aktiv/);
});

test('Skizze durchklicken: Weiter, Zurück, Pfeiltasten, Steuerung sichtbar auf 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./#/skizzen');
  await page.getByRole('link', { name: /MCP: der Stecker/ }).click();
  await expect(page).toHaveURL(/#\/skizze\/mcp$/);
  await expect(page.getByText('Schritt 1 von 6')).toBeVisible();
  const steuerung = page.getByTestId('skizze-steuerung');
  const box = (await steuerung.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  await page.getByRole('button', { name: 'Nächster Schritt' }).click();
  await expect(page.getByText('Schritt 2 von 6')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Schritt 4 von 6')).toBeVisible();
  await page.getByRole('button', { name: 'Vorheriger Schritt' }).click();
  await expect(page.getByText('Schritt 3 von 6')).toBeVisible();
  await page.getByRole('button', { name: /^Client/ }).click();
  await expect(page.getByText('Schritt 2 von 6')).toBeVisible();
  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(page).toHaveURL(/#\/skizzen$/);
});

test('Themen-Detail zeigt Bild, Skizzen und startet das Thema', async ({ page }) => {
  await page.goto('./#/thema/aie/mcp');
  const bild = page.locator('.themenbild img');
  await expect(bild).toBeVisible();
  await expect(bild).toHaveAttribute('src', /inhalt\/bilder\/aie-mcp\.webp$/);
  expect(await bild.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: /MCP: der Stecker/ })).toBeVisible();
  await page.getByRole('button', { name: 'Dieses Thema lernen' }).click();
  await expect(page.getByTestId('lernkarte')).toBeVisible();
  await expect(page.locator('.lernkarte__vorne .chip')).toHaveText('MCP');
});

test('Kartenrückseite: Skizze ansehen und zurück ohne Session-Verlust', async ({ page }) => {
  await page.goto('./#/stapel/aie?thema=MCP');
  await expect(page.getByTestId('lernkarte')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^2\//)).toBeVisible();
  await page.keyboard.press(' ');
  await page.getByRole('button', { name: 'Skizze ansehen' }).click();
  const sheet = page.getByRole('dialog', { name: 'MCP: der Stecker' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(sheet.getByText('Schritt 2 von 6')).toBeVisible();
  await expect(page.getByText(/^2\//)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByText(/^2\//)).toBeVisible();
  await expect(page.getByTestId('lernkarte')).toHaveAttribute('aria-pressed', 'true');
});

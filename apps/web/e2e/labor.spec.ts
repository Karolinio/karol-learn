import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('kl-e2e')) { sessionStorage.setItem('kl-e2e', '1'); indexedDB.deleteDatabase('karol-learn'); } });
});

async function keinUeberlauf(page: Page) {
  const breiter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(breiter).toBeLessThanOrEqual(0);
}

test('Störfall Endlosschleife: Symptom, falsche und richtige Ursache, Reparatur, Vergleich, Haken bleibt', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./#/skizzen');
  await page.getByTestId('labor-einstieg').click();
  await expect(page).toHaveURL(/#\/labor$/);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Skizzen' })).toHaveClass(/ist-aktiv/);
  await page.getByRole('link', { name: /Der Agent hört nicht auf/ }).click();

  // Reduced Motion: kein Autoplay, Karol tippt selbst.
  await expect(page.getByText('Runde 1 von 30')).toBeVisible();
  await page.getByRole('button', { name: 'Nächste Runde' }).click();
  await expect(page.getByText('Runde 2 von 30')).toBeVisible();
  await keinUeberlauf(page);
  await page.getByRole('button', { name: 'Ans Ende' }).click();
  await expect(page.getByText('Runde 30 von 30')).toBeVisible();
  await page.getByRole('button', { name: 'Zur Ursache' }).click();

  await expect(page.getByText('Was ist die Ursache?')).toBeVisible();
  await page.getByRole('button', { name: /Kontextfenster ist zu klein/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nicht ganz' })).toContainText('Bremse');
  await expect(page.getByRole('button', { name: /Kontextfenster ist zu klein/ })).toBeDisabled();
  await page.getByRole('button', { name: /kein Rundenlimit/ }).click();

  await expect(page.getByText('Wie reparierst du es?')).toBeVisible();
  await page.getByRole('button', { name: /Größeres Kontextfenster/ }).click();
  await expect(page.getByText('Symptom bleibt')).toBeVisible();
  await page.getByRole('button', { name: /Rundenlimit 8/ }).click();
  const vergleich = page.getByTestId('vergleich');
  await expect(vergleich).toContainText('Not-Aus nach 30 Runden');
  await expect(vergleich).toContainText('Wiederholung gestoppt');
  await keinUeberlauf(page);
  await page.getByRole('button', { name: 'Fall abschließen' }).click();
  await expect(page.getByRole('heading', { name: 'Gelöst' })).toBeVisible();
  await expect(page.getByText('Mit 3 Versuchen', { exact: false })).toBeVisible();

  await page.goto('./#/labor');
  await page.reload();
  const zeile = page.getByRole('link', { name: /Der Agent hört nicht auf/ });
  await expect(zeile.getByRole('img', { name: 'gelöst' })).toBeVisible();
  await page.goto('./#/fortschritt/aie');
  await expect(page.getByTestId('fortschritt-labor')).toContainText('1/4 Störfälle gelöst');
});

test('Simulator: Caching umschalten ändert die Gesamtkosten, Regler per Tastatur', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./#/labor/simulator');
  const gesamt = page.getByTestId('gesamtkosten');
  const vorher = await gesamt.textContent();
  await expect(page.getByTestId('kosten-jetzt')).toHaveCount(0);
  // Von vorn abspielen und anhalten: eine Regleränderung muss danach wieder ans Ende springen.
  await page.getByRole('button', { name: 'Abspielen' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Runde 6 von 6')).toHaveCount(0);
  await page.getByRole('button', { name: 'Regler' }).click();
  const sheet = page.getByRole('dialog', { name: 'Regler' });
  await sheet.getByRole('switch', { name: /Prompt Caching/ }).focus();
  await page.keyboard.press('Space');
  await expect(sheet.getByRole('switch', { name: /Prompt Caching/ })).toBeChecked();
  await expect(sheet.getByTestId('gesamtkosten')).not.toHaveText(vorher!);

  const mehr = sheet.getByRole('button', { name: 'Tools angeboten mehr' });
  const box = (await mehr.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await mehr.focus();
  await page.keyboard.press('Enter');
  await expect(sheet.getByRole('group', { name: 'Tools angeboten' })).toContainText('6');
  await page.keyboard.press('Escape');
  await expect(gesamt).toHaveCount(1);
  await expect(gesamt).not.toHaveText(vorher!);
  await expect(page.getByText('Runde 6 von 6')).toBeVisible();
  await keinUeberlauf(page);
});

test('Heute zeigt den nächsten Störfall', async ({ page }) => {
  await page.goto('./#/');
  await expect(page.getByTestId('naechster-stoerfall')).toContainText('Der Agent hört nicht auf');
});

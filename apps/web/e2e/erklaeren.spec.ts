import { expect, test, type Page, type Route } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

const SERVER = 'http://127.0.0.1:8810';
const KARTE = 'aie-abrechnung-token';
const TEXT = 'Die API zählt Tokens, also Wortstücke, und zwar getrennt für das, was rein- und rausgeht.';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

const bewertung = (punkte: [number, number, number, number], nachfrage: string) => ({
  urteil: 'Richtig und greifbar, nur der Bezug zur Rechnung fehlt.',
  kriterien: {
    richtigkeit: { punkte: punkte[0], satz: '„Wortstücke“ stimmt.' },
    vollstaendigkeit: { punkte: punkte[1], satz: 'Dass Anfragen allein nicht zählen, fehlt.' },
    verstaendlichkeit: { punkte: punkte[2], satz: 'Gut für einen Geschäftsführer.' },
    kuerze: { punkte: punkte[3], satz: 'Knapp.' },
  },
  falscheAussagen: [],
  fehlendeKernpunkte: [1],
  besserSatz: 'Sie zahlen pro Wortstück, getrennt für Frage und Antwort. Viele kurze Anfragen sind also nicht automatisch teuer.',
  nachfrage,
});

async function antworte(route: Route, status: number, body: unknown, verzoegerungMs = 0) {
  if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: CORS }); return; }
  if (verzoegerungMs) await new Promise((r) => setTimeout(r, verzoegerungMs));
  await route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function mitServer(page: Page, erklaeren: (route: Route) => Promise<void>) {
  await page.route(`${SERVER}/api/status`, (r) => antworte(r, 200, { success: true, data: { ok: true, version: '0.1.0', erklaeren: true }, error: null }));
  await page.route(`${SERVER}/api/erklaeren`, erklaeren);
}

async function keinUeberlauf(page: Page) {
  const breiter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(breiter).toBeLessThanOrEqual(0);
}

async function mindestens44(page: Page, selektor: string) {
  const boxen = await page.locator(selektor).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })));
  expect(boxen.length).toBeGreaterThan(0);
  for (const b of boxen) { expect(b.w).toBeGreaterThanOrEqual(44); expect(b.h).toBeGreaterThanOrEqual(44); }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => { if (!sessionStorage.getItem('kl-e2e')) { sessionStorage.setItem('kl-e2e', '1'); indexedDB.deleteDatabase('karol-learn'); } });
});

test('mit Coach: Lexikon → Zielperson → Text → Warten → Urteil + Nachfrage → Runde 2 → Fertig → Fortschritt', async ({ page }) => {
  const anfragen: Record<string, unknown>[] = [];
  await mitServer(page, async (r) => {
    if (r.request().method() === 'POST') anfragen.push(r.request().postDataJSON());
    const runde2 = anfragen.length > 1;
    await antworte(r, 200, { success: true, data: { bewertung: runde2 ? bewertung([3, 3, 3, 2], '') : bewertung([3, 2, 3, 1], 'Und was heißt das konkret für meine Rechnung?') }, error: null }, 1000);
  });
  await page.goto('./#/lexikon');
  await page.getByRole('searchbox', { name: 'Suchen' }).fill('Wonach rechnet');
  await page.getByRole('button', { name: /Wonach rechnet eine Modell-API/ }).click();
  await page.getByRole('dialog').getByTestId('erklaeren-starten').click();
  await expect(page).toHaveURL(new RegExp(`#/erklaeren/${KARTE}$`));
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Heute' })).toHaveClass(/ist-aktiv/);

  await expect(page.getByText('Wem erklärst du es?')).toBeVisible();
  await mindestens44(page, '.erkl-person');
  await keinUeberlauf(page);
  await page.getByTestId('zielperson-gf').click();

  await expect(page.getByLabel('Erklär es dem Geschäftsführer')).toBeVisible();
  await expect(page.getByTestId('absenden')).toBeDisabled();
  await page.getByLabel('Erklär es dem Geschäftsführer').fill(TEXT);
  await expect(page.getByTestId('absenden')).toHaveText('Bewerten lassen');
  await keinUeberlauf(page);
  await page.getByTestId('absenden').click();

  await expect(page.getByText('Claude liest deine Erklärung.')).toBeVisible();
  await expect(page.getByTestId('urteil')).toContainText('Fast');
  await expect(page.getByTestId('urteil')).toContainText('9/12');
  await expect(page.getByTestId('nachfrage')).toContainText('Und was heißt das konkret für meine Rechnung?');
  await keinUeberlauf(page);
  await page.getByText('Vier Kriterien').click();
  await expect(page.getByText('Dass Anfragen allein nicht zählen, fehlt.')).toBeVisible();
  await page.getByText('Fehlende Kernpunkte').click();
  await expect(page.getByText('Es zählt nicht die Zahl der Anfragen allein.')).toBeVisible();

  await page.getByRole('button', { name: 'Antworten' }).click();
  await expect(page.getByTestId('nachfrage')).toBeVisible();
  await page.getByLabel('Antworte dem Geschäftsführer').fill('Sie zahlen pro Wortstück, für Ihre Frage und für die Antwort getrennt.');
  await page.getByTestId('absenden').click();
  await expect(page.getByTestId('urteil')).toContainText('Kundenreif');
  await expect(page.getByTestId('urteil')).toContainText('Runde 2');
  await expect(page.getByTestId('nachfrage')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fertig' }).click();
  await expect(page.getByTestId('erkl-fertig')).toContainText('Kundenreif · 11/12');

  expect(anfragen).toHaveLength(2);
  expect(anfragen[0]).toEqual({ karteId: KARTE, zielperson: 'gf', text: TEXT });
  expect(anfragen[1]).toMatchObject({ nachfrage: { frage: 'Und was heißt das konkret für meine Rechnung?', ersterText: TEXT } });

  await page.reload();
  await page.goto('./#/fortschritt/aie');
  await expect(page.getByTestId('fortschritt-erklaeren')).toContainText('1 geübt, 1 kundenreif');
});

test('ohne Server: Selbstcheck mit zwei Haken wird gespeichert, Lexikon zeigt die letzte Fassung', async ({ page }) => {
  await page.route(`${SERVER}/**`, (r) => r.abort());
  await page.goto(`./#/erklaeren/${KARTE}`);
  await page.getByTestId('zielperson-it').click();
  await page.getByLabel('Erklär es der IT-Leiterin').fill(TEXT);
  await expect(page.getByTestId('absenden')).toHaveText('Selbst prüfen');
  await page.getByTestId('absenden').click();
  await expect(page.getByTestId('eigener-text')).toHaveText(TEXT);
  await expect(page.getByText('Nach verarbeiteten Tokens, getrennt für Eingabe und Ausgabe.', { exact: false }).first()).toBeVisible();
  const haken = page.getByRole('checkbox');
  await expect(haken).toHaveCount(2);
  await mindestens44(page, '.erkl-check__zeile');
  await haken.nth(0).click();
  await haken.nth(1).click();
  await expect(haken.nth(1)).toHaveAttribute('aria-checked', 'true');
  await keinUeberlauf(page);
  await page.getByTestId('selbst-fertig').click();
  await expect(page.getByTestId('erkl-fertig')).toContainText('2 von 2 Kernpunkten');

  await page.reload();
  await page.goto(`./#/lexikon?karte=${KARTE}`);
  const blatt = page.getByRole('dialog');
  await expect(blatt.getByTestId('letztes-erklaeren')).toContainText('Kundenreif · 2/2 (Selbstcheck)');
  await blatt.getByText('Deine letzte Fassung').click();
  await expect(blatt.getByText(TEXT)).toBeVisible();
});

test('Fehler 504: ruhige Meldung, Selbst prüfen behält den Text, kein Lauf ohne Klick', async ({ page }) => {
  let laeufe = 0;
  await mitServer(page, async (r) => {
    if (r.request().method() === 'POST') laeufe += 1;
    await antworte(r, 504, { success: false, data: null, error: 'Die Bewertung hat zu lange gedauert' });
  });
  await page.goto(`./#/erklaeren/${KARTE}`);
  await page.getByTestId('zielperson-dev').click();
  await page.getByLabel('Erklär es dem Entwickler beim Kunden').fill(TEXT);
  await page.getByTestId('absenden').click();
  await expect(page.getByTestId('fehler')).toContainText('Claude hat diesmal zu lange gebraucht.');
  await page.waitForTimeout(300);
  expect(laeufe).toBe(1);
  await keinUeberlauf(page);
  await page.getByRole('button', { name: 'Selbst prüfen' }).click();
  await expect(page.getByTestId('eigener-text')).toHaveText(TEXT);
});

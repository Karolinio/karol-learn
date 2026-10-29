const ERSATZ: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Dateiname aus einem Themennamen: nur a–z, 0–9 und Bindestriche. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (z) => ERSATZ[z] ?? z)
    .replace(/&/g, ' und ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

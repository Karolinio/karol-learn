/** Entwurf der Erklärung je Karte in sessionStorage: übersteht ein Neuladen, nicht das Schließen des Tabs. */
const PRAEFIX = 'kl:erklaeren-entwurf:';

export function liesEntwurf(karteId: string): string {
  try {
    return sessionStorage.getItem(PRAEFIX + karteId) ?? '';
  } catch {
    return ''; // privater Modus oder gesperrter Speicher: dann eben ohne Entwurf
  }
}

export function schreibeEntwurf(karteId: string, text: string): void {
  try {
    if (text) sessionStorage.setItem(PRAEFIX + karteId, text);
    else sessionStorage.removeItem(PRAEFIX + karteId);
  } catch {
    /* privater Modus oder voll: der Entwurf ist nur Komfort */
  }
}

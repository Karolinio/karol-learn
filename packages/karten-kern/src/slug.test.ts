import { describe, expect, test } from 'vitest';
import { slug } from './slug';

describe('slug', () => {
  test('wandelt & in "und" und Leerzeichen in Bindestriche', () => {
    expect(slug('Wissen & RAG')).toBe('wissen-und-rag');
  });
  test('ersetzt Umlaute und ß', () => {
    expect(slug('Prüfung Öl Ärger Straße')).toBe('pruefung-oel-aerger-strasse');
  });
  test('entfernt Sonderzeichen und doppelte Bindestriche', () => {
    expect(slug('  Recht & Regulierung!! ')).toBe('recht-und-regulierung');
    expect(slug('Git & Ablauf')).toBe('git-und-ablauf');
    expect(slug('Terminal & CLI')).toBe('terminal-und-cli');
  });
  test('erzeugt nie Pfadteile wie ../', () => {
    expect(slug('../../etc/passwd')).toBe('etc-passwd');
  });
});

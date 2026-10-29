import { describe, expect, test } from 'vitest';
import { tagesserie } from './serie';

describe('tagesserie', () => {
  test('zählt aufeinanderfolgende Tage bis heute', () => {
    expect(tagesserie(['2026-10-25', '2026-10-26', '2026-10-27'], '2026-10-27')).toBe(3);
  });
  test('zählt bis gestern, wenn heute noch nichts gelernt wurde', () => {
    expect(tagesserie(['2026-10-25', '2026-10-26'], '2026-10-27')).toBe(2);
  });
  test('Lücke beendet die Serie, Dubletten zählen einmal', () => {
    expect(tagesserie(['2026-10-20', '2026-10-27', '2026-10-27'], '2026-10-27')).toBe(1);
    expect(tagesserie(['2026-10-20'], '2026-10-27')).toBe(0);
    expect(tagesserie([], '2026-10-27')).toBe(0);
  });
});

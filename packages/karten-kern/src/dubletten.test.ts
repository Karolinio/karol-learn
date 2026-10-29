import { describe, expect, test } from 'vitest';
import { findeDublette, jaccard, woerter } from './dubletten';

describe('woerter und jaccard', () => {
  test('normalisiert Groß- und Kleinschreibung und Satzzeichen', () => {
    expect([...woerter('Was ist ein Token?')]).toEqual(['was', 'ist', 'ein', 'token']);
  });
  test('Jaccard 1 bei gleicher Menge, 0 bei leerer', () => {
    expect(jaccard(woerter('a b'), woerter('b a'))).toBe(1);
    expect(jaccard(new Set(), new Set())).toBe(0);
    expect(jaccard(woerter('a b c'), woerter('a b d'))).toBeCloseTo(0.5);
  });
});

describe('findeDublette', () => {
  const bestand = [{ id: 'aie-token', frage: 'Was ist ein Token?' }, { id: 'aie-sdk', frage: 'Was ist ein SDK genau und wofür?' }];
  test('gleiche id ist Dublette', () => {
    expect(findeDublette({ id: 'aie-token', frage: 'ganz anders' }, bestand)).toBe('aie-token');
  });
  test('ähnliche Frage über der Schwelle ist Dublette', () => {
    expect(findeDublette({ id: 'neu', frage: 'Was ist ein SDK genau, und wofür?' }, bestand)).toBe('aie-sdk');
  });
  test('verschiedene Frage ist keine Dublette', () => {
    expect(findeDublette({ id: 'neu', frage: 'Wie teuer ist Caching?' }, bestand)).toBeUndefined();
  });
});

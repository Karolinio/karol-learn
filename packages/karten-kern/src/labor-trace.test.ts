import { describe, expect, test } from 'vitest';
import { laufSpan, modellDauer, rundenSpans, toolDauer } from './labor-trace';

describe('Spandauer aus Tokens', () => {
  test('mehr Tokens dauern länger, Gecachtes geht schneller als Neues', () => {
    expect(modellDauer(0, 40_000, 100)).toBeGreaterThan(modellDauer(0, 4_000, 100));
    expect(modellDauer(0, 4_000, 500)).toBeGreaterThan(modellDauer(0, 4_000, 100));
    expect(modellDauer(36_000, 4_000, 100)).toBeLessThan(modellDauer(0, 40_000, 100));
    expect(toolDauer(40_000)).toBeGreaterThan(toolDauer(100));
  });
});

describe('rundenSpans', () => {
  test('Runde mit Gateway und Tool: Kinder hängen an der Runde, Zeiten schließen lückenlos an', () => {
    const { spans, endeMs } = rundenSpans({
      runde: 2, startMs: 1000, modell: { gecacht: 0, neu: 2000, output: 80, status: 'ok' },
      gateway: 'ok', tool: { name: 'suche_kunde', tokens: 500, status: 'ok' },
    });
    expect(spans.map((s) => s.id)).toEqual(['r2', 'r2-modell', 'r2-gateway', 'r2-tool']);
    expect(spans.slice(1).every((s) => s.eltern === 'r2')).toBe(true);
    const [r, m, g, t] = spans;
    expect(m!.startMs).toBe(1000);
    expect(g!.startMs).toBe(m!.startMs + m!.dauerMs);
    expect(t!.startMs).toBe(g!.startMs + g!.dauerMs);
    expect(endeMs).toBe(t!.startMs + t!.dauerMs);
    expect(r!.dauerMs).toBe(endeMs - 1000);
    expect(r!.status).toBe('ok');
  });
  test('abgelehnt vom Gateway: kein Tool-Span, Runde gilt als abgelehnt', () => {
    const { spans } = rundenSpans({ runde: 1, startMs: 0, modell: { gecacht: 0, neu: 100, output: 10, status: 'ok' }, gateway: 'abgelehnt' });
    expect(spans.map((s) => s.art)).toEqual(['runde', 'modell', 'gateway']);
    expect(spans[0]!.status).toBe('abgelehnt');
  });
  test('Tool-Fehler und Modellfehler färben die Runde rot', () => {
    const tool = rundenSpans({ runde: 1, startMs: 0, modell: { gecacht: 0, neu: 100, output: 10, status: 'ok' }, tool: { name: 'x', tokens: 5, status: 'fehler' } });
    expect(tool.spans[0]!.status).toBe('fehler');
    const modell = rundenSpans({ runde: 3, startMs: 0, modell: { gecacht: 0, neu: 0, output: 0, status: 'fehler' } });
    expect(modell.spans.map((s) => s.status)).toEqual(['fehler', 'fehler']);
  });
  test('laufSpan ist die Wurzel', () => {
    expect(laufSpan(1234, 'ok')).toEqual({ id: 'lauf', art: 'lauf', name: 'Lauf', startMs: 0, dauerMs: 1234, status: 'ok' });
  });
});

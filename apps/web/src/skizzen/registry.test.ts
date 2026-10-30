import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Karte, Roadmap, Track } from '@karol-learn/karten-kern';
import { findeSkizze, sichtbareSkizzen, SKIZZEN, skizzeFuerKarte, skizzenZumThema } from './registry';

const INHALT = resolve(__dirname, '../../../../inhalt');
const karten: Karte[] = (['aie', 'fde'] as const).flatMap((t) => readdirSync(join(INHALT, 'karten', t))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(join(INHALT, 'karten', t, f), 'utf8')) as { karten: Karte[] }).karten));
const roadmaps: Roadmap[] = (['aie', 'fde'] as const).map((t) => JSON.parse(readFileSync(join(INHALT, 'roadmap', `${t}.json`), 'utf8')) as Roadmap);
const ids = new Map(karten.map((k) => [k.id, k]));
const alle: Record<Track, Set<string>> = {
  aie: new Set(roadmaps.find((r) => r.track === 'aie')!.themen.map((t) => t.thema)),
  fde: new Set(roadmaps.find((r) => r.track === 'fde')!.themen.map((t) => t.thema)),
};
const ohne = (thema: string): Record<Track, Set<string>> => ({
  aie: new Set([...alle.aie].filter((t) => t !== thema)), fde: new Set([...alle.fde].filter((t) => t !== thema)),
});

describe('Skizzen-Registry', () => {
  test('ids sind eindeutig und Slugs', () => {
    const liste = SKIZZEN.map((s) => s.id);
    expect(new Set(liste).size).toBe(liste.length);
    for (const id of liste) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  test('jede Skizze hat Titel, Kurztext, Schritte und nur Themen aus ihrer Roadmap', () => {
    for (const s of SKIZZEN) {
      expect(s.titel.length, s.id).toBeGreaterThan(0);
      expect(s.kurztext.length, s.id).toBeLessThanOrEqual(120);
      expect(s.schritte.length, s.id).toBeGreaterThanOrEqual(3);
      for (const t of s.themen) expect(alle[s.track].has(t), `${s.id}: Thema ${t}`).toBe(true);
    }
  });
  test('jede verlinkte Karten-id existiert und liegt im Track der Skizze', () => {
    for (const s of SKIZZEN) {
      for (const schritt of s.schritte) {
        if (!schritt.karte) continue;
        const k = ids.get(schritt.karte);
        expect(k, `${s.id}: ${schritt.karte}`).toBeDefined();
        expect(k?.track, `${s.id}: ${schritt.karte}`).toBe(s.track);
      }
    }
  });
  test('jedes Feld karte.skizze zeigt auf eine Skizze desselben Tracks', () => {
    const mitSkizze = karten.filter((k) => k.skizze);
    expect(mitSkizze.length).toBeGreaterThanOrEqual(15);
    for (const k of mitSkizze) {
      const s = SKIZZEN.find((x) => x.id === k.skizze);
      expect(s, `${k.id} → ${k.skizze}`).toBeDefined();
      expect(s?.track, k.id).toBe(k.track);
    }
  });
  test('jedes Feld skizze eines Labor-Störfalls zeigt auf eine Skizze desselben Tracks', () => {
    const faelle = readdirSync(join(INHALT, 'labor')).filter((f) => f.includes('-labor-'))
      .map((f) => JSON.parse(readFileSync(join(INHALT, 'labor', f), 'utf8')) as { id: string; track: Track; skizze?: string });
    expect(faelle.filter((f) => f.skizze).length).toBeGreaterThanOrEqual(3);
    for (const f of faelle.filter((x) => x.skizze)) {
      const s = SKIZZEN.find((x) => x.id === f.skizze);
      expect(s, `${f.id} → ${f.skizze}`).toBeDefined();
      expect(s?.track, f.id).toBe(f.track);
    }
  });
  test('Agent-Loop bleibt unter seiner alten id erreichbar', () => {
    expect(findeSkizze('agent-loop', alle)?.titel).toBe('Agent-Loop');
  });
  test('Track-Filter trennt streng', () => {
    expect(sichtbareSkizzen(alle, 'aie').every((s) => s.track === 'aie')).toBe(true);
    expect(sichtbareSkizzen(alle, 'fde').map((s) => s.id)).toContain('git-ablauf');
  });
  test('KL_AUSSCHLIESSEN=wiya blendet gateway-mandat aus, andere bleiben', () => {
    const themen = ohne('wiya');
    expect(findeSkizze('gateway-mandat', themen)).toBeUndefined();
    expect(sichtbareSkizzen(themen, 'fde').map((s) => s.id)).not.toContain('gateway-mandat');
    expect(findeSkizze('einsatz', themen)).toBeDefined();
  });
  test('Skizze bleibt, solange eines ihrer Themen da ist', () => {
    expect(findeSkizze('kontextfenster', ohne('Kosten'))).toBeDefined();
  });
  test('skizzeFuerKarte: Feld vor Thema, sonst Thema, sonst nichts', () => {
    expect(skizzeFuerKarte({ track: 'aie', thema: 'Kontext', skizze: 'mcp' }, alle)?.id).toBe('mcp');
    expect(skizzeFuerKarte({ track: 'aie', thema: 'MCP' }, alle)?.id).toBe('mcp');
    expect(skizzeFuerKarte({ track: 'aie', thema: 'Memory' }, alle)).toBeUndefined();
    expect(skizzeFuerKarte({ track: 'fde', thema: 'wiya', skizze: 'gateway-mandat' }, ohne('wiya'))).toBeUndefined();
    expect(skizzeFuerKarte({ track: 'fde', thema: 'MCP', skizze: 'mcp' }, alle)).toBeUndefined();
  });
  test('skizzenZumThema findet die Skizzen eines Roadmap-Themas', () => {
    expect(skizzenZumThema('aie', 'Harness', alle).map((s) => s.id)).toEqual(['schichten', 'agent-loop', 'vier-wege']);
  });
});

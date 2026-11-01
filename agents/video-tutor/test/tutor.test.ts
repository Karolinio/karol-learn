import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { execFile } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MandatsFehler, pruefeMandat, schreibeMitMandat } from '../mandat';
import { parseClaudeAusgabe } from '../auswertung';
import { liesTranskript, parseArgs } from '../eingaben';
import { vttZuText, waehleSpur, youtubeId } from '../youtube';

const HIER = dirname(fileURLToPath(import.meta.url));
const RUN = resolve(HIER, '../run.ts');
const TSX = resolve(HIER, '../../../node_modules/.bin/tsx');
let wurzel = '';
let bin = '';

function starte(args: string[], env: Record<string, string> = {}): Promise<{ code: number; out: string; err: string }> {
  return new Promise((ok) => {
    execFile(TSX, [RUN, ...args], { env: { ...process.env, KL_WURZEL: wurzel, PATH: `${bin}:${process.env.PATH}`, KL_CLAUDE_BIN: join(bin, 'claude'), ...env } }, (e, out, err) => {
      ok({ code: e ? Number((e as { code?: number }).code ?? 1) : 0, out: String(out), err: String(err) });
    });
  });
}

beforeAll(() => {
  wurzel = mkdtempSync(join(tmpdir(), 'kl-tutor-'));
  bin = join(wurzel, 'bin');
  mkdirSync(bin);
  copyFileSync(join(HIER, 'fake-claude.mjs'), join(bin, 'claude'));
  chmodSync(join(bin, 'claude'), 0o755);
  mkdirSync(join(wurzel, 'inhalt/karten/aie'), { recursive: true });
  writeFileSync(join(wurzel, 'inhalt/karten/aie/modelle.json'), JSON.stringify({ track: 'aie', thema: 'Modelle', karten: [
    { id: 'aie-token', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Was ist ein Token?', antwort: 'Ein Textstück.', quelle: 'x' },
  ] }));
  writeFileSync(join(wurzel, 'transkript.txt'), 'Heute geht es um Prompt Caching und Tokens.');
});
afterAll(() => rmSync(wurzel, { recursive: true, force: true }));

describe('Video-Tutor mit Fake-claude', () => {
  test('schreibt Vorschläge, markiert Dubletten, verwirft ungültige und loggt', async () => {
    const protokoll = join(wurzel, 'protokoll.json');
    const r = await starte([join(wurzel, 'transkript.txt'), '--quelle', 'Video: Caching', '--track', 'aie'], { CLAUDE_FAKE_PROTOKOLL: protokoll, GEHEIM: 'nicht weitergeben' });
    expect(r.err).toBe('');
    expect(r.code).toBe(0);
    expect(r.out).toContain('2 Vorschläge, 1 Dubletten, 1 Ideen → im Eingang prüfen');
    const aufruf = JSON.parse(readFileSync(protokoll, 'utf8'));
    expect(aufruf.args).toEqual(expect.arrayContaining(['-p', '--output-format', 'json', '--json-schema', '--model', 'sonnet', '--tools', '']));
    expect(aufruf.prompt).toContain('Heute geht es um Prompt Caching');
    // Isolation: leerer Temp-Ordner (danach gelöscht), Umgebung nur als Allowlist.
    expect(aufruf.args).toEqual(expect.arrayContaining(['--setting-sources', 'project', '--disable-slash-commands', '--strict-mcp-config', '--no-session-persistence']));
    expect(aufruf.args).not.toContain('--bare');
    expect(aufruf.cwd).toMatch(/kl-claude-/);
    expect(aufruf.cwd.startsWith(resolve(HIER, '../../..'))).toBe(false);
    expect(existsSync(aufruf.cwd)).toBe(false);
    expect(aufruf.env).not.toContain('GEHEIM');
    expect(aufruf.env).not.toContain('KL_WURZEL');
    expect(aufruf.env.every((k: string) => /^(PATH|HOME|USER|LOGNAME|SHELL|LANG|TMPDIR|TERM|LC_.*|ANTHROPIC_.*|CLAUDE_.*|__CF_USER_TEXT_ENCODING)$/.test(k))).toBe(true);
    expect(aufruf.prompt).toContain('aie-token | Was ist ein Token?');
    const dateien = readdirSync(join(wurzel, 'inhalt/vorschlaege'));
    expect(dateien).toHaveLength(1);
    const lauf = JSON.parse(readFileSync(join(wurzel, 'inhalt/vorschlaege', dateien[0]!), 'utf8'));
    expect(lauf.vorschlaege.map((v: { id: string }) => v.id)).toEqual(['aie-v-caching', 'aie-v-dublette']);
    expect(lauf.vorschlaege[1].dublettVon).toBe('aie-token');
    expect(lauf.vorschlaege[0]).toMatchObject({ quelle: 'Video: Caching', status: 'offen', erklaerhilfe: expect.stringContaining('Stammkunde') });
    expect(lauf.vorschlaege[1]).not.toHaveProperty('erklaerhilfe');
    expect(lauf.ideen).toEqual([expect.objectContaining({ titel: 'Cache als Stempelkarte', art: 'vergleich', quelle: 'Video: Caching', id: expect.stringMatching(/-i1$/) })]);
    const logs = readdirSync(join(wurzel, 'agents/video-tutor/laeufe'));
    const log = JSON.parse(readFileSync(join(wurzel, 'agents/video-tutor/laeufe', logs[0]!), 'utf8'));
    expect(log).toMatchObject({ exitCode: 0, quelle: 'Video: Caching', zaehlung: { roh: 4, gueltig: 2, ungueltig: 2, dubletten: 1 } });
    expect(log.hash).toMatch(/^[a-f0-9]{64}$/);
  });
  test('versteht auch Text mit Code-Zaun statt structured_output', () => {
    const roh = parseClaudeAusgabe(JSON.stringify({ result: '```json\n{"vorschlaege":[{"id":"a"}]}\n```' }));
    expect(roh.vorschlaege).toHaveLength(1);
    expect(roh.ideen).toEqual([]);
    expect(() => parseClaudeAusgabe(JSON.stringify({ is_error: true, result: 'Limit' }))).toThrow('Limit');
  });
  test('Absturz von claude wird geloggt und bricht ab', async () => {
    const r = await starte([join(wurzel, 'transkript.txt'), '--quelle', 'x'], { CLAUDE_FAKE_MODUS: 'absturz' });
    expect(r.code).toBe(3);
    expect(r.err).toContain('claude endete mit Code 3');
  });
  test('Fehlerantwort von claude bricht ab', async () => {
    const r = await starte([join(wurzel, 'transkript.txt'), '--quelle', 'x'], { CLAUDE_FAKE_MODUS: 'fehler' });
    expect(r.code).toBe(1);
    expect(r.err).toContain('Limit erreicht');
  });
  test('ohne --quelle oder Datei bricht der Tutor vor dem Modell ab', async () => {
    expect((await starte([join(wurzel, 'transkript.txt')])).err).toContain('--quelle');
    expect((await starte([join(wurzel, 'gibtsnicht.txt'), '--quelle', 'x'])).err).toContain('nicht gefunden');
  });
});

describe('Eingaben', () => {
  test('parseArgs prüft den Track', () => {
    expect(parseArgs(['a.txt', '--quelle', 'Q', '--track', 'fde'])).toEqual({ datei: 'a.txt', quelle: 'Q', track: 'fde' });
    expect(parseArgs(['https://youtu.be/dQw4w9WgXcQ'])).toEqual({ datei: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(() => parseArgs(['a.txt', '--quelle', 'Q', '--track', 'xyz'])).toThrow();
  });
  test('liesTranskript lehnt zu große und binäre Dateien ab', () => {
    const gross = join(wurzel, 'gross.txt');
    writeFileSync(gross, 'x'.repeat(401 * 1024));
    expect(() => liesTranskript(gross, 400)).toThrow('zu groß');
    const binaer = join(wurzel, 'bild.bin');
    writeFileSync(binaer, Buffer.from([0x89, 0x50, 0x00, 0x01]));
    expect(() => liesTranskript(binaer, 400)).toThrow('keine Textdatei');
    expect(() => liesTranskript(wurzel, 400)).toThrow('nicht gefunden');
  });
});

describe('YouTube', () => {
  test('youtubeId erkennt nur echte YouTube-Links', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('transkript.txt')).toBeUndefined();
    expect(youtubeId('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(youtubeId('https://www.youtube.com/watch?v=--rm -rf /')).toBeUndefined();
    expect(youtubeId('file:///etc/passwd')).toBeUndefined();
  });
  test('vttZuText entfernt Zeitstempel, Tags und Wiederholungen', () => {
    const vtt = 'WEBVTT\nKind: captions\nLanguage: de\n\n00:00:00.000 --> 00:00:02.000 align:start\nHallo<00:00:01.000><c> Welt</c>\n\n00:00:02.000 --> 00:00:03.000\nHallo Welt\nZweite &amp; Zeile\n';
    expect(vttZuText(vtt)).toBe('Hallo Welt\nZweite & Zeile');
  });
  test('waehleSpur nimmt manuelle de/en, sonst die Originalspur, nie eine Übersetzung', () => {
    const auto = { 'en-orig': [{}], en: [{}], de: [{}], fr: [{}] };
    expect(waehleSpur({ language: 'en', subtitles: { 'en-US': [{}] }, automatic_captions: auto })).toEqual({ sprache: 'en-US', auto: false });
    expect(waehleSpur({ language: 'en', subtitles: { de: [{}], en: [{}] } })).toEqual({ sprache: 'de', auto: false });
    expect(waehleSpur({ language: 'en', subtitles: {}, automatic_captions: auto })).toEqual({ sprache: 'en-orig', auto: true });
    expect(waehleSpur({ language: 'de', automatic_captions: { de: [{}], en: [{}] } })).toEqual({ sprache: 'de', auto: true });
    expect(waehleSpur({ language: 'en', subtitles: { live_chat: [{}] }, automatic_captions: { de: [{}] } })).toBeUndefined();
    expect(waehleSpur({ automatic_captions: auto })).toBeUndefined();
  });
  test('ohne yt-dlp gibt es einen klaren Hinweis', async () => {
    const r = await starte(['https://youtu.be/dQw4w9WgXcQ', '--track', 'aie'], { KL_YTDLP_BIN: join(wurzel, 'gibt-es-nicht') });
    expect(r.code).toBe(1);
    expect(r.err).toContain('yt-dlp ist nicht installiert');
  });
});

describe('Mini-Mandat', () => {
  test('Schreibversuche außerhalb des erlaubten Ordners scheitern', () => {
    const erlaubt = join(wurzel, 'inhalt/vorschlaege');
    expect(() => pruefeMandat(join(erlaubt, '../karten/aie/boese.json'), erlaubt)).toThrow(MandatsFehler);
    expect(() => schreibeMitMandat(join(wurzel, 'boese.json'), {}, erlaubt)).toThrow(MandatsFehler);
    expect(() => pruefeMandat(`${erlaubt}-nachbar/x.json`, erlaubt)).toThrow(MandatsFehler);
    expect(() => pruefeMandat(erlaubt, erlaubt)).toThrow(MandatsFehler);
    expect(schreibeMitMandat(join(erlaubt, 'ok.json'), { a: 1 }, erlaubt)).toBe(join(erlaubt, 'ok.json'));
  });
});

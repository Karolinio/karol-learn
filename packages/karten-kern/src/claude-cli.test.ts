import { describe, expect, test } from 'vitest';
import { claudeArgumente, claudeUmgebung, entpackeClaudeAusgabe } from './claude-cli';

describe('claudeArgumente', () => {
  test('ohne Tools, ohne MCP, ohne Sitzung, ohne fremde Einstellungen und Slash-Befehle, Antwort nach Schema', () => {
    expect(claudeArgumente('{"type":"object"}', 'sonnet')).toEqual([
      '-p',
      '--output-format', 'json',
      '--json-schema', '{"type":"object"}',
      '--model', 'sonnet',
      '--tools', '',
      '--strict-mcp-config',
      '--no-session-persistence',
      '--setting-sources', 'project',
      '--disable-slash-commands',
    ]);
  });
  test('nie --bare: das verlangt einen API-Schlüssel statt Karols Abo', () => {
    expect(claudeArgumente('{}', 'sonnet')).not.toContain('--bare');
  });
});

describe('claudeUmgebung', () => {
  test('lässt nur die Allowlist durch', () => {
    const env = {
      PATH: '/bin', HOME: '/h', USER: 'k', LOGNAME: 'k', SHELL: '/bin/zsh', LANG: 'de_DE.UTF-8', LC_ALL: 'de', LC_CTYPE: 'x',
      TMPDIR: '/t', TERM: 'xterm', ANTHROPIC_BASE_URL: 'a', CLAUDE_CONFIG_DIR: 'c',
      KL_WURZEL: '/repo', GEHEIM: '1', NODE_OPTIONS: '--require x', AWS_SECRET_ACCESS_KEY: 's', LEER: undefined,
    };
    expect(Object.keys(claudeUmgebung(env)).sort()).toEqual([
      'ANTHROPIC_BASE_URL', 'CLAUDE_CONFIG_DIR', 'HOME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'LOGNAME', 'PATH', 'SHELL', 'TERM', 'TMPDIR', 'USER',
    ]);
  });
  test('fehlende Werte fallen weg, die Eingabe bleibt unverändert', () => {
    const env = Object.freeze({ PATH: '/bin', HOME: undefined });
    expect(claudeUmgebung(env)).toEqual({ PATH: '/bin' });
  });
});

describe('entpackeClaudeAusgabe', () => {
  test('nimmt structured_output aus der Hülle', () => {
    expect(entpackeClaudeAusgabe(JSON.stringify({ type: 'result', is_error: false, result: '', structured_output: { a: 1 } }))).toEqual({ a: 1 });
  });
  test('versteht Text mit und ohne Code-Zaun', () => {
    expect(entpackeClaudeAusgabe(JSON.stringify({ result: '```json\n{"a":2}\n```' }))).toEqual({ a: 2 });
    expect(entpackeClaudeAusgabe(JSON.stringify({ result: ' {"a":3} ' }))).toEqual({ a: 3 });
  });
  test('ein Objekt als result wird durchgereicht', () => {
    expect(entpackeClaudeAusgabe(JSON.stringify({ result: { a: 4 } }))).toEqual({ a: 4 });
  });
  test('is_error wird zum Fehler mit der Meldung', () => {
    expect(() => entpackeClaudeAusgabe(JSON.stringify({ is_error: true, result: 'Limit erreicht' }))).toThrow('Limit erreicht');
    expect(() => entpackeClaudeAusgabe(JSON.stringify({ is_error: true }))).toThrow('claude meldet Fehler');
  });
  test('kaputtes JSON wirft', () => {
    expect(() => entpackeClaudeAusgabe('kein json')).toThrow();
    expect(() => entpackeClaudeAusgabe(JSON.stringify({ result: 'auch kein json' }))).toThrow();
    expect(() => entpackeClaudeAusgabe('null')).toThrow('Hülle');
  });
});

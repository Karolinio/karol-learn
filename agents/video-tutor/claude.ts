import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claudeArgumente, claudeUmgebung } from '@karol-learn/karten-kern';

export interface ClaudeErgebnis { exitCode: number; stdout: string; stderr: string }

/**
 * Ruft `claude -p` ohne Shell und ohne Tools auf; der Prompt geht über stdin.
 * Isoliert: frischer leerer Arbeitsordner (danach gelöscht), Umgebung nur als Allowlist, siehe claude-cli.ts.
 */
export function rufeClaude(bin: string, prompt: string, schema: string, modell: string, timeoutMs: number): Promise<ClaudeErgebnis> {
  const cwd = mkdtempSync(join(tmpdir(), 'kl-claude-'));
  return new Promise((ok) => {
    const optionen = { cwd, env: claudeUmgebung(process.env), timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true };
    const kind = execFile(bin, claudeArgumente(schema, modell), optionen, (fehler, stdout, stderr) => {
      rmSync(cwd, { recursive: true, force: true });
      const code = fehler ? (typeof (fehler as NodeJS.ErrnoException & { code?: unknown }).code === 'number' ? Number((fehler as { code?: unknown }).code) : 1) : 0;
      const zusatz = fehler && fehler.killed ? '\nZeitlimit überschritten' : fehler && code === 1 && !stderr ? `\n${fehler.message}` : '';
      ok({ exitCode: code, stdout: String(stdout), stderr: `${String(stderr)}${zusatz}` });
    });
    kind.stdin?.on('error', () => { /* Prozess beendet, bevor stdin fertig war: Fehler kommt über den Callback */ });
    kind.stdin?.end(prompt);
  });
}

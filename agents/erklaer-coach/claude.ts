import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claudeArgumente, claudeUmgebung } from '@karol-learn/karten-kern';

export type ClaudeLauf =
  | { art: 'ok'; stdout: string }
  | { art: 'claude_fehlt' | 'zeit' | 'claude_fehler' | 'ausgabe'; meldung: string };

const MAX_AUSGABE = 2 * 1024 * 1024;

/**
 * Ruft `claude -p` ohne Shell und ohne Tools; der Prompt geht über stdin.
 * Isoliert: frischer leerer Arbeitsordner (danach gelöscht), Umgebung nur als Allowlist, siehe claude-cli.ts.
 * Bewusst doppelt zum Video-Tutor (Agenten importieren einander nicht), unterscheidet aber fehlendes claude, Zeit, Puffer und Exit-Code.
 * Mit `signal` endet claude, sobald der Coach selbst beendet wird.
 */
export function rufeClaude(bin: string, prompt: string, schema: string, modell: string, timeoutMs: number, signal?: AbortSignal): Promise<ClaudeLauf> {
  const cwd = mkdtempSync(join(tmpdir(), 'kl-claude-'));
  return new Promise((ok) => {
    const optionen = { cwd, env: claudeUmgebung(process.env), timeout: timeoutMs, maxBuffer: MAX_AUSGABE, windowsHide: true, ...(signal ? { signal } : {}) };
    const kind = execFile(bin, claudeArgumente(schema, modell), optionen, (fehler, stdout) => {
      rmSync(cwd, { recursive: true, force: true });
      if (!fehler) { ok({ art: 'ok', stdout: String(stdout) }); return; }
      const code = (fehler as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') ok({ art: 'claude_fehlt', meldung: 'claude ist nicht installiert oder nicht im PATH' });
      else if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') ok({ art: 'ausgabe', meldung: 'Antwort von claude ist zu groß' });
      else if (signal?.aborted) ok({ art: 'claude_fehler', meldung: 'abgebrochen' });
      else if (fehler.killed) ok({ art: 'zeit', meldung: `claude hat nach ${Math.round(timeoutMs / 1000)} s nicht geantwortet` });
      else ok({ art: 'claude_fehler', meldung: `claude endete mit Code ${String(code)}` });
    });
    kind.stdin?.on('error', () => { /* Prozess beendet, bevor stdin fertig war: Fehler kommt über den Callback */ });
    kind.stdin?.end(prompt);
  });
}

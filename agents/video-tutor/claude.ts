import { execFile } from 'node:child_process';

export interface ClaudeErgebnis { exitCode: number; stdout: string; stderr: string }

/** Ruft `claude -p` ohne Shell und ohne Tools auf; der Prompt geht über stdin. */
export function rufeClaude(bin: string, prompt: string, schema: string, modell: string, timeoutMs: number): Promise<ClaudeErgebnis> {
  const args = [
    '-p',
    '--output-format', 'json',
    '--json-schema', schema,
    '--model', modell,
    '--tools', '',
    '--strict-mcp-config',
    '--no-session-persistence',
  ];
  return new Promise((ok) => {
    const kind = execFile(bin, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (fehler, stdout, stderr) => {
      const code = fehler ? (typeof (fehler as NodeJS.ErrnoException & { code?: unknown }).code === 'number' ? Number((fehler as { code?: unknown }).code) : 1) : 0;
      const zusatz = fehler && fehler.killed ? '\nZeitlimit überschritten' : fehler && code === 1 && !stderr ? `\n${fehler.message}` : '';
      ok({ exitCode: code, stdout: String(stdout), stderr: `${String(stderr)}${zusatz}` });
    });
    kind.stdin?.on('error', () => { /* Prozess beendet, bevor stdin fertig war: Fehler kommt über den Callback */ });
    kind.stdin?.end(prompt);
  });
}

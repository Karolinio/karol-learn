/** Die eine Stelle, die Aufruf und Ausgabeformat von `claude -p --output-format json` kennt. Pur. */

/**
 * Argumente für `claude -p`: ohne Tools, ohne MCP, ohne Sitzung, Antwort nach Schema. Prompt geht über stdin.
 * `--setting-sources project` in einem leeren Arbeitsordner lädt keine Projekt- oder User-Einstellungen und keine Hooks.
 * Bewusst nicht `--bare`: das verlangt ANTHROPIC_API_KEY und bricht Karols Abo-Login.
 */
export function claudeArgumente(schema: string, modell: string): string[] {
  return [
    '-p',
    '--output-format', 'json',
    '--json-schema', schema,
    '--model', modell,
    '--tools', '',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--setting-sources', 'project',
    '--disable-slash-commands',
  ];
}

const ERLAUBT = new Set(['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'TMPDIR', 'TERM']);
const ERLAUBTE_PRAEFIXE = ['LC_', 'ANTHROPIC_', 'CLAUDE_'] as const;

/** Umgebung für den claude-Prozess als Allowlist: Grundvariablen, Locale, Auth und Config von claude. Sonst nichts. */
export function claudeUmgebung(env: Readonly<Record<string, string | undefined>>): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => {
    const [k, v] = e;
    return v !== undefined && (ERLAUBT.has(k) || ERLAUBTE_PRAEFIXE.some((p) => k.startsWith(p)));
  }));
}

function ohneZaun(text: string): string {
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (m?.[1] ?? text).trim();
}

interface Huelle { is_error?: boolean; result?: unknown; structured_output?: unknown }

/** Packt die Nutzlast aus der Hülle: structured_output, sonst result (Text mit oder ohne Code-Zaun). Wirft bei Fehlern. */
export function entpackeClaudeAusgabe(stdout: string): unknown {
  const huelle = JSON.parse(stdout) as Huelle | null;
  if (!huelle || typeof huelle !== 'object') throw new Error('claude-Ausgabe ist keine Hülle');
  if (huelle.is_error) throw new Error(`claude meldet Fehler: ${String(huelle.result ?? '')}`.slice(0, 500));
  if (huelle.structured_output !== undefined) return huelle.structured_output;
  return typeof huelle.result === 'string' ? JSON.parse(ohneZaun(huelle.result)) : huelle.result;
}

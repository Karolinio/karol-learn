import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const HIER = dirname(fileURLToPath(import.meta.url));

export const agentSchema = z.object({
  log_pfad: z.string().min(1),
  timeout_s: z.number().int().min(1).max(600),
  max_text_zeichen: z.number().int().min(20).max(1200),
  modell: z.string().min(1),
});
export type AgentKonfig = z.infer<typeof agentSchema>;

export interface Umgebung { wurzel: string; claudeBin: string; konfig: AgentKonfig; prompt: string; schema: string; timeoutMs: number }

/** Liest agent.json, prompt.md und das Schema. KL_WURZEL und KL_COACH_TIMEOUT_MS sind nur für Tests. */
export function ladeUmgebung(env: NodeJS.ProcessEnv = process.env): Umgebung {
  const konfig = agentSchema.parse(JSON.parse(readFileSync(join(HIER, 'agent.json'), 'utf8')));
  const testZeit = Number(env.KL_COACH_TIMEOUT_MS);
  return {
    wurzel: resolve(env.KL_WURZEL ?? join(HIER, '../..')),
    claudeBin: env.KL_CLAUDE_BIN || 'claude',
    konfig,
    prompt: readFileSync(join(HIER, 'prompt.md'), 'utf8'),
    schema: JSON.stringify(JSON.parse(readFileSync(join(HIER, 'schema/bewertung.schema.json'), 'utf8'))),
    timeoutMs: Number.isFinite(testZeit) && testZeit > 0 ? testZeit : konfig.timeout_s * 1000,
  };
}

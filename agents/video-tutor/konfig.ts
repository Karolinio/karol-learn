import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const HIER = dirname(fileURLToPath(import.meta.url));

export const agentSchema = z.object({
  max_vorschlaege: z.number().int().min(1).max(100),
  erlaubter_schreibpfad: z.string().min(1),
  log_pfad: z.string().min(1),
  timeout_s: z.number().int().min(1).max(1800),
  max_transkript_kb: z.number().int().min(1),
  modell: z.string().min(1),
});
export type AgentKonfig = z.infer<typeof agentSchema>;

export interface Umgebung { wurzel: string; claudeBin: string; ytdlpBin: string; konfig: AgentKonfig; prompt: string; schema: string }

/** Liest agent.json, prompt.md und das Schema. KL_WURZEL überschreibt die Repo-Wurzel (für Tests). */
export function ladeUmgebung(env: NodeJS.ProcessEnv = process.env): Umgebung {
  const wurzel = resolve(env.KL_WURZEL ?? join(HIER, '../..'));
  const konfig = agentSchema.parse(JSON.parse(readFileSync(join(HIER, 'agent.json'), 'utf8')));
  return {
    wurzel,
    claudeBin: env.KL_CLAUDE_BIN || 'claude',
    ytdlpBin: env.KL_YTDLP_BIN || 'yt-dlp',
    konfig,
    prompt: readFileSync(join(HIER, 'prompt.md'), 'utf8'),
    schema: JSON.stringify(JSON.parse(readFileSync(join(HIER, 'schema/vorschlag.schema.json'), 'utf8'))),
  };
}

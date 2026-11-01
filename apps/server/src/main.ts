import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baueServer } from './app';

const HOST = '127.0.0.1';
const port = Number(process.env.KL_PORT ?? 8810);
const origins = (process.env.KL_ORIGIN ?? 'http://127.0.0.1:5180,http://localhost:5180').split(',').map((s) => s.trim());
const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const inhalt = resolve(wurzel, 'inhalt');
/** Erklär-Coach: fester Pfad, ohne Shell. Kindprozess-Limit 75 s (claude selbst 60 s, App wartet 90 s). */
const coach = {
  befehl: resolve(wurzel, 'node_modules/.bin/tsx'),
  args: [resolve(wurzel, 'agents/erklaer-coach/run.ts')],
  timeoutMs: 75_000,
};
const log = (z: string) => process.stderr.write(`[server] ${z}\n`);

const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];

baueServer({ inhalt, origins, hosts, coach }, log).listen(port, HOST, () => log(`läuft auf http://${HOST}:${port} (Inhalt: ${inhalt})`));

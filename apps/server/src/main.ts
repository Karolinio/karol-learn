import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baueServer } from './app';

const HOST = '127.0.0.1';
const port = Number(process.env.KL_PORT ?? 8810);
const origins = (process.env.KL_ORIGIN ?? 'http://127.0.0.1:5180,http://localhost:5180').split(',').map((s) => s.trim());
const inhalt = resolve(dirname(fileURLToPath(import.meta.url)), '../../../inhalt');
const log = (z: string) => process.stderr.write(`[server] ${z}\n`);

const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];

baueServer({ inhalt, origins, hosts }, log).listen(port, HOST, () => log(`läuft auf http://${HOST}:${port} (Inhalt: ${inhalt})`));

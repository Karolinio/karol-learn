import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { WURZEL } from './lib';

// Startet den fertigen Build im WLAN, damit das Handy ihn öffnen kann. Kein Deployment.
const PORT = Number(process.env.KL_HANDY_PORT ?? 4190);

function lanAdressen(): string[] {
  return Object.values(networkInterfaces()).flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address);
}

const adressen = lanAdressen();
const zeilen = adressen.length
  ? adressen.map((a) => `  http://${a}:${PORT}/`)
  : ['  (keine LAN-Adresse gefunden: ist das WLAN an?)'];
process.stdout.write([
  '',
  'Aufs Handy: gleiches WLAN, in Safari öffnen:',
  ...zeilen,
  'Dann Teilen → Zum Home-Bildschirm. Über http im LAN gibt es keinen Offline-Modus.',
  'Beenden mit Ctrl+C.',
  '',
].join('\n'));

const kind = spawn('npx', ['vite', 'preview', '--host', '0.0.0.0', '--port', String(PORT), '--strictPort'], {
  cwd: join(WURZEL, 'apps/web'),
  stdio: 'inherit',
});
kind.on('exit', (code) => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => kind.kill('SIGINT'));

import { execFileSync } from 'node:child_process';
import { pruefeStruktur } from './struktur';
import { WURZEL } from './lib';

// Was git versionieren würde: getrackt plus neu, ohne .gitignore-Treffer.
const ausgabe = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: WURZEL, encoding: 'utf8' });
const dateien = ausgabe.split('\0').filter(Boolean);
const fehler = pruefeStruktur(dateien);
if (fehler.length) {
  process.stderr.write(`struktur: ${fehler.length} Verstöße gegen docs/STRUKTUR.md\n${fehler.map((f) => `  ${f}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`struktur: grün, ${dateien.length} Dateien geprüft\n`);
}

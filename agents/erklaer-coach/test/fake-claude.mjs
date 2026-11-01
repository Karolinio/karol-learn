#!/usr/bin/env node
// Fake-claude für Tests des Erklär-Coachs. Liest stdin, schreibt Argumente, Prompt, Arbeitsordner und
// Umgebungs-Schlüssel nach CLAUDE_FAKE_PROTOKOLL und seine PID nach CLAUDE_FAKE_PID_DATEI.
// Antwortet je nach CLAUDE_FAKE_MODUS: gut, text, fehler, absturz, kaputt, schemafalsch, langsam, lang.
// Präfix CLAUDE_, weil der Coach claude nur eine Allowlist der Umgebung gibt.
import { writeFileSync } from 'node:fs';

// Kernpunkte 1-basiert, wie im Auftrag nummeriert.
const BEWERTUNG = {
  urteil: 'Richtig und greifbar, aber die Kosten fehlen.',
  kriterien: {
    richtigkeit: { punkte: 3, satz: 'Alles stimmt.' },
    vollstaendigkeit: { punkte: 2, satz: 'Dass nach Tokens abgerechnet wird, fehlt.' },
    verstaendlichkeit: { punkte: 3, satz: '„Wortstück“ versteht jeder.' },
    kuerze: { punkte: 2, satz: 'Der zweite Satz wiederholt den ersten.' },
  },
  falscheAussagen: [],
  fehlendeKernpunkte: [2],
  besserSatz: 'Ein Token ist ein Wortstück. Danach rechnet der Anbieter ab.',
  nachfrage: 'Und was heißt das für meine Rechnung?',
};
const lang = (n) => 'sehr langes Wort '.repeat(n).trim();
const LANG = {
  ...BEWERTUNG, urteil: lang(20), besserSatz: lang(30), nachfrage: lang(20), fehlendeKernpunkte: [2, 9, 0],
  kriterien: { ...BEWERTUNG.kriterien, kuerze: { punkte: 1, satz: lang(20) } },
  falscheAussagen: [{ zitat: lang(20), korrektur: lang(25) }],
};

if (process.env.CLAUDE_FAKE_PID_DATEI) writeFileSync(process.env.CLAUDE_FAKE_PID_DATEI, String(process.pid));
let prompt = '';
process.stdin.on('data', (d) => (prompt += d));
process.stdin.on('end', () => {
  if (process.env.CLAUDE_FAKE_PROTOKOLL) {
    writeFileSync(process.env.CLAUDE_FAKE_PROTOKOLL, JSON.stringify({ args: process.argv.slice(2), prompt, cwd: process.cwd(), env: Object.keys(process.env) }));
  }
  const modus = process.env.CLAUDE_FAKE_MODUS ?? 'gut';
  if (modus === 'absturz') { process.stderr.write('kaputt /geheimer/pfad'); process.exit(3); }
  if (modus === 'kaputt') { process.stdout.write('das ist kein JSON'); return; }
  if (modus === 'langsam') { setTimeout(() => process.stdout.write(JSON.stringify({ structured_output: BEWERTUNG })), 30_000); return; }
  const ausgabe = modus === 'text'
    ? { type: 'result', is_error: false, result: '```json\n' + JSON.stringify(BEWERTUNG) + '\n```' }
    : modus === 'fehler' ? { type: 'result', is_error: true, result: 'Limit erreicht' }
    : modus === 'schemafalsch' ? { type: 'result', is_error: false, structured_output: { ...BEWERTUNG, kriterien: { richtigkeit: { punkte: 7, satz: 'x' } } } }
    : { type: 'result', is_error: false, result: '', structured_output: modus === 'lang' ? LANG : BEWERTUNG };
  process.stdout.write(JSON.stringify(ausgabe));
});

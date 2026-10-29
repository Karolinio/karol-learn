#!/usr/bin/env node
// Fake-claude für Tests: liest stdin, schreibt Argumente und Prompt nach FAKE_CLAUDE_PROTOKOLL,
// antwortet je nach FAKE_CLAUDE_MODUS.
import { writeFileSync } from 'node:fs';
let prompt = '';
process.stdin.on('data', (d) => (prompt += d));
process.stdin.on('end', () => {
  if (process.env.FAKE_CLAUDE_PROTOKOLL) writeFileSync(process.env.FAKE_CLAUDE_PROTOKOLL, JSON.stringify({ args: process.argv.slice(2), prompt }));
  const modus = process.env.FAKE_CLAUDE_MODUS ?? 'gut';
  if (modus === 'absturz') { process.stderr.write('kaputt'); process.exit(3); }
  const vorschlaege = [
    { id: 'aie-v-caching', track: 'aie', thema: 'Kosten', stufe: 1, frage: 'Was spart Prompt Caching?', antwort: 'Wiederholte Prompt-Anfänge werden billiger.', erklaerhilfe: 'Wie ein Stammkunde, der seine Bestellung nicht neu erklären muss.', begruendung: 'Kosten.' },
    { id: 'aie-v-dublette', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Was ist ein Token?', antwort: 'Ein Textstück.', begruendung: 'Grundlage.' },
    { id: 'falsch', track: 'aie', thema: 'Modelle', stufe: 1, frage: 'Ohne Präfix?', antwort: 'x', begruendung: '' },
    { id: 'aie-v-lang', track: 'aie', thema: 'Modelle', stufe: 2, frage: 'x'.repeat(200), antwort: 'x', begruendung: '' },
  ];
  const ideen = [
    { titel: 'Cache als Stempelkarte', art: 'vergleich', beschreibung: 'Der gleiche Anfang wird nur einmal voll bezahlt.', track: 'aie', thema: 'Kosten' },
    { titel: 'Falscher Track', art: 'skizze', beschreibung: 'x', track: 'fde', thema: 'Rolle' },
    { titel: '', art: 'uebung', beschreibung: 'leerer Titel', track: 'aie', thema: 'Kosten' },
  ];
  const ausgabe = modus === 'text'
    ? { type: 'result', is_error: false, result: '```json\n' + JSON.stringify({ vorschlaege, ideen }) + '\n```' }
    : modus === 'fehler' ? { type: 'result', is_error: true, result: 'Limit erreicht' }
    : { type: 'result', is_error: false, result: '', structured_output: { vorschlaege, ideen } };
  process.stdout.write(JSON.stringify(ausgabe));
});

import type { HarnessRegler, Skript, SkriptRunde, Szenario } from './labor-typen';

// Kleine, handrechenbare Bausteine für die Labor-Tests. Kein Teil der App.

export const reglerBasis: HarnessRegler = {
  toolAnzahl: 2, maxRunden: null, kontextLimit: 100_000, gateway: false, caching: false, fehlerDurchreichen: false,
};

export const runde = (tool: string, args: string, ergebnis = 500, teil: Partial<SkriptRunde> = {}): SkriptRunde => ({
  denken: { text: `Ich rufe ${tool} auf.`, tokens: 50 },
  bitte: { tool, args, tokens: 30 },
  ergebnis: { text: `Ergebnis von ${tool}`, tokens: ergebnis },
  ...teil,
});

export const schluss: SkriptRunde = { denken: { text: 'Fertig: hier ist die Antwort.', tokens: 100 }, fertig: true };

export const skriptBasis: Skript = {
  system: { text: 'Du bist ein Support-Agent.', tokens: 1000 },
  user: { text: 'Wo ist Bestellung 4711?', tokens: 100 },
  tools: [
    { name: 'suche_bestellung', beschreibung: 'Sucht eine Bestellung.', tokens: 200 },
    { name: 'sende_mail', beschreibung: 'Sendet eine Mail.', tokens: 300 },
    { name: 'lies_dokument', beschreibung: 'Liest ein Dokument.', tokens: 400 },
  ],
  runden: [runde('suche_bestellung', '{"nr":"4711"}'), schluss],
};

export const szenarioBasis: Szenario = {
  id: 'aie-labor-test',
  track: 'aie',
  themen: ['Tool-Schleife'],
  titel: 'Testfall',
  symptom: 'Der Agent hört nicht auf.',
  skript: { ...skriptBasis, runden: [], schleife: runde('suche_bestellung', '{"nr":"4711"}') },
  regler: reglerBasis,
  ursachen: [
    { id: 'u1', text: 'Kein Limit', richtig: true, warum: 'Ohne Limit läuft die Schleife weiter.' },
    { id: 'u2', text: 'Fenster zu klein', richtig: false, warum: 'Das Fenster ist nicht voll.' },
    { id: 'u3', text: 'Modell zu schwach', richtig: false, warum: 'Das Modell tut, was der Ablauf zulässt.' },
  ],
  reparaturen: [
    { id: 'r1', text: 'Limit setzen', richtig: true, warum: 'Das Limit beendet die Schleife.', regler: { maxRunden: 5, gleicheBitteMax: 2 } },
    { id: 'r2', text: 'Größeres Fenster', richtig: false, warum: 'Mehr Platz, gleiche Schleife.', regler: { kontextLimit: 200_000 } },
    { id: 'r3', text: 'Anderes Modell', richtig: false, warum: 'Das Modell stoppt keine Schleife.', wirkungslos: true },
  ],
  karten: ['aie-endlosschleife'],
  beweis: { metrik: 'ende', erwartet: 'wiederholung' },
};

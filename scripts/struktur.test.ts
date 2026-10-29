import { describe, expect, test } from 'vitest';
import { pruefeStruktur } from './struktur';

const sauber = [
  'README.md', 'AGENTS.md', 'package.json', '.gitignore', '.githooks/pre-commit',
  'agents/video-tutor/agent.json', 'agents/video-tutor/prompt.md', 'agents/video-tutor/README.md', 'agents/video-tutor/run.ts',
  'apps/web/package.json', 'apps/web/src/App.tsx',
  'packages/karten-kern/package.json', 'packages/karten-kern/src/index.ts',
  'inhalt/karten/aie/mcp.json', 'inhalt/karten/fde/wiya.json', 'inhalt/roadmap/aie.json', 'inhalt/meta.json',
  'inhalt/bilder/themen/aie-mcp.webp', 'inhalt/bilder/herkunft.json', 'inhalt/rohbestand/eingang.json', 'inhalt/vorschlaege/.gitkeep',
  'scripts/pruefen.ts', 'scripts/struktur.test.ts', 'docs/STRUKTUR.md', 'docs/screenshots/heute-375.png',
];

describe('pruefeStruktur', () => {
  test('sauberer Baum ist grün', () => {
    expect(pruefeStruktur(sauber)).toEqual([]);
  });
  test('lose Datei und fremder Ordner in der Wurzel', () => {
    const f = pruefeStruktur([...sauber, 'notizen.txt', 'tmp/x.json']);
    expect(f).toHaveLength(2);
    expect(f[0]).toMatch(/notizen\.txt: lose Datei/);
    expect(f[1]).toMatch(/tmp\/: Ordner in der Wurzel/);
  });
  test('Agent ohne README, prompt.md oder agent.json', () => {
    const f = pruefeStruktur([...sauber, 'agents/neu/agent.json', 'agents/neu/run.ts']);
    expect(f).toEqual(['agents/neu/: es fehlt prompt.md, README.md']);
  });
  test('inhalt/karten erlaubt nur aie und fde', () => {
    expect(pruefeStruktur([...sauber, 'inhalt/karten/xyz/a.json'])[0]).toMatch(/nur aie\/ und fde\//);
    expect(pruefeStruktur([...sauber, 'inhalt/karten/aie/Gross Schrift.json'])[0]).toMatch(/nur <slug>\.json/);
  });
  test('Bilder nur nach Namensregel, keine fremden Ordner in inhalt/', () => {
    expect(pruefeStruktur([...sauber, 'inhalt/bilder/themen/foto.png'])[0]).toMatch(/<track>-<slug>\.webp/);
    expect(pruefeStruktur([...sauber, 'inhalt/entwuerfe/a.json'])[0]).toMatch(/nicht vorgesehen/);
  });
  test('Skripte flach, docs nur Markdown und Screenshots', () => {
    expect(pruefeStruktur([...sauber, 'scripts/alt/x.ts'])).toHaveLength(1);
    expect(pruefeStruktur([...sauber, 'docs/notiz.txt'])).toHaveLength(1);
    expect(pruefeStruktur([...sauber, 'docs/screenshots/a.jpg'])).toHaveLength(1);
  });
  test('Paket ohne src/index.ts und App ohne package.json', () => {
    expect(pruefeStruktur([...sauber, 'packages/neu/package.json'])).toEqual(['packages/neu/: es fehlt src/index.ts']);
    expect(pruefeStruktur([...sauber, 'apps/neu/index.html'])).toEqual(['apps/neu/: es fehlt package.json']);
  });
});

import { macheSkizze } from './mache';
import { Kasten, Pfeil } from './teile';

export const rag = macheSkizze({
  id: 'rag',
  titel: 'RAG: suchen, dann antworten',
  track: 'aie',
  themen: ['Wissen & RAG'],
  kurztext: 'Oben das Einlesen, unten der Weg einer Frage bis zur Antwort mit Beleg.',
  viewBox: '0 0 360 470',
  schritte: [
    { titel: 'Dokumente', text: 'Vorher, einmal: Die Dokumente des Kunden werden eingelesen, z. B. PDFs, Wiki-Seiten, Mails.', karte: 'aie-rag', fokus: ['doku'] },
    { titel: 'Stücke', text: 'Sie werden in Stücke (Chunks) geteilt, am besten entlang von Überschriften.', karte: 'aie-chunking', fokus: ['stuecke', 'i1'] },
    { titel: 'Embeddings', text: 'Jedes Stück wird zu einem Embedding: einer Zahlenliste, die seine Bedeutung trägt.', karte: 'aie-embedding', fokus: ['emb', 'i2'] },
    { titel: 'Datenbank', text: 'Die Vektoren landen mit dem Text in einer Datenbank, z. B. Postgres mit pgvector.', karte: 'aie-s-rag-pgvector', fokus: ['db', 'i3'] },
    { titel: 'Frage als Vektor', text: 'Jetzt fragt jemand. Die Frage wird mit demselben Embedding-Modell zum Vektor.', karte: 'aie-s-rag-gleiches-modell', fokus: ['frage', 'qemb', 'q1'] },
    { titel: 'Suchen', text: 'Vektorsuche findet ähnliche Bedeutung, BM25 findet exakte Wörter wie Rechnungsnummern. Zusammen: Hybrid-Suche.', karte: 'aie-s-rag-hybrid-warum', fokus: ['suche', 'q2', 'p-db'] },
    { titel: 'Reranker', text: 'Ein Reranker liest Frage und Treffer zusammen und sortiert neu. Nur die besten bleiben.', karte: 'aie-reranker', fokus: ['rerank', 'q3'] },
    { titel: 'In den Kontext, dann Antwort', text: 'Die Top-Treffer kommen mit der Frage in den Kontext. Das Modell antwortet und nennt die Quelle.', karte: 'aie-s-rag-zitieren', fokus: ['kontext', 'antwort', 'q4', 'q5'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="ingest" x={6} y={6} b={348} h={112} titel="Vorher: einlesen" art="rahmen" r={20} />
      <Kasten id="doku" x={16} y={46} b={74} h={56} titel="Texte" unter="PDF, Wiki" r={10} />
      <Pfeil id="i1" ab={1} d="M92 74 L100 74" />
      <Kasten id="stuecke" ab={1} x={104} y={46} b={66} h={56} titel="Stücke" r={10} />
      <Pfeil id="i2" ab={2} d="M172 74 L180 74" />
      <Kasten id="emb" ab={2} x={184} y={46} b={78} h={56} titel="Vektoren" unter="Embeddings" r={10} />
      <Pfeil id="i3" ab={3} d="M264 74 L272 74" />
      <Kasten id="db" ab={3} x={276} y={46} b={70} h={56} titel="Postgres" unter="+ pgvector" r={10} />

      <Kasten id="frage" ab={4} x={16} y={144} b={150} h={46} titel="Frage" r={12} />
      <Pfeil id="q1" ab={4} d="M91 192 L91 206" />
      <Kasten id="qemb" ab={4} x={16} y={210} b={150} h={50} titel="Embedding" unter="Frage als Vektor" r={12} />
      <Pfeil id="q2" ab={5} d="M91 262 L91 276" />
      <Kasten id="suche" ab={5} x={16} y={280} b={150} h={54} titel="Vektorsuche" unter="+ BM25 (Wörter)" r={12} />
      <Pfeil id="p-db" ab={5} d="M311 104 C 311 210, 250 300, 172 306" gestrichelt />
      <Pfeil id="q3" ab={6} d="M91 336 L91 350" />
      <Kasten id="rerank" ab={6} x={16} y={354} b={150} h={50} titel="Reranker" unter="sortiert neu" r={12} />
      <Pfeil id="q4" ab={7} d="M168 380 L188 380" />
      <Kasten id="kontext" ab={7} x={192} y={354} b={152} h={50} titel="Kontext" unter="Top-Treffer + Frage" r={12} />
      <Pfeil id="q5" ab={7} d="M268 406 L268 414" />
      <Kasten id="antwort" ab={7} x={192} y={418} b={152} h={46} titel="Antwort" unter="mit Quelle" r={12} />
    </>
  ),
});

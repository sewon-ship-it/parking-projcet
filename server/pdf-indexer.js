import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export async function loadAllPdfs(dirPath) {
  const files = fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith(".pdf"))
    : [];
  const store = [];
  for (const fname of files) {
    const buf = fs.readFileSync(path.join(dirPath, fname));
    const data = await pdf(buf);
    const paragraphs = data.text.split(/\n\s*\n/g).map(t => t.trim()).filter(Boolean);
    store.push({ fname, paragraphs });
  }
  return store;
}

export function findSnippets(pdfStore, query, topK = 3) {
  const q = (query || "").toLowerCase();
  const scored = [];
  for (const doc of pdfStore) {
    for (const p of doc.paragraphs) {
      const s = score(p.toLowerCase(), q);
      if (s > 0) scored.push({ fname: doc.fname, text: p, score: s });
    }
  }
  return scored.sort((a,b)=>b.score-a.score).slice(0, topK);
}

function score(text, q) {
  const terms = q.split(/\s+/).filter(Boolean);
  let s = 0;
  for (const t of terms) if (text.includes(t)) s += 1;
  return s;
}


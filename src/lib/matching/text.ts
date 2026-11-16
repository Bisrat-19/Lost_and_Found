// Text processing + TF-IDF cosine similarity. No external dependencies.
import { COLOR_FILLER, COLOR_WORDS, STOPWORDS, WORD_SYNONYMS } from "./synonyms";

/** Very light stemming: plural "s" only. Aggressive stemmers mangle short words ("red" → "r"). */
function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (/(sses|xes|ches|shes)$/.test(word)) return word.slice(0, -2); // glasses → glass, boxes → box
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) {
    return word.slice(0, -1);
  }
  return word;
}

function rawWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/**
 * Description → meaningful, normalised tokens.
 * Removes stopwords and colour words (colour is scored separately, so counting
 * it here would double-count it), strips plurals, and maps synonyms.
 */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of rawWords(text)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    const word = singular(raw);
    if (STOPWORDS.has(word) || COLOR_WORDS[word] || COLOR_WORDS[raw] || COLOR_FILLER.has(word)) {
      continue;
    }
    out.push(WORD_SYNONYMS[word] ?? word);
  }
  return out;
}

/** First colour mentioned in free text ("dark-colored backpack" → "dark"), or null. */
export function colorFromText(text: string): string | null {
  for (const raw of rawWords(text)) {
    const c = COLOR_WORDS[raw];
    if (c) return c;
  }
  return null;
}

export type Idf = Map<string, number>;

/**
 * Inverse document frequency over a set of token lists.
 * Smoothed (like scikit-learn): idf = ln((1 + N) / (1 + df)) + 1.
 * Smoothing keeps words shared by *every* document above zero, which matters
 * when comparing just one lost report against one or two found reports.
 */
export function buildIdf(docs: readonly string[][]): Idf {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const n = docs.length;
  const idf: Idf = new Map();
  for (const [term, count] of df) idf.set(term, Math.log((1 + n) / (1 + count)) + 1);
  return idf;
}

type Vector = Map<string, number>;

/** TF-IDF vector. Sub-linear TF (1 + ln count) so repeated words don't dominate. */
export function tfidfVector(tokens: readonly string[], idf: Idf): Vector {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const vec: Vector = new Map();
  for (const [term, c] of counts) {
    vec.set(term, (1 + Math.log(c)) * (idf.get(term) ?? 1));
  }
  return vec;
}

/** Cosine similarity of two sparse vectors, 0 (nothing shared) to 1 (identical). */
export function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [term, w] of a) {
    na += w * w;
    const wb = b.get(term);
    if (wb) dot += w * wb;
  }
  for (const w of b.values()) nb += w * w;
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/** Terms present in both token lists (for "why it matched" explanations). */
export function sharedTerms(a: readonly string[], b: readonly string[]): string[] {
  const setB = new Set(b);
  return [...new Set(a)].filter((t) => setB.has(t));
}

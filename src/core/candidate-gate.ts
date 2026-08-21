// core/candidate-gate.ts — Issue #514: pages from mentions.
//
// The extraction names candidates; this decides the clear cases before any
// further call is spent on them. A candidate whose name never appears in the
// source text, or appears only inside parentheses, enumerations or short list
// items, gets no page — and is removed from the other candidates' related_*
// lists so the gate never manufactures a dead link. Measured on a German
// sample (10 notes, 115 candidates): 9.6 % absent, 19.1 % aside, 71.3 % prose
// with the rules below (a first rule — plain substring, any sentence with two
// commas is an enumeration — read 7.8 / 27.8 / 64.3 and overreached on nested
// clauses and appositions while under-reading compounds).
//
// The threshold lives here, in code, not in a prompt: every constant below is
// a policy line that can move without a model noticing. Three prompt-side
// formulations of the same question were stable within a formulation (91–100 %
// self-agreement over three draws) and inconsistent between formulations
// (0.9 % to 13.9 % filtered). The model keeps the remaining two thirds.
//
// Opt-in (`settings.skipMentionOnlyCandidates`, off by default): it changes
// which pages an ingest writes, so it is the user's choice, not an upgrade's.
//
// Language-keyed on purpose. What counts as a word boundary, an inflection or
// a connective is a property of the language the page names are written in —
// `settings.wikiLanguage` — so the gate carries one profile per language and
// is a no-op (reported by the caller) for every language without one. It is
// also a no-op when the note declares a `language:` that differs from the wiki
// language: the names are translations then, and the source cannot contain
// them.
//
// Which languages carry a profile, and how: a word-script profile is an
// additive-suffix model — the name's words may carry one of the listed endings
// in running text, and chunk length is counted in words. That fits languages
// whose plural and case forms mostly append to the stem (German, English,
// French, Spanish, Portuguese, Dutch, and Korean, whose particles attach to the
// noun). A character-script profile (Chinese, Japanese) has no boundaries and
// no inflection: the name is a substring, chunk length is characters, and the
// language's dedicated list separator (、 in Chinese, ・ in Japanese) marks an
// enumeration outright. Where the stem itself changes (Italian vowel
// alternation, Swedish/Danish/Norwegian -a → -or/-er, Slavic declension) a
// suffix profile under-matches and drops candidates the source does treat —
// the wrong direction for a guess, so those languages get no profile rather
// than a bad one.
//
// Known, accepted consequence: a thing that fails here in source A and passes
// in source B gets its page with B, and A is not among its sources. The page
// set stays order-independent; the evidence set does not.

import type { SourceAnalysis, EntityInfo, ConceptInfo } from '../types';

export type GateVerdict = 'prose' | 'aside' | 'absent';

/** A sentence with at least this many commas may be an enumeration. */
const ENUM_MIN_COMMAS = 2;
/** ...and the comma-delimited chunk holding the name must be this short (words, word-script). */
const ENUM_MAX_WORDS = 4;
/** A markdown list item this short is an enumeration entry, not prose (words, word-script). */
const LIST_ITEM_MAX_WORDS = 6;
/** The same two limits for character-script languages (Chinese, Japanese), in characters. Estimated, unmeasured. */
const ENUM_MAX_CHARS = 12;
const LIST_ITEM_MAX_CHARS = 16;

/** Clause separators: the comma, its fullwidth form, and the ideographic comma. */
const SEPARATORS = /[,，、]/;
/** Sentence ends, Latin and CJK. */
const SENTENCE_END = /[.;!?。；！？]/;
/** Paired brackets that mark an aside, Latin and CJK. */
const PAREN_RE = /\([^()]*\)|\[[^[\]]*\]|（[^（）]*）|【[^【】]*】|「[^「」]*」|『[^『』]*』/g;

export interface GateLanguageProfile {
  /** Suffixes a word of the name may carry in running text (regex alternatives, no anchors). */
  inflection: readonly string[];
  /** Words that do not count when measuring how short an enumeration chunk is. */
  connectives: ReadonlySet<string>;
  /**
   * `word` (default): the name is matched at word boundaries, each word with
   * an optional inflection suffix, and chunk length is counted in words.
   * `char`: the language writes without word boundaries (Chinese, Japanese) —
   * the whole name is matched as a substring, chunk length is counted in
   * characters, and `inflection` is unused.
   */
  script?: 'word' | 'char';
  /**
   * Separators that only ever delimit list items in this language (the
   * Chinese ideographic comma 、, the Japanese nakaguro ・): a name in a chunk
   * bounded by one of them is an enumeration entry regardless of length.
   */
  enumerationMarks?: readonly string[];
}

/**
 * One profile per wiki language. `de` is the measured one (ten notes, 115
 * candidates); every other profile is an estimate from the language's
 * inflection and has not been measured on a vault — the setting is off by
 * default, so an estimate is a starting point a user opts into, not a claim
 * shipped to everyone. Everything else → no profile → no gate (reported).
 */
export const GATE_LANGUAGE_PROFILES: Readonly<Record<string, GateLanguageProfile>> = {
  // measured
  de: {
    inflection: ['e', 's', 'n', 'en', 'es', 'er', 'em', 'ern', 'nen'],
    connectives: new Set(['und', 'oder', 'sowie', 'bzw.']),
  },
  // estimated — plural -s/-es, possessive
  en: {
    inflection: ['s', 'es', "'s"],
    connectives: new Set(['and', 'or']),
  },
  // estimated — plural -s/-x, feminine -e/-es; under-matches -al → -aux
  fr: {
    inflection: ['s', 'x', 'e', 'es'],
    connectives: new Set(['et', 'ou', 'ainsi', 'que']),
  },
  // estimated — plural -s/-es
  es: {
    inflection: ['s', 'es'],
    connectives: new Set(['y', 'e', 'o', 'u']),
  },
  // estimated — plural -s/-es; under-matches -ão → -ões, -l → -is
  pt: {
    inflection: ['s', 'es'],
    connectives: new Set(['e', 'ou']),
  },
  // estimated — plural -s/-en/-'s; under-matches consonant doubling and
  // vowel shortening (eiwit → eiwitten, boom → bomen)
  nl: {
    inflection: ['s', 'en', "'s", 'n'],
    connectives: new Set(['en', 'of']),
  },
  // estimated — particles attach to the noun additively (은/는, 이/가, 을/를,
  // 의, 에, 에서, 로/으로, 와/과, 도, 만, 들); spaces delimit words
  ko: {
    inflection: ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '에게', '로', '으로', '와', '과', '도', '만', '들', '들은', '들이', '들을', '부터', '까지', '처럼', '보다'],
    connectives: new Set(['및', '또는', '그리고', '혹은']),
  },
  // estimated — no word boundaries, no inflection: substring match, length in
  // characters; 、 separates list items and nothing else
  zh: {
    inflection: [],
    connectives: new Set(['和', '及', '与', '或', '以及', '或者', '跟', '同']),
    script: 'char',
    enumerationMarks: ['、'],
  },
  // estimated — no word boundaries: substring match, length in characters;
  // 、 is the general comma here, ・ the list separator
  ja: {
    inflection: [],
    connectives: new Set(['や', 'と', 'および', '及び', 'または', '又は', 'か', 'も']),
    script: 'char',
    enumerationMarks: ['・'],
  },
};

/** `de-CH` → `de`; unknown or empty → null (no gate). */
export function gateProfileFor(language: string | undefined | null): GateLanguageProfile | null {
  if (!language) return null;
  const key = language.trim().toLowerCase();
  return GATE_LANGUAGE_PROFILES[key] ?? GATE_LANGUAGE_PROFILES[key.split(/[-_]/)[0]] ?? null;
}

function nfc(s: string): string {
  return s.normalize('NFC');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-name match with word boundaries on both sides, each word tolerant of
 * an inflection suffix: `Ferritins`, `Kohlenhydraten`, `oxidativen Wirkung`
 * match; `Transferrinsättigung` does not match `Transferrin` — a compound is a
 * different word, and a page named after the part was not named by the source.
 */
function needleOf(name: string, profile: GateLanguageProfile): RegExp | null {
  const parts = nfc(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (profile.script === 'char') {
    // No word boundaries to assert: a Han character next to the name is a
    // letter to \p{L}, so a boundary test would reject every real occurrence.
    return new RegExp(parts.map(escapeRe).join('\\s*'), 'giu');
  }
  const inflection = profile.inflection.length > 0 ? `(?:${profile.inflection.map(escapeRe).join('|')})?` : '';
  const body = parts.map(p => escapeRe(p) + inflection).join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu');
}

function parenSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const re = new RegExp(PAREN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

function lineAt(text: string, pos: number): string {
  const start = text.lastIndexOf('\n', pos - 1) + 1;
  const end = text.indexOf('\n', pos);
  return text.slice(start, end === -1 ? text.length : end);
}

/** The sentence around `pos`, read across wrapped lines: paragraph first, then a sentence end (Latin or CJK). */
function sentenceAt(text: string, pos: number): { sentence: string; rel: number } {
  let p0 = text.lastIndexOf('\n\n', pos);
  p0 = p0 === -1 ? 0 : p0 + 2;
  let p1 = text.indexOf('\n\n', pos);
  if (p1 === -1) p1 = text.length;
  const para = text.slice(p0, p1).replace(/\n/g, ' ');
  const rel = pos - p0;
  let start = rel;
  while (start > 0 && !SENTENCE_END.test(para[start - 1])) start--;
  let end = rel;
  while (end < para.length && !SENTENCE_END.test(para[end])) end++;
  return { sentence: para.slice(start, end), rel: rel - start };
}

/**
 * How long a chunk is for the enumeration test: words (minus connectives) in
 * a word-script language, characters (minus connectives, spaces and
 * punctuation) in a character-script one.
 */
function chunkLength(chunk: string, profile: GateLanguageProfile): number {
  if (profile.script === 'char') {
    let c = chunk;
    for (const w of profile.connectives) c = c.split(w).join('');
    return Array.from(c.replace(/[\s\p{P}]+/gu, '')).length;
  }
  return chunk.trim().split(/\s+/).filter(w => w && !profile.connectives.has(w.toLowerCase())).length;
}
const enumMax = (profile: GateLanguageProfile) => profile.script === 'char' ? ENUM_MAX_CHARS : ENUM_MAX_WORDS;
const listItemMax = (profile: GateLanguageProfile) => profile.script === 'char' ? LIST_ITEM_MAX_CHARS : LIST_ITEM_MAX_WORDS;

/**
 * An enumeration entry: the sentence has enough separators, the chunk holding
 * the name is short, and so is a neighbouring chunk — an apposition (`Das
 * Hepcidin, das in der Leber gebildet wird, ...`) has a short chunk with long
 * neighbours and is not a list. In a language with a dedicated list separator
 * (Chinese 、, Japanese ・) a chunk bounded by it is an entry outright.
 */
function isEnumerationChunk(sentence: string, rel: number, profile: GateLanguageProfile): boolean {
  const marks = profile.enumerationMarks ?? [];
  const seps = new RegExp(`[${SEPARATORS.source.slice(1, -1)}${marks.map(escapeRe).join('')}]`);
  if ((sentence.match(new RegExp(seps.source, 'g')) ?? []).length < ENUM_MIN_COMMAS) return false;
  let pos = 0;
  const chunks = sentence.split(seps);
  for (let i = 0; i < chunks.length; i++) {
    const end = pos + chunks[i].length;
    if (rel >= pos && rel <= end) {
      if (marks.length > 0) {
        const before = pos > 0 ? sentence[pos - 1] : '';
        const after = end < sentence.length ? sentence[end] : '';
        if (marks.includes(before) || marks.includes(after)) return true;
      }
      if (chunkLength(chunks[i], profile) > enumMax(profile)) return false;
      const neighbours = [chunks[i - 1], chunks[i + 1]].filter((c): c is string => c !== undefined);
      return neighbours.some(c => chunkLength(c, profile) <= enumMax(profile));
    }
    pos = end + 1;
  }
  return false;
}

/**
 * Where the name stands in the text: in running prose (at least once), only
 * as an aside (parentheses, enumeration, short list item), or nowhere.
 * Case-insensitive, NFC-normalized, whole name — not a core word, not an alias:
 * a page is named after what the source says, or it is not made from it.
 */
export function classifyCandidate(text: string, name: string, profile: GateLanguageProfile): GateVerdict {
  const t = nfc(text);
  const needle = needleOf(name, profile);
  if (!needle) return 'absent';
  const spans = parenSpans(t);
  let sawAside = false;
  let m: RegExpExecArray | null;
  while ((m = needle.exec(t)) !== null) {
    const pos = m.index;
    if (m[0].length === 0) { needle.lastIndex++; continue; }
    const line = lineAt(t, pos);
    if (/^\s*#{1,6}\s/.test(line)) return 'prose';
    if (spans.some(([a, b]) => a <= pos && pos < b)) { sawAside = true; continue; }
    const item = /^\s*[-*•]\s+/.exec(line);
    if (item) {
      if (chunkLength(line.slice(item[0].length), profile) <= listItemMax(profile)) { sawAside = true; continue; }
      return 'prose';
    }
    const { sentence, rel } = sentenceAt(t, pos);
    if (isEnumerationChunk(sentence, rel, profile)) { sawAside = true; continue; }
    return 'prose';
  }
  return sawAside ? 'aside' : 'absent';
}

export interface DroppedCandidate {
  name: string;
  kind: 'entity' | 'concept';
  verdict: Exclude<GateVerdict, 'prose'>;
}

export interface GateResult {
  entities: EntityInfo[];
  concepts: ConceptInfo[];
  dropped: DroppedCandidate[];
  /** False when no profile exists for `language` — the input came back untouched. */
  applied: boolean;
}

/**
 * Apply the gate to an analysis for pages named in `language` (the wiki
 * language). Returns the kept candidates (with references to dropped names
 * pruned from related_* lists) and what was dropped, why. Pure; the caller
 * decides what to log and writes the result back. The cross-language check
 * (note declares another language) is the caller's — it needs the vault.
 */
export function gateCandidates(
  analysis: Pick<SourceAnalysis, 'entities' | 'concepts'>,
  sourceText: string,
  language: string | undefined | null,
): GateResult {
  const profile = gateProfileFor(language);
  if (!profile) return { entities: analysis.entities, concepts: analysis.concepts, dropped: [], applied: false };
  const dropped: DroppedCandidate[] = [];
  const keep = <T extends { name: string }>(items: T[], kind: DroppedCandidate['kind']): T[] =>
    items.filter(item => {
      const verdict = classifyCandidate(sourceText, item.name, profile);
      if (verdict === 'prose') return true;
      dropped.push({ name: item.name, kind, verdict });
      return false;
    });
  const entities = keep(analysis.entities, 'entity');
  const concepts = keep(analysis.concepts, 'concept');
  if (dropped.length === 0) return { entities: analysis.entities, concepts: analysis.concepts, dropped, applied: true };

  const gone = new Set(dropped.map(d => nfc(d.name).trim().toLowerCase()));
  const prune = (names: string[] | undefined): string[] | undefined =>
    names?.filter(n => !gone.has(nfc(n).trim().toLowerCase()));
  return {
    entities: entities.map(e => ({
      ...e,
      ...(e.related_entities ? { related_entities: prune(e.related_entities) } : {}),
      ...(e.related_concepts ? { related_concepts: prune(e.related_concepts) } : {}),
    })),
    concepts: concepts.map(c => ({
      ...c,
      related_concepts: prune(c.related_concepts) ?? [],
      ...(c.related_entities ? { related_entities: prune(c.related_entities) } : {}),
    })),
    dropped,
    applied: true,
  };
}

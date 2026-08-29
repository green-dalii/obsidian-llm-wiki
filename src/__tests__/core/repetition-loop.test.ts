// Issue #524: the repetition-loop detector. Calibrated against the LM Studio
// server logs of one vault (May–Aug 2026): at 200 characters no clean
// text-mode response out of 2,319 was flagged, and every flagged response
// carried a run of ≥ 2,280 characters. The tests below pin the shape of the
// signal, not the calibration — the unit must repeat at least four times in
// a row, cover the minimum length, and contain a letter or digit.

import { describe, it, expect } from 'vitest';
import { findRepetitionLoop, isSourceBorneLoop, REPETITION_LOOP_MIN_CHARS } from '../../core/repetition-loop';

const CLEAN_BATCH = JSON.stringify({
  source_title: 'Sleep apnea',
  summary: 'Obstructive sleep apnea is a sleep-related breathing disorder.',
  entities: [
    { name: 'CPAP', type: 'device', summary: 'Continuous positive airway pressure therapy.', mentions_in_source: ['CPAP is first-line therapy.'] },
    { name: 'Epworth Sleepiness Scale', type: 'instrument', summary: 'An eight-item questionnaire.', mentions_in_source: ['The Epworth Sleepiness Scale scores daytime sleepiness.'] },
  ],
  concepts: [
    { name: 'Apnea-hypopnea index', type: 'metric', summary: 'Events per hour of sleep.', mentions_in_source: ['An AHI above 30 is severe.'] },
  ],
});

describe('findRepetitionLoop', () => {
  it('returns null for a clean extraction batch', () => {
    expect(findRepetitionLoop(CLEAN_BATCH)).toBeNull();
  });

  it('flags a word loop that ends in finish_reason=length', () => {
    const loop = '"summary": "für die für die für die ' + 'für die '.repeat(60);
    const found = findRepetitionLoop(loop);
    expect(found).not.toBeNull();
    expect(found!.length).toBeGreaterThanOrEqual(REPETITION_LOOP_MIN_CHARS);
    expect(found!.unit).toContain('für die');
  });

  it('flags a phrase loop sitting inside an otherwise valid JSON string', () => {
    // The silent form from #524: finish_reason=stop, schema-valid JSON, the
    // loop inside a quote. Four items, not thirty, and nothing else to see.
    const phrase = 'bisher kaum prospektiv untersucht ist, ';
    const damaged = JSON.stringify({
      entities: [{ name: 'Curcumin', summary: 'Curcumin ' + phrase.repeat(12) }],
      concepts: [],
    });
    const found = findRepetitionLoop(damaged);
    expect(found).not.toBeNull();
    expect(found!.length).toBeGreaterThanOrEqual(phrase.length * 4);
  });

  it('flags a loop whose unit spans lines', () => {
    const unit = '  "aliases": [\n    "Sauerteig",\n';
    expect(findRepetitionLoop(unit.repeat(10))).not.toBeNull();
  });

  it('ignores runs of punctuation, fences and table rules', () => {
    expect(findRepetitionLoop('|---|---|---|---|' + '---|'.repeat(80))).toBeNull();
    expect(findRepetitionLoop('='.repeat(400))).toBeNull();
    expect(findRepetitionLoop('\n'.repeat(300))).toBeNull();
  });

  it('ignores a short repetition below the minimum length', () => {
    // Legitimate content repeats words; what it does not do is repeat them
    // for hundreds of characters.
    expect(findRepetitionLoop('very very very very very long')).toBeNull();
    expect(findRepetitionLoop('ab '.repeat(40))).toBeNull(); // 120 chars
  });

  it('honours a caller-supplied minimum', () => {
    const text = 'ab '.repeat(40); // 120 chars
    expect(findRepetitionLoop(text, 100)).not.toBeNull();
    expect(findRepetitionLoop(text, 121)).toBeNull();
  });

  it('reports the longest run when several qualify', () => {
    const short = 'novo '.repeat(50); // 250 chars
    const long = 'UVB-UVB '.repeat(100); // 800 chars
    const found = findRepetitionLoop(`${short}\n\nsome prose\n\n${long}`);
    expect(found!.length).toBe(long.length);
    expect(found!.unit).toContain('UVB');
  });

  it('trims a long unit for logging', () => {
    const unit = 'x'.repeat(30) + ' y'.repeat(30) + ' ';
    const found = findRepetitionLoop(unit.repeat(6));
    expect(found).not.toBeNull();
    expect(found!.unit.length).toBeLessThanOrEqual(41);
  });

  it('carries the untrimmed unit alongside the trimmed one', () => {
    const unit = 'x'.repeat(30) + ' y'.repeat(30) + ' ';
    const text = unit.repeat(6);
    const found = findRepetitionLoop(text);
    // The match may start mid-unit, so the raw unit is a rotation of `unit`
    // rather than `unit` itself — same length, and still a unit the text
    // actually repeats, which is all the source lookup needs.
    expect(found!.rawUnit).toHaveLength(unit.length);
    expect(found!.unit).toMatch(/…$/);
    expect(text.split(found!.rawUnit).length - 1).toBeGreaterThanOrEqual(4);
  });
});

// #525 review: halving changes how many items are asked for, never the note,
// so a loop the note itself carries is reproduced by every retry.
// #542: the source check has to mirror the response detector — the response
// detector requires 4 *consecutive* repeats (LOOP_RE `\1{3,}`), so a faithful
// echo is also a *consecutive* pattern in the note, not 4 scattered mentions.
// A stopword scattered through ordinary prose ("und die " ×25 in a German
// note) is not the note's pattern to repeat; spending the halve-retry on it
// drops the only recovery attempt #524 provided for a damaged batch.
describe('isSourceBorneLoop', () => {
  const REFRAIN = 'Und täglich grüßt das Murmeltier. ';

  it('recognises a refrain the note states at least four times consecutively', () => {
    const loop = findRepetitionLoop(REFRAIN.repeat(10))!;
    // REFRAIN×4 back-to-back, then intervening prose, then REFRAIN×2: the
    // 4-consecutive run at the start is the refrain pattern.
    const note = `${REFRAIN.repeat(4)} Dazwischen anderer Text. ${REFRAIN.repeat(2)}`;
    expect(isSourceBorneLoop(loop, note)).toBe(true);
  });

  it('does not fire on a unit the note merely mentions once', () => {
    const loop = findRepetitionLoop(REFRAIN.repeat(10))!;
    expect(isSourceBorneLoop(loop, `Ein Satz. ${REFRAIN} Noch ein Satz.`)).toBe(false);
  });

  it('does not fire on a unit the note never contains', () => {
    const loop = findRepetitionLoop('Sauerteig, '.repeat(40))!;
    expect(isSourceBorneLoop(loop, 'Ein Text über Ferritin und Eisen.')).toBe(false);
  });

  // #542 failure mode: a stopword ("und die ") appears many times scattered
  // through ordinary German prose. The pre-#542 guard's `>= 4 scattered` check
  // returned true and suppressed the halve-retry — the loop unit was 25× in
  // the note, but never as a refrain; the response's 80× was degeneration,
  // not echo. After the fix: scattered mentions don't satisfy the
  // consecutive-run check, so the retry fires.
  it('does not fire on a stopword scattered through the note (#542)', () => {
    const loop = findRepetitionLoop('und die '.repeat(80))!;
    const note = [
      'Ein gewöhnlicher Text über Sprache. Die ist ein Wort. Die kommt oft vor.',
      'Die und die Bedeutung und die Form. Die ist ein Wort. Die ist häufig.',
      'und die Verbindung. und die Form. und die Syntax. und die Bedeutung.',
      'und die Syntax, und die Semantik, und die Pragmatik.',
    ].join(' ');
    // "und die " appears many times scattered, never ≥4 consecutive.
    expect(note.split('und die ').length - 1).toBeGreaterThanOrEqual(8);
    expect(isSourceBorneLoop(loop, note)).toBe(false);
  });

  // The trap this exists to avoid: `unit` is shortened for log lines, so a
  // unit over 40 characters would never be found in the note if the lookup
  // used it. The check has to read `rawUnit`.
  it('finds a refrain longer than the log-trimmed unit', () => {
    const long = 'Die Wiederholung ist der Kern dieses langen Refrains im Text. ';
    expect(long.length).toBeGreaterThan(41);
    const loop = findRepetitionLoop(long.repeat(8))!;
    expect(loop.unit).toContain('…');
    expect(isSourceBorneLoop(loop, long.repeat(5))).toBe(true);
  });

  // #542 acceptance criterion #1: pin the consecutive-run boundary. Exactly
  // 4 → true (the threshold), exactly 3 → false. A `>= 3 → false` mutation
  // (changing the threshold) must NOT pass these tests.
  it('requires exactly 4 consecutive occurrences (boundary pinned, #542)', () => {
    const loop = findRepetitionLoop(REFRAIN.repeat(10))!;
    expect(isSourceBorneLoop(loop, `${REFRAIN.repeat(3)} Dazwischen Text.`)).toBe(false);
    expect(isSourceBorneLoop(loop, `${REFRAIN.repeat(4)} Dazwischen Text.`)).toBe(true);
  });
});

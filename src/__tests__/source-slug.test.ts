import { describe, it, expect } from 'vitest';
import { resolveSourceSlug, sourceFingerprint, sourceBaseSlug } from '../core/source-slug';

describe('sourceFingerprint', () => {
  it('is deterministic for the same path', () => {
    expect(sourceFingerprint('raw/a/About this course.md'))
      .toBe(sourceFingerprint('raw/a/About this course.md'));
  });

  it('is exactly 6 lowercase hex chars', () => {
    expect(sourceFingerprint('raw/a/x.md')).toMatch(/^[0-9a-f]{6}$/);
  });

  it('differs for different paths with the same basename', () => {
    expect(sourceFingerprint('raw/CourseA/About this course.md'))
      .not.toBe(sourceFingerprint('raw/CourseB/About this course.md'));
  });
});

describe('sourceBaseSlug', () => {
  it('is the plain slugified basename, no path', () => {
    expect(sourceBaseSlug('raw/Course X/About this course.md')).toBe('about-this-course');
  });
});

describe('resolveSourceSlug', () => {
  it('always appends a 6-hex fingerprint', () => {
    expect(resolveSourceSlug('raw/A/Storage buckets.md')).toMatch(/^storage-buckets_[0-9a-f]{6}$/);
  });

  it('does NOT include a folder hint', () => {
    const slug = resolveSourceSlug('raw/Course X/About this course.md');
    expect(slug).toMatch(/^about-this-course_[0-9a-f]{6}$/);
    expect(slug).not.toContain('course-x');
  });

  it('is stable for the same file (re-ingest determinism)', () => {
    expect(resolveSourceSlug('raw/Course X/About this course.md'))
      .toBe(resolveSourceSlug('raw/Course X/About this course.md'));
  });

  it('keeps two same-basename files in different folders unique', () => {
    const a = resolveSourceSlug('raw/Agentic Prompt Engineering/About this course.md');
    const b = resolveSourceSlug('raw/Working with Orchestrator resources/About this course.md');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^about-this-course_[0-9a-f]{6}$/);
    expect(b).toMatch(/^about-this-course_[0-9a-f]{6}$/);
  });

  it('never exceeds the length cap, keeping the fingerprint', () => {
    const longName = 'A'.repeat(200);
    const slug = resolveSourceSlug(`raw/Folder/${longName}.md`, { maxLen: 80 });
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toMatch(/_[0-9a-f]{6}$/);
  });
});

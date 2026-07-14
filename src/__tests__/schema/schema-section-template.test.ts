import { describe, it, expect } from 'vitest';
import { buildSchemaSectionTemplate } from '../../schema/schema-context';
import { buildDefaultSchemaBody } from '../../schema/schema-manager';
import { parseSchemaContext } from '../../schema/schema-context';

describe('buildSchemaSectionTemplate', () => {
  describe('default schema (backward compat — no behavior change)', () => {
    it('returns canonical entity sections when schema is default', () => {
      const ctx = parseSchemaContext(buildDefaultSchemaBody(), 'entity');
      const tpl = buildSchemaSectionTemplate(ctx, 'entity');
      // Default behavior: canonical entity sections (v1.24.1 PATCH — Basic
      // Information removed from the prompt path and the default schema; the
      // canonical fallback in schema-context.ts must agree or the
      // system-prompt context will still tell the LLM to render the
      // redundant block. See Issue #258.
      expect(tpl).not.toContain('## Basic Information');
      expect(tpl).toContain('## Description');
      expect(tpl).toContain('## Related Entities');
      expect(tpl).toContain('## Related Concepts');
      expect(tpl).toContain('## Mentions in Source');
    });

    it('returns canonical concept sections for concept page type', () => {
      const ctx = parseSchemaContext(buildDefaultSchemaBody(), 'concept');
      const tpl = buildSchemaSectionTemplate(ctx, 'concept');
      expect(tpl).toContain('## Definition');
      expect(tpl).toContain('## Key Characteristics');
      expect(tpl).toContain('## Applications');
    });

    it('returns canonical source sections for source page type', () => {
      const ctx = parseSchemaContext(buildDefaultSchemaBody(), 'source');
      const tpl = buildSchemaSectionTemplate(ctx, 'source');
      expect(tpl).toContain('## Summary');
      expect(tpl).toContain('## Key Points');
      expect(tpl).toContain('## Mentioned Pages');
    });
  });

  describe('custom schema (user customization propagates)', () => {
    it('extracts section names from user-defined `**Sections:**` list', () => {
      const customBody = `# Wiki Schema

## Entity Page Template

**Sections:**
1. **Overview**: Single paragraph summary
2. **Timeline**: Chronological events
3. **Connections**: Related entities

## Concept Page Template

**Sections:**
1. **Definition**: Brief definition
2. **Examples**: Real-world examples

## My Custom Section

User added a new top-level section.
`;
      const ctx = parseSchemaContext(customBody, 'entity');
      // Sanity: hasUserSections should be true (My Custom Section not in defaults)
      expect(ctx.hasUserSections).toBe(true);
      const tpl = buildSchemaSectionTemplate(ctx, 'entity');
      // User's section names flow through
      expect(tpl).toContain('## Overview');
      expect(tpl).toContain('## Timeline');
      expect(tpl).toContain('## Connections');
      // Default sections should NOT appear when user customized
      expect(tpl).not.toContain('## Basic Information');
      expect(tpl).not.toContain('## Description');
    });

    it('returns empty template when schema has no Entity Page Template section', () => {
      const body = '## Concept Page Template\n**Sections:**\n1. **Definition**: x';
      const ctx = parseSchemaContext(body, 'entity');
      const tpl = buildSchemaSectionTemplate(ctx, 'entity');
      // No Entity Page Template in body — fall back to canonical entity
      // sections. As of v1.24.1 PATCH (Issue #258), the canonical entity
      // list starts at Description, not Basic Information.
      expect(tpl).not.toContain('## Basic Information');
      expect(tpl).toContain('## Description');
    });
  });
});
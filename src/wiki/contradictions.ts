// Contradiction detection, tracking, and resolution — extracted from WikiEngine.

import { EngineContext, ContradictionInfo } from '../types';
import { slugify, parseFrontmatter, cleanMarkdownResponse } from '../utils';
import { PROMPTS } from '../prompts';
import {
  getSectionLabels,
  applySectionLabels,
  buildSystemPrompt,
} from './system-prompts';

export class ContradictionManager {
  constructor(private ctx: EngineContext) {}

  async noteContradiction(contradiction: ContradictionInfo): Promise<void> {
    const pagePath = contradiction.source_page.replace(
      /\[\[(.+)\]\]/,
      `${this.ctx.settings.wikiFolder}/$1.md`
    );

    const existingContent = await this.ctx.tryReadFile(pagePath);
    if (!existingContent) return;

    const contradictionNote = `\n\n## ⚠️ Potential Contradiction\n\n**Source claim**: ${contradiction.claim}\n\n**Existing view**: ${contradiction.contradicted_by}\n\n**Resolution suggestion**: ${contradiction.resolution}\n\n---\n*Flagged: ${new Date().toISOString().split('T')[0]}*`;

    await this.ctx.createOrUpdateFile(pagePath, existingContent + contradictionNote);
    await this.trackContradiction(contradiction);
  }

  private async trackContradiction(contradiction: ContradictionInfo): Promise<void> {
    const contradictionsDir = `${this.ctx.settings.wikiFolder}/contradictions`;
    try {
      await this.ctx.app.vault.createFolder(contradictionsDir);
    } catch {
      // folder already exists
    }

    const date = new Date().toISOString().split('T')[0];
    const claimSlug = slugify(contradiction.claim.substring(0, 50));
    const filePath = `${contradictionsDir}/${claimSlug}-${date}.md`;

    if (await this.ctx.tryReadFile(filePath)) {
      console.debug('Contradiction already tracked:', filePath);
      return;
    }

    const pageRelPath = contradiction.source_page.replace(/\[\[(.+)\]\]/, '$1');
    const labels = getSectionLabels(this.ctx.settings);
    const content = `---
status: detected
detected: ${date}
source_page: "[[${pageRelPath}]]"
---

# Contradiction: ${contradiction.claim.substring(0, 60)}

## ${labels.new_claim}
${contradiction.claim}

## ${labels.existing_knowledge}
${contradiction.contradicted_by}

## ${labels.resolution_suggestion}
${contradiction.resolution}

## ${labels.source_page}
${contradiction.source_page}

---
*Auto-detected on ${date}*
`;

    await this.ctx.createOrUpdateFile(filePath, content);
    console.debug('Contradiction tracked:', filePath);
  }

  async getOpenContradictions(): Promise<
    Array<{ path: string; status: string; claim: string; sourcePage: string }>
  > {
    const contradictionsDir = `${this.ctx.settings.wikiFolder}/contradictions`;
    const files = this.ctx.app.vault
      .getMarkdownFiles()
      .filter(f => f.path.startsWith(contradictionsDir));

    const results: Array<{
      path: string;
      status: string;
      claim: string;
      sourcePage: string;
    }> = [];

    for (const file of files) {
      const content = await this.ctx.app.vault.read(file);
      const fm = parseFrontmatter(content);
      const status = (fm?.status as string) || 'detected';

      if (status === 'resolved' || status === 'suppressed') continue;

      const headerBlocks = content.split(/\n## /);
      const claimText =
        headerBlocks.length > 1
          ? headerBlocks[1].replace(/^[^\n]+\n/, '').trim()
          : '';
      const sourcePageText =
        headerBlocks.length > 4
          ? headerBlocks[4].replace(/^[^\n]+\n/, '').trim()
          : '';

      results.push({
        path: file.path,
        status,
        claim: claimText || file.basename,
        sourcePage: sourcePageText,
      });
    }

    return results;
  }

  async updateContradictionStatus(
    filePath: string,
    newStatus: string
  ): Promise<void> {
    const content = await this.ctx.tryReadFile(filePath);
    if (!content) {
      console.debug('Contradiction file not found:', filePath);
      return;
    }
    const updated = content.replace(/^status:\s*\S+/m, `status: ${newStatus}`);
    if (newStatus === 'resolved') {
      const resolvedDate = new Date().toISOString().split('T')[0];
      if (updated.includes('resolved:')) {
        const final = updated.replace(
          /^resolved:\s*\S*/m,
          `resolved: ${resolvedDate}`
        );
        await this.ctx.createOrUpdateFile(filePath, final);
      } else {
        const final = updated.replace(
          /^(detected:\s*\S+)/m,
          `$1\nresolved: ${resolvedDate}`
        );
        await this.ctx.createOrUpdateFile(filePath, final);
      }
    } else {
      await this.ctx.createOrUpdateFile(filePath, updated);
    }
    console.debug(
      `Contradiction status updated: ${filePath} → ${newStatus}`
    );
  }

  async resolveContradiction(contradictionPath: string): Promise<void> {
    const contradictionContent = await this.ctx.tryReadFile(contradictionPath);
    if (!contradictionContent)
      throw new Error('Contradiction file not found');

    const fm = parseFrontmatter(contradictionContent);
    const sourcePage = (fm?.source_page as string) || '';
    const pagePath = sourcePage.replace(
      /\[\[(.+)\]\]/,
      `${this.ctx.settings.wikiFolder}/$1.md`
    );

    const existingContent = await this.ctx.tryReadFile(pagePath);
    if (!existingContent) throw new Error('Affected wiki page not found');

    const prompt = PROMPTS.resolveContradiction
      .replace('{{existing_content}}', existingContent.substring(0, 6000))
      .replace(
        '{{contradiction_content}}',
        contradictionContent.substring(0, 3000)
      );

    const finalPrompt = applySectionLabels(prompt, this.ctx.settings);

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const fixedContent = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 4000,
      system: await buildSystemPrompt(
        this.ctx.settings,
        this.ctx.getSchemaContext,
        'full'
      ),
      messages: [{ role: 'user', content: finalPrompt }],
    });

    const cleaned = cleanMarkdownResponse(fixedContent);
    await this.ctx.createOrUpdateFile(pagePath, cleaned);
    console.debug('Contradiction resolved:', contradictionPath);
  }
}

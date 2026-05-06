// Conversation Ingestor — extract Wiki knowledge from chat conversations.
// Extracted from WikiEngine.

import {
  EngineContext,
  SourceAnalysis,
} from '../types';
import { PROMPTS } from '../prompts';
import {
  slugify,
  parseJsonResponse,
} from '../utils';
import { getSectionLabels } from './system-prompts';
import { PageFactory } from './page-factory';

export interface ConversationOrchestration {
  ensureWikiStructure: () => Promise<void>;
  apiDelay: (ms?: number) => Promise<void>;
  generateIndex: () => Promise<void>;
  updateLog: (operation: string, analysis: SourceAnalysis) => Promise<void>;
}

export interface ConversationHistory {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}

export function formatConversation(history: ConversationHistory): string {
  return history.messages.map(msg => {
    const role = msg.role === 'user' ? '👤 User' : '🤖 Wiki';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    return `### ${role} (${time})\n\n${msg.content}\n\n---\n`;
  }).join('\n');
}

export class ConversationIngestor {
  constructor(
    private ctx: EngineContext,
    private pageFactory: PageFactory,
    private orch: ConversationOrchestration
  ) {}

  async ingestConversation(history: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
  }): Promise<void> {
    const client = this.ctx.getClient();
    if (!client) {
      throw new Error('LLM Client not initialized');
    }

    console.debug('=== Starting conversation extraction ===');
    this.ctx.onProgress?.('Analyzing conversation...');

    const actualDate = new Date().toISOString().split('T')[0];
    console.debug('[系统时间]', actualDate);

    const indexPath = `${this.ctx.settings.wikiFolder}/index.md`;
    const existingWikiIndex = await this.ctx.tryReadFile(indexPath) || 'Wiki is empty';
    console.debug('[Wiki索引]', existingWikiIndex ? '已读取' : '为空');

    const conversationText = formatConversation(history);

    if (existingWikiIndex !== 'Wiki is empty') {
      this.ctx.onProgress?.('Checking for existing knowledge...');
      try {
        const dedupResult = await this.checkDedup(existingWikiIndex, conversationText);
        if (dedupResult === 'fully_redundant') {
          console.debug('Conversation fully covered by existing Wiki, skipping save');
          this.ctx.onProgress?.('This knowledge already exists in Wiki');
          return;
        }
      } catch (error) {
        console.debug('Dedup check failed, proceeding with save:', error);
      }
    }

    const analysisPrompt = `You are a Wiki knowledge extraction assistant.

Existing Wiki Index (use this as reference for entity/concept names):
${existingWikiIndex}

User conversation with AI:
${conversationText}

Convert this conversation into structured Wiki pages.

Focus on:
1. Extracting key knowledge points (not full conversation log)
2. Identifying core concepts and entities discussed
3. Summarizing conversation topic and conclusions
4. Entity/concept names should match existing Wiki pages if possible

Actual conversation date: ${actualDate} (use this, do not generate date yourself)

Output JSON format:
{
  "source_title": "Semantic Topic Title (no date, describe the discussion topic)",
  "summary": "Conversation topic summary",
  "entities": [
    {
      "name": "Short Reference Name",
      "type": "person|organization|project|other",
      "summary": "Entity information summary",
      "mentions_in_source": ["Specific mentions in conversation"]
    }
  ],
  "concepts": [
    {
      "name": "Concept Name",
      "type": "theory|method|technology|term|other",
      "summary": "Concept definition",
      "mentions_in_source": ["Specific mentions in conversation"],
      "related_concepts": ["Related Concept 1", "Related Concept 2"]
    }
  ],
  "key_points": ["Point 1", "Point 2"],
  "created_pages": [],
  "updated_pages": []
}

CRITICAL RULES:
- source_title: Semantic title describing discussion topic (NOT date-based generic title)
- entity.name: Choose or extract appropriate name from Wiki index (maintain consistency with existing Wiki)
- concept.name: Same principle - reference Wiki index for concept names
- mentions_in_source: REQUIRED field - list actual mentions in conversation text
- If no entities/concepts found, use empty arrays [] (never omit the field)
- Names should be suitable for [[wiki-links]] referencing (judge appropriate naming based on Wiki index)`;

    const analysis = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 5000,
      system: await this.ctx.buildSystemPrompt('conversation'),
      messages: [{
        role: 'user',
        content: analysisPrompt
      }],
      response_format: { type: 'json_object' }
    });

    const parsed = await parseJsonResponse(analysis, async (malformedJson: string) => {
      const repairPrompt = `Fix the following malformed JSON. Only fix JSON syntax errors (unescaped quotes, trailing commas, missing brackets). Do NOT change any values or content. Output ONLY the fixed JSON, no other text.\n\n${malformedJson}`;
      return await client.createMessage({
        model: this.ctx.settings.model,
        max_tokens: 4000,
        system: await this.ctx.buildSystemPrompt('conversation'),
        messages: [{ role: 'user', content: repairPrompt }],
        response_format: { type: 'json_object' }
      });
    }) as SourceAnalysis | null;
    if (!parsed) {
      throw new Error('Conversation analysis JSON parsing failed');
    }

    console.debug('[LLM分析结果]', parsed);
    console.debug('[生成的标题]', parsed.source_title);

    this.ctx.onProgress?.('Creating summary page...');
    await this.orch.ensureWikiStructure();

    const semanticSlug = slugify(parsed.source_title);
    const summaryPath = `${this.ctx.settings.wikiFolder}/sources/${semanticSlug}.md`;
    console.debug('[语义化文件路径]', summaryPath);

    const tags = parsed.concepts.map(c => c.name).join(', ');
    const labels = getSectionLabels(this.ctx.settings);
    const summaryContent = `---
type: source
created: ${actualDate}
source_file: Conversation Extract - ${actualDate}
tags: [${tags}]
---

# ${parsed.source_title}

## ${labels.source}
- Conversation date: ${actualDate}
- Source type: User query extraction
- Semantic path: [[${summaryPath.replace(this.ctx.settings.wikiFolder + '/', '')}]]

## ${labels.core_content}

${parsed.summary}

## ${labels.key_entities}

${parsed.entities.map(e => `- [[entities/${slugify(e.name)}|${e.name}]] - ${e.summary}`).join('\n')}

## ${labels.key_concepts}

${parsed.concepts.map(c => `- [[concepts/${slugify(c.name)}|${c.name}]] - ${c.summary}`).join('\n')}

## ${labels.main_points}

${parsed.key_points.map((p: string) => `- ${p}`).join('\n')}

---
${labels.updated}: ${actualDate}`;

    await this.ctx.createOrUpdateFile(summaryPath, summaryContent);
    parsed.created_pages.push(summaryPath);

    const convPlannedPaths: string[] = [summaryPath];
    for (const entity of parsed.entities) {
      convPlannedPaths.push(`${this.ctx.settings.wikiFolder}/entities/${slugify(entity.name)}.md`);
    }
    for (const concept of parsed.concepts) {
      convPlannedPaths.push(`${this.ctx.settings.wikiFolder}/concepts/${slugify(concept.name)}.md`);
    }

    for (const entity of parsed.entities) {
      await this.orch.apiDelay();
      this.ctx.onProgress?.(`Saving entity: ${entity.name}`);
      try {
        const entityPage = await this.pageFactory.createOrUpdateEntityPage(entity, parsed, { path: summaryPath, basename: semanticSlug }, convPlannedPaths);
        if (entityPage) {
          parsed.created_pages.push(entityPage);
        }
      } catch (error) {
        console.error(`Conversation entity "${entity.name}" failed:`, error);
      }
    }

    for (const concept of parsed.concepts) {
      await this.orch.apiDelay();
      this.ctx.onProgress?.(`Saving concept: ${concept.name}`);
      try {
        const conceptPage = await this.pageFactory.createOrUpdateConceptPage(concept, parsed, { path: summaryPath, basename: semanticSlug }, convPlannedPaths);
        if (conceptPage) {
          parsed.created_pages.push(conceptPage);
        }
      } catch (error) {
        console.error(`Conversation concept "${concept.name}" failed:`, error);
      }
    }

    this.ctx.onProgress?.('Generating index...');
    await this.orch.generateIndex();
    parsed.contradictions = parsed.contradictions || [];
    await this.orch.updateLog('conversation', parsed);

    console.debug('=== Conversation extraction complete ===');
    console.debug('Created pages:', parsed.created_pages);
  }

  private async checkDedup(wikiIndex: string, conversationText: string): Promise<string> {
    const summary = conversationText.substring(0, 1500);
    const prompt = PROMPTS.dedupCheck
      .replace('{{wiki_index}}', wikiIndex.substring(0, 3000))
      .replace('{{conversation_summary}}', summary);

    const client = this.ctx.getClient();
    if (!client) throw new Error('LLM client not initialized');

    const response = await client.createMessage({
      model: this.ctx.settings.model,
      max_tokens: 200,
      system: await this.ctx.buildSystemPrompt('conversation'),
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const parsed = await parseJsonResponse(response) as { status?: string } | null;
    return parsed?.status || 'entirely_new';
  }
}

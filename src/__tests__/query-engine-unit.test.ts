import { describe, it, expect } from 'vitest';
import { QueryModal } from '../wiki/query-engine';

describe('QueryEngine — Unit Tests', () => {
  describe('instantiation', () => {
    it('exports QueryModal class', () => {
      // QueryModal 需要完整的 Obsidian App 和 LLMWikiPlugin mock
      // 包括 Modal, Notice, MarkdownRenderer, Component 等
      expect(typeof QueryModal).toBe('function');
    });
  });

  // Note: QueryEngine 的完整测试需要：
  // 1. Obsidian API mock（App, Modal, Notice, MarkdownRenderer, Component, Platform）
  // 2. LLMWikiPlugin mock（包含 settings, llmClient, wikiEngine）
  // 3. DOM API mock（HTMLElement, HTMLTextAreaElement）
  // 4. 对话状态机 mock（history, streaming, abort）
  //
  // 这些依赖使 QueryEngine 更适合作为集成测试
  // 当前阶段仅验证导出正确
});

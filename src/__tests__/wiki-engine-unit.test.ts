import { describe, it, expect } from 'vitest';
import { WikiEngine } from '../wiki/wiki-engine';

describe('WikiEngine — Unit Tests', () => {
  describe('instantiation', () => {
    it('can be created with minimal mock dependencies', () => {
      // WikiEngine 实例化需要完整的 Obsidian App mock
      // 这里仅验证导出正确
      expect(typeof WikiEngine).toBe('function');
    });
  });

  // Note: WikiEngine 的完整测试需要完整的 Obsidian App mock
  // 包括 vault.createFolder, vault.adapter, fileManager.renameFile 等
  // 这些测试更适合作为集成测试在后续阶段补充
});

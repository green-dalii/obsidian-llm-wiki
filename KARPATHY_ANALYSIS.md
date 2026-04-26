# Karpathy LLM Wiki 核心机制分析

## 关键发现

### 1. Wiki 页面结构（多页面生成）

每个源文件摄入后，LLM 应生成 **10-15 个页面**：

- **Summary page** - 源文件的摘要
- **Entity pages** - 关键实体（人名、地名、项目名等）
- **Concept pages** - 核心概念（技术、理论、方法等）
- **Comparison pages** - 实体/概念之间的对比
- **Overview/synthesis** - 整体综述

### 2. 双向链接机制

**关键点：**
- LLM 自动创建和维护链接
- 新资料进入时，**更新现有页面**
- 标记矛盾：新数据 vs 旧声明
- 保持一致性：跨页面引用正确

### 3. 摄入流程（关键缺陷）

**正确流程：**
```
1. 读取源文件
2. 与用户讨论关键要点（交互）
3. 创建摘要页
4. 【关键】更新相关实体和概念页面（10-15页）
5. 更新 index.md
6. 添加 log.md 条目
```

**当前实现缺陷：**
- ❌ 只生成一个 Wiki 页面
- ❌ 没有创建实体页、概念页
- ❌ 没有更新现有页面
- ❌ 没有标记矛盾

### 4. Index.md 格式

**正确格式：**
```markdown
# Wiki Index

## Entities
- [[John Doe]] - Software engineer at Company X
- [[Jane Smith]] - Researcher in ML

## Concepts
- [[Machine Learning]] - Subfield of AI
- [[Deep Learning]] - Neural network approach

## Sources
- [[source-article-1]] - Summary of Article 1
```

**当前缺陷：**
- ❌ 只是时间排序
- ❌ 没有分类
- ❌ 没有一行摘要

### 5. Log.md 格式

**正确格式：**
```markdown
## [2026-04-26] ingest | Article Title
Added source: Article Title
Created pages: [[summary]], [[concept-ml]], updated [[ml-overview]]
Noted contradiction: Article claims X, but [[old-source]] claims Y

## [2026-04-25] query | What is ML?
Answer generated, filed as [[ml-comparison]]
```

**当前缺陷：**
- ❌ 只记录操作类型
- ❌ 没有详细记录哪些页面被更新
- ❌ 没有记录矛盾和发现

### 6. Lint 维护检查项

**必须检查：**
- Contradictions - 页面间矛盾
- Stale claims - 过时声明
- Orphan pages - 无入链的孤立页
- Missing concept pages - 概念缺少独立页面
- Missing cross-references - 缺失的链接
- Data gaps - 可以用网络搜索填补的空缺

### 7. 页面 Frontmatter

**应该包含：**
```yaml
---
type: entity | concept | source | comparison
created: 2026-04-26
sources: [article-1, article-2]
tags: [ml, ai, research]
---
```

---

## 核心改进方向

### 1. 多页面生成机制

**Prompt 设计：**
```
分析这个源文件：
1. 提取关键实体（创建/更新实体页）
2. 提取核心概念（创建/更新概念页）
3. 生成摘要页
4. 检查与现有 Wiki 的矛盾
5. 更新相关页面（10-15个）

输出格式：
- summary-xxx.md
- entity-person-name.md
- concept-topic.md
- 更新现有页面列表
```

### 2. 实体和概念识别

**需要 LLM 做：**
- 提取实体（人名、组织、项目、地点）
- 提取概念（理论、方法、技术、术语）
- 创建双向链接 [[Entity Name]]
- 判断是否需要独立页面

### 3. 现有页面更新

**关键逻辑：**
```
摄入新源：
1. 识别相关实体和概念
2. 检查 Wiki 中是否已有这些页面
3. 如果有，更新它们
4. 如果没有，创建它们
5. 标记新旧矛盾
```

### 4. Index 分类结构

**改进：**
- 按 category 分组
- 每页一行摘要
- 使用 Obsidian [[]] 链接

### 5. Log 详细记录

**改进：**
- 记录创建的页面
- 记录更新的页面
- 记录发现的矛盾
- 记录生成的问答

---

## 实现计划

### Phase 1: Prompt 重设计

创建专业的 prompt 模板，让 LLM：
- 提取实体和概念
- 创建多个页面
- 更新现有页面
- 标记矛盾

### Phase 2: 多页面处理

改进 processSourceFile：
- 生成 summary 页
- 生成 entity 页（多个）
- 生成 concept 页（多个）
- 更新相关现有页面

### Phase 3: Index 改进

改进 generateIndex：
- 分类组织
- 一行摘要
- YAML frontmatter

### Phase 4: Log 改进

改进 updateLog：
- 详细记录
- 标准格式
- 可解析

### Phase 5: Lint 增强

改进 lintWiki：
- 完整检查清单
- 自动修复建议
- 网络搜索建议

---

## 关键代码结构

```typescript
// 摄入新源（重构）
async processSourceFile(file: TFile) {
  // 1. 分析源文件
  const analysis = await this.analyzeSource(file);

  // 2. 生成摘要页
  await this.createSummaryPage(file, analysis);

  // 3. 创建/更新实体页
  for (const entity of analysis.entities) {
    await this.updateEntityPage(entity);
  }

  // 4. 创建/更新概念页
  for (const concept of analysis.concepts) {
    await this.updateConceptPage(concept);
  }

  // 5. 标记矛盾
  for (const contradiction of analysis.contradictions) {
    await this.noteContradiction(contradiction);
  }

  // 6. 更新 index 和 log
  await this.updateIndexAndLog(analysis);
}
```
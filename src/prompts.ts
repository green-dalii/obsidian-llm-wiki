// LLM prompt templates for Wiki operations

export const PROMPTS = {
  analyzeSource: `你是一个 Wiki 知识库维护者。请分析以下源文件，并以 JSON 格式输出结构化分析结果。

**源文件内容：**
{{content}}

**现有 Wiki 页面列表：**
{{existing_pages}}

**任务要求：**
1. 提取关键实体（人名、组织、项目、地点等）
2. 提取核心概念（理论、方法、技术、术语等）
3. 识别与现有 Wiki 的矛盾或冲突
4. 找出相关的现有 Wiki 页面
5. 生成简洁摘要

**输出格式（JSON）：**
{
  "source_title": "源文件标题",
  "summary": "100-200字的摘要",
  "entities": [
    {
      "name": "实体名称",
      "type": "person|organization|project|location|other",
      "summary": "该实体的一句话描述",
      "mentions_in_source": ["该实体在源中的具体提及"]
    }
  ],
  "concepts": [
    {
      "name": "概念名称",
      "type": "theory|method|technology|term|other",
      "summary": "该概念的一句话描述",
      "mentions_in_source": ["该概念在源中的具体提及"],
      "related_concepts": ["相关概念名称"]
    }
  ],
  "contradictions": [
    {
      "claim": "源文件声称的内容",
      "source_page": "矛盾的现有 Wiki 页面 [[page-name]]",
      "contradicted_by": "该页面声称的内容",
      "resolution": "建议的解决方式"
    }
  ],
  "related_pages": ["相关的现有 Wiki 页面名称"],
  "key_points": ["关键要点1", "关键要点2"]
}

**重要规则：**
- 只输出 JSON，不要其他内容
- 实体和概念名称使用英文或中文，但保持一致
- 每个实体和概念都应该在 Wiki 中有独立页面
- 矛盾检测要仔细对比现有内容
- related_pages 应是现有 Wiki 中实际存在的页面
- 输出必须是有效 JSON 格式`,

  generateEntityPage: `你是一个 Wiki 知识库维护者。请为以下实体创建一个 Wiki 页面。

**实体信息：**
- 名称：{{entity_name}}
- 类型：{{entity_type}}
- 摘要：{{entity_summary}}
- 在源中的提及：{{mentions}}

**现有 Wiki 页面（引用时必须使用以下完整路径）：**
{{existing_pages}}

**现有 Wiki 中相关内容：**
{{related_content}}

{{merge_strategy}}

**任务要求：**
1. 创建实体页面，包含基本信息和关键信息
2. 引用其他页面时，必须使用上面"现有 Wiki 页面"列表中提供的完整路径格式（如 [[entities/Page-Name|Page Name]]）
3. 如果 Wiki 中已有该实体，使用上面的合并策略进行智能合并
4. 保持客观、准确、简洁

**输出格式：**
---
type: entity
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
---

# {{entity_name}}

## 基本信息
- 类型：{{entity_type}}
- 来源：[[{{source_file}}]]

## 描述
[实体的详细描述，包含双向链接]

## 相关内容
[引用相关概念和实体，使用上述列表中的完整路径]

## 在源中的提及
- [具体提及内容]

---
更新日期：{{date}}`,

  // Variant used when the existing page has `reviewed: true` in frontmatter.
  // The LLM must treat the human-edited content as authoritative and only
  // append genuinely new information from the latest source.
  preserveReviewedEntityPage: `你是一个 Wiki 知识库维护者。以下实体页面已被用户手动审阅（reviewed: true）。

**⚠️ 重要：用户审阅的内容必须完整保留，不得删除或改写。**

**实体信息（来自新源文件）：**
- 名称：{{entity_name}}
- 类型：{{entity_type}}
- 摘要：{{entity_summary}}
- 在源中的提及：{{mentions}}

**现有 Wiki 页面（引用时必须使用以下完整路径）：**
{{existing_pages}}

**用户已审阅的现有页面内容（必须完整保留）：**
{{related_content}}

**任务要求：**
1. **完整保留**用户审阅过的所有内容，不得删除或改写任何段落
2. 只在页面末尾的"新信息"部分添加来自新源文件的、与现有内容不重复的信息
3. 如果新信息与现有内容重复或矛盾，不要添加，保持用户原有版本
4. frontmatter 中必须保留 reviewed: true
5. 引用其他页面时，使用上面列表中的完整路径格式

**输出格式：**
---
type: entity
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
reviewed: true
---

[完整保留用户审阅的现有内容]

## 新信息（{{date}}）
[仅添加不重复的新信息，如无新信息则写"无新增信息"]

---
更新日期：{{date}}`,

  // Variant used when the existing concept page has `reviewed: true` in frontmatter.
  preserveReviewedConceptPage: `你是一个 Wiki 知识库维护者。以下概念页面已被用户手动审阅（reviewed: true）。

**⚠️ 重要：用户审阅的内容必须完整保留，不得删除或改写。**

**概念信息（来自新源文件）：**
- 名称：{{concept_name}}
- 类型：{{concept_type}}
- 摘要：{{concept_summary}}
- 在源中的提及：{{mentions}}
- 相关概念：{{related_concepts}}

**现有 Wiki 页面（引用时必须使用以下完整路径）：**
{{existing_pages}}

**用户已审阅的现有页面内容（必须完整保留）：**
{{related_content}}

**任务要求：**
1. **完整保留**用户审阅过的所有内容，不得删除或改写任何段落
2. 只在页面末尾的"新信息"部分添加来自新源文件的、与现有内容不重复的信息
3. 如果新信息与现有内容重复或矛盾，不要添加，保持用户原有版本
4. frontmatter 中必须保留 reviewed: true
5. 引用其他页面时，使用上面列表中的完整路径格式

**输出格式：**
---
type: concept
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
reviewed: true
---

[完整保留用户审阅的现有内容]

## 新信息（{{date}}）
[仅添加不重复的新信息，如无新信息则写"无新增信息"]

---
更新日期：{{date}}`,

  generateConceptPage: `你是一个 Wiki 知识库维护者。请为以下概念创建一个 Wiki 页面。

**概念信息：**
- 名称：{{concept_name}}
- 类型：{{concept_type}}
- 摘要：{{concept_summary}}
- 在源中的提及：{{mentions}}
- 相关概念：{{related_concepts}}

**现有 Wiki 页面（引用时必须使用以下完整路径）：**
{{existing_pages}}

**现有 Wiki 中相关内容：**
{{related_content}}

{{merge_strategy}}

**任务要求：**
1. 创建概念页面，包含定义、特点、应用等
2. 引用其他页面时，必须使用上面"现有 Wiki 页面"列表中提供的完整路径格式（如 [[concepts/Page-Name|Page Name]]）
3. 如果 Wiki 中已有该概念，使用上面的合并策略进行智能合并
4. 保持客观、准确、简洁

**输出格式：**
---
type: concept
created: {{date}}
sources: ["[[{{source_file}}]]"]
tags: [{{tags}}]
---

# {{concept_name}}

## 定义
[概念的清晰定义]

## 关键特征
- 特征1
- 特征2

## 应用场景
[概念的应用场景]

## 相关概念
[引用相关概念，使用上述列表中的完整路径]

## 相关实体
[引用相关实体，使用上述列表中的完整路径]

---
更新日期：{{date}}`,

  generateSummaryPage: `你是一个 Wiki 知识库维护者。请为以下源文件创建摘要页面。

**源文件信息：**
- 标题：{{source_title}}
- 内容：{{content}}
- 分析结果：{{analysis}}

**所有已创建的 Wiki 页面（引用时必须使用以下完整路径）：**
{{created_pages_list}}

**任务要求：**
1. 创建简洁的摘要页面
2. 引用实体和概念时，必须使用上面"所有已创建的 Wiki 页面"列表中提供的完整路径格式
3. 突出关键要点
4. 保持客观、准确

**输出格式：**
---
type: source
created: {{date}}
source_file: "[[{{source_file}}]]"
tags: [{{tags}}]
---

# {{source_title}} - 摘要

## 来源
- 原始文件：[[{{source_file}}]]
- 摄入日期：{{date}}

## 核心内容
[100-200字的摘要，包含双向链接]

## 关键实体
[引用实体，使用上述列表中的完整路径]

## 关键概念
[引用概念，使用上述列表中的完整路径]

## 主要观点
- 观点1
- 观点2

---
更新日期：{{date}}`,

  suggestSchemaUpdate: `You are a Wiki Schema advisor. Review the current schema and the latest ingestion analysis.

Current Schema:
{{schema_content}}

Analysis Context:
{{analysis_context}}

Task: Determine if the schema needs updating to better accommodate recent content.
Consider:
1. Are there new entity types that should be added to the classification rules?
2. Are there new concept types that should be added?
3. Should naming conventions be adjusted?
4. Should page templates be updated (missing sections, better structure)?
5. Should maintenance policies be revised (stale thresholds, severity levels)?

Output JSON format:
{
  "changes_needed": true,
  "suggestions": "Markdown description of suggested schema changes with reasoning"
}

If no changes are needed:
{
  "changes_needed": false,
  "suggestions": ""
}

Output ONLY the JSON, no other text.`,

  // Multi-Source Knowledge Fusion: structured merge analysis
  // Called before page generation when a page already exists with substantial content.
  mergeAnalysis: `你是一个 Wiki 知识融合分析器。对比现有 Wiki 页面内容和新源文件信息，输出结构化合并策略。

**页面名称：** {{page_name}}
**页面类型：** entity 或 concept

**现有页面内容：**
{{existing_content}}

**新源文件提取的信息：**
{{new_info}}

**任务：**
1. 逐条对比新信息与现有内容
2. 将每条新信息分类为：
   - "new" — 完全新的信息，现有页面中没有
   - "duplicate" — 与现有内容重复，不需要添加
   - "complementary" — 补充现有内容（同一话题的额外细节）
   - "contradictory" — 与现有内容矛盾
3. 对于 "complementary" 信息，指定应插入现有页面的哪个章节之后
4. 对于 "contradictory" 信息，记录具体矛盾点

输出 JSON 格式：
{
  "merge_items": [
    {
      "content": "新信息的具体内容",
      "classification": "new|duplicate|complementary|contradictory",
      "target_section": "应插入的章节名（仅 new 和 complementary 需要）",
      "reason": "分类理由（一句话）"
    }
  ],
  "contradictions": [
    {
      "claim": "新信息声称的内容",
      "existing_claim": "现有页面中矛盾的内容",
      "resolution": "建议处理方式"
    }
  ],
  "merge_summary": "合并策略总结（一句话）"
}

规则：
- 只输出 JSON，不要其他内容
- 现有内容中的观点优先于新信息（除非新信息明显更准确）
- 不要删除或改写现有内容的任何部分`,

  evaluateConversationValue: `你是 Wiki 知识评估助手。判断以下对话是否包含值得保存到 Wiki 的实质性知识。

对话内容：
{{conversation}}

判断标准：
- 包含具体的概念解释、分析或事实性信息（非简单闲聊）
- 对话内容可提炼为结构化的 Wiki 条目
- 信息具有参考价值，未来可能被再次查阅

输出 JSON 格式：
{"valuable": true/false, "reason": "判断理由（一句话）"}`,

  dedupCheck: `你是 Wiki 知识去重助手。判断对话内容是否已被现有 Wiki 页面覆盖。

现有 Wiki 页面索引：
{{wiki_index}}

对话摘要：
{{conversation_summary}}

任务：
1. 分析对话涉及的知识主题
2. 判断这些主题是否已存在于上述 Wiki 页面中
3. 如果全部主题已被覆盖（语义相同或高度相似），标记为 fully_redundant
4. 如果部分主题是新的，标记为 partially_new 并列出新主题

输出 JSON 格式：
{"status": "fully_redundant|partially_new|entirely_new", "new_topics": ["新主题1"], "redundant_topics": ["已覆盖主题1"], "reason": "判断理由（一句话）"}`,

  resolveContradiction: `你是 Wiki 矛盾解决助手。根据矛盾记录和受影响页面内容，生成修复后的页面。

受影响页面内容：
{{existing_content}}

矛盾记录：
{{contradiction_content}}

任务：
1. 分析矛盾的双方观点
2. 调和矛盾：保留正确的信息，标注疑似的错误信息
3. 如果是事实性矛盾，选择更可靠或更新的来源
4. 如果是视角差异，保留双方观点并注明不同立场

重要规则：
- 不要删除任何现有内容
- 在受影响页面末尾添加 "## 已解决矛盾" 章节，说明处理方式和理由
- 保持页面整体结构不变，只在矛盾相关部分进行调整
- 输出完整的修复后页面内容（不要只输出修改部分）
- 不要输出任何解释性文字，直接输出 Markdown 格式的页面内容`,

  fixDeadLink: `你是 Wiki 断链修复助手。分析断链并根据情况修复。

断链来源页面：
{{source_content}}

断链目标（链接文本）：
{{target_name}}

Wiki 现有页面列表：
{{existing_pages}}

任务：
1. 在现有页面列表中搜索与目标相似度最高的页面（判断语义相似）
2. 如果找到匹配页面：输出正确的 [[wiki/entities/page-name]] 或 [[wiki/concepts/page-name]] 链接
3. 如果未找到匹配：输出适合作为新页面标题的简洁名称

输出 JSON 格式：
{"action": "correct|create_stub", "correct_link": "修正后的链接（action=correct时）", "stub_title": "新页面标题（action=create_stub时）", "stub_type": "entity|concept", "reason": "判断理由（一句话）"}`,

  fillEmptyPage: `你是 Wiki 页面扩充助手。为以下内容不足的 Wiki 页面生成内容。

页面路径：{{page_path}}
页面类型（entities/concepts/sources）：{{page_type}}

现有内容：
{{existing_content}}

Wiki 索引（参考背景）：
{{wiki_index}}

任务：
1. 根据页面类型和标题生成合适的内容（150-300字）
2. entities 类型：描述该实体的定义、相关背景、与其他实体的关系
3. concepts 类型：解释该概念的定义、应用场景、相关概念
4. sources 类型：总结该来源的核心观点和贡献
5. 使用 [[wiki-links]] 链接到相关页面
6. 保留现有内容的任何 frontmatter 和已有文字

输出格式：直接输出完整的 Markdown 页面内容（不要输出解释文字）`,

  linkOrphanPage: `你是 Wiki 链接修复助手。为孤立页面在相关页面中建立反向链接。

孤立页面：
{{orphan_content}}

Wiki 索引：
{{wiki_index}}

任务：
1. 分析孤立页面的主题
2. 从 Wiki 索引中选出 1-3 个与此页面最相关的现有页面
3. 为每个相关页面生成建议添加的链接文本（一句话描述 + [[wiki-link]]）

输出 JSON 格式：
{"related_pages": [{"page_path": "wiki/entities/xxx.md", "link_text": "描述此关联的一句话", "link_target": "[[entities/orphan-name]]"}], "reason": "关联理由"}`,

};

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

**任务要求：**
1. 创建实体页面，包含基本信息和关键信息
2. 引用其他页面时，必须使用上面"现有 Wiki 页面"列表中提供的完整路径格式（如 [[entities/Page-Name|Page Name]]）
3. 如果 Wiki 中已有该实体，合并新信息，不要删除旧内容
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

**任务要求：**
1. 创建概念页面，包含定义、特点、应用等
2. 引用其他页面时，必须使用上面"现有 Wiki 页面"列表中提供的完整路径格式（如 [[concepts/Page-Name|Page Name]]）
3. 如果 Wiki 中已有该概念，合并新信息，不要删除旧内容
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

  generateHierarchicalIndex: `You are a Wiki librarian organizing a knowledge index.

Below is a list of all Wiki pages with their summaries:

{{page_list}}

Wiki Structure guidelines:
{{wiki_structure}}

Create a hierarchical, importance-ranked index in Markdown. Follow these rules:

1. **Group by type**: Entities, Concepts, Sources — each as a top-level section
2. **Hierarchy within groups**: Show parent-child relationships. If Concept A is a sub-concept of Concept B, indent it under B
3. **Importance ranking**: More important pages (more linked, more foundational) come first within each group
4. **Link format**: Use [[wiki/type/page-name|Display Name]] for every page reference
5. **Short annotations**: Add a one-line summary in Chinese or English (match the page's language) after each link
6. **Statistics**: End with a summary line showing page counts per category

Output ONLY the Markdown index content, no introductory or concluding text.`,
};
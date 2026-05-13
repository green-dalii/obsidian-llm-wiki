![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki — Obsidian 插件

> 基于 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 实现的知识库生成系统，自动从笔记中提取实体与概念，构建互联的 Wiki 页面。

**作者:** Greener-Dalii | **版本:** 1.7.9

[English](README.md) | [中文文档](README_CN.md) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## 什么是 LLM-Wiki？

你写笔记，AI 来整理，你开口问。就这么简单。

**痛点。** 你的笔记是个金矿——人物、概念、观点、关联。但现在它们只是文件夹里的一堆文档。找到谁跟谁有关，只能靠搜索、打标签，以及祈祷自己还记得那条线索。

**思路。** [Andrej Karpathy 提出了](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)一个优雅的方案：把笔记当原材料，让 LLM 来做架构师。它读你写的东西，提取实体和概念，编织成一个结构化的 Wiki——带 `[[双向链接]]`、自动索引，还能用自然语言对你的知识库提问。

**你不再是图书管理员。** 不用纠结该给谁建页面，不用手工维护交叉链接，不用担心信息过时。笔记丢进 `sources/`，LLM 自动阅读、提取、撰写、链接，甚至标记矛盾——你只管继续写。

**也不是另一个聊天机器人。** ChatGPT 了解互联网，LLM-Wiki 了解*你*——准确说，是你教给它的东西。每个回答都带着 `[[wiki-links]]` 回到你的知识图谱。每条回复都是一条探索路径的起点，而不是终点。

---

## 为什么选择 Obsidian + LLM-Wiki？

Obsidian 是链接思考的利器。但有个问题：连线的那个人一直是你自己。

LLM-Wiki 把这个关系翻转了。不是你手工构建图谱，而是 AI 随着你的笔记一起成长。你写一篇新笔记——它帮你找出你可能会错过的关联。你提一个问题——它在你自己的知识图谱里穿行，带着引用回来见你。

- **你的图谱视图活起来了。** 新笔记不再静静躺在文件夹里——它们自动生长出指向实体、概念和来源的链接。图谱有机生长，而非手工搭建。
- **你的笔记学会了对话。** 搜索变成了聊天。"我之前写过什么关于 X 的内容？"变成了对话，流式回答带着 `[[wiki-links]]` 作为路标。
- **Obsidian 成为你的思考伙伴。** 它不再只是装笔记的柜子，而是帮你*思考*的东西——浮现隐藏的关联、发现知识盲区、记起你忘了自己知道的事。

---

## 核心特性

### 摄入改进
- **批量智能跳过** — 文件夹批量摄入时自动检测并跳过已处理文件，节省时间和API成本。报告中显示跳过计数
- **并行页面生成** — 50+ 实体长文档可配置1-5并发页面生成，3倍提速，错误隔离
- **迭代批量提取** — 自适应批次大小消除长文档max_tokens瓶颈，系统化提取所有实体/概念
- **原文引用保留** — 来源提及章节保留原语言引用，可选翻译，确保可追溯性

### 知识质量
- **保存到Wiki质量改进** — 对话保存现与文件摄入质量一致：完整摘要页、frontmatter字段、实体/概念报告
- **实体/概念关联增强** — 独立的"相关实体"和"相关概念"章节，支持双向追踪
- **智能知识融合** — 页面更新时的智能合并：检测重复、保留矛盾及归属、维护链接
- **内容截断保护** — 8000 max_tokens + 所有provider自动2倍token重试
- **矛盾状态机** — `检测 → 审核通过 → 已解决`（AI修复）或 `检测 → 待修复`（手动）

### 查询与反馈
- **对话式查询** — ChatGPT风格对话框，流式Markdown输出，自带`[[wiki-links]]`，多轮历史
- **查询到Wiki反馈** — 关闭时3阶段价值评估，保存前语义去重
- **重复保存防护** — Hash跟踪阻止未变化对话的重复评估

### LLM与语言
- **多Provider支持** — Anthropic、Anthropic兼容（Coding Plan）、Gemini、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama、自定义接口
- **动态模型列表** — 从provider API实时获取
- **Wiki输出语言** — 8种语言独立于界面（英/中/日/韩/德/法/西/葡），支持自定义输入
- **国际化** — 中英文界面切换（默认英文），所有提示遵循语言设置

### 维护与架构
- **Schema层** — `wiki/schema/config.md`包含模板、融合策略、内容规范，注入所有提示词
- **Lint AI自动修复** — LintReportModal中逐项修复死链、空洞页面、孤立页面
- **自动维护** — 多文件夹监听、定时Lint、启动健康检查（均可选）
- **知识图谱** — Obsidian图谱视图中可视化实体/概念关系
- **自动索引** — `index.md`和`log.md`自动维护
- **模块化代码库** — 9个聚焦模块，易于维护

---

## 快速开始

### 安装

**手动安装（推荐）：**

1. 从 [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 在 Obsidian 中打开 设置 → 第三方插件，在 **已安装插件** 标签页点击文件夹图标，打开插件目录
3. 新建一个 `karpathywiki` 文件夹，将三个文件放入其中
4. 回到 Obsidian，点击刷新图标 — **Karpathy LLM Wiki** 会出现在已安装插件列表中
5. 打开开关启用

**开发构建：** `git clone` 后执行 `pnpm install` 和 `pnpm build`。

### 配置 LLM Provider

1. 打开 设置 → Karpathy LLM Wiki
2. 从下拉菜单选择 Provider（Anthropic、Anthropic 兼容、Google Gemini、OpenAI、DeepSeek、Kimi、GLM、Ollama、OpenRouter 或自定义）
3. 填入 API Key（Ollama 不需要）
4. 点击 **获取模型列表** 填充模型下拉框，或手动输入模型名
5. 点击 **测试连接**，然后 **保存设置**

**Ollama 本地模型（无需 API Key）：** 安装 [Ollama](https://ollama.com)，拉取模型（如 `ollama pull qwen3.5:latest`），在 Provider 下拉选择 "Ollama (本地)"。

**Anthropic 兼容（Coding Plan）：** 如果你的服务商提供 Anthropic 兼容的 API 端点（常见于 Coding Plan 订阅），选择 "Anthropic 兼容"，填入服务商提供的 Base URL 和 API Key，使用 Anthropic SDK 格式调用 Claude 模型。
### 模型选择建议

本插件遵循 Karpathy 的核心理念：**将完整 Wiki 上下文直接喂给 LLM，而非切成碎片做 RAG 检索**。强烈推荐选择长上下文窗口的模型——Wiki 越大，LLM 越需要足够的上下文来保持跨页面一致性和准确回答。

> 为什么不使用 RAG/嵌入向量？Karpathy 在[原始构想](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)中指出，RAG 将知识碎片化，破坏了 LLM 在完整知识图谱上的推理能力。一次长上下文 LLM 调用能更好地理解页面之间的关联。

**重点推荐：**

| 模型 | 上下文窗口 | 推荐理由 |
|------|-----------|----------|
| **DeepSeek V4** | 1M tokens | **首选推荐 — 极低价格，中文能力出色，最适合构建大型 Wiki** |
| **Gemini 3.1 Pro** | 1M+ tokens | **最大上下文窗口，推理能力强（ARC-AGI-2 77.1%），适合超大型 Wiki** |
| **Claude Opus 4.7** | 1M tokens | **最强智能体编程和推理能力，适合复杂多页面综合** |
| **GPT-5.5** | 1M tokens | **OpenAI 最新旗舰（2026年4月），AI 智能指数榜首，知识工作表现出色** |
| **Claude Sonnet 4.6** | 1M tokens | 速度、成本与质量的良好平衡，适合中型 Wiki |

对于本地模型（Ollama）：上下文窗口通常较小（8K-128K），建议限制 Wiki 规模，或使用云端 Provider 做摄入 + 本地模型做查询。

### 使用方式

| 方式 | 操作 |
|------|------|
| **从 sources/ 摄入** | `Cmd+P` → "Ingest Sources"，处理整个 `sources/` 文件夹 |
| **从任意文件夹摄入** | `Cmd+P` → "Ingest from Folder"，选择文件夹从现有笔记生成 Wiki |
| **对话查询** | `Cmd+P` → "Query Wiki"，提问并获取流式回答，回答中自带 `[[wiki-links]]` |

重复摄入同一源文件时，实体/概念页以增量方式合并新信息，摘要页会重新生成。

**批量智能跳过：** 文件夹摄入时，插件自动检测已处理文件并跳过，节省时间和API成本。如果`wiki/sources/${slug}.md`存在，该源文件视为已摄入。批量报告显示"跳过（已摄入）：X/Y"计数。

**摄入加速：**对于包含大量实体（20+）的源文件，可在设置 → 摄入加速中启用并行页面生成：
- **页面生成并发度**：1（串行，最安全）到 5（并行，最快）。大多数 Provider 建议从 3 开始。如遇限流请增大批次延迟。
- **批次延迟**：并行批次间的延迟，100-2000ms。OpenAI（60 RPM 限制）建议设为 500ms+，或遇 429 错误时增大。

> **安全说明**：并行生成使用 `Promise.allSettled` —— 如某页失败，其他页面继续生成。失败页面会自动单独重试并指数退避。指向尚未生成页面的链接使用合法的 Obsidian 语法（`[[entity-name]]`），目标页面一旦存在即自动解析。

**来源引用保留：**"来源提及"章节保留源文件的原文引用。如 Wiki 输出语言与源文件语言不同，翻译将显示在原文后的括号内。这样既保证可追溯性，又保持可读性。

```markdown
---
type: entity
created: 2026-04-29
reviewed: true
---

# Supervised Learning
你精心整理的内容...
```

---

## 命令列表

| 命令 | 说明 |
|------|------|
| **Ingest single source** | 选择单个笔记 → 生成 Wiki 页面 |
| **Ingest from folder** | 选择任意文件夹 → 从现有笔记批量生成 Wiki |
| **Query wiki** | 基于 Wiki 的对话式问答，流式输出 |
| **Lint wiki** | 检测矛盾、过时信息、孤立页面 |
| **Regenerate index** | 手动重建 `wiki/index.md` |
| **Suggest schema updates** | LLM 分析 Wiki 并建议 Schema 改进 |

---

## 使用示例

**输入：** `sources/machine-learning.md`

```markdown
# Machine Learning
Machine learning uses algorithms to learn from data.

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**输出 — 摘要页：** `wiki/sources/machine-learning.md`

```markdown
# Machine Learning
Core concepts and algorithms for learning from data.

## Key Concepts
- [[Supervised Learning]] — Learning from labeled data
- [[Unsupervised Learning]] — Discover patterns in unlabeled data
- [[Reinforcement Learning]] — Learn through interaction
```

**输出 — 实体页：** `wiki/entities/supervised-learning.md`

```markdown
# Supervised Learning

## Definition
Supervised learning learns predictive models from labeled data.

## Key Features
- Requires labeled dataset
- Common algorithms: linear regression, decision trees, neural networks

## Related Concepts
- [[Machine Learning]]
- [[Unsupervised Learning]]
```

---

## 架构

基于 Karpathy 的三层分离设计：

```
sources/     # 你的源文档（只读）
  ↓ ingest
wiki/        # LLM 生成的 Wiki 页面
  ↓ query / maintain
schema/      # Wiki 结构配置（命名规范、页面模板、分类规则）
```

**模块化代码结构** (`src/`)：`wiki/`（引擎、查询、摄入、修复、页面工厂）、`schema/`（schema 管理、自动维护）、`ui/`（设置、模态框），以及共享的 `llm-client.ts`、`prompts.ts`、`texts.ts`（国际化）。

**生成的页面结构：**
- `wiki/sources/文件名.md` — 源文件摘要
- `wiki/entities/实体名.md` — 实体页（人物、组织、项目等）
- `wiki/concepts/概念名.md` — 概念页（理论、方法、术语等）
- `wiki/index.md` — 自动生成的索引
- `wiki/log.md` — 操作日志

---

## 常见问题

**摄入提示"请先配置 API Key"** — 前往 设置 → LLM Wiki，填写 API Key，点击测试连接后保存。

**Wiki 页面显示为代码块** — v1.0.7+ 已修复，重新生成相应页面即可。

**中文文件名变成 `untitled-xxx`** — v1.0.3+ 已修复，现已完整支持 Unicode。

**JSON 解析失败 / "源文件分析失败"** — v1.0.8+ 已加入 LLM 修复回退。打开开发者工具（`Ctrl+Shift+I`）查看详细日志。

---

## 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/你的功能`
3. 提交更改：`git commit -m 'feat: 添加某功能'`
4. 推送分支并提交 Pull Request

请使用 TypeScript 编写，遵循项目现有代码风格，并同步更新 `manifest.json`、`package.json` 和 `versions.json` 中的版本号。

有问题、有想法、或者想分享你的使用方式？欢迎加入 [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)。

---

## 许可证

MIT License — 详见 [LICENSE](LICENSE)。

## 致谢

- **概念来源：** [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 本插件的原始构想
- **开发平台：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDK：** Anthropic SDK、OpenAI SDK

![llm_wiki_banner](/docs/assets/llm_wiki_banner.jpg)

# Karpathy LLM Wiki — Obsidian 插件

> 基于 [Andrej Karpathy 的 LLM Wiki 概念](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 实现的知识库生成系统，自动从笔记中提取实体与概念，构建互联的 Wiki 页面。

**作者:** Greener-Dalii | **版本:** 1.2.0

[English](README.md) | [中文文档](README_CN.md)

---

## 核心特性

- **多 LLM Provider 支持** — Anthropic (Claude)、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama，以及自定义 OpenAI 兼容接口
- **国际化** — 中英文界面切换（默认英文）
- **智能摄入** — 自动从源文档提取实体和概念，生成结构化 Wiki 页面
- **双向链接** — 所有生成页面使用原生 Obsidian `[[wiki-links]]` 语法
- **知识图谱** — 在 Obsidian Graph View 中可视化实体/概念关系
- **对话式查询** — ChatGPT 风格对话框，流式 Markdown 输出，支持多轮追问和保存到 Wiki
- **自动维护** — 检测矛盾、过时信息、孤立页面
- **自动索引** — `index.md` 和 `log.md` 自动维护

---

## 快速开始

### 安装

**手动安装（推荐）：** 从 [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) 下载 `main.js`、`manifest.json`、`styles.css`，复制到 `.obsidian/plugins/llm-wiki/`，在 设置 → 第三方插件 中启用。

**开发构建：** `git clone` 后执行 `pnpm install` 和 `pnpm build`。

### 配置 LLM Provider

1. 打开 设置 → Karpathy LLM Wiki
2. 从下拉菜单选择 Provider（Anthropic、OpenAI、DeepSeek、Kimi、GLM、Ollama、OpenRouter 或自定义）
3. 填入 API Key（Ollama 不需要）
4. 点击 **获取模型列表** 填充模型下拉框，或手动输入模型名
5. 点击 **测试连接**，然后 **保存设置**

**Ollama 本地模型（无需 API Key）：** 安装 [Ollama](https://ollama.com)，拉取模型（如 `ollama pull qwen2`），在 Provider 下拉选择 "Ollama (本地)"。

### 使用方式

| 方式 | 操作 |
|------|------|
| **从 sources/ 摄入** | `Cmd+P` → "Ingest Sources"，处理整个 `sources/` 文件夹 |
| **从任意文件夹摄入** | `Cmd+P` → "Ingest from Folder"，选择文件夹从现有笔记生成 Wiki |
| **对话查询** | `Cmd+P` → "Query Wiki"，提问并获取流式回答，回答中自带 `[[wiki-links]]` |

重复摄入同一源文件时，实体/概念页以增量方式合合新信息，摘要页会重新生成。

---

## 命令列表

| 命令 | 说明 |
|------|------|
| **Ingest Sources** | 处理 `sources/` → 生成 Wiki 页面 |
| **Ingest from Folder** | 选择任意文件夹 → 从现有笔记生成 Wiki |
| **Query Wiki** | 基于 Wiki 的对话式问答，流式输出 |
| **Lint Wiki** | 检测矛盾、过时信息、孤立页面 |
| **Generate Index** | 手动重新生成 `wiki/index.md` |

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
schema/      # 工作流配置（规划中）
```

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

---

## 许可证

MIT License — 详见 [LICENSE](LICENSE)。

## 致谢

- **概念来源：** [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 本插件的原始构想
- **开发平台：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDK：** Anthropic SDK、OpenAI SDK

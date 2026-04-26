# Karpathy LLM Wiki Plugin for Obsidian

> 🤖 Karpathy 的 LLM Wiki 完整实现 - 多页面知识生成系统

**作者:** green-dalii | **版本:** 1.0.9 | **状态:** 生产可用

[English](README.md) | 中文文档

---

## 🎯 项目简介

这是一个完整的 Karpathy LLM Wiki 实现，专为 Obsidian 设计。它能自动从源文档生成结构化的 Wiki 知识库，支持实体页、概念页的双向链接和知识图谱可视化。

### 核心特性

- **🤖 多 LLM Provider 支持**：Anthropic (Claude)、OpenAI、DeepSeek、Kimi、GLM、OpenRouter、Ollama、自定义兼容服务
- **🌍 国际化支持**：英文和中文界面（默认：英文）
- **📝 智能摄入**：自动提取实体、概念，生成 Wiki 页面
- **🔗 双向链接**：原生 Obsidian `[[wiki-links]]` 语法
- **📊 知识图谱**：通过 Obsidian Graph View 可视化关系网络
- **🔍 Wiki 查询**：提问并获得综合答案
- **🛠️ 自动维护**：检测矛盾、过时信息、孤立页面
- **📑 自动生成索引**：`index.md` 和 `log.md` 自动维护

---

## 📖 架构说明

基于 Karpathy 的三层分离架构：

```
sources/     # 源文档（只读）
  ↓ ingest
wiki/        # LLM 生成的 Wiki 页面
  ↓ query/maintain
schema/      # 工作流配置（未来功能）
```

**生成的页面结构：**
- `wiki/sources/文件名.md` - 源文件摘要页
- `wiki/entities/实体名.md` - 实体详情页（人物、组织、项目等）
- `wiki/concepts/概念名.md` - 概念解释页（理论、方法、术语等）
- `wiki/index.md` - Wiki 索引页
- `wiki/log.md` - 操作日志

---

## 🚀 快速开始

### 安装

#### 手动安装

1. 下载最新版本：[Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. 复制到你的 vault: `.obsidian/plugins/llm-wiki/`
3. 在 Obsidian 中启用：Settings → Community plugins → Karpathy LLM Wiki

#### 开发构建

```bash
git clone https://github.com/green-dalii/obsidian-llm-wiki.git
cd obsidian-llm-wiki
pnpm install
pnpm build
```

### 配置 LLM Provider

#### 1. Anthropic (Claude)

**步骤：**
- Provider 选择：`Anthropic (Claude)`
- API Key: `sk-ant-...`（从 [Anthropic Console](https://console.anthropic.com/) 获取）
- 点击"获取模型列表" → 下拉选择模型（如 `claude-sonnet-4-6`）
- 点击"测试连接"验证 → 点击"保存设置"

**费用参考：**
- Claude Sonnet 4.6: ~$3/百万输入 token, ~$15/百万输出 token
- 每次摄入约消耗 2000-5000 token（费用 $0.01-0.08）

#### 2. OpenAI

**步骤：**
- Provider: `OpenAI`
- API Key: `sk-...`（从 [OpenAI Platform](https://platform.openai.com/) 获取）
- 模型: `gpt-4o` 或 `gpt-4o-mini`

#### 3. DeepSeek / Kimi / GLM

**步骤：**
- Provider 选择相应服务商
- API Key 从对应平台获取
- 自动填充 Base URL 和默认模型

#### 4. Ollama (本地模型)

**步骤：**
- Provider: `Ollama (本地)`
- 无需 API Key
- Base URL: `http://localhost:11434/v1`（自动填充）
- 模型: 输入本地模型名称（如 `llama3`、`qwen2`）

**前置条件：**
```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 拉取模型
ollama pull llama3
ollama pull qwen2  # 中文模型推荐
```

#### 5. 自定义 OpenAI 兼容服务

**步骤：**
- Provider: `自定义 OpenAI 兼容`
- Base URL: 输入你的 API endpoint（如 `http://your-server:8000/v1`）
- API Key: 按服务商要求填写
- 模型: 手动输入模型名称

### 基础使用流程

#### 方法1：从源文件夹摄入

```bash
# 创建源文件夹
mkdir sources

# 添加 Markdown 文件
sources/machine-learning.md
sources/data-science.md
```

在 Obsidian 中：
- `Cmd+P` → "Ingest Sources" → 自动处理 `sources/` 文件夹

#### 方法2：从现有文件夹初始化

```bash
# 你的现有笔记结构
notes/
  ├── programming/
  ├── research/
  └── daily/
```

在 Obsidian 中：
- `Cmd+P` → "Ingest from Folder" → 选择 `notes/programming`
- 自动生成 Wiki 从现有笔记

---

## 🔧 命令列表

| 命令 | 功能说明 |
|------|---------|
| **Ingest Sources** | 处理 `sources/` 文件夹 → 生成 Wiki 页面 |
| **Ingest from Folder** | 选择任意文件夹 → 从现有笔记初始化 Wiki |
| **Query Wiki** | 提问并获得综合答案（基于 Wiki 内容） |
| **Lint Wiki** | 检测矛盾、过时信息、孤立页面 |
| **Generate Index** | 手动生成 `wiki/index.md` |

---

## 💡 使用示例

### 输入示例

**源文件：** `sources/machine-learning.md`

```markdown
# Machine Learning

Machine learning uses algorithms to learn from data...

## Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

### 输出结果

**摘要页：** `wiki/sources/machine-learning.md`

```markdown
# Machine Learning

Machine learning 基础概念，涵盖监督学习、无监督学习、强化学习...

## 核心概念
- [[Supervised Learning]] - 从标注数据学习
- [[Unsupervised Learning]] - 发现无标注数据中的模式
- [[Reinforcement Learning]] - 通过交互学习
```

**实体页：** `wiki/entities/supervised-learning.md`

```markdown
# Supervised Learning

## 定义
监督学习是从标注数据中学习预测模型的机器学习方法。

## 关键特征
- 需要标注数据集
- 常见算法：线性回归、决策树、神经网络

## 相关概念
- [[Machine Learning]]
- [[Unsupervised Learning]]
```

---

## ⚙️ 增量更新机制

### 当前实现

**摄入同一源文件的影响：**

| 页面类型 | 行为 | 说明 |
|---------|------|------|
| **摘要页** | ❌ 重新生成 | 每次摄入会覆盖旧的摘要页 |
| **实体页** | ✅ 增量更新 | 合合新信息到现有页面 |
| **概念页** | ✅ 增量更新 | 合合新信息到现有页面 |

**最佳实践：**
- ✅ 首次摄入新源文件 → 创建完整 Wiki
- ✅ 源文件更新后重新摄入 → 实体/概念页智能合并
- ⚠️ 避免无修改的重复摄入（浪费 API 费用）
- 💡 如需重新生成摘要页，先手动删除旧摘要页

**未来改进候选：**
参见 [ROADMAP.md](ROADMAP.md) 的"智能摄入检测"章节。

---

## 🔒 安全说明

### OpenAI Browser Environment

OpenAI SDK 需要 `dangerouslyAllowBrowser: true` 才能在 Obsidian 的 Electron 环境中运行。这是安全的，因为：

- Obsidian 是**本地 Electron 应用**，不是浏览器
- API Key 存储在**本地文件** `.obsidian/plugins/data.json`
- 无跨域脚本攻击风险
- 这是 Obsidian Plugin 开发的标准实践

### 推荐安全策略

1. **使用本地模型**：Ollama 无需 API Key，完全本地运行
2. **Anthropic**：无浏览器环境限制
3. **API Key 管理**：定期更换 Key，避免泄露

---

## 🗺️ 功能规划

参见 [ROADMAP.md](ROADMAP.md) 了解未来规划：

- 智能摄入检测（避免重复处理）
- 多语言支持
- 知识图谱导出
- Schema 工作流配置
- 协作编辑支持

---

## 🐛 故障排查

### 常见问题

#### 1. 摄入失败："请先配置 API Key"

**原因：** LLM Client 未初始化

**解决：**
- Settings → LLM Wiki → 填写 API Key
- 点击"测试连接"验证
- 点击"保存设置"

#### 2. 生成的 Wiki 页面显示为代码块

**原因：** LLM 返回的内容被 `\`\`\`markdown\`\`\`` 包裹

**解决：** 已在 v1.0.7+ 修复，使用 `cleanMarkdownResponse()` 自动移除代码块标记

#### 3. 中文文件名变成 `untitled-xxx`

**原因：** slugify 函数不支持中文

**解决：** 已在 v1.0.3+ 修复，支持完整 Unicode 字符（中文、日文、韩文）

#### 4. JSON 解析失败："源文件分析失败"

**原因：** LLM 返回的 JSON 格式异常

**解决：** 已在 v1.0.8+ 增强 JSON 解析：
- 清理 markdown 包裹
- 提取 JSON 对象
- 修复常见格式问题（尾随逗号）
- 详细日志追踪解析过程

**调试：** 打开开发者工具（View → Toggle Developer Tools）查看详细日志

---

## 🤝 贡献指南

欢迎贡献！请遵循以下流程：

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

**开发规范：**
- TypeScript 编写，遵循项目代码风格
- 添加必要的日志和错误处理
- 更新版本号（manifest.json、package.json、versions.json）
- 提交 Git 记录（参考现有 commit 格式）

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

- **概念来源：** [Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- **开发平台：** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDK：** Anthropic SDK、OpenAI SDK

---

## 📞 支持

- 📖 [文档](docs/)
- 🐛 [问题反馈](https://github.com/green-dalii/obsidian-llm-wiki/issues)
- 💬 [讨论](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

**快速链接：** [English](README.md) | [功能规划](ROADMAP.md) | [变更日志](CHANGELOG.md) | [许可证](LICENSE)
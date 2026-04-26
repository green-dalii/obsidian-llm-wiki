# LLM Wiki Plugin for Obsidian

一个实现 Karpathy 的 LLM Wiki 理念的 Obsidian 插件 - 使用大模型增量构建并维护持久化知识库。

## 核心理念

基于 [Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)，该插件实现：

- **增量知识构建**：不再是传统的 RAG 系统（每次重新检索碎片），而是让 LLM 编译一次并持续更新
- **知识复利**：新信息直接融入现有结构，跨页面引用随资料增加而自然丰富
- **自动化维护**：模型负责更新链接、标记冲突与补充缺失，彻底解决人工维护负担

## 架构

### 三层分离

1. **原始资料层** (`sources/` 文件夹)
   - 只读来源，模型仅读取不修改
   - 存放需要处理的原始文档

2. **Wiki 层** (`wiki/` 文件夹)
   - 由模型自动生成的结构化 Markdown 文件集合
   - 包含摘要、实体页、概念页等
   - 使用 Obsidian 双向链接 `[[页面名]]` 实现互联

3. **Schema 配置层** (`schema/` 文件夹)
   - 记录工作流规范与页面约定的指令文件
   - 确保模型行为保持一致

### 核心操作

#### 1. 摄入（Ingest）
- 解析新资料
- 提取关键信息
- 同步更新相关页面、目录与操作日志

#### 2. 查询（Query）
- 检索 Wiki 内容并综合回答
- 生成的优质分析可直接沉淀为新页面

#### 3. 维护（Lint）
- 定期扫描知识库
- 自动排查内容矛盾、过时声明、孤立节点或缺失链接

## 功能特性

- ✅ **多 Provider 支持**：支持 Anthropic (Claude) 和 OpenAI (含兼容 endpoint)
- ✅ **智能摄入**：自动从源文件夹读取文档，使用 LLM 提取关键信息
- ✅ **双向链接**：生成的 Wiki 页面支持 Obsidian 原生 `[[链接]]` 语法
- ✅ **图谱可视化**：利用 Obsidian 内置图谱功能查看知识关系
- ✅ **版本控制**：原生支持 Git，追踪每次知识更新
- ✅ **自动维护**：定期检查知识库一致性，发现矛盾和孤立页面
- ✅ **索引生成**：自动生成 `index.md` 目录和 `log.md` 操作时间线

## 安装

### 开发环境安装

```bash
cd llm-wiki-plugin
pnpm install
pnpm dev
```

### 手动安装

1. 下载 `main.js`, `manifest.json`, `styles.css` 到你的 vault 的 `.obsidian/plugins/llm-wiki-plugin/` 文件夹
2. 在 Obsidian 设置中启用插件
3. 配置你的 Anthropic API Key

## 配置

在插件设置中配置：

### LLM Provider 选择

插件支持两种 LLM 提供商：

1. **Anthropic (Claude)** - 默认选项
   - **API Key**：你的 Anthropic API Key
   - **模型**：推荐使用 `claude-sonnet-4-6` 或 `claude-opus-4-7`

2. **OpenAI / OpenAI Compatible**
   - **API Key**：你的 OpenAI API Key
   - **Base URL**（可选）：自定义 API endpoint，用于接入兼容服务（如本地 LLM、Azure OpenAI 等）
   - **模型**：推荐使用 `gpt-4o` 或 `gpt-4o-mini`

### 其他配置

- **源文件夹**：存放原始资料的文件夹（默认：`sources`）
- **Wiki 文件夹**：存放生成的 Wiki 页面（默认：`wiki`）
- **自动更新间隔**：自动维护 Wiki 的时间间隔（毫秒）

### OpenAI 兼容 endpoint 示例

如果你使用本地 LLM 服务或其他 OpenAI 兼容服务，可以在 Base URL 中配置：

- **Ollama**：`http://localhost:11434/v1`
- **Azure OpenAI**：`https://your-resource.openai.azure.com/openai/deployments/your-deployment`
- **其他兼容服务**：根据服务商提供的 endpoint 配置

### 关于 OpenAI SDK 浏览器环境

使用 OpenAI Provider 时，你可能注意到插件启用了 `dangerouslyAllowBrowser: true` 选项。这是**安全的低风险配置**，原因：

- **Obsidian 是 Electron 应用**：虽然被 OpenAI SDK 检测为浏览器环境，但实际上是本地应用
- **本地数据存储**：API Key 存储在本地文件（`.obsidian/plugins/data.json`），只有你能访问
- **社区通用做法**：许多 Obsidian 插件都使用此方案
- **安全性评估**：详见 [SECURITY.md](SECURITY.md)

**如果你仍然担心安全性**，可以使用：
- **本地 LLM**（如 Ollama）：完全不暴露 API Key
- **Anthropic Provider**：无浏览器限制

## 使用方法

### 命令面板命令

1. **摄入新资料 (Ingest Sources)**
   - 从源文件夹读取所有文档
   - 使用 LLM 提取关键信息并生成 Wiki 页面
   - 自动更新索引和日志

2. **查询 Wiki (Query Wiki)**
   - 输入问题
   - LLM 会综合所有 Wiki 内容给出答案
   - 可以生成新的分析页面

3. **维护 Wiki (Lint Wiki)**
   - 扫描整个知识库
   - 识别内容矛盾、过时信息、孤立页面
   - 提供维护建议

4. **生成索引 (Generate Index)**
   - 生成 `wiki/index.md` 目录文件
   - 按更新时间排列所有页面

### 工作流程

```
原始文档 → sources/ 文件夹
   ↓
运行"摄入新资料"命令
   ↓
LLM 提取关键信息 → wiki/*.md 文件
   ↓
使用 Obsidian 查看图谱、双向链接
   ↓
定期运行"维护 Wiki"保持一致性
```

## 开发路线

- [ ] 支持更多 LLM 提供商（OpenAI, 本地模型）
- [ ] 可自定义的 Schema 模板
- [ ] 知识图谱可视化增强
- [ ] 批量导入功能
- [ ] 冲突解决界面
- [ ] 页面模板系统

## 技术栈

- **TypeScript**：主要开发语言
- **Obsidian API**：文件系统、编辑器、UI 组件
- **Anthropic SDK**：Claude API 集成
- **esbuild**：构建工具

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 参考

- [Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Obsidian Plugin Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
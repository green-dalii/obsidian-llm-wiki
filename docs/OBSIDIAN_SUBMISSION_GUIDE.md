# Obsidian Plugin Submission Guide

> 如何将 LLM Wiki Plugin 提交到 Obsidian 官方 Plugin 社区

**更新日期:** 2025-04-26

---

## 📋 提交前检查清单

### ✅ 必备文件完整性

确保以下文件存在且格式正确：

| 文件 | 作用 | 要求 |
|------|------|------|
| **manifest.json** | 插件元数据 | ✅ 必需，包含 id、name、version、minAppVersion、description、author |
| **main.js** | 编译产物 | ✅ 必需，从 TypeScript 编译生成 |
| **styles.css** | 样式文件 | ⚠️ 可选，如果插件有自定义样式 |
| **README.md** | 用户文档 | ✅ 必需，英文版本（国际化） |
| **LICENSE** | 许可证 | ✅ 必需，推荐 MIT License |

### ✅ 检查当前项目

**验证命令：**

```bash
# 1. 检查必需文件
ls -lh manifest.json main.js styles.css README.md LICENSE

# 2. 验证 manifest.json 格式
cat manifest.json

# 3. 验证版本一致性
grep "version" manifest.json package.json versions.json
```

**当前项目状态（v1.0.8）：**

- ✅ `manifest.json` - 格式正确
- ✅ `main.js` - 已编译（376KB）
- ✅ `styles.css` - 存在（889B）
- ✅ `README.md` - 完整英文文档
- ✅ `README_CN.md` - 中文文档
- ✅ `LICENSE` - MIT License（Copyright 2025）
- ✅ `ROADMAP.md` - 功能规划文档
- ✅ `CHANGELOG.md` - 变更日志

---

## 🚀 提交流程

### Step 1: 准备 GitHub 仓库

#### 1.1 创建 GitHub Repository

**前往 GitHub：**
1. 登录 [GitHub](https://github.com/)
2. 点击 "New Repository"
3. 填写信息：
   - **Repository name:** `llm-wiki-plugin`
   - **Description:** `Karpathy's LLM Wiki implementation for Obsidian - multi-page knowledge generation`
   - **License:** MIT（已在本地配置）
   - **Public:** 必须选择 Public（Obsidian 要求）

#### 1.2 推送代码到 GitHub

**初始化 Git（如果未初始化）：**

```bash
# 当前项目已初始化 Git，跳过此步骤
# git init
# git add .
# git commit -m "feat: initial commit"
```

**关联 GitHub Remote：**

```bash
# 添加 remote（替换为你的 GitHub 用户名）
git remote add origin https://github.com/green-dalii/llm-wiki-plugin.git

# 推送到 GitHub
git push -u origin main
```

**验证推送：**
- 访问 `https://github.com/green-dalii/llm-wiki-plugin`
- 确认所有文件都已上传
- 确认 README.md 正常显示

---

### Step 2: 创建第一个 Release

#### 2.1 准备 Release 文件

**必需文件：**
- `main.js`
- `manifest.json`
- `styles.css`

**打包命令：**

```bash
# 创建临时目录
mkdir -p release-temp

# 复制必需文件
cp main.js release-temp/
cp manifest.json release-temp/
cp styles.css release-temp/

# 创建 ZIP 包
cd release-temp
zip -r ../llm-wiki-plugin-v1.0.8.zip .
cd ..

# 清理
rm -rf release-temp
```

#### 2.2 在 GitHub 创建 Release

**步骤：**
1. 访问 GitHub 仓库
2. 点击 "Releases" → "Draft a new release"
3. 填写信息：
   - **Tag version:** `v1.0.8`（必须与 manifest.json version 一致）
   - **Release title:** `v1.0.8 - Multi-provider support and quality improvements`
   - **Description:** 从 CHANGELOG.md 复制相关内容
4. 上传 ZIP 包：`llm-wiki-plugin-v1.0.8.zip`
5. 点击 "Publish release"

**Release Description 模板：**

```markdown
## v1.0.8 - Enhanced JSON parsing and error tracking

### New Features
- Multi LLM Provider support (Anthropic, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, Custom)
- Dynamic model list fetching from API
- Smart ingestion with entity/concept extraction

### Improvements
- Chinese filename support (full Unicode)
- Markdown code block cleanup
- Enhanced JSON parsing (5-step strategy)
- Detailed debug logs

### Installation
Download `main.js`, `manifest.json`, `styles.css` and copy to `.obsidian/plugins/llm-wiki-plugin/`

For full changelog, see [CHANGELOG.md](CHANGELOG.md)
```

---

### Step 3: 提交到 Obsidian Plugin Community

#### 3.1 Fork obsidian-releases 仓库

**步骤：**
1. 访问 [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
2. 点击 "Fork" → 创建你的 Fork

#### 3.2 添加插件到 community-plugins.json

**在你的 Fork 中：**

1. 编辑 `community-plugins.json`
2. 在数组末尾添加你的插件 ID：

```json
[
  "existing-plugin-1",
  "existing-plugin-2",
  ...
  "llm-wiki-plugin"
]
```

**注意：**
- ✅ 仅添加插件 ID（`llm-wiki-plugin`），不是完整 URL
- ✅ 保持 JSON 格式正确（逗号分隔）
- ✅ 不要修改其他插件条目

#### 3.3 提交 Pull Request

**步骤：**
1. Commit 变更：
   ```bash
   git add community-plugins.json
   git commit -m "Add LLM Wiki Plugin"
   ```
2. Push 到你的 Fork：
   ```bash
   git push origin master
   ```
3. 在 GitHub 上点击 "Pull Request"
4. 填写 PR 标题：
   - **Title:** `Add LLM Wiki Plugin`
5. PR Body 模板：

```markdown
## Plugin Submission: LLM Wiki

### Plugin Details
- **ID:** `llm-wiki-plugin`
- **Name:** LLM Wiki
- **Version:** 1.0.8
- **Description:** Karpathy's LLM Wiki implementation for Obsidian - multi-page knowledge generation
- **Author:** green-dalii
- **Repo:** https://github.com/green-dalii/llm-wiki-plugin
- **Branch:** main

### Compliance Checklist
- ✅ Plugin ID is unique
- ✅ Plugin is open source (MIT License)
- ✅ Plugin follows Obsidian plugin guidelines
- ✅ README.md contains installation instructions
- ✅ manifest.json has required fields (id, name, version, minAppVersion, description, author)
- ✅ Release with `main.js`, `manifest.json`, `styles.css` exists on GitHub

### Testing
The plugin has been tested with:
- Obsidian v0.15.0+
- Multiple LLM providers (Anthropic, OpenAI, DeepSeek, Ollama)
- Chinese and English content

For more details, see [README.md](https://github.com/green-dalii/llm-wiki-plugin/blob/main/README.md)
```

---

### Step 4: 审核流程

#### 4.1 自动检查

Obsidian 团队会自动检查：

- ✅ Plugin ID 是否唯一
- ✅ 是否符合 Obsidian Plugin Guidelines
- ✅ Release 文件是否完整
- ✅ README 是否包含必要信息
- ✅ 是否开源且许可证正确

#### 4.2 等待审核

**预计时间：**
- 通常 1-7 天
- Obsidian 团队会检查代码质量、安全性、用户体验

**可能的结果：**

1. ✅ **Approve** - 插件会被添加到 Obsidian Plugin Community
2. ❌ **Request Changes** - 需要修改并重新提交
3. ❌ **Reject** - 插件不符合要求

#### 4.3 处理审核反馈

**如果收到 "Request Changes":**

1. 根据反馈修改代码或文档
2. 更新版本号（如 v1.0.9）
3. 创建新的 Release
4. 在 PR 中评论说明修改内容

---

## 📚 Obsidian Plugin Guidelines

### 必须遵守的规则

#### 1. 安全性

- ✅ **不要访问用户数据**：除非用户明确授权
- ✅ **不要上传数据到第三方**：除非用户明确同意
- ✅ **API Key 安全存储**：存储在 `.obsidian/plugins/data.json`（本地）
- ✅ **不要硬编码敏感信息**：API Key、密码等

**当前项目合规性：**
- ✅ API Key 存储在本地 Obsidian data.json
- ✅ 使用 `dangerouslyAllowBrowser: true` 的安全性已说明（见 README）
- ✅ 无硬编码敏感信息

#### 2. 用户体验

- ✅ **提供清晰的 README**：安装步骤、使用指南、故障排查
- ✅ **设置面板友好**：提供测试连接、保存按钮、状态显示
- ✅ **错误提示友好**：使用 Obsidian Notice API，避免技术术语
- ✅ **命令命名清晰**：使用动词+名词格式（如 "Ingest Sources"）

**当前项目合规性：**
- ✅ README 包含完整安装和使用说明
- ✅ 设置面板有测试连接、保存按钮
- ✅ 使用 Notice API 提供用户友好提示
- ✅ 命令命名清晰（Ingest Sources, Query Wiki, Lint Wiki）

#### 3. 代码质量

- ✅ **使用 TypeScript**：类型安全，避免运行时错误
- ✅ **遵循 Obsidian Plugin API**：使用官方 API（vault、file、editor）
- ✅ **错误处理**：try/catch + 用户友好提示
- ✅ **不引入破坏性依赖**：避免过大 npm 包

**当前项目合规性：**
- ✅ TypeScript 实现
- ✅ 使用 Obsidian Plugin API（TFile、TFolder、Notice、Setting）
- ✅ 完整的错误处理（try/catch + Notice）
- ⚠️ 依赖较大：Anthropic SDK + OpenAI SDK（已最小化，无替代方案）

#### 4. 许可证

- ✅ **必须开源**：推荐 MIT、Apache 2.0、GPL
- ✅ **许可证文件存在**：LICENSE 文件
- ✅ **manifest.json 填写正确**：author、authorUrl

**当前项目合规性：**
- ✅ MIT License
- ✅ LICENSE 文件存在
- ✅ manifest.json author: "green-dalii", authorUrl: "https://github.com/green-dalii"

---

## 🛠️ 发布后续维护

### 版本更新流程

**每次发布新版本：**

1. **更新代码：**
   ```bash
   # 修改代码后
   pnpm build
   ```

2. **更新版本号：**
   ```bash
   # manifest.json
   "version": "1.0.9"

   # package.json
   "version": "1.0.9"

   # versions.json（添加新版本映射）
   "1.0.9": "0.15.0"
   ```

3. **提交 Git：**
   ```bash
   git add .
   git commit -m "feat: v1.0.9 - new feature description"
   git push origin main
   ```

4. **创建 Release：**
   - GitHub → Releases → Draft new release
   - Tag: `v1.0.9`
   - 上传新的 `main.js`, `manifest.json`, `styles.css`

5. **Obsidian 自动更新：**
   - 用户会自动收到更新通知（Obsidian 检测到新版本）

---

## ❓ 常见问题

### 1. 提交后多久可以出现在 Obsidian Plugin Community？

**回答：** 通常 1-7 天，取决于审核队列长度和插件质量。

---

### 2. 如何检查插件 ID 是否已被占用？

**回答：**
- 查看 [community-plugins.json](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json)
- 搜索你的插件 ID（如 `llm-wiki-plugin`）
- 如果已存在，需更换 ID

---

### 3. Release 必须包含哪些文件？

**回答：**
- ✅ **必需：** `main.js`, `manifest.json`
- ⚠️ **可选：** `styles.css`（如果有自定义样式）
- ❌ **不要包含：** `main.ts`, `node_modules/`, `.git/`, `package.json`（源代码）

---

### 4. 为什么 Obsidian 要求 `main.js` 而不是 `main.ts`？

**回答：**
- Obsidian 运行在浏览器环境（Electron），需要编译后的 JavaScript
- TypeScript 用于开发阶段类型检查
- 用户下载编译产物，不需要 TypeScript 环境

---

### 5. 如何测试插件是否符合 Obsidian Plugin Guidelines？

**回答：**
- 阅读 [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- 使用 [obsidian-plugin-cli](https://github.com/obsidianmd/obsidian-plugin-cli) 检查

---

## 📞 支持和帮助

### 官方资源

- 📖 [Obsidian Plugin Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 📋 [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- 💬 [Obsidian Discord - #plugin-dev](https://discord.gg/obsidianmd)
- 🐛 [obsidian-releases Issues](https://github.com/obsidianmd/obsidian-releases/issues)

### 社区帮助

- 提交 PR 后，可在 Obsidian Discord #plugin-dev 频道寻求帮助
- PR 中可以标记 `@obsidianmd` 团队成员请求审核

---

## 🎯 下一步行动

### 立即执行（提交前）

1. ✅ **确认文件完整：**
   ```bash
   ls -lh manifest.json main.js styles.css README.md LICENSE
   ```

2. ✅ **验证版本一致性：**
   ```bash
   grep "version" manifest.json package.json versions.json
   ```

3. ✅ **推送到 GitHub：**
   ```bash
   git remote add origin https://github.com/green-dalii/llm-wiki-plugin.git
   git push -u origin main
   ```

### 提交流程（按顺序）

1. 📦 创建 Release（v1.0.8）
2. 🍴 Fork obsidian-releases
3. 📝 添加插件 ID 到 community-plugins.json
4. 🔀 提交 Pull Request
5. ⏳ 等待审核（1-7天）

---

**最后更新:** 2025-04-26 | **文档作者:** green-dalii
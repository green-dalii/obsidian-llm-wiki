# OpenAI SDK 浏览器环境安全性说明

## 问题背景

使用 OpenAI SDK 时，你可能遇到以下错误：

```
OpenAIError: It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
```

**原因：** OpenAI SDK 默认禁止在浏览器环境中使用，以防止 API Key 被恶意脚本窃取。

---

## 为什么 Obsidian 是安全的？

### Obsidian 的环境特性

Obsidian 实际上是 **Electron 应用**，而不是纯浏览器环境：

1. **本地运行**
   - 应用运行在本地计算机
   - 不依赖远程服务器
   - 数据存储在本地文件系统

2. **沙盒隔离**
   - Electron 提供了 Node.js 和 Chromium 双重环境
   - 插件运行在相对隔离的环境中
   - 不存在传统网页的跨域脚本攻击风险

3. **本地数据存储**
   - API Key 存储在本地配置文件（`.obsidian/plugins/data.json`）
   - 只有本地用户可以访问
   - 不会通过网络传输（除非你自己配置同步）

4. **用户信任模型**
   - Obsidian 插件由用户主动安装
   - 用户信任插件代码
   - API Key 由用户自己配置和管理

---

## 安全性对比

| 环境 | API Key 风险 | 说明 |
|-----|-------------|------|
| **浏览器网页** | 🔴 **高风险** | 任何第三方脚本都可以读取 API Key，可能被恶意网站窃取 |
| **Obsidian 插件** | 🟡 **低风险** | 本地应用，只有安装的插件能访问，用户可控 |
| **Node.js 服务端** | 🟢 **最安全** | 完全隔离，不受浏览器限制，标准做法 |

---

## 我们的安全措施

### 代码实现

```typescript
class OpenAIClient implements LLMClient {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: true // Obsidian Electron 环境
    });
  }
}
```

### 配置存储

- API Key 存储在本地文件：`.obsidian/plugins/llm-wiki-plugin/data.json`
- 只有你能访问这个文件
- 不会上传到云端（除非你配置 Obsidian Sync）

---

## 用户安全建议

### ✅ 推荐做法

1. **使用官方 Obsidian 版本**
   - 从官网下载：https://obsidian.md
   - 遅免使用第三方修改版本

2. **信任插件来源**
   - 只安装来自官方 Community Plugins 或可信源的插件
   - 检查插件代码（开源插件可以审计）

3. **妥善管理 API Key**
   - 不要分享你的 vault（包含 API Key）
   - 使用环境变量或配置文件管理敏感信息
   - 定期检查 API Key 使用情况

4. **监控 API 使用**
   - 在 OpenAI/Anthropic 后台查看 API 使用量
   - 发现异常使用立即禁用 Key

5. **使用本地 LLM**
   - 如果担心 API Key 安全，可以使用本地模型（如 Ollama）
   - 完全不暴露 API Key

### ❌ 避免的做法

1. **不要公开分享 vault**
   - 如果 vault 包含 API Key，不要上传到公开 Git 仓库
   - 使用 `.gitignore` 忽略 `.obsidian/plugins/*/data.json`

2. **不要在不受信任的环境使用**
   - 遅免在公共电脑配置 API Key
   - 不要使用来路不明的 Obsidian 版本

3. **不要过度依赖云端同步**
   - 如果使用 Obsidian Sync，确保加密
   - API Key 可能被同步到云端

---

## 技术细节

### OpenAI SDK 检测机制

OpenAI SDK 通过以下方式检测浏览器环境：

```typescript
function getBrowserEnvironment() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }
  return 'node';
}
```

Obsidian 的 Electron 环境包含 `window` 和 `document`，被误判为浏览器。

### Electron 环境优势

Electron 提供了 Node.js API：

- `fs` 文件系统访问
- `path` 路径处理
- `crypto` 加密功能
- 本地进程管理

这些 API 在纯浏览器中不可用，使得 Electron 应用更像服务端环境。

---

## 替代方案

如果你仍然担心安全性，可以使用以下替代方案：

### 1. 本地代理服务

创建一个本地 HTTP 代理，转发 OpenAI 请求：

```bash
# 使用 nginx 或其他代理工具
# Obsidian 插件 → 本地代理 → OpenAI API
```

优势：
- API Key 不直接存储在 Obsidian
- 更安全的环境隔离

劣势：
- 需要额外配置
- 增加复杂度

### 2. 使用本地 LLM

```yaml
# 配置 OpenAI Compatible endpoint
Provider: OpenAI / OpenAI Compatible
Base URL: http://localhost:11434/v1
Model: llama2
API Key: ollama  # 本地服务，不需要真实 Key
```

优势：
- 完全不暴露 API Key
- 数据完全本地化
- 零网络风险

劣势：
- 模型能力可能不如云端
- 需要本地计算资源

### 3. Anthropic Provider

Anthropic SDK 没有浏览器限制，可以直接使用：

```yaml
Provider: Anthropic (Claude)
API Key: sk-ant-...
Model: claude-sonnet-4-6
```

优势：
- 无浏览器环境限制
- 无需额外配置

劣势：
- 同样需要管理 API Key 安全

---

## 总结

### 安全性评估

在 Obsidian Electron 环境中使用 `dangerouslyAllowBrowser: true` 是**合理的低风险决策**：

| 因素 | 评估 |
|------|------|
| 环境类型 | 🟢 Electron（更接近 Node.js） |
| 数据存储 | 🟢 本地文件，用户可控 |
| 攻击风险 | 🟢 本地应用，无跨域攻击 |
| 用户控制 | 🟢 用户主动配置和管理 |
| 社区实践 | 🟢 其他 Obsidian 插件也使用此方案 |

### 最佳实践

**推荐配置流程：**

```
1. 使用官方 Obsidian 版本
2. 从可信源安装插件
3. 配置 API Key（本地存储）
4. 定期监控 API 使用
5. 遅免公开分享 vault
```

**高级安全选项：**

```
选项 A：使用本地 LLM（Ollama）
  → 完全不暴露 API Key
  → 最安全方案

选项 B：使用 Anthropic Provider
  → 无浏览器限制
  → 简单易用

选项 C：创建本地代理
  → API Key 存储在外部
  → 环境隔离
```

---

## 常见问题

### Q1: 我的 API Key 会被窃取吗？

**A:** 在正常使用情况下不会。Obsidian 是本地应用，API Key 存储在本地文件中，只有你能访问。风险来自：
- 安装不受信任的插件
- 公开分享包含 API Key 的 vault
- 使用来路不明的 Obsidian 版本

### Q2: 为什么 OpenAI SDK 不自动识别 Electron？

**A:** OpenAI SDK 使用通用检测方法（检查 `window` 和 `document`），无法区分 Electron 和浏览器。这是保守的安全策略。

### Q3: 其他 Obsidian 插件如何处理这个问题？

**A:** 许多 Obsidian 插件（如 Text Generator、Smart Connections）都使用 `dangerouslyAllowBrowser: true`，这是社区的通用做法。

### Q4: 我应该使用哪个 Provider？

**A:** 根据安全性需求：
- **最高安全**：本地 LLM（Ollama）
- **平衡方案**：Anthropic（无浏览器限制）
- **便捷使用**：OpenAI（已配置安全选项）

---

## 参考

- [OpenAI SDK 官方文档](https://github.com/openai/openai-node#running-in-a-browser-like-environment)
- [Electron 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [Obsidian 插件开发指南](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

---

**版本：v0.2.1**
**更新日期：2026-04-26**
**安全性评估：低风险，可接受**
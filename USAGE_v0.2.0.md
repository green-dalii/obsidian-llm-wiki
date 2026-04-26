# v0.2.0 使用指南 - 手动保存和测试配置

## 🎯 重大改进

v0.2.0 版本彻底重构了设置面板，解决了配置无法保存的问题：

### ✅ 核心改进

1. **显式保存按钮**
   - 移除自动保存（onChange 可能不触发）
   - 添加"保存设置"按钮，明确保存操作
   - 突出显示主操作按钮（CTA 样式）

2. **测试连接按钮**
   - 验证配置是否正确
   - 发送测试请求到 LLM Provider
   - 即时反馈连接状态

3. **状态显示**
   - 显示 LLM Client 初始化状态（✅ 已初始化 / ❌ 未初始化）
   - 让用户清楚知道配置是否生效

4. **临时设置对象**
   - 所有编辑操作在临时对象上进行
   - 只有点击"保存"才持久化
   - 避免频繁保存和不完整配置

---

## 📋 配置步骤

### 步骤 1：安装新版本

```bash
# 复制新版本文件到 Obsidian vault
cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/llm-wiki-plugin/

# 重启 Obsidian
```

### 步骤 2：打开插件设置

在 Obsidian 中：
- 设置 → Community plugins → LLM Wiki → 点击齿轮图标

### 步骤 3：查看当前状态

打开设置后，顶部显示：

```
LLM Client 状态: ❌ 未初始化
```

### 步骤 4：配置 Provider

**选项 A：Anthropic (Claude)**

1. Provider 选择：`Anthropic (Claude)`
2. API Key：输入你的 Anthropic API Key（`sk-ant-...`）
3. Model：`claude-sonnet-4-6`（自动填充）

**选项 B：OpenAI / OpenAI Compatible**

1. Provider 选择：`OpenAI / OpenAI Compatible`
2. API Key：输入你的 OpenAI API Key（`sk-...`）
3. Base URL（可选）：
   - 使用官方 API：留空
   - 使用本地 LLM：`http://localhost:11434/v1`（Ollama）
   - 使用其他兼容服务：填写对应的 endpoint
4. Model：`gpt-4o`（自动填充）

### 步骤 5：测试连接（重要！）

**在保存前先测试：**

1. 点击"测试连接"按钮
2. 等待测试结果（按钮显示"测试中..."）
3. 查看通知：
   - ✅ **成功**：显示 "连接成功！响应: ..."
   - ❌ **失败**：显示 "连接失败: ..." 或 "API Key 未配置"

**如果测试失败，检查：**
- API Key 格式是否正确（无多余空格）
- Base URL 格式是否正确（OpenAI endpoint 需要包含 `/v1`）
- Model 名称是否正确
- 网络/本地服务是否可用

### 步骤 6：保存设置

测试成功后：

1. 点击"保存设置"按钮（突出显示）
2. 查看通知："设置已保存成功！"
3. **状态自动刷新**：顶部显示 `LLM Client 状态: ✅ 已初始化`

### 步骤 7：验证持久化

关闭设置面板，重新打开：

- ✅ 所有配置保持不变
- ✅ 状态显示：`LLM Client 状态: ✅ 已初始化`

### 步骤 8：测试功能

按 `Cmd/Ctrl + P`，执行命令：

- **摄入新资料**：应该正常执行（不再提示"请先配置 API Key"）
- **查询 Wiki**：可以正常查询
- **维护 Wiki**：可以正常维护

---

## 🔍 常见问题排查

### 问题 1：测试连接失败 - "API Key 未配置"

**原因：** API Key 输入框中没有填写内容

**解决：**
- 确保 API Key 输入框有内容
- 检查是否有隐藏空格（复制粘贴时可能带入）

### 问题 2：测试连接失败 - "连接失败"

**可能原因：**

1. **API Key 无效**
   - 验证 API Key 是否正确
   - 检查 API Key 是否过期或被禁用

2. **Base URL 格式错误**
   - OpenAI 官方：留空即可
   - Ollama：`http://localhost:11434/v1`（必须包含 `/v1`）
   - 其他服务：根据服务商文档配置

3. **网络问题**
   - 检查网络连接
   - 如果使用本地服务，确认服务正在运行

4. **Model 名称错误**
   - Anthropic：`claude-sonnet-4-6`、`claude-opus-4-7`
   - OpenAI：`gpt-4o`、`gpt-4o-mini`
   - 本地模型：根据支持的模型填写

### 问题 3：保存后状态仍显示"未初始化"

**原因：** 可能保存过程中出现问题

**解决：**
1. 打开开发者控制台（`Cmd+Option+I`）
2. 查看 Console 中的日志：
   ```
   设置已持久化
   初始化 LLM 客户端...
   Provider: openai
   API Key: 已设置
   OpenAI Base URL: [你的URL]
   OpenAI 客户端初始化成功，Base URL: [URL或默认]
   ```
3. 如果没有看到这些日志，说明保存失败

### 问题 4：重启 Obsidian 后配置丢失

**检查持久化文件：**

```bash
# 查看插件数据文件
cat /path/to/your/vault/.obsidian/plugins/llm-wiki-plugin/data.json
```

**应该看到：**
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "openaiBaseUrl": "http://...",
  "model": "gpt-4o",
  "sourceFolder": "sources",
  "wikiFolder": "wiki",
  "schemaFolder": "schema",
  "autoUpdateInterval": 3600000
}
```

**如果文件不存在或内容错误：**
- 手动创建/修改 `data.json` 文件
- 重新在设置面板中配置并保存

---

## 💡 最佳实践

### 推荐配置流程

```
1. 配置 Provider 和 API Key
2. 【先测试】点击"测试连接"按钮验证
3. 测试成功后，点击"保存设置"
4. 验证状态显示 ✅ 已初始化
5. 执行实际功能测试（摄入命令）
```

### 测试连接的意义

- **验证配置有效性**：发送真实请求到 LLM Provider
- **节省调试时间**：快速发现配置问题
- **避免无效操作**：确认连接后再执行功能

---

## 🎨 UI 改进

### 新布局结构

```
LLM Wiki 设置
├─ 状态显示：LLM Client 状态: ✅/❌
├─ LLM Provider 配置
│  ├─ Provider 下拉选择
│  ├─ API Key 输入
│  ├─ OpenAI Base URL（动态显示）
│  └─ Model 输入
├─ 分隔线
├─ 操作按钮区域
│  ├─ 测试连接按钮（验证配置）
│  └─ 保存设置按钮（CTA 突出显示）
├─ 分隔线
└─ 文件夹配置
   ├─ 源文件夹
   ├─ Wiki 文件夹
   └─ 自动更新间隔
```

---

## 📊 技术细节

### 临时设置对象

设置面板使用 `tempSettings` 临时对象：

```typescript
// 编辑时只修改临时对象
tempSettings.apiKey = value;

// 保存时才同步到插件设置
plugin.settings = { ...tempSettings };
await plugin.saveSettings();
```

**优势：**
- 避免频繁持久化
- 允许用户修改多个字段后再保存
- 防止不完整配置被保存

### 测试连接流程

```typescript
// 1. 临时初始化客户端
testClient = new OpenAIClient(apiKey, baseUrl);

// 2. 发送测试请求
testResponse = await testClient.createMessage({
  model: settings.model,
  max_tokens: 100,
  messages: [{ role: 'user', content: '测试连接' }]
});

// 3. 返回结果
return { success: true, message: '连接成功' };
```

---

## ✅ 验证清单

完成以下检查确认配置成功：

- [ ] 安装 v0.2.0 版本
- [ ] 打开插件设置
- [ ] 状态显示：❌ 未初始化
- [ ] 配置 Provider（Anthropic 或 OpenAI）
- [ ] 输入 API Key（无空格）
- [ ] 输入 Base URL（如果需要）
- [ ] 输入 Model 名称
- [ ] 点击"测试连接"按钮
- [ ] 看到"连接成功"通知
- [ ] 点击"保存设置"按钮
- [ ] 看到"设置已保存成功"通知
- [ ] 状态自动刷新：✅ 已初始化
- [ ] 关闭并重新打开设置面板
- [ ] 状态保持：✅ 已初始化
- [ ] 执行"摄入新资料"命令
- [ ] 功能正常执行（不再提示配置错误）

---

## 🚀 下一步

配置成功后，参考主 README.md 开始使用插件：

1. 创建 `sources` 文件夹
2. 添加测试文档
3. 执行"摄入新资料"命令
4. 查看生成的 Wiki 页面

---

## 💬 反馈

如果仍有问题，请：

1. 打开开发者控制台查看详细日志
2. 检查 `data.json` 文件内容
3. 提交 GitHub Issue（附上控制台日志和 `data.json`）

---

**版本：v0.2.0**
**更新日期：2026-04-26**
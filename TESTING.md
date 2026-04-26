# 测试指南

本文档提供 LLM Wiki 插件的测试步骤和验证方法。

## 准备工作

1. 确保已构建插件：`main.js` 文件存在
2. 准备一个 Obsidian vault 用于测试
3. 准备 API Keys：
   - Anthropic API Key（测试 Anthropic provider）
   - OpenAI API Key（测试 OpenAI provider）

---

## 安装插件到 Obsidian

### 手动安装步骤

1. 创建插件目录：
   ```bash
   mkdir -p /path/to/your/vault/.obsidian/plugins/llm-wiki-plugin
   ```

2. 复制插件文件：
   ```bash
   cp main.js manifest.json styles.css /path/to/your/vault/.obsidian/plugins/llm-wiki-plugin/
   ```

3. 重启 Obsidian

4. 在设置中启用插件：
   - 打开设置 → Community plugins
   - 找到 "LLM Wiki"
   - 点击启用

---

## 测试 Anthropic Provider

### 1. 配置 Anthropic

1. 打开插件设置
2. 选择 Provider：`Anthropic (Claude)`
3. 输入 API Key：你的 Anthropic API Key（格式：`sk-ant-...`）
4. Model 保持默认：`claude-sonnet-4-6`

### 2. 准备测试数据

创建 `sources` 文件夹并添加测试文档：

```markdown
# sources/test.md

# 机器学习基础

机器学习是人工智能的一个分支，它使用算法和统计模型让计算机系统执行任务而不使用显式指令。

## 核心概念

- **监督学习**：使用标注数据训练模型
- **无监督学习**：从未标注数据中发现模式
- **强化学习**：通过与环境交互学习最优策略

## 相关技术

深度学习是机器学习的子集，使用神经网络处理复杂问题。
```

### 3. 测试摄入功能

1. 按 `Cmd/Ctrl + P` 打开命令面板
2. 输入 "摄入新资料"
3. 执行命令

**预期结果：**
- 显示通知："开始摄入资料..." → "成功摄入 1 个文件"
- 在 `wiki/` 文件夹中生成 `test.md` 文件
- 内容包含提取的概念、实体、观点
- 包含 `[[双向链接]]` 语法

### 4. 验证生成的 Wiki

检查 `wiki/test.md`：

- ✅ 包含 Markdown 格式
- ✅ 包含提取的核心概念
- ✅ 包含双向链接（如 `[[监督学习]]`）
- ✅ 内容结构化清晰

### 5. 测试查询功能

1. 打开命令面板
2. 输入 "查询 Wiki"
3. 输入问题："什么是机器学习？"

**预期结果：**
- 弹出查询模态框
- 输入后弹出答案模态框
- 答案综合 Wiki 内容

### 6. 测试维护功能

1. 打开命令面板
2. 输入 "维护 Wiki"

**预期结果：**
- 显示通知："开始维护 Wiki..." → "维护完成"
- 弹出维护报告模态框
- 包含问题识别（矛盾、孤立页面等）

---

## 测试 OpenAI Provider

### 1. 配置 OpenAI

1. 打开插件设置
2. 选择 Provider：`OpenAI / OpenAI Compatible`
3. 输入 API Key：你的 OpenAI API Key（格式：`sk-...`）
4. Base URL：留空（使用官方 API）
5. Model：`gpt-4o`

**验证：**
- ✅ 设置面板显示 "OpenAI Base URL" 字段（动态显示）
- ✅ 描述文字相应变化

### 2. 测试基本功能

重复 Anthropic 测试步骤（摄入、查询、维护），验证功能正常。

**预期结果：**
- 所有功能正常工作
- API 调用成功
- 生成的 Wiki 页面质量良好

---

## 测试自定义 Endpoint

### 1. 配置本地 LLM endpoint

假设你有一个本地 LLM 服务（如 Ollama）：

1. Provider：`OpenAI / OpenAI Compatible`
2. API Key：任意字符串（本地服务可能不需要）
3. Base URL：`http://localhost:11434/v1`
4. Model：根据本地服务支持的模型填写

### 2. 测试连接

执行摄入命令，验证能否连接本地服务。

---

## UI 测试

### 动态字段显示

测试 provider 切换时 UI 变化：

1. 初始状态：Anthropic provider
   - ✅ 不显示 "OpenAI Base URL" 字段
   - ✅ Model placeholder：`claude-sonnet-4-6`

2. 切换到 OpenAI provider
   - ✅ 显示 "OpenAI Base URL" 字段
   - ✅ Model placeholder：`gpt-4o`

3. 切换回 Anthropic provider
   - ✅ "OpenAI Base URL" 字段消失
   - ✅ Model placeholder恢复

### 设置持久化

1. 配置 provider 和 API Key
2. 关闭 Obsidian
3. 重新打开 Obsidian
4. 检查设置

**预期结果：**
- ✅ Provider 选择保持
- ✅ API Key 保持
- ✅ 其他设置保持

---

## 错误处理测试

### 1. 无 API Key

配置步骤：
1. 清空 API Key
2. 执行任何命令

**预期结果：**
- ✅ 显示通知："请先配置 API Key"
- ✅ 命令不执行

### 2. 错误的 API Key

配置步骤：
1. 输入无效 API Key
2. 执行命令

**预期结果：**
- ✅ 显示错误通知："摄入失败，请查看控制台"
- ✅ 控制台有详细错误信息

### 3. 错误的 Model 名称

配置步骤：
1. 输入错误的模型名称
2. 执行命令

**预期结果：**
- ✅ API 返回错误
- ✅ 显示错误通知

---

## 性能测试

### 1. 大文件测试

创建一个大文件（100+ 行），测试摄入性能。

### 2. 多文件测试

在 `sources` 中放置 5-10 个文件，测试批量摄入。

---

## 日志和索引验证

### 1. 检查操作日志

查看 `wiki/log.md`：

- ✅ 包含时间戳
- ✅ 记录操作类型
- ✅ 格式正确

### 2. 检查索引

执行 "生成索引" 命令，查看 `wiki/index.md`：

- ✅ 包含所有 Wiki 页面
- ✅ 显示更新时间
- ✅ 使用双向链接语法

---

## 测试清单

完成以下测试项：

- [ ] Anthropic provider 配置
- [ ] Anthropic 摄入功能
- [ ] Anthropic 查询功能
- [ ] Anthropic 维护功能
- [ ] OpenAI provider 配置
- [ ] OpenAI 基本功能
- [ ] 自定义 endpoint 配置
- [ ] UI 动态字段显示
- [ ] 设置持久化
- [ ] 错误处理（无 API Key）
- [ ] 错误处理（错误 API Key）
- [ ] 日志记录
- [ ] 索引生成

---

## 常见问题排查

### 1. 插件未出现在 Community plugins

**原因**：未正确安装到 `.obsidian/plugins/` 目录

**解决**：检查文件路径，确保在正确的 vault 目录下

### 2. API 调用失败

**原因**：API Key 无效或网络问题

**解决**：
- 验证 API Key 格式
- 检查网络连接
- 查看控制台详细错误

### 3. 自定义 endpoint 无法连接

**原因**：endpoint 地址错误或服务未运行

**解决**：
- 验证 endpoint URL 格式
- 确保本地服务运行
- 测试 endpoint 可访问性

---

## 测试报告模板

完成测试后，填写以下报告：

```markdown
# LLM Wiki Plugin 测试报告

测试人：[姓名]
测试日期：[日期]
测试环境：[Obsidian 版本、操作系统]

## Anthropic Provider 测试
- [✅/❌] 配置成功
- [✅/❌] 摄入功能
- [✅/❌] 查询功能
- [✅/❌] 维护功能

## OpenAI Provider 测试
- [✅/❌] 配置成功
- [✅/❌] 摄入功能
- [✅/❌] 查询功能
- [✅/❌] 维护功能

## UI 测试
- [✅/❌] 动态字段显示
- [✅/❌] 设置持久化

## 问题记录
[记录发现的问题]

## 建议
[测试后的建议]
```
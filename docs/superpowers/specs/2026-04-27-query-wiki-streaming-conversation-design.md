# Query Wiki 流式对话功能设计文档

**Date:** 2026-04-27
**Author:** Claude Sonnet 4.6 + Greener-Dalii
**Status:** Design Review

---

## 1. Overview

### 1.1 Problem Statement

当前 Query Wiki 功能存在两大用户体验问题：

1. **交互体验差**：用户输入问题后Modal立即消失，后台运行查询，需等待较长时间才能看到结果，缺乏反馈感
2. **输出格式差**：LLM回复以Raw Markdown格式显示，未渲染，无法看到实际效果，无法点击[[wiki-links]]

### 1.2 Solution Goal

将 Query Wiki 改造为**对话式交互**界面，支持：

- **流式输出**：LLM回复实时显示，用户立即看到生成过程
- **Markdown渲染**：使用Obsidian内置渲染器，支持[[wiki-links]]等Obsidian特有语法
- **多轮对话**：支持追问，对话历史在Modal内可见
- **可选保存**：用户可选择性将对话保存为Wiki知识页

### 1.3 Design Constraints

- **复用现有架构**：最小化改动，不影响ingestSource等核心功能
- **国际化支持**：UI和LLM回复均支持英文/中文切换
- **向后兼容**：保持LLMClient非流式接口不变
- **Token限制**：需限制对话历史长度，避免超出LLM token上限

---

## 2. Architecture Design

### 2.1 Implementation Strategy

**方案1：重构QueryModal + 新增流式支持**

- 复用现有LLMWikiPlugin架构
- 仅改QueryModal和LLMClient接口
- 新增ingestConversation方法复用Wiki生成逻辑
- 技术债务最小，风险可控

### 2.2 Component Changes

#### 2.2.1 New Components

| Component | Purpose | Dependencies |
|-----------|---------|--------------|
| `LLMClient.createMessageStream()` | 流式LLM接口 | Anthropic/OpenAI SDK |
| `LLMWikiPlugin.ingestConversation()` | 对话提炼为Wiki | analyzeSource流程 |
| QueryModal对话式UI | 多轮对话交互 | MarkdownRenderer |
| TEXTS对话UI国际化 | Modal文本国际化 | language设置 |

#### 2.2.2 Modified Components

| Component | Change | Impact |
|-----------|---------|---------|
| `AnthropicClient` | 新增createMessageStream实现 | 新增stream方法 |
| `OpenAIClient` | 新增createMessageStream实现 | 新增stream方法 |
| `QueryModal.onOpen()` | 重构为对话式布局 | 完全重写UI |
| `LLMWikiPlugin.queryWiki()` | 调用新Modal | 小改动 |
| `LLMWikiSettings` | 新增maxConversationHistory | 配置扩展 |

#### 2.2.3 Unchanged Components

- `ingestSource()`, `lintWiki()`等核心功能（保持非流式）
- `LLMClient.createMessage()`接口（向后兼容）
- `AnswerModal`, `LintReportModal`等现有Modal

---

## 3. Interface Design

### 3.1 LLMClient Interface Extension

```typescript
interface LLMClient {
  // 原有方法（保持不变）
  createMessage(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
  }): Promise<string>;

  // 新增流式方法（可选实现）
  createMessageStream?(params: {
    model: string;
    max_tokens: number;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string>;

  listModels?(): Promise<string[]>;
}
```

**设计要点：**
- `createMessageStream`为可选方法，向后兼容
- 不支持的Provider可降级为非流式createMessage()
- 返回Promise<string>确保最终获取完整回复（用于历史记录）

### 3.2 Conversation History Management

```typescript
interface ConversationHistory {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}
```

**存储策略：**
- 存储在QueryModal实例内（内存）
- 关闭Modal后自动清空（不持久化）
- 用户可点击"Save to Wiki"按钮手动保存

**历史限制：**
- 通过`LLMWikiSettings.maxConversationHistory`配置
- 默认值：10轮对话（20条消息）
- 超出限制时自动截断最早对话，保留最新

### 3.3 Settings Configuration

```typescript
interface LLMWikiSettings {
  // ... 现有字段 ...

  maxConversationHistory: number; // 对话历史最大轮数
}

const DEFAULT_SETTINGS: LLMWikiSettings = {
  // ... 现有默认值 ...

  maxConversationHistory: 10, // 默认10轮
}
```

**设置UI：**
- 设置面板新增"Wiki Query Configuration"区域
- 输入框显示当前配置值，min=1, max=50
- 提示推荐值：10-15轮，避免token超限
- 双语提示（英文+中文）

---

## 4. QueryModal UI Design

### 4.1 Layout Structure

采用**经典对话式布局**（类似ChatGPT）：

```
┌─────────────────────────────────┐
│ Header: Query Wiki - 对话式查询   │
├─────────────────────────────────┤
│                                 │
│  对话历史区（可滚动）              │
│  ├─ 用户消息1                    │
│  ├─ AI回复1（Markdown渲染）       │
│  ├─ 用户追问2                    │
│  └─ AI流式回复2（实时显示）        │
│                                 │
├─────────────────────────────────┤
│ 固定底部：输入区                  │
│  ├─ textarea输入框               │
│  ├─ 发送 | Save to Wiki | 清空   │
│  └─ 提示: 对话历史: 2/10轮        │
└─────────────────────────────────┘
```

### 4.2 Core Methods

#### sendMessage()

```typescript
async sendMessage(userMessage: string) {
  // 1. 添加用户消息到历史
  this.history.messages.push({
    role: 'user',
    content: userMessage,
    timestamp: Date.now()
  });

  // 2. 渲染用户消息
  this.renderHistoryMessage('user', userMessage);

  // 3. 限制历史长度
  this.limitHistory();

  // 4. 创建流式响应容器
  this.currentResponseDiv = this.createResponseContainer();
  this.isStreaming = true;
  this.accumulatedResponse = '';

  // 5. 构建LLM请求（包含语言指示）
  const messages = this.buildLLMMessages();
  const languageHint = TEXTS[this.plugin.settings.language].llmLanguageHint;

  // 6. 调用流式接口
  try {
    const fullResponse = await this.plugin.llmClient.createMessageStream({
      model: this.plugin.settings.model,
      max_tokens: 3000,
      messages: messages,
      language: this.plugin.settings.language,
      onChunk: (chunk) => this.streamResponse(chunk)
    });

    // 7. 完成后添加到历史
    this.history.messages.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now()
    });
  } catch (error) {
    // 错误处理：降级或提示
  }

  this.isStreaming = false;
}
```

#### streamResponse()

```typescript
streamResponse(chunk: string) {
  // 1. 累积响应文本
  this.accumulatedResponse += chunk;

  // 2. 渲染到容器
  if (this.currentResponseDiv) {
    this.renderMarkdownContent(
      this.accumulatedResponse,
      this.currentResponseDiv
    );
  }
}
```

#### renderMarkdownContent()

```typescript
renderMarkdownContent(content: string, container: HTMLElement) {
  // 清空容器
  container.empty();

  // 使用Obsidian内置MarkdownRenderer
  MarkdownRenderer.renderMarkdown(
    content,
    container,
    '',
    this.plugin
  );
}
```

**渲染策略：**
- 每次chunk到达时重新渲染完整累积文本
- 确保Markdown完整性（避免渲染不完整片段）
- 支持[[wiki-links]], callouts等Obsidian语法

#### limitHistory()

```typescript
limitHistory() {
  const max = this.plugin.settings.maxConversationHistory;
  const totalMessages = this.history.messages.length;

  if (totalMessages > max * 2) {
    const keepCount = max * 2;
    this.history.messages = this.history.messages.slice(-keepCount);

    new Notice(`历史已截断至最近${max}轮对话`, 3000);
  }
}
```

---

## 5. Stream Implementation

### 5.1 AnthropicClient Stream

```typescript
class AnthropicClient implements LLMClient {
  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    messages: Message[];
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string> {
    // 添加语言指示
    const messagesWithLanguage = [
      ...params.messages,
      { role: 'user', content: params.language === 'en'
        ? 'Please answer in English.'
        : '请用中文回答。'
      }
    ];

    const stream = await this.client.messages.stream({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: messagesWithLanguage
    });

    let fullResponse = '';

    stream.on('text', (text) => {
      fullResponse += text;
      params.onChunk(text);
    });

    await stream.finalMessage();
    return fullResponse;
  }
}
```

### 5.2 OpenAIClient Stream

```typescript
class OpenAIClient implements LLMClient {
  async createMessageStream(params: {
    model: string;
    max_tokens: number;
    messages: Message[];
    language: 'en' | 'zh';
    onChunk: (chunk: string) => void;
  }): Promise<string> {
    const messagesWithLanguage = [
      ...params.messages,
      { role: 'user', content: params.language === 'en'
        ? 'Please answer in English.'
        : '请用中文回答。'
      }
    ];

    const stream = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.max_tokens,
      messages: messagesWithLanguage,
      stream: true
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullResponse += text;
        params.onChunk(text);
      }
    }

    return fullResponse;
  }
}
```

---

## 6. Conversation to Wiki Feature

### 6.1 ingestConversation() Method

用户点击"Save to Wiki"按钮触发：

```typescript
async ingestConversation(history: ConversationHistory): Promise<void> {
  // 1. 序列化对话为结构化输入
  const conversationText = this.formatConversation(history);

  // 2. LLM分析对话（类似analyzeSource）
  const analysis = await this.llmClient.createMessage({
    model: this.settings.model,
    max_tokens: 5000,
    messages: [{
      role: 'user',
      content: CONVERSATION_ANALYSIS_PROMPT + conversationText
    }]
  });

  // 3. 解析JSON
  const parsed = parseJsonResponse(analysis);

  // 4. 生成Wiki页面（复用createSummaryPage等逻辑）
  const summaryPage = await this.createConversationSummaryPage(parsed);
  const entityPages = await this.createEntityPages(parsed.entities);
  const conceptPages = await this.createConceptPages(parsed.concepts);

  // 5. 更新index.md和log.md
  await this.generateIndex();
  await this.updateLog('conversation', parsed);
}
```

### 6.2 Conversation Analysis Prompt

```typescript
const CONVERSATION_ANALYSIS_PROMPT = `
你是一个Wiki知识生成助手。

用户与AI的对话历史：
[对话记录]

请将这次对话转化为结构化的Wiki页面：

1. **摘要页** (sources/conversation-YYYY-MM-DD)
   - 对话主题和核心问题
   - 关键发现和结论
   - 问答要点总结

2. **概念页** (concepts/概念名)
   - 提取讨论中的核心概念
   - 概念定义和解释
   - 相关概念关联

3. **实体页** (entities/实体名)
   - 提取讨论的人物/组织/项目等
   - 实体信息摘要

输出JSON格式：
{
  "source_title": "对话摘要 - YYYY-MM-DD",
  "summary": "...",
  "entities": [...],
  "concepts": [...],
  "key_points": [...],
  "created_pages": [...],
  "updated_pages": []
}
`;
```

**设计要点：**
- 复用analyzeSource的JSON解析和页面生成逻辑
- 提炼"知识总结型"而非完整记录型
- 自动生成摘要页 + 概念页 + 实体页

---

## 7. Internationalization

### 7.1 TEXTS Extension

新增对话式UI文本：

```typescript
const TEXTS = {
  en: {
    // ... 现有文本 ...

    // Modal UI
    queryModalTitle: 'Query Wiki - Conversational Query',
    queryModalPlaceholder: 'Enter question... (Enter to send)',
    queryModalSendButton: 'Send',
    queryModalSaveButton: 'Save to Wiki',
    queryModalClearButton: 'Clear History',
    queryModalHistoryCount: 'Conversation history: {}/{} rounds',
    queryModalStreaming: 'Streaming...',

    // Settings
    maxConversationHistoryName: 'Max Conversation History',
    maxConversationHistoryDesc: 'Limit conversation messages to avoid token overflow',
    maxConversationHistoryHint: 'Recommended: 10-15 rounds',

    // LLM Language Hint
    llmLanguageHint: 'Please answer in English.'
  },
  zh: {
    // ... 现有文本 ...

    // Modal UI
    queryModalTitle: 'Query Wiki - 对话式查询',
    queryModalPlaceholder: '输入问题... (Enter发送)',
    queryModalSendButton: '发送',
    queryModalSaveButton: '保存到Wiki',
    queryModalClearButton: '清空历史',
    queryModalHistoryCount: '对话历史: {}/{} 轮',
    queryModalStreaming: '流式生成中...',

    // Settings
    maxConversationHistoryName: '对话历史上限',
    maxConversationHistoryDesc: '限制对话消息数，避免超出LLM token限制',
    maxConversationHistoryHint: '推荐：10-15轮',

    // LLM Language Hint
    llmLanguageHint: '请用中文回答。'
  }
};
```

---

## 8. Error Handling

### 8.1 Stream Failure → Degradation

```typescript
async sendMessage(userMessage: string) {
  try {
    // 尝试流式
    if (this.plugin.llmClient.createMessageStream) {
      const response = await this.plugin.llmClient.createMessageStream(...);
    } else {
      // 降级为非流式
      const response = await this.plugin.llmClient.createMessage(...);
      this.renderHistoryMessage('assistant', response);
    }
  } catch (error) {
    new Notice(TEXTS[this.plugin.settings.language].errorStreamFailed);
    console.error('Stream failed:', error);
  }
}
```

### 8.2 Token Limit Exceeded

- `limitHistory()`自动截断最早对话
- 显示Notice提示用户历史已截断
- 日志记录截断操作

### 8.3 Markdown Rendering Issues

- 流式输出时累积完整文本再渲染（避免不完整片段）
- 渲染失败时降级为纯文本显示
- 错误日志记录

---

## 9. Testing Strategy

### 9.1 Unit Tests

- `limitHistory()`历史截断逻辑
- `formatConversation()`对话格式化
- `buildLLMMessages()`消息构建

### 9.2 Integration Tests

- 流式与非流式切换测试
- Markdown渲染验证（[[wiki-links]], callouts）
- 对话保存为Wiki流程
- 国际化切换测试

### 9.3 Manual Testing

- Obsidian实际环境测试
- 多轮对话交互体验
- Save to Wiki功能验证
- 长对话历史截断测试

---

## 10. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] LLMClient接口扩展（createMessageStream）
- [ ] AnthropicClient流式实现
- [ ] OpenAIClient流式实现
- [ ] LLMWikiSettings扩展（maxConversationHistory）
- [ ] TEXTS国际化文本扩展

### Phase 2: QueryModal Refactor
- [ ] QueryModal重构为对话式布局
- [ ] sendMessage()流式处理实现
- [ ] renderMarkdownContent()渲染实现
- [ ] limitHistory()历史限制实现
- [ ] "Save to Wiki"按钮集成

### Phase 3: Conversation to Wiki
- [ ] ingestConversation()方法实现
- [ ] CONVERSATION_ANALYSIS_PROMPT设计
- [ ] 对话格式化方法
- [ ] Wiki页面生成（复用现有逻辑）

### Phase 4: Settings & Polish
- [ ] 设置面板配置项UI
- [ ] 错误降级处理
- [ ] 国际化测试
- [ ] Manual测试验证

### Phase 5: Documentation & Release
- [ ] README.md更新
- [ ] CHANGELOG.md更新
- [ ] Version bump (1.0.9 → 1.1.0)
- [ ] Git commit & push

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 流式SDK不稳定 | 降级为非流式createMessage() |
| Token超限导致API错误 | 自动截断历史 + 提示用户 |
| Markdown渲染不完整 | 累积完整文本再渲染 |
| 对话历史过多影响性能 | 设置页面配置上限（默认10轮） |
| 国际化遗漏文本 | 编写时同步更新en和zh两个TEXTS对象 |

---

## 12. Future Enhancements

**可选实现（不在本次范围内）：**

- 对话历史持久化到Obsidian data.json
- Modal内Markdown编辑功能
- 对话导出为Markdown文件
- 多个对话会话管理

---

## Appendix A: Visual Mockups

参见Visual Companion展示的：
- 方案A：经典对话式布局（已确认）
- 设置面板配置UI
- QueryModal完整界面Mockup

---

**Document Status:** Ready for User Review
**Next Step:** User reviews spec → invoke writing-plans skill for implementation plan
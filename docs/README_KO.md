![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 플러그인

> [Andrej Karpathy의 LLM Wiki 개념](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을 기반으로 한 지식베이스 생성 시스템. 노트에서 Entity와 Concept을 자동 추출해 연결된 Wiki 페이지를 구축합니다.
>
> **Obsidian 공식 평점 95/100** | 8개 언어 네이티브 지원 | 활발한 유지보수, 지속 진화

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[공식 사이트](https://llmwiki.greenerai.top/) | [블로그](https://llmwiki.greenerai.top/blog/) | [피드백 토론](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 DeepWiki로 코드베이스 탐색](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ 빠른 업데이트 알림：** 이 프로젝트는 빠르게 진화하며 버그 수정, 성능 개선, 새로운 기능 및 UX 최적화를 자주 제공합니다. Obsidian에서 항상 최신 버전으로 업데이트하고(**설정 → 커뮤니티 플러그인 → 업데이트 확인**), 플러그인 자동 업데이트를 활성화하세요.

## 📑 Contents

- [💡 LLM-Wiki란?](#-llm-wiki란)
- [⚡ Obsidian + LLM-Wiki를 선택하는 이유](#-obsidian--llm-wiki를-선택하는-이유)
- [🚀 빠른 시작](#-빠른-시작)
  - [📦 설치](#-설치)
  - [🔄 플러그인 업데이트](#-플러그인-업데이트)
  - [🔑 LLM Provider 설정](#-llm-provider-설정)
  - [🎮 사용법](#-사용법)
  - [⚠️ 이전 버전에서 업그레이드하시나요?](#️-이전-버전에서-업그레이드하시나요)
- [⚡ v1.16.3 업데이트 하이라이트](#-v1163-업데이트-하이라이트)
- [✨ 주요 기능](#-주요-기능)
  - [📊 지식 품질](#-지식-품질)
  - [🛠️ 유지 관리](#️-유지-관리)
  - [💬 조회 및 피드백](#-조회-및-피드백)
  - [🌐 LLM 및 언어](#-llm-및-언어)
  - [🏗️ 아키텍처 및 성능](#️-아키텍처-및-성능)
  - [🔒 개인정보 보호 및 보안](#-개인정보-보호-및-보안)
- [⌨️ 명령어](#️-명령어)
- [📖 예시](#-예시)
- [🤖 모델 권장 사항](#-모델-권장-사항)
- [🏗️ 아키텍처](#️-아키텍처)
- [❓ FAQ (자주 묻는 질문)](#-faq-자주-묻는-질문)
  - [💡 일반](#-일반)
  - [🏷️ 별칭과 중복](#️-별칭과-중복)
  - [⚡ 성능 및 비용 관리](#-성능-및-비용-관리)
  - [🧹 유지보수](#-유지보수)
  - [🔍 문제 해결](#-문제-해결)
  - [🔒 투명성 및 규정 준수](#-투명성-및-규정-준수)
- [📜 라이선스](#-라이선스)
- [🙏 감사의 말](#-감사의-말)
## 💡 LLM-Wiki란?

작성은 당신이, 정리는 AI가, 질문은 다시 당신이. 이것이 전부입니다.

**🎯 문제.** 노트는 인물, 개념, 아이디어, 연결고리의 금광입니다. 하지만 현재는 단지 폴더 안의 파일일 뿐입니다. 무엇이 무엇과 연결되는지 찾기 위해선 검색과 태깅, 그리고 기억에 의존해야 합니다.

**✨ 해결책.** [Andrej Karpathy가 제안한](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 우아한 방식: 노트를 원재료로 취급하고 LLM이 설계를 담당합니다. LLM이 작성 내용을 읽고 Entity와 Concept을 추출하여 구조화된 Wiki를 구축합니다 — `[[bidirectional links]]`, 자동 생성 인덱스, 그리고 지식베이스에 질문할 수 있는 채팅 인터페이스를 포함합니다.

**📚 당신은 더 이상 사서가 아닙니다.** 어떤 내용을 페이지로 만들지 결정할 필요도, 교차 링크를 유지할 필요도, 정보가 오래되었는지 걱정할 필요도 없습니다. 노트를 `sources/`에 넣으면 LLM이 읽고, 추출하고, 작성하고, 연결하며, 심지어 모순까지 표시합니다 — 당신은 몰입을 유지하면서 작업을 계속합니다.

**🤖 그리고 이것은 또 다른 챗봇이 아닙니다.** ChatGPT는 인터넷을 알고 있습니다. LLM-Wiki는 *당신*을 압니다 — 정확히 말하자면 당신이 가르친 내용을 압니다. 모든 답변은 `[[wiki-links]]`를 통해 지식 그래프로 연결됩니다. 모든 응답은 끝이 아닌 탐색의 시작점입니다.

---

## ⚡ v1.16.3 업데이트 하이라이트

이번 릴리스는 **핫픽스 릴리스**로, v1.16.2 P0 버그 수정 배치를 완성합니다. v1.16.2의 Lint 취소 상태 표시줄 수정이 불완전했습니다(수정 버튼 클릭 후 모달이 즉시 닫혀 사용자가 취소할 수 있기 전에 상태 표시줄이 숨겨짐). 또한 v1.16.2 리뷰 후 5개의 cleanup 항목도 함께 제공합니다. **호환성 깨짐 없음, 재구성 불필요.**

**주요 수정 사항:**

- **Lint 취소 상태 표시줄이 이제 진짜 작동합니다 (Issue #94).** v1.16.2에서는 AbortSignal을 fix-runner로 전파했지만 버튼 클릭 시 모달이 닫혀 — onClose → endLintOperation이 발화되어 사용자가 취소할 수 있기 전에 상태 표시줄이 숨겨졌습니다. 수정: 각 수정 단계에 독립적인 lint operation 라이프사이클을 부여 — 수정 버튼 클릭 시 `startLintOperation` 호출, 수정 완료 시 `endLintOperation` 호출. 모달은 즉시 닫히고(기존 UX 유지), 사용자는 상단 진행 Notice와 하단 상태 표시줄이 수정 내내 계속 표시되어 클릭하여 취소 가능.

- **중복 검사 진행 표시가 콘솔과 일치 (Issue #94 후속).** 이전에는 "1/4"(외부 라운드 수)가 표시되어 정상은 "1-4/16"(내부 배치 범위)였습니다. Notice와 콘솔 로그가 일치하도록 수정됨 — 더 이상 진행 상황을 혼동하지 않음.

- **thinkingControlCache 키 수정 (Issue #243).** 사전 정의된 공급자를 baseUrl 덮어쓰기 없이 사용할 때 캐시 쓰기는 빈 키를, 읽기는 사전 정의된 URL을 사용하여 캐시가 영영 미스하고 매 호출마다 낭비적인 400 라운드트립을 트리거했습니다. 읽기/쓰기 경로가 이제 동일한 `getThinkingControlCacheKey()` 헬퍼를 사용합니다.

- **deleteEmptyStubs에 탄력성 부여 (Issue #244).** 단일 vault 읽기 또는 deleteFile 실패가 더 이상 전체 루프를 중단하지 않습니다. 각 파일이 독립적으로 try/catch되며, 사용자에게는 삭제 성공/실패 카운트를 명확한 Notice로 표시.

- **thinking-control 폴백 후 음수 결과 캐시 (Issue #245).** `OpenAICompatibleClient`는 400 폴백 성공 후 `thinkingControlSupported = false`를 설정하여, 동일 baseUrl의 후속 호출이 중복된 프로브-실패 라운드트립을 건너뜁니다.

- **i18n 정리 (Issue #94 후속 + #248):** 3개의 하드코딩된 영어 진행 문자열을 적절한 i18n 키(`lintCheckingDuplicatesProgress`, `lintFixingPolluted`, `lintModalFixPolluted`)로 교체, 8개 언어 모두 적용. thinking-control 오류 감지는 이제 HTTP 400 상태와 거부된 필드 키워드를 모두 요구함 — 이전에는 "thinking"을 포함한 모든 오류에 일치하여 오탐 폴백을 유발했음.

**이전 버전에서 업그레이드?** 호환성 깨짐 없음, 재구성 불필요. 기존 Wiki, 설정, 워크플로우가 모두 유지됩니다.

**모든 사용자에게 이 버전으로의 업그레이드를 강력히 권장합니다** — Lint 취소 수정이 cancel-UX 스토리를 완성하고, 캐시와 탄력성 수정은 모든 Lint 호출에서 조용히 작동합니다.

---

## ✨ 주요 기능

### 📊 지식 품질

- **Entity/Concept 추출** — LLM이 노트에서 Entity(인물, 조직, 제품, 이벤트)와 Concept(이론, 방법, 용어)을 추출합니다. 유연한 추출 세분화（최소~5개、굵음~10、표준~50、세밀~100、사용자 정의1~300）로 분석 깊이와 API 비용의 balance
- **필수 페이지 Alias** — 생성된 각 페이지에 최소 1개의 alias(번역, 약어, 대체 이름)를 포함해 교차 언어 중복 감지를 활성화합니다
- **중복 감지 및 병합** — Semantic tiering이 실제 중복(교차 언어 번역, 약어, 철자 변형)을 포착합니다. 지능형 LLM 병합이 콘텐츠를 융합하고 alias를 보존합니다
- **스마트 지식 융합** — 다중 source 업데이트가 새 정보를 중복 없이 병합하고, 모순은 출처와 함께 보존하고, `reviewed: true` 페이지는 덮어쓰기에서 보호됩니다
- **콘텐츠 잘림 보호** — 8000 max_tokens, 자동 stop_reason 감지, 모든 provider에서 2× token 재시도
- **원문 Source 인용 보존** — 원어 인용문을 보존하고 선택적 번역으로 추적 가능성을 확보합니다

### 🛠️ 유지 관리

- **Lint 상태 검사** — 포괄적인 보고서에서 중복, dead link, 빈 페이지, orphan, 누락된 alias, 모순을 감지합니다
- **Semantic-Tier 중복 감지** — Tier 1(직접 이름 일치: 교차 언어, 약어, 높은 유사도 제목)은 항상 검증됩니다. Tier 2(간접 신호: 공유 링크, 중간 유사도)은 token 예산을 채웁니다
- **스마트 일괄 수정** — 인과 관계 순서로 배치 수정: 중복 병합 → dead link 해결 → orphan 연결 → 빈 페이지 확장
- **Alias 완성** — 누락된 alias의 일괄 병렬 생성을 원클릭으로 수행해 향후 중복 감지를 개선합니다
- **자동 유지 관리** — 다중 폴더 파일 감시, 주기적 lint, 시작 시 상태 검사(모두 선택적)
- **모순 상태 머신** — `detected → review_ok → resolved`(AI 수정) 또는 `detected → pending_fix`(수동)

### 💬 조회 및 피드백

- **대화형 조회** — ChatGPT 스타일 대화, 스트리밍 Markdown 출력, `[[wiki-links]]`, 다중 턴 이력
- **조회에서 Wiki로 피드백** — 가치 있는 대화를 Wiki에 저장하고 Entity/Concept 추출 및 저장 전 semantic dedup을 수행합니다
- **중복 저장 방지** — Hash 추적이 변경되지 않은 대화의 재평가를 방지합니다

### 🌐 LLM 및 언어

- **다중 Provider 지원** — Anthropic, Anthropic Compatible(Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, custom endpoint
- **5xx 자동 재시도** — 모든 클라이언트에서 HTTP 5xx/429/529/529 오류 시 지수 백오프 재시도(최대 2회)
- **동적 모델 목록** — Provider API에서 실시간 가져오기
- **Wiki 출력 언어** — 인터페이스와 독립적인 8개 언어(영어/중국어/일본어/한국어/독일어/프랑스어/스페인어/포르투갈어), custom 입력 지원
- **🌍 전면 UI 국제화** — 플러그인 UI 8개 언어 지원(EN/ZH/JA/KO/DE/FR/ES/PT), 269+ UI 필드 완전 번역, 자연스러운 로컬 표현
- **⚡ Rate Limit Guardian** — 병렬 생성에서 rate limit 발생 시 자동 감지 및 제안: 동시성 낮춤, 배치 지연 증가, Provider 변경
- **🦙 Web Clipper Compatible** — Obsidian Web Clipper의 `Clippings/` 폴더를 1클릭으로 감시 목록에 추가, 웹 클립 자동 Wiki화

### 🏗️ 아키텍처 및 성능

- **병렬 페이지 생성** — 구성 가능한 1–5개 동시 페이지, 기본값 3(병렬), 큰 source에서 2–3× 속도 향상, 페이지별 오류 격리
- **반복적 배치 추출** — 적응형 배치 크기, 긴 문서의 max_tokens 병목을 해소합니다
- **3계층 아키텍처** — `sources/`(읽기 전용) → `wiki/`(LLM 생성) → `schema/`(공동 진화 구성)
- **모듈형 코드베이스** — `src/`의 13개 초점 모듈

### 🔒 개인정보 보호 및 보안

- **백엔드 없음, 원격 측정 없음.** 플러그인은 완전히 Obsidian 내부에서 실행됩니다——외부 서버, 분석, 데이터 수집이 전혀 없습니다. LLM 제공자를 명시적으로 설정하지 않는 한 노트가 Vault를 떠나지 않습니다.
- **데이터는 기본적으로 로컬에 유지됩니다.** 플러그인은 선택한 LLM API 이외의 장소에 콘텐츠를 저장, 캐시 또는 전송하지 않습니다. 수집 또는 쿼리를 위해 보내는 텍스트만 기기를 떠납니다——그것도 설정한 제공자에게만.
- **Ollama, LM Studio 또는 로컬 제공자를 통한 완전 로컬 모드.** 완전한 데이터 주권을 위해 로컬에서 실행되는 LLM을 사용하세요. 노트는 완전히 귀하의 기기에서 처리됩니다——인터넷에 연결되지 않습니다.
- **최소한의 권한.** Vault 파일 접근은 Wiki 관리에 필요합니다(노트 읽기, 페이지 생성, 데드 링크 감지). 네트워크 접근은 설정한 제공자와의 LLM API 호출에만 사용됩니다. 클립보드 접근은 Query 모달의 "복사" 버튼으로 제한됩니다——클릭할 때만입니다.

---


---

## ⌨️ 명령어

| 명령어 | 설명 |
|--------|------|
| **📥 단일 소스 수집** | 단일 노트를 선택 → Entity, Concept, 요약을 포함하는 Wiki 페이지를 생성합니다 |
| **📂 폴더에서 수집** | 임의 폴더를 선택 → 기존 노트에서 Wiki를 일괄 생성합니다 |
| **🔍 위키 질의** | 대화형 Q&A, 스트리밍 출력과 `[[wiki-links]]`를 포함합니다 |
| **🛠️ 위키 린트** | 전체 상태 검사: 중복, dead link, 빈 페이지, orphan, 누락된 alias, 모순 |
| **📋 인덱스 재생성** | `wiki/index.md`를 수동으로 다시 빌드합니다 |
| **⏹️ 작업 취소** | `Cmd+P` → "Cancel current ingestion" 또는 상태 표시줄 클릭 — 배치 경계에서 안전하게 중지 |
| **💡 스키마 업데이트 제안** | LLM이 Wiki를 분석하고 Schema 개선을 제안합니다 |

---

## 📖 예시

**입력:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**출력 — Entity 페이지:** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

### Supervised Learning

### 기본 정보
- 타입: method
- 소스: [[sources/machine-learning]]

### 설명
Supervised learning(지도 학습)은 레이블이 있는 훈련 데이터에서 학습하고
새로운 데이터에 대해 예측을 수행하는 머신러닝 패러다임입니다...

### 관련 개념
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### 관련 Entity
- [[entities/Arthur-Samuel|Arthur Samuel]]

### 소스 내 언급
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 모델 권장 사항

이 플러그인은 Karpathy의 핵심 철학을 따릅니다: **전체 Wiki 컨텍스트를 직접 LLM에 제공하고 RAG 검색으로 단편화하지 않음**. 긴 컨텍스트 창을 가진 모델을 강력히 권장합니다 — Wiki가 커질수록 LLM이 교차 페이지 일관성을 유지하는 데 더 많은 컨텍스트가 필요합니다.

> 💡 **왜 RAG를 사용하지 않나요?** Karpathy는 [원 개념](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)에서 RAG가 지식을 단편화하고 완전한 지식 그래프에서 LLM의 추론 능력을 저해한다고 지적했습니다.

**💰 가성비 우선 전략:** 플래그십 모델이 필요 없습니다. 다음 **경제적인 대안**으로 더 낮은 비용으로 훌륭한 결과를 얻을 수 있습니다:

| 등급 | 모델 | 컨텍스트 창 | 이유 |
|------|------|-------------|------|
| **🌟 가성비 최고** | **DeepSeek V4-Flash** | 1M tokens | 최저가($0.14/M), 284B MoE, 배치 처리에 최적 |
| **🌟 가성비 최고** | **Gemini-3.5-Flash** | 1M tokens | GPT-5.5보다 4배 빠른 출력, 에이전트 작업 우수 |
| **🌟 가성비 최고** | **Qwen3.6-Plus** | 1M tokens | 코딩 및 에이전트 능력 강력, 경쟁력 있는 가격 |
| **🌟 가성비 최고** | **Grok-4** | 2M tokens | 2M 초장문 컨텍스트, 초대형 Wiki에 최적 |
| **균형형** | **Claude Sonnet 4.6** | 1M tokens | 품질과 비용의 좋은 균형, $3/$15 per 1M tokens |
| **경량형** | **Claude Haiku 4.5** | 200K tokens | 고속 경제, 소형 Wiki에 적합 |
| **경제형** | **MiMo-V2.5-Flash** | 1M tokens | Xiaomi의 고가성비 선택, 309B MoE 아키텍처 |
| **플래그십형** | Claude Opus 4.7 | 1M tokens | 최고 품질, 비용 높음 — 선택적으로 사용 |
| **플래그십형** | GPT-5.5 | 1M tokens | 최고 수준 추론, 비용 높음 — 선택적으로 사용 |

로컬 모델(Ollama): 컨텍스트 창이 일반적으로 작습니다(8K–128K). 수집에는 cloud provider를, 조회에는 로컬 모델을 사용하는 것을 권장합니다.

**🔌 Anthropic Compatible(Coding Plan):** Provider가 Anthropic 호환 API 엔드포인트를 제공하는 경우, "Anthropic Compatible"을 선택하고 Provider의 Base URL과 API Key를 입력하세요.

> 💡 **구독 플랜:** Coding Plan, OpenAI Pro, Anthropic Pro 등의 구독 플랜은 빈번한 사용 시 비용 관리에 탁월한 선택입니다. 본 플러그인은 이러한 서비스들을 지원합니다.

---

## 🏗️ 아키텍처

Karpathy의 3계층 분리 설계를 기반으로 합니다:

```
sources/     # 📄 사용자의 source 문서(읽기 전용)
  ↓ ingest
wiki/        # 🧠 LLM 생성 Wiki 페이지
  ↓ query / maintain
schema/      # 📋 Wiki 구성 설정(명명 규칙, 페이지 템플릿, 분류 규칙)
```

**코드 구조** (`src/`):

```
wiki/               # 📄 Wiki 엔진 모듈
  wiki-engine.ts    # 🎯 오케스트레이터
  query-engine.ts   # 💬 대화형 조회
  source-analyzer.ts # 📊 반복적 배치 추출
  page-factory.ts   # 🏗️ Entity/Concept CRUD + 병합
  lint-controller.ts # 🔍 Lint 오케스트레이션
  lint-fixes.ts     # 🛠️ 수정 로직 (dead link, 빈 페이지, orphan)
  lint/             # Lint 하위 모듈
    duplicate-detection.ts  # 🔄 프로그램 기반 중복 후보 생성
    fix-runners.ts          # ⚡ 배치 수정 실행 헬퍼
  contradictions.ts # ⚠️ 모순 감지
  system-prompts.ts # 🗣️ 언어 지시 + 섹션 레이블
schema/             # Schema 공동 진화
  schema-manager.ts # 📋 Schema CRUD + 제안
  auto-maintain.ts  # 🔄 파일 감시 + 주기적 lint
ui/                 # 사용자 인터페이스
  settings.ts       # ⚙️ 설정 패널
  modals.ts         # 📦 Lint/Ingest/Query 모달
+ 공유 모듈: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**생성된 페이지:**
- `wiki/sources/filename.md` — 📄 Source 요약
- `wiki/entities/entity-name.md` — 👤 Entity 페이지(인물, 조직, 프로젝트 등)
- `wiki/concepts/concept-name.md` — 💡 Concept 페이지(이론, 방법, 용어 등)
- `wiki/index.md` — 📑 자동 생성 인덱스
- `wiki/log.md` — 📝 작업 로그

---

## ❓ FAQ (자주 묻는 질문)

> **플러그인을 최신으로 유지하세요.** 이 프로젝트는 자주 업데이트되며 며칠마다 새로운 기능과 수정 사항이 추가됩니다. Obsidian에서 **설정 → 커뮤니티 플러그인 → 업데이트 확인**을 정기적으로 실행하세요.
>
> 더 많은 질문은 [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28)을 참조하세요.

### 💡 일반

**이 플러그인은 실제로 무엇을 하나요?**
노트를 넣으면 인물, 개념, 이론을 추출하여 `[[양방향 링크]]`가 있는 상호 연결된 Wiki를 생성합니다. *여러분의* 노트를 기반으로 답변을 얻습니다 — 인터넷 환각이 아닙니다.

**최소 요구사항은?**
Obsidian v1.6.6+, 데스크톱(Windows/macOS/Linux), LLM Provider API Key. Ollama는 로컬에서 작동하며 API Key가 필요 없습니다.

**설치 후 기능을 사용할 수 없는 이유는?**
플러그인은 핵심 기능을 사용하려면 먼저 연결 테스트를 성공적으로 완료해야 합니다. **설정 → Karpathy LLM Wiki** → 제공자 선택 → API 키 입력 → **Fetch Models** 클릭 → 모델 선택 → **Test Connection** 클릭. 녹색 "LLM Ready" 표시가 나타나면 모든 기능을 사용할 수 있습니다. 이는 잘못 구성된 제공자의 묵묵한 실패를 방지합니다.

**실행 중인 수집/Lint를 취소하려면?**
작업 중 상태 표시줄 텍스트를 클릭하세요("수집 중... 클릭하여 취소" 표시), 또는 `Ctrl+P` → "Cancel current ingestion"을 사용하세요. 현재 배치 경계에서 작업이 깔끔하게 중지되며 완료된 작업은 모두 보존됩니다.

**현재 편집 중인 파일을 빠르게 수집하려면?**
왼쪽 리본 바의 `sticker` 아이콘을 클릭하거나, `Ctrl+P` → "Ingest current file"을 사용하세요. 파일 선택기를 건너뛰고 현재 활성 편집기 탭을 직접 수집합니다.

**log.md의 이중 괄호 [[[[...]]]]를 수정하려면?**
**Lint Wiki**를 실행하세요 — 스캐너가 wiki 디렉토리 전체(log.md 포함)에서 LLM 비용 없이 이중 중첩 위키 링크를 자동으로 감지하고 수정합니다. 수동 정리가 필요하지 않습니다.

**"Overloaded" 오류가 발생하는 이유는 무엇인가요?**
플러그인은 이제 Anthropic의 529 오버로드 오류를 재시도 가능한 것으로 인식합니다. 오버로드 오류는 모든 제공자에서 지수 백오프와 함께 자동으로 재시도됩니다.

**페이지가 entities/ 또는 concepts/에 이미 존재하는데 왜 중복 스텁이 생성되었나요?**
플러그인은 이제 슬러그 기반 매칭을 사용합니다 — 같은 이름의 다른 형식이 중복 스텁을 생성하는 대신 기존 페이지로 해결됩니다.

**어떤 모델을 선택해야 하나요?**
위의 [모델 권장 사항](#-모델-권장-사항)을 참조하세요. 긴 컨텍스트 모델을 권장합니다 — Wiki가 클수록 LLM은 더 많은 컨텍스트가 필요합니다.

### 🏷️ 별칭과 중복

**Lint에서 거의 모든 페이지에 "Alias 누락"이 표시되는 이유는 무엇인가요?**
v1.7.11 이전에 생성된 페이지에는 Alias가 포함되지 않았습니다. 이는 무해합니다 — Alias는 개선 기능이지 필수가 아닙니다. Lint 보고서에서 **Complete Aliases**를 클릭하면 LLM이 번역, 약어, 대체 이름을 일괄 생성합니다. Alias가 생기면 중복 감지와 Alias 기반 검색이 훨씬 효과적입니다.

**이름이 비슷한 중복 페이지가 보이는 이유는 무엇인가요?**
v1.7.10 이전에는 Alias 인식 중복 감지가 없었습니다. **Lint Wiki** 실행 → **Merge Duplicates**를 클릭하여 융합하세요. 병합된 페이지는 양쪽의 Alias를 모두 보존하여 향후 중복을 방지합니다.

**중복 감지는 어떻게 작동하나요? (v1.7.10+)**
2계층 의미론적 감지: 1계층(항상 LLM 검증)은 교차 언어 일치, 약어, 높은 유사도 제목을 포착합니다. 2계층은 중간 유사도 후보로 남은 예산을 채웁니다. Alias는 1계층에 매우 중요합니다 — 페이지가 v1.7.11 이전이면 **Complete Aliases**를 실행하세요.

**"오염된 페이지"란 무엇인가요? (v1.9.0)**
폴더 접두사가 실수로 파일명에 포함된 페이지 (예: `concepts/concepts레이아웃최적화.md`). **Lint Wiki** → **🧹 Fix Polluted Pages**로 이름을 변경하고 모든 인바운드 링크를 업데이트합니다.

### ⚡ 성능 및 비용 관리

**수집 속도를 높이려면 어떻게 하나요?**
**설정 → Ingestion Acceleration**에서: **Page Generation Concurrency**를 3~5로 증가(병렬 페이지 생성), **Batch Delay**를 100~300ms로 낮춤(속도 제한 주의). "최소", "굵음" 또는 "표준" **추출 세분화**를 선택하면 페이지 수를 줄이고 API 비용을 절약할 수 있습니다.

**HTTP 429 오류가 발생하는 이유는 무엇인가요?**
플러그인이 자동으로 속도 제한을 감지하고 제안합니다: 동시성을 1~2로 낮춤, Batch Delay를 500~800ms로 증가, 또는 더 높은 제한의 Provider로 전환.

**API 비용을 어떻게 제어하나요?**
- Auto-Maintenance는 기본 OFF (필요할 때만 활성화)
- Smart Batch Skip이 이미 수집된 파일을 자동 건너뜀
- "Standard" 또는 "Coarse" 세분화 = 더 적은 LLM 호출
- Batch Delay > 500ms는 호출 간격만 벌리고 토큰 소비는 증가하지 않음
- Lint 보고서는 수정 실행 전에 카운트를 표시하여 비용 대비 가치 판단 가능

### 🧹 유지보수

**Smart Fix All은 무엇을 하나요?**
인과 관계 순서로 수정 실행 (v1.9.0+):
1. 🧹 오염 페이지 수정 → 2. 🏷️ Alias 완성 → 3. 🔄 중복 병합 → 4. 🔗 데드 링크 수정 → 5. 🔗 고아 페이지 연결 → 6. 📝 빈 페이지 확장

**큰 Wiki에서 Lint가 멈춥니다?**
v1.7.17+로 업그레이드 — Lint가 50페이지마다 Obsidian UI 스레드에 제어권을 반환하여 1200+ 페이지 Wiki에서도 프리즈를 방지합니다.

### 🔍 문제 해결

**Query가 분명 존재하는 페이지를 찾지 못하는 이유는 무엇인가요?**
세 가지 일반적인 원인: (1) 인덱스가 오래됨 → **Regenerate index**. (2) Alias 누락 → **Complete Aliases**. (3) 표현을 바꿔보세요 — LLM은 키워드 검색이 아닌 의미 기반 매칭을 수행합니다.

**Wiki 페이지를 수동으로 편집할 수 있나요?**
네. Frontmatter에 `reviewed: true`를 설정하면 덮어쓰기로부터 보호됩니다. 수동으로 추가한 Alias, 태그, Source는 병합 시 보존됩니다.

**안전하게 업그레이드하려면?**
플러그인은 소스 파일을 수정하지 않습니다. `wiki/` 백업 → 플러그인 업데이트 → **Regenerate index** → **Lint Wiki** → 선택적으로 수정.

**도움을 받으려면?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — 버그 신고
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 질문 및 피드백

---

## 🔒 투명성 및 규정 준수

이 플러그인은 Obsidian 커뮤니티 플러그인 마켓에 등록되어 있으며 보안 및 권한에 대한 자동 검토를 받습니다.

**이 플러그인에는 백엔드도, 서버 인프라도, 어떠한 데이터 수집도 없습니다.** Obsidian 내에서 실행되는 순수한 로컬 소프트웨어입니다. 플러그인은 어떤 방식으로도 데이터를 수집, 저장, 전송할 수 없습니다——그러한 서버가 존재하지 않기 때문입니다.

**네트워크 접근**은 설정한 LLM 제공자와의 통신에만 사용되며, 다른 네트워크 호출은 이루어지지 않습니다. 이는 완전히 귀하의 통제 하에 있습니다: 제공자를 선택하고, API 키를 입력하고, 데이터를 어디로 보낼지 결정하는 것은 귀하입니다.

**파일 시스템 접근**（Vault 열거）은 Wiki 구축 및 유지 관리에 필요합니다: 소스 노트 읽기, 페이지 생성, 데드 링크 스캔, 중복 페이지 감지. 플러그인은 소스 파일을 절대 수정하지 않습니다——wiki 폴더 내의 파일만.

**클립보드 접근**은 Query 모달의 "복사" 버튼에만 사용되며, 클릭할 때만입니다.

완전한 데이터 로컬리티를 원하시면 Ollama나 LM Studio와 같은 로컬 LLM 제공자를 사용하세요. 로컬 제공자를 사용하면 데이터가 기기를 떠나지 않습니다.
## 📜 라이선스

MIT License — [LICENSE](LICENSE)를 참조하세요.

---

## 🙏 감사의 말

- **💡 개념:** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 원본 LLM Wiki 개념
- **🛠️ 플랫폼:** Obsidian 팀 — 플러그인 플랫폼 및 API
- **🔌 LLM SDK:** Anthropic, OpenAI, Google, DeepSeek, Kimi, GLM, OpenRouter, Ollama — LLM provider

---

**공식 사이트:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
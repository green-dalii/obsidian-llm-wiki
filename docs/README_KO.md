![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 플러그인

> 노트를 연결된 질의 가능한 지식베이스로 바꿔주는 Obsidian 플러그인 — [Andrej Karpathy의 LLM Wiki 개념](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을, 여러분이 이미 글을 쓰고 있는 편집기에 구현했습니다.

> **제로 임베딩 그래프 검색 • 10개 언어 네이티브 지원 • 모든 LLM 공급업체 호환**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | **한국어** | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[공식 사이트](https://llmwiki.greenerai.top/) | [옵시디언 마켓플레이스](https://community.obsidian.md/plugins/karpathywiki) | [블로그](https://llmwiki.greenerai.top/blog/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [목차](#-목차) • 🚀 [빠른 시작](#-빠른-시작) • ✨ [주요 기능](#-주요-기능) • 🔍 [검색 작동 방식](#-검색-작동-방식) • 🤖 [모델](#-모델) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← 이 플러그인이 도움이 되었다면, 커피 한 잔♥️ 사주시거나 별표🌟 하나 부탁드려요↗

---

## 📑 목차

- [🤔 이 플러그인이 필요한 이유?](#-이-플러그인이-필요한-이유)
- [🎯 이런 분들께 추천합니다](#-이런-분들께-추천합니다)
- [🚀 빠른 시작](#-빠른-시작)
- [✨ 주요 기능](#-주요-기능)
- [🔍 검색 작동 방식](#-검색-작동-방식)
- [🤖 모델](#-모델)
- [❓ FAQ](#-faq)
- [🔒 개인정보](#-개인정보)
- [💖 프로젝트 지원하기](#-프로젝트-지원하기)
- [📜 라이선스 및 크레딧](#-라이선스-및-크레딧)

---

## 🤔 이 플러그인이 필요한 이유?

여러분은 노트를 작성합니다. 그 노트들은 폴더에 쌓여갑니다. 무엇이 무엇과 연결되는지 찾으려면 몇 달 전에 잊어버린 맥락을 기억해야 합니다.

**Karpathy의 LLM Wiki 아이디어를 구현한 다른 오픈소스 프로젝트도 존재합니다 — 하지만 그중 어느 것도 원클릭 Obsidian 플러그인으로 제공되지는 않습니다.** 대부분은 CLI 도구, Claude Code 스킬, 또는 별도의 데스크톱 앱입니다. 저희는 네이티브 UI, 볼트 내 저장소, Obsidian의 Graph View가 내장된 유일한 플러그인입니다.

### 경쟁 제품과의 비교

|  | Karpathy LLM Wiki (이 플러그인) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **제공 형태** | ✅ 원클릭 Obsidian 플러그인 | ❌ 별도 Tauri 데스크톱 앱 | ❌ Claude Code 스킬 | ❌ Claude Code / Codex 스킬 | ❌ CLI + SDK + MCP 서버 |
| **설정 시간** | ✅ **5분** — 커뮤니티 플러그인 → 설치 → 공급자 선택 → 수집 | ❌ 30분+ — 컴파일/바이너리 다운로드, CLI 설정 | ❌ 15분 — Claude Code 구독 + 스킬 설치 필요 | ❌ 10분 — Claude Code/Codex 구독 + 스킬 설정 필요 | ❌ 30분+ — pip 설치 + SDK + MCP 설정 |
| **설치 경로** | ✅ Obsidian → 커뮤니티 플러그인 → 검색 → 설치 | ❌ 별도 바이너리 컴파일 또는 다운로드 후 CLI 설정 | ❌ Claude Code 구독 + 설치 가이드 필요 | ❌ Claude Code 또는 Codex 구독 + 설정 단계 필요 | ❌ pip install + Python SDK + 로컬 서버 |
| **아키텍처 복잡도** | ✅ **의존성 제로** — 벡터 DB, 임베딩 모델, 외부 프로세스 불필요 | 🟡 자체 Python 런타임 + sigma.js + sqlite 내장 | 🟡 Claude Code 환경 사용 — 자체 완결적이지 않음 | 🟡 별도 플랫폼 런타임 필요 | ❌ Python, 임베딩 모델, 벡터 DB 필요 |
| **i18n (UI + Wiki 출력)** | ✅ 10개 언어 (UI/출력 독립) | 🟡 2개 (EN / 中文) | ❌ 영어 전용 | ❌ 영어 전용 | ❌ 영어 전용 |
| **LLM 공급자** | ✅ 12+ (Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-compatible, Kimi, GLM, MiniMax, DeepSeek 포함) | 🟡 OpenAI 호환 | 🟡 Claude Code를 통한 구독 | 🟡 Claude Code / Codex를 통한 구독 | 🟡 OpenAI 호환 |
| **검색 알고리즘** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 4-신호 휴리스틱 (Adamic-Adar + 2홉 감쇠) | ❌ Louvain 커뮤니티 탐지만 사용 | ❌ Louvain + k홉 미리보기 | ❌ 하이브리드: BM25 + 시맨틱 + wikilink |
| **쿼리 파이프라인 (5단계 캐스케이드)** | ✅ Lex → LLM 키워드 → 부분문자열 스캔 → LLM KB 폴백 → PPR 확장 (첫 충분 신호에서 절단) | 🟡 2홉 감쇠만 사용 | ❌ Louvain 클러스터링만 사용 | ❌ k홉 미리보기 (LLM 보강 없음) | ❌ BM25 + 시맨틱 (그래프 없음) |
| **임베딩 필요 여부** | ✅ 아니오 (설계상 임베딩 비용 제로) | 🟡 선택 사항, 기본 꺼짐 | ✅ 아니오 | ✅ 아니오 | ❌ **예 — 필수** |
| **그래프 시각화** | ✅ Obsidian 네이티브 Graph View (내장, 추가 크기 제로) | ❌ 데스크톱 앱 내 커스텀 sigma.js + graphology | 🟡 vis.js graph.html (별도 파일) | ❌ 커스텀 sigma.js 오프라인 HTML | ❌ 읽기 전용 브라우저 뷰어 |
| **Wiki 정직성** | ✅ 쿼리와 일치하는 Wiki 소스가 없을 때 "Stage FALLBACK" 배너 표시 | ❌ 동등 기능 없음 | ❌ 동등 기능 없음 | ❌ 동등 기능 없음 | ❌ 동등 기능 없음 |
| **검색 벤치마크 공개** | ✅ PPR @5 = 27.1% vs 순수 kNN 24.1% (이 분야 유일한 공개 수치) | ❌ 임베딩 활성화 시에만 58% → 71%, 동등 비교 불가 | ❌ 미공개 | ❌ 미공개 | ❌ 미공개 |

### 의도적으로 선택한 세 가지 설계 원칙

- **🪟 Obsidian이 런타임입니다.** 터미널, 별도 앱, Docker, Python이 필요 없습니다. 커뮤니티 플러그인에서 설치하고, 수집을 클릭하면 Wiki가 첫 순간부터 볼트 안에 만들어집니다. Obsidian 네이티브 Graph View가 여러분의 `[[wiki-link]]` 그래프를 렌더링합니다 — 내장 기능이며 번들 크기가 전혀 늘어나지 않습니다.
- **🧭 깔끔하고 자체 완결적입니다.** 의존성이 전혀 없습니다. 임베딩 모델, 벡터 데이터베이스, pip 패키지가 없습니다 — 노트를 읽고 LLM과 통신하며 Wiki 페이지를 작성하는 단일 플러그인입니다. 모든 것이 Obsidian 안에서 동작합니다.
- **🔌 이미 비용을 지불하고 있는 어떤 모델이든 사용 가능합니다.** Anthropic, Bedrock, OpenAI, ChatGPT Plan (Codex OAuth), DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, Anthropic-compatible, 커스텀 엔드포인트 — 12개 이상의 공급자 중 어느 것도 임베딩 엔드포인트를 가질 필요가 없습니다.

---

## 🎯 이런 분들께 추천합니다

**✅ 네, 다음에 해당한다면:**

- **5시간 프로젝트가 아닌 5분 설정을 원하신다면.** 커뮤니티 플러그인에서 설치 → 공급자 선택 → 노트 하나 수집. CLI, Python, 별도 런타임, 벡터 DB가 필요 없습니다. 몇 초 만에 `wiki/`에 Wiki 페이지가 나타납니다.
- **깔끔하고 자체 완결적인 무언가를 원하신다면.** 플러그인의 외부 의존성은 정확히 0개입니다: 임베딩 모델, 벡터 데이터베이스, pip 패키지, Docker 컨테이너가 없습니다. 노트를 읽고, LLM과 통신하며, 볼트에 Wiki 페이지를 작성하는 단일 Obsidian 플러그인입니다. 모든 것이 Obsidian 안에 있습니다.
- **인터넷이 아닌 *여러분의 노트*에서 답변하는 질의 가능한 채팅** — 모든 답변에 `[[wiki-links]]`가 포함되어 지식 그래프로 연결됩니다.
- **데이터 주권을 중요시한다면** — Ollama나 LM Studio와 함께 완전히 로컬에서 실행되며, 인터넷에 전혀 연결되지 않습니다.
- **지원되는 10개 언어 중 하나로 글을 쓰거나 읽는다면** — UI와 Wiki 출력 언어는 독립적입니다 (Wiki는 중국어로, 인터페이스는 영어로 유지 가능).
- **`[[wiki-links]]`를 작성하여 그래프를 유지 관리한다면** — 여러분이 작성하는 모든 링크가 이미 검색을 풍부하게 합니다; 별도의 태깅/임베딩/인덱싱 단계가 필요 없습니다.
- **원클릭 유지관리를 원하신다면** — Lint 상태 검사 + Smart Fix All로 중복, 데드 링크, 고아 페이지를 직접 관리하지 않고도 관리할 수 있습니다.

**❌ 아니오, 다음에 해당한다면:**

- **범용 ChatGPT 대체품을 원하신다면** — 이 플러그인은 *여러분의 지식*에서만 답변합니다.
- **PDF/웹 페이지/외부 코퍼스에 대한 RAG 파이프라인이 필요하다면** — 저희는 볼트 내 경로에 집중합니다 (PDF는 v1.25.0부터 지원).
- **호스팅형 SaaS를 찾고 있다면** — 백엔드, 서버, 계정이 없습니다.

---

## 🚀 빠른 시작

1. **설치.** Obsidian → 설정 → 커뮤니티 플러그인 → 찾아보기 → "Karpathy LLM Wiki" 검색 → 설치 → 활성화. 또는 [커뮤니티 플러그인 페이지](https://community.obsidian.md/plugins/karpathywiki)에서 **Add to Obsidian** 클릭.
2. **공급자 설정.** 설정 → Karpathy LLM Wiki 열기 → 공급자 선택 (OpenAI, Anthropic, Ollama, ChatGPT Plan (Codex OAuth) 등) → API 키 입력 (로컬은 불필요) → **Test Connection** 클릭 → 저장.
3. **노트 하나 수집.** 두 가지 방법:
   - **⌨️ 키보드:** `Cmd+P/Ctrl+P` → "Ingest single source" → Markdown (또는 PDF, v1.25.0+) 파일 선택.
   - **🖱️ 도구 모음 아이콘:** Obsidian 왼쪽 리본의 **스티커 아이콘**을 클릭하면 현재 열려 있는 노트를 즉시 수집합니다 — 메뉴를 뒤질 필요 없음.
   
   몇 초 안에 첫 Wiki 페이지가 `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`에 생성됩니다.
4. **Wiki 질의.** 두 가지 방법:
   - **⌨️ 키보드:** `Cmd+P/Ctrl+P` → "Query wiki".
   - **🖱️ 도구 모음 아이콘:** Obsidian 왼쪽 리본의 **말풍선 아이콘**을 클릭.
   
   Copilot 스타일의 우측 도킹 사이드 패널이 열리며, 그 안에서 Wiki와 대화할 수 있습니다. 답변에는 지식 그래프로 다시 연결되는 `[[wiki-links]]` 가 포함됩니다.

![Query side panel](/docs/assets/query-side-panel.png)

이게 전부입니다. 플러그인은 원본 노트를 전혀 수정하지 않습니다 — `wiki/` 아래에 새 페이지만 생성합니다. **수집** 과 **Wiki 질의** 모두 왼쪽 리본에 고정되어 있어 언제든지 한 번의 클릭으로 접근할 수 있습니다. (`Cmd`는 macOS, `Ctrl`은 Windows/Linux.)

### 핵심 명령어

| 명령어 | 기능 |
|--------|------|
| **📥 단일 소스 수집** | `Cmd+P/Ctrl+P` → "Ingest single source" — Markdown 또는 **PDF (v1.25.0+)** 파일을 선택하여 Entity/Concept/Wiki 페이지 생성. *또는: 🖱️ 활성 노트에서 왼쪽 리본의 스티커 아이콘 클릭.* |
| **📂 폴더에서 수집** | `Cmd+P/Ctrl+P` → "Ingest from folder" — 폴더의 모든 노트를 스마트 배치 스킵과 함께 일괄 수집 |
| **📑 여러 파일 수집** | `Cmd+P/Ctrl+P` → "Ingest multiple files" — 2패널 파일 트리에서 하위 집합 선택 (라이브 큐 + 파일별 취소) |
| **🔍 Wiki 질의** | `Cmd+P/Ctrl+P` → "Query wiki" — 우측 도킹 사이드 패널에서 Wiki와 대화; 답변에 `[[wiki-links]]` 포함. *또는: 🖱️ 왼쪽 리본의 말풍선 아이콘 클릭.* |
| **🛠️ Wiki 린트** | `Cmd+P/Ctrl+P` → "Lint wiki" — 전체 상태 검사: 중복, 데드 링크, 빈 페이지, 고아, 누락된 alias, 모순 |
| **⚡ Smart Fix All** | Lint 모달 내부 — 원클릭 인과순서 수리, 단계별 보고서 제공 |
| **📋 인덱스 재생성** | `Cmd+P/Ctrl+P` → "Regenerate index" — 현재 페이지와 alias로 `wiki/index.md` 재구축 |
| **⏹ 작업 취소** | `Cmd+P/Ctrl+P` → "Cancel current ingestion" 또는 상태 표시줄 클릭 — 다음 배치 경계에서 깔끔하게 중지 |
| **📊 수집 기록** | `Cmd+P/Ctrl+P` → "View Ingestion History" — 과거 수집, lint 보고서, 유지보수 실행을 검색 가능한 UI로 조회 |

![Command panel — all LLM Wiki commands live in Obsidian's command palette](/docs/assets/command-panel.png)
| 전 | 후 |
|---|------|
| `notes/machine-learning.md` (평범한 파일) | `wiki/concepts/supervised-learning.md` — `[[양방향 링크]]`, alias, 출처 정보, `wiki/index.md` 항목 포함 |

> 💡 **최신 상태 유지.** 새 기능, 수정 사항, 성능 개선이 자주 릴리스됩니다. 설정 → 커뮤니티 플러그인 → 업데이트 확인, 또는 플러그인 자동 업데이트를 활성화하세요.
> 📖 상세 가이드 (설치, PDF 설정, 멀티 공급자, 업그레이드)는 [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides)에서 확인하세요.

---

## ✨ 주요 기능

### 📚 지식 품질

- **🔍 Entity/Concept 추출** — LLM이 Entity(인물, 조직, 제품, 이벤트)와 Concept(이론, 방법, 용어)을 독립 페이지로 추출합니다. 세분화 설정 가능 (Minimal ~ Fine, Custom 포함)으로 비용과 깊이를 조절할 수 있습니다.
- **🏷️ 필수 Alias** — 생성된 각 페이지에 최소 1개의 alias(번역, 약어, 변형)를 포함하여 교차 언어 중복 감지가 작동합니다.
- **🔄 계층형 중복 감지** — Tier 1 (직접 이름 일치: 교차 언어, 약어, 높은 유사도 제목)은 항상 검증됩니다. Tier 2 (공유 링크, 중간 유사도)는 남은 토큰 예산을 채웁니다.
- **🧩 스마트 병합 및 모순 상태** — 중복 병합 시 alias 보존; 모순은 출처와 함께 표시; `reviewed: true` 페이지는 덮어쓰기에서 보호됩니다.
- **🎨 사용자 정의 태그 어휘** — 설정 → Wiki → Tag Vocabulary → *Custom*에서 자체 Entity/Concept 타입 태그 목록을 정의할 수 있습니다. Lint가 활성 어휘를 벗어난 태그가 있는 페이지를 보고합니다.

### 📄 PDF 수집 (v1.25.0+)

- **🔌 공급자 게이트** — Anthropic, OpenAI, Bedrock이 PDF를 네이티브로 처리합니다. 다른 OpenAI/Anthropic 호환 엔드포인트에서는 설정 → LLM Configuration → Advanced에서 **Force PDF Support**를 활성화하여 호출을 시도할 수 있습니다. Apple Silicon에서의 로컬 OCR, 서드파티 추출기(MinerU, Docling, Mathpix, Adobe), 전체 PDF 수집 워크스루에 대해서는 아래 [PDF OCR 경로](#-pdf-ocr-경로)와 [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)를 참조하세요.
- **🗄️ 제한된 캐시** — `.obsidian/plugins/karpathywiki/pdf-cache/`에 변환된 Markdown을 저장하며, 콘텐츠 해시 + 모델 + converter version으로 키가 지정됩니다. 3계층 방어 하우스키핑: 총 100MB / 1000개 항목 / 단일 10MB 상한, LRU-by-mtime 축출.
- **📝 선택적 볼트 사이드카** — 설정 → Wiki Configuration → Wiki Folder → *Write PDF Markdown to Vault*를 켜면 소스 PDF 옆에 `<basename>.pdf.md`를 작성합니다 (기본값 꺼짐 — 캐시 전용이 기본).
- **🛡️ Verbatim 트랜스크립터 프롬프트** — OCR 스타일 변환, `[illegible]` / `[figure: ...]` 반환각 마커 포함; 소형 로컬 모델의 markdown 펜스 래핑은 캐시 쓰기 전에 자동 정리됩니다.

### 📄 PDF OCR 경로

세 가지 경로, 설정에 맞게 선택하세요:

1. **☁️ PDF를 네이티브 지원하는 클라우드 공급자** — Anthropic, OpenAI, AWS Bedrock이 PDF를 기본 지원합니다. 수집만 하면 됩니다; 추가 설정 불필요. 다른 OpenAI/Anthropic 호환 엔드포인트에서는 설정 → LLM Configuration → Advanced에서 **Force PDF Support**를 활성화하세요.
2. **🖥️ Apple Silicon 로컬 OCR** — [oMLX](https://github.com/jundot/omlx)가 Microsoft Markitdown을 내장 PDF→Markdown 백엔드로 통합합니다. oMLX에서 Markitdown 활성화, [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M 활성, 2026-06 오픈소스)을 비전 모델로 로드, 플러그인을 Custom OpenAI-Compatible 공급자로 oMLX에 연결, **Force PDF Support** 켜기, oMLX가 서빙하는 멀티모달 모델 선택. PDF가 기기를 떠나지 않습니다.
3. **🛠️ 서드파티 추출기 (MinerU, Docling, Mathpix, Adobe)** — PDF에 대해 별도 추출기를 실행하여 `.md` 파일을 생성한 다음, 플러그인의 표준 파이프라인을 통해 일반 Markdown 노트로 수집합니다. 과학 논문, 스캔 문서, 수학 중심 PDF에 가장 안정적입니다.

📖 **세 가지 경로 모두에 대한 전체 설정 워크스루** (클라우드 공급자, oMLX 하드웨어 계층, MinerU 설치, 캐시 하우스키핑) → [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)

### 💬 조회 및 유지관리

- **🧭 5단계 PPR 캐스케이드** — [검색 작동 방식](#-검색-작동-방식) 참조. `[[wiki-link]]` 그래프 위의 Personalized PageRank가 그래프 인지 멀티홉 컨텍스트를 제공합니다.
- **🪟 우측 도킹 사이드 패널** — Query Wiki가 중앙 팝업 대신 Copilot 스타일의 우측 사이드바 리프에서 열립니다 (v1.22.1+).
- **🔍 Lint 상태 검사** — 단일 명령어로 감지: 중복, 데드 링크, 빈 페이지, 고아, 누락된 alias, 모순.
- **⚡ Smart Fix All** — 원클릭 인과순서 수리: alias 채우기 → 중복 병합 → 데드 링크 수정 → 고아 연결 → 빈 페이지 확장, 단계별 보고서 포함.
- **📊 작업 이력 패널** — 과거 수집, lint 보고서, 유지보수 실행을 검색 및 필터링 가능한 UI로 조회.
- **🛡️ 사전 수집 게이트** — 빈/공백/frontmatter 전용 노트는 LLM 호출 전에 거부됨; 콘텐츠 해시 중복 제거가 경로 간 동일 파일을 감지합니다.

### 🔒 개인정보

- **🚫 백엔드 없음, 추적 없음, 분석 없음.** 완전히 Obsidian 내부에서 실행됩니다. 네트워크는 설정한 LLM 공급자와의 통신에만 사용됩니다.
- **📁 소스 파일은 읽기 전용입니다.** 플러그인은 원본 볼트 노트를 절대 수정하지 않습니다 — `wiki/` 아래에 새 페이지만 생성합니다.
- **🦙 완전 로컬 모드.** Ollama, LM Studio, 또는 모든 로컬 OpenAI 호환 엔드포인트 → 노트가 기기를 떠나지 않습니다.
- **🔐 최소 권한.** Wiki 관리를 위한 볼트 파일 접근. Query 모달의 "Copy" 버튼 클릭 시에만 클립보드 접근.

### 🦙 로컬 우선

- **🖥️ Ollama, LM Studio, OpenRouter, 커스텀 엔드포인트** — 즉시 사용 가능. 로컬 모델은 조회에 적합 (작은 컨텍스트 창); 2000페이지 볼트 수집은 보통 긴 컨텍스트 클라우드 모델이 필요합니다.
- **📄 Apple Silicon에서 PDF OCR 경로 완전 로컬 지원** — [PDF OCR 경로](#-pdf-ocr-경로) 참조.
- **🔐 ChatGPT Plan (Codex OAuth)** — 데스크톱: `127.0.0.1:1455` 루프백 콜백; 모바일: 기기 코드 로그인. 자격 증명은 Obsidian SecretStorage에만 저장되며 로그아웃 시 삭제됩니다. 서드파티 Codex 호환 기능이며, OpenAI 파트너십이나 범용 ChatGPT API가 아닙니다.

### 🌐 언어

- **🌍 10개 UI 언어** — English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. UI와 Wiki 출력 언어는 독립적입니다 — Wiki는 중국어로, 인터페이스는 영어로 유지 가능합니다.
- **📚 10개 Wiki 출력 언어** — 동일한 세트; 설정 → Wiki Configuration에서 선택. *Custom input* 옵션으로 임시 프롬프트 사용 가능.
- **🈶 269개 이상의 번역된 UI 문자열** — 모든 라벨, 모달, Notice. 11번째 언어 추가는 기여자 주도입니다 (PR #159 패턴).

---

## 🔍 검색 작동 방식

대부분의 "AI 검색" 플러그인은 노트를 청크로 분할하고 벡터 DB에 임베딩합니다. 저희는 그렇게 하지 않습니다. Karpathy가 RAG에 반대한 이유는 청킹이 LLM의 전체 지식 그래프 추론 능력을 저해하기 때문이며 — 이 주장은 실제로도 유효합니다. 대신, 여러분이 `[[wiki-links]]`를 작성하여 이미 유지 관리하고 있는 그래프를 탐색합니다.

### 5단계 시드 선택 캐스케이드

"Microsoft 창업자는 누구인가?"라고 질문하면, Query Wiki는 답변 생성 전에 5단계를 실행합니다:

1. **Lex 빠른 경로** — 모든 Entity/Concept 제목 및 alias에 대한 직접 토큰 중복 체크. 무료, 즉시, 이후 모든 단계의 게이트 역할.
2. **LLM 키워드 생성** — LLM이 쿼리로부터 8–12개의 다국어 키워드 생성 (동의어, 약어, 토큰 중복에 취약한 용어를 단일 LLM 호출로 처리).
3. **로컬 부분문자열 스캔** — 생성된 각 키워드를 페이지 제목, alias, 본문 스니펫에 대해 로컬에서 재매칭. 추가 LLM 호출 없음, 노이즈 허용 재현율 보완.
4. **LLM KB 폴백** — lex + 키워드 스캔의 신호가 약할 때, LLM이 전체 Wiki에 대해 top-N 후보를 한 번 의미적으로 재시드.
5. **PPR 그래프 확장** — 후보 시드 집합에서 `[[wiki-link]]` 그래프 위 Personalized PageRank (Haveliwala 2002) 실행. 이것이 그래프 인지 멀티홉 컨텍스트를 제공합니다: "Bill Gates" → "Microsoft" → "경쟁사", 단순한 제목 일치가 아닌.

캐스케이드는 충분한 신호를 반환한 단계에서 자동으로 절단됩니다 — 고정된 5단계 비용 없음, lex로 충분할 때는 LLM 호출 없음, LLM 보강이 필요할 때는 정밀도 손실 없음.

### 규모에 맞는 Personalized PageRank

Monte Carlo PPR (Fogaras 2005)을 사용합니다 — 3,000개의 랜덤 워크 × 각 50단계, Haveliwala 2002의 데드엔드 규칙 적용. 비용은 **O(K × L)**로 페이지 수와 무관하므로, 2000페이지 볼트에서도 200페이지 볼트와 동일한 확장 지연 시간을 보입니다.

**PPR @5 = 27.1% vs 순수 kNN 기준 24.1%** (이 오픈소스 LLM-Wiki 분야에서 유일하게 공개된 검색 벤치마크).

### 임베딩을 사용하지 않는 이유

[Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175)에서 임베딩 경로를 의도적으로 거부했습니다. 그래프 신호는 이미 존재합니다 — 모든 `[[wiki-link]]`는 "이것들은 서로 관련있다"는 직접 큐레이팅된 엣지이며, 저희가 지원하는 대부분의 공급자(Ollama, LM Studio, Anthropic, Bedrock, Kimi, GLM, MiniMax)는 `/v1/embeddings` 엔드포인트를 전혀 제공하지 않습니다. 임베딩 모델을 추가하면 페이지당 다운로드, 공급자별 어댑터가 필요하고 검색 품질에는 이점이 전혀 없을 것입니다.

---

## 🤖 모델

**지원 공급자 (12+, 2026-07 기준 models.dev 교차 확인):**

| 공급자 | 시리즈 | 비고 |
|--------|--------|------|
| **Anthropic** | Claude 5 시리즈 | 네이티브 PDF; `/v1/messages` 프로토콜 |
| **OpenAI** | GPT-5.6 시리즈 (Sol / Terra / Luna) | 네이티브 PDF; Platform API 키 |
| **Google Gemini** | Gemini 3.6 시리즈 | 네이티브 PDF (1.5부터 파일 파트); OpenAI 호환 엔드포인트 |
| **DeepSeek** | DeepSeek V4 시리즈 | OpenAI 호환; 최저 비용 계층 |
| **Alibaba Qwen** | Qwen3.7/3.8 시리즈 | OpenAI 호환 (DashScope) |
| **xAI Grok** | Grok 4 시리즈 | OpenAI 호환; 긴 컨텍스트 |
| **Moonshot Kimi** | Kimi K3 시리즈 | OpenAI 호환; 2.8T MoE 프론티어 |
| **Zhipu GLM** | GLM-5 시리즈 | OpenAI 호환; 강력한 이중 언어 |
| **MiniMax** | MiniMax M3 시리즈 | OpenAI 호환; 1M 컨텍스트 |
| **Step (阶跃星辰)** | Step 3 시리즈 (Flash) | OpenAI 호환; 빠른 추론 |
| **Tencent Hunyuan** | Hy3 시리즈 | OpenAI 호환; 오픈웨이트 MoE |
| **Xiaomi MiMo** | MiMo V2.5 시리즈 | MIT 오픈소스; 플랫 가격 |
| **Google Gemma** | Gemma 4 시리즈 | 오픈웨이트; 262K 컨텍스트 |
| **AWS Bedrock** | Anthropic + OpenAI 변형 | VPC / 규정 준수 경로 |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | 브라우저/기기 코드 로그인; SecretStorage |
| **로컬: Ollama, LM Studio, OpenRouter, Anthropic-Compatible** | 모든 OpenAI/Anthropic 프로토콜 모델 | Custom OpenAI-Compatible + Anthropic-Compatible (Token Plan / Coding Plan) |

이 플러그인은 LLM에 전체 Wiki 컨텍스트를 제공하므로 — **긴 컨텍스트 모델이 유리합니다**. 전체 계층형 표 (클라우드 + 로컬)는 [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)에 있으며, [models.dev](https://models.dev/)와 교차 확인되어 최신 상태를 유지합니다.

### 중요한 요소

- **🧠 컨텍스트 창 ≥ 200K 토큰** — 약 500페이지 이상의 볼트에서 필요. 200K 미만이면 캐스케이드의 조립된 컨텍스트가 잘리기 시작합니다.
- **⚖️ 명령 수행 품질** — 추출 작업에서는 원시 IQ보다 명령 수행 능력이 더 중요합니다. 스키마 템플릿을 따르는 모델을 선택하세요, 가장 큰 리더보드 숫자가 아닙니다.
- **🔌 임베딩 엔드포인트는 무관합니다** — 저희는 임베딩을 사용하지 않습니다. `/v1/embeddings`가 없는 공급자도 괜찮습니다 (저희 12+ 공급자 대부분이 그렇습니다).
- **🦙 조회는 로컬, 수집은 클라우드** — 2000페이지 볼트 수집은 보통 긴 컨텍스트 클라우드 모델이 필요합니다; 262K 로컬 모델은 대부분의 조회를 커버합니다.

### Anthropic vs OpenAI vs Codex OAuth — 서로 다른 공급자입니다

- **Anthropic** (및 Bedrock 변형) — 별도 청구되는 Anthropic Platform API 키.
- **OpenAI** — 별도 청구되는 OpenAI Platform API 키.
- **ChatGPT Plan (Codex OAuth)** — 실험적, 별도 공급자로 브라우저 또는 기기 코드 로그인 후 적격 Codex 사용 한도를 사용합니다. 사용 가능 여부는 OpenAI Codex 인증 및 사용 한도 정책을 따르며, 플랜 이름으로 보장되지 않습니다. 서드파티 Codex 호환 기능이며, OpenAI 파트너십이나 범용 ChatGPT API가 아닙니다.

> 📖 **전체 선택 표** (클라우드 + 로컬 + PDF OCR + Codex OAuth + 양자화 + 하드웨어 계층) → [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)

---

## ❓ FAQ

### 이 플러그인은 실제로 무엇을 하나요?

노트, 폴더, 선택 항목을 고르면 LLM이 Entity와 Concept을 추출하고 `[[양방향 링크]]`로 연결된 Wiki를 생성합니다. 질문하면 *여러분의 노트*에 기반한 대화형 답변을 받습니다 — 인터넷이 아닙니다. 원본 볼트 노트는 절대 수정되지 않습니다.

### 어떻게 시작하나요?

Obsidian 커뮤니티 플러그인에서 설치 → 공급자 선택 → **Test Connection** → 아무 노트에 대해 **Ingest single source** 실행. 첫 Wiki 페이지가 몇 초 안에 나타납니다. [빠른 시작](#-빠른-시작) 참조.

### 기존 Wiki는 안전한가요?

✅ v1.0.0 이후 하위 호환성 유지. 덮어쓰기로부터 보호하려면 페이지에 `reviewed: true`를 설정하세요. v1.24.x에서 업그레이드해도 볼트가 다시 작성되지 않습니다; v1.25.0의 PDF 수집은 기본적으로 캐시 전용입니다.

### 내 데이터가 외부로 전송되나요?

🚫 백엔드 없음, 분석 없음 — 플러그인은 완전히 Obsidian 내부에서 실행됩니다. 수집/조회를 위해 명시적으로 보낸 텍스트만 기기를 떠나며, 설정한 LLM 공급자에게만 전송됩니다. 완전한 데이터 로컬리티를 위해 Ollama나 LM Studio를 사용하세요.

### 내 언어로 사용할 수 있나요?

🌍 UI와 Wiki 출력 모두 10개 언어 지원. UI와 Wiki 언어는 독립적입니다. 11번째 언어 추가는 기여자 주도입니다 (PR #159 패턴).

### RAG 챗봇과 어떻게 다른가요?

🚫 청킹 없음. 🚫 임베딩 없음. 🚫 벡터 DB 없음. ✅ 기존 `[[wiki-link]]` 그래프 위의 Personalized PageRank — 그래프 인지 멀티홉 컨텍스트, 임베딩 비용 제로, 로컬 모델 완전 지원.

### 어떤 LLM을 사용해야 하나요?

긴 컨텍스트 모델(≥200K 토큰)이 가장 적합합니다. [모델 섹션](#-모델)에서 원칙을 다루고, 전체 계층형 표는 [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)에 있습니다.

### 공개된 벤치마크가 있나요?

네 — PPR @5 = 27.1% vs 순수 kNN 기준 24.1% (프로젝트 자체 코퍼스 기준). 전체 파이프라인과 벤치마크 스크립트는 [검색 작동 방식](#-검색-작동-방식)에 설명되어 있습니다.

### API 비용을 어떻게 관리하나요?

배치 수집에는 Coarse 또는 Minimal 추출 세분화를 사용하세요. Smart Batch Skip이 이미 수집된 파일을 자동 감지합니다. Auto-Maintenance는 기본적으로 꺼져 있습니다. Lint는 수정 실행 전에 건수를 표시합니다 — 승인 없이 비용이 청구되지 않습니다.

### 실행 중인 작업을 취소하려면?

상태 표시줄 클릭 ("수집 중… 클릭하여 취소" 표시) 또는 `Cmd+P/Ctrl+P` → "Cancel current ingestion". 다음 배치 경계에서 깔끔하게 중지됩니다.

### 도움은 어디서 받나요?

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — 버그 신고 · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 질문 및 기능 요청 · 개발자 콘솔 (`Ctrl+Shift+I` / `Cmd+Option+I`) — 플러그인 로그 확인.

---

## 🔒 개인정보

이 플러그인은 Obsidian 커뮤니티 플러그인 마켓에 등록되어 있으며 보안 및 권한에 대한 자동 검토를 받습니다.

- **🚫 백엔드 없음, 서버 없음, 데이터 수집 없음.** Obsidian 내에서 실행되는 순수 로컬 소프트웨어입니다. 플러그인은 데이터를 수집, 저장, 전송할 수 없으며 실제로 그러지 않습니다 — 그러한 서버가 존재하지 않기 때문입니다.
- **🔐 네트워크 접근은 옵트인입니다.** 설정한 LLM 공급자와의 통신에만 사용됩니다. 공급자를 선택하고, API 키를 입력하고, 데이터가 어디로 갈지 결정하는 것은 여러분입니다.
- **📁 볼트 파일 접근**은 Wiki 관리에 사용됩니다 (노트 읽기, 페이지 생성, 데드 링크 스캔, 중복 감지). 플러그인은 소스 파일을 절대 수정하지 않습니다.
- **📋 클립보드 접근**은 Query 모달의 "Copy" 버튼에서만 사용됩니다 — 클릭할 때만입니다.

완전한 데이터 로컬리티를 위해 Ollama 또는 LM Studio를 사용하세요. 로컬 공급자를 사용하면 데이터가 기기를 떠나지 않습니다.

---

## 💖 프로젝트 지원하기

LLM-Wiki가 여러분의 지식 워크플로에서 중요한 부분이 되었다면:

- ☕ **[Ko-fi에서 커피 한 잔 사기](https://ko-fi.com/greenerdalii)** — 일회성 또는 월간 지원
- 💳 **[PayPal로 팁 보내기](https://paypal.me/greenerdalii)** — 일회성 팁

후원은 전적으로 선택 사항입니다. 플러그인은 Apache-2.0 라이선스로 유지되며 기능이 완전한 상태를 유지합니다.

프로젝트를 지원해 주신 [@jameses-cyber](https://github.com/jameses-cyber)와 [@issaqua](https://github.com/issaqua)님께 감사드립니다.

---

## 📜 라이선스 및 크레딧

Apache License, Version 2.0 — [LICENSE](../LICENSE) 및 [NOTICE](../NOTICE) 참조.

**다음을 기반으로 구축되었습니다:**
- 💡 [Andrej Karpathy의 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 원본 개념
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) 및 [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — 검색 알고리즘

**유지관리자:** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)

![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki — Obsidian 플러그인

> [Andrej Karpathy의 LLM Wiki 개념](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을 기반으로 한 지식베이스 생성 시스템. 노트에서 Entity와 Concept을 자동 추출해 연결된 Wiki 페이지를 구축합니다.

> **Obsidian 공식 평점 95/100 | 10개 언어 네이티브 지원 | 제로 임베딩 그래프 검색 | 완전한 데이터 주권 | 모든 LLM 공급업체 호환**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | **한국어** | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[공식 사이트](https://llmwiki.greenerai.top/) | [옵시디언 마켓플레이스](https://community.obsidian.md/plugins/karpathywiki) | [블로그](https://llmwiki.greenerai.top/blog/) | [피드백 토론](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

🚀 [빠른 시작](#-빠른-시작) | ✨ [주요 기능](#-주요-기능) | 🤖 [모델 권장 사항](#-모델-권장-사항) | 🔒 [투명성 및 규정 준수](#-투명성-및-규정-준수) | ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← 이 플러그인이 도움이 되었다면, 커피 한 잔♥️ 사주시거나 별표🌟 하나 부탁드려요↗

---

> **⚡ 빠른 업데이트 알림:** 이 프로젝트는 빠르게 진화하며 버그 수정, 성능 개선, 새로운 기능 및 UX 최적화를 자주 제공합니다. Obsidian에서 항상 최신 버전으로 업데이트하고(**설정 → 커뮤니티 플러그인 → 업데이트 확인**), 플러그인 자동 업데이트를 활성화하세요.

## 📑 Contents

- [🧠 Karpathy LLM Wiki — Obsidian 플러그인](#-karpathy-llm-wiki--obsidian-플러그인)
  - [📑 Contents](#-contents)
  - [💡 LLM-Wiki란?](#-llm-wiki란)
  - [⚡ 왜 Obsidian + LLM-Wiki인가?](#-왜-obsidian--llm-wiki인가)
  - [🚀 빠른 시작](#-빠른-시작)
    - [📦 설치](#-설치)
    - [🔄 업데이트](#-업데이트)
    - [🔑 LLM 프로바이더 설정](#-llm-프로바이더-설정)
    - [🎮 사용법](#-사용법)
    - [⚠️ 이전 버전에서 업그레이드?](#️-이전-버전에서-업그레이드)
  - [⚡ v1.25.0 업데이트 하이라이트](#-v1250-업데이트-하이라이트)
  - [✨ 주요 기능](#-주요-기능)
    - [📊 지식 품질](#-지식-품질)
    - [📄 PDF 수집 (v1.25.0)](#-pdf-수집-v1250)
    - [💬 조회 및 피드백](#-조회-및-피드백)
    - [🛠️ 유지 관리](#️-유지-관리)
    - [🌐 LLM 및 언어](#-llm-및-언어)
    - [🏗️ 아키텍처 및 성능](#️-아키텍처-및-성능)
    - [🔒 개인정보 보호 및 보안](#-개인정보-보호-및-보안)
  - [📖 예시](#-예시)
  - [🤖 모델 권장 사항](#-모델-권장-사항)
    - [☁️ 클라우드 모델 추천](#️-클라우드-모델-추천)
    - [🦙 로컬 모델 추천 (Ollama / LM Studio)](#-로컬-모델-추천-ollama--lm-studio)
    - [📄 로컬 PDF OCR 경로 (v1.25.0+)](#-로컬-pdf-ocr-경로-v1250)
  - [🏗️ 아키텍처](#️-아키텍처)
  - [❓ FAQ](#-faq)
  - [🔒 투명성 및 규정 준수](#-투명성-및-규정-준수)
  - [💖 프로젝트 지원하기](#-프로젝트-지원하기)
    - [후원자](#후원자)
  - [📜 라이선스](#-라이선스)
  - [🙏 감사의 말](#-감사의-말)
  - [Star History](#star-history)

## 💡 LLM-Wiki란?

작성은 당신이, 정리는 AI가, 질문은 다시 당신이. 이것이 전부입니다.

**🎯 문제.** 노트는 인물, 개념, 아이디어, 연결고리의 금광입니다. 하지만 현재는 단지 폴다 안의 파일일 뿐입니다. 무엇이 무엇과 연결되는지 찾기 위해선 검색과 태깅, 그리고 기억에 의존해야 합니다.

**✨ 해결책.** [Andrej Karpathy가 제안한](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 우아한 방식: 노트를 원재료로 취급하고 LLM이 설계를 담당합니다. LLM이 작성 내용을 읽고 Entity와 Concept을 추출하여 구조화된 Wiki를 구축합니다 — `[[bidirectional links]]`, 자동 생성 인덱스, 그리고 지식베이스에 질문할 수 있는 채팅 인터페이스를 포함합니다.

**📚 당신은 더 이상 사서가 아닙니다.** 어떤 내용을 페이지로 만들지 결정할 필요도, 교차 링크를 유지할 필요도, 정보가 오래되었는지 걱정할 필요도 없습니다. vault의 아무 노트(또는 폴다, 다중 선택)를 선택하면 LLM이 읽고, 추출하고, 작성하고, 연결하며, 심지어 모순까지 표시합니다 — 당신은 몰입을 유지하면서 작업을 계속합니다.

**🤖 그리고 이것은 또 다른 챗봇이 아닙니다.** ChatGPT는 인터넷을 알고 있습니다. LLM-Wiki는 *당신*을 압니다 — 정확히 말하자면 당신이 가르친 내용을 압니다. 모든 답변은 `[[wiki-links]]`를 통해 지식 그래프로 연결됩니다. 모든 응답은 끝이 아닌 탐색의 시작점입니다.

**🏆 핵심 차별화 — ゼ로 임베딩 비용의 그래프 기반 검색.** 대부분의 지식베이스 플러그인은 벡터 임베딩(비용 높음, 공급업체 의존, 인터넷 필요)을 사용합니다. LLM-Wiki는 기존의 `[[wiki-link]]` 그래프 위에서 Personalized PageRank를 실행 — API 호출 ゼ로, 새로운 의존성 없이, 로컬 모델 완전 지원으로 임베딩급 검색 품질을 실현합니다. i18n 대응 **ゼ로 LLM Tier B 섹션 추출**(10개 언어)을 더하면 모든 공급업체에서 작동하는 지식 엔진이 완성됩니다.

---

## ⚡ 왜 Obsidian + LLM-Wiki인가?

Obsidian은 연결된 사고에 탁월합니다. 하지만 한 가지 문제가 있습니다: 모든 연결을 직접 만들어야 한다는 점입니다.

LLM-Wiki는 이 구조를 뒤집습니다. 직접 그래프를 수작업으로 만드는 대신, AI가 여러분과 함께 그래프를 키워줍니다. 새로운 개념에 대한 노트를 추가하면 놓쳤을 연결을 찾아주고, 질문을 던지면 여러분만의 지식 그래프를 탐색하여 인용과 함께 답변을 가져다줍니다.

- **🔗 그래프 뷰가 살아납니다.** 새로운 노트는 단순히 저장되는 것이 아니라 Entity, 개념, 소스로의 링크를 뻗어냅니다. 그래프는 유기적으로 성장하고, 플러그인이 이를 관리합니다: 중복 감지, 데드 링크 수정, 에일리어스를 통한 언어 간 연결.
- **💬 노트가 대화하기 시작합니다.** 검색이 대화가 됩니다. "X에 대해 무엇을 썼지?"가 스트리밍 응답과 `[[wiki-links]]`라는 빵조각과 함께 하나의 대화가 됩니다. 모든 답변은 여러분의 지식 속으로 더 깊이 들어가는 길입니다.
- **🧠 Obsidian이 사고의 파트너가 됩니다.** 더 이상 노트의 창고가 아니라, 여러분이 *생각*하는 것을 돕는 존재가 됩니다. 숨겨진 연결을 발견하고, 모순을 표시하고, 잊고 있던 것을 기억해줍니다.

---

## 🚀 빠른 시작

### 📦 설치

**🌟 권장 — Obsidian 커뮤니티 플러그인 마켓:**

1. Obsidian에서 **설정 → 커뮤니티 플러그인**으로 이동
2. **찾아보기**를 클릭하고 "Karpathy LLM Wiki"를 검색
3. **설치**를 클릭한 다음 **활성화**

**🌐 커뮤니티 플러그인 웹사이트에서 —** [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)에 방문하여 **Obsidian에 추가**를 클릭하면 직접 설치할 수 있습니다.

**⚙️ 수동 설치 (대안):**

1. [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)에서 `main.js`, `manifest.json`, `styles.css`를 다운로드
2. Obsidian에서 설정 → 커뮤니티 플러그인으로 이동. **설치된 플러그인** 탭에서 폴다 아이콘을 클릭하여 플러그인 디렉토리를 엽니다
3. `karpathywiki`라는 이름의 폴다를 만들고 세 파일을 넣습니다
4. Obsidian으로 돌아가 새로고침 아이콘을 클릭 — **Karpathy LLM Wiki**가 설치된 플러그인에 나타납니다
5. 켜기 토글을 눌러 활성화

**🔨 개발용:** `git clone`, `pnpm install`, `pnpm build`

### 🔄 업데이트

이 프로젝트는 빠르게 진화하며 새로운 기능, 버그 수정, 개선 사항이 자주 제공됩니다. 최신 상태를 유지하는 것을 권장합니다:

**옵션 A — 수동 업데이트 (권장):**
1. **설정 → 커뮤니티 플러그인**으로 이동
2. **업데이트 확인** 클릭
3. 목록에서 **Karpathy LLM Wiki**를 찾아 **업데이트** 클릭

**옵션 B — 자동 업데이트 활성화:**
1. **설정 → 커뮤니티 플러그인**으로 이동
2. **플러그인 자동 업데이트 확인** 켜기
3. 새 버전이 자동으로 감지됩니다. 편리한 때에 수동으로 업데이트하세요

> 💡 **왜 업데이트를 유지해야 하나요?** 각 릴리즈에는 새로운 기능, 성능 개선, 중요한 버그 수정이 포함될 수 있습니다.

### 🔑 LLM 프로바이더 설정

1. 설정 → Karpathy LLM Wiki 열기
2. 드롭다운에서 프로바이더 선택 (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter 또는 커스텀)
3. API 키 입력 (Ollama는 불필요)
4. **Fetch Models**를 클릭하여 모델 목록을 가져오거나 모델 이름을 수동 입력
5. **Test Connection** 클릭 후 **Save Settings** 저장

**🦙 Ollama (로컬, API 키 불필요):** [Ollama](https://ollama.com)를 설치하고 모델을 pull(`ollama pull gemma4` 또는 `ollama pull qwen3.5:27b`)한 다음 프로바이더 드롭다운에서 "Ollama (Local)"을 선택하세요.

**🎛️ LM Studio (로컬, API 키 불필요):** [LM Studio](https://lmstudio.ai)를 설치하고 로컬 서버(기본 `http://localhost:1234/v1`)를 시작한 다음 프로바이더 드롭다운에서 "LM Studio (Local)"을 선택하세요.

### 🎮 사용법

| 방법 | 사용법 |
|------|--------|
| **📥 단일 소스 수집** | `Cmd+P` → "Ingest single source" — 노트(Markdown 또는 **PDF, v1.25.0+**)를 선택하여 Entity와 Concept를 추출 |
| **📂 폴다에서 수집** | `Cmd+P` → "Ingest from folder" — 폴다를 선택하여 Wiki를 일괄 생성 |
| **📑 여러 파일 수집** | `Cmd+P` → "Ingest multiple files" — 재귀 폴다 트리 + 파일별 체크박스의 2패널 모달로 노트를 선택하고, 라이브 큐를 통해 일괄 수집 |
| **🎯 현재 파일 수집** | 왼쪽 리본의 `sticker` 아이콘 클릭 또는 `Cmd+P` → "Ingest current file" — 편집 중인 파일을 수집 |
| **🔍 위키 질의** | `Cmd+P` → "Query wiki" — 대화형 Q&A, 스트리밍 답변, `[[wiki-links]]` 포함 |
| **🛠️ 위키 린트** | `Cmd+P` → "Lint wiki" — 중복, 데드 링크, 빈 페이지, 고아 페이지, 누락된 alias, 모순의 전체 상태 검사 |
| **📋 인덱스 재생성** | `Cmd+P` → "Regenerate index" — `wiki/index.md`를 현재 페이지와 alias로 다시 빌드 |
| **📊 수집 기록 보기 (v1.21.0)** | `Cmd+P` → "View Ingestion History" — 과거 수집, lint 보고서, 유지보수 실행을 검색·필터링 가능한 UI에서 조회 |
| **⏹ 현재 작업 취소** | `Cmd+P` → "Cancel current ingestion" — 진행 중인 작업을 다음 배치 경계에서 깔끔하게 중지 |
| **🎉 환영 노트 다시 만들기 (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — 최초 실행 시 환영 노트를 다시 생성 |

동일한 소스를 다시 수집하면 Entity/Concept 페이지에 증분 업데이트가 적용(새 정보가 병합)되고 요약 페이지는 재생성됩니다.

> 💡 **스마트 배치 스킵:** 폴다 수집 시 플러그인이 이미 처리된 파일을 자동 감지하여 걸너뜀으로써 시간과 API 비용을 절약합니다. 배치 보고서에 걸너뜀 수가 표시됩니다.

![명령 팔레트 — "karpa" 검색으로 모든 Karpathy LLM Wiki 명령어 보기](assets/command-panel.png)

### ⚠️ 이전 버전에서 업그레이드?

> 🔧 **v1.24.x에서 업그레이드.** PDF 수집(v1.25.0)은 캐시를 `.obsidian/plugins/karpathywiki/pdf-cache/`에 작성합니다(상한 100 MB / 1000개 / 단일 10 MB; 시작 시와 배치 수집 시작 시 LRU-by-mtime으로 축출). vault는 **기본값으로 수정되지 않습니다** —— Settings → Wiki Configuration → Wiki Folder에서 **Write PDF Markdown to Vault**를 켠 경우에만 소스 PDF 옆에 `<basename>.pdf.md` 사이드카를 작성합니다. 두 개의 새 설정 — **Force PDF Support**(고급, 기본값 꺼짐)와 **Write PDF Markdown to Vault**(기본값 꺼짐) — 는 완전한 하위 호환: 이전 `data.json`에 이 필드가 없으면 `false`로 폴백합니다.

> 🔧 **v1.24.0에서 업그레이드.** 페이지의 *Mentions in Source* 섹션만 보호하던 내부 주석 마커 `<!-- reviewed: keep -->`(v1.24.0, #244)가 제거되었습니다. 정리한 Mentions 섹션을 유지하려면 페이지 frontmatter에 `reviewed: true`를 설정하세요. 전체 페이지(Mentions 포함)를 보호하며, 숨겨진 주석과 달리 속성 패널에 표시되고 Markdown 린터에서도 손상되지 않습니다.

**하위 호환됩니다.** v1.0.0 이후 파괴적 변경이 없습니다 — 기존 Wiki 페이지, 설정, 워크플로우가 재구성 없이 보존처리됩니다.

**업그레이드 후** **Lint Wiki** → **Smart Fix All**을 실행하여 원클릭 인과순서 수리를 하세요:
1. 🏷️ Alias 완성 (LLM이 번역, 약어, 대체 이름을 배치 생성)
2. 🔄 중복 병합 (교차 언어, 약어, 높은 유사도 일치)
3. 🔗 데드 링크 / 고아 페이지 연결 / 빈 페이지 확장 수정

그런 다음 **Regenerate Index**로 `wiki/index.md`를 재구축하여 모든 페이지의 alias 항목을 활성화합니다 — alias 인식 검색이 가능해집니다(예: "DSA"로 "DeepSeek-Sparse-Attention" 검색).

> 📖 특정 버전 간 업그레이드에 대한 자세한 연습(v1.20.3 slug fingerprint, v1.16.0 이중 중첩 링크 등)은 [GitHub Discussions / Upgrading](https://github.com/green-dalii/obsidian-llm-wiki/discussions)에서 관리처리됩니다.

**확인할 설정:** Force PDF Support(Settings → LLM Configuration → Advanced, 기본값 꺼짐 — 비-NATIVE 공급자에만 필요), Write PDF Markdown to Vault(Settings → Wiki Configuration → Wiki Folder, 기본값 꺼짐), Wiki Output Language(UI와 독립), Extraction Granularity(Minimal–Fine, + Custom), Page Generation Concurrency(기본값 3), Batch Delay(기본값 300ms).

---
## ⚡ v1.25.0 업데이트 하이라이트

4가지 핵심 테마: 캐시 전용 PDF 수집, 로컬 모델 가이드, PDF 트랜스크리버 프롬프트 중앙화, 8건의 e2e 버그 수정. v1.24.x 모든 사용자에게 업그레이드 권장.

- **📄 PDF 수집 (Level 1).** vault에서 PDF 한 개를 고르면 — 플러그인이 LLM 공급자의 네이티브 파일 입력(anthropic / openai / bedrock-anthropic / bedrock-openai; 그 외의 OpenAI/Anthropic 호환 엔드포인트에서는 Settings → LLM Configuration → Advanced에서 **Force PDF Support** 활성화)으로 읽어 OCR 스타일의 문자 단위 변환을 거쳐 Markdown으로 변환하고 표준 Markdown 수집 파이프라인으로 다시 진입합니다. 기존 엔티티/개념/별칭/`[[wiki-link]]` 워크플로는 모두 그대로 적용됩니다. 결과는 **콘텐츠 해시 캐시**로 `.obsidian/plugins/karpathywiki/pdf-cache/`에 저장됩니다(키에 `converterVersion`이 내장되어 프롬프트 업데이트 시 자동으로 무효화). 로컬 권장 구성은 [로컬 PDF OCR 경로](#-로컬-pdf-ocr-경로-v1250)를 참조하세요.
- **🗄️ 제한된 캐시 증가.** 3계층 방어의 캐시 관리(총 100 MB / 1000개 / 단일 10 MB 상한) + LRU-by-mtime 축출. 구 항목은 시작 시와 배치 수집 시작 시 정리됩니다. 기본값은 캐시 전용이며 vault를 수정하지 않습니다.
- **📝 선택적 vault 사이드카(고급).** Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** 켜면 변환 후 소스 PDF 옆에 `<basename>.pdf.md`를 작성합니다. 기본값은 꺼짐.
- **🦙 로컬 모델 추천.** 모델 권장 사항 섹션이 로컬과 클라우드 섹션으로 분리되어 Qwen3.5 / Qwen3.6 / Gemma 4(파라미터 vs 품질 트레이드오프, MLX vs GGUF 양자화, 컨텍스트 전략)를 다룹니다.
- **🛡️ Verbatim 트랜스크립터 프롬프트.** PDF→Markdown 프롬프트가 OCR 스타일의 문자 단위 변환으로 재구성되었으며 `[illegible]` / `[figure: ...]` / `[equation: ...]` 반환 환각 마커를 포함합니다. 출력을 ```markdown 펜스로 감싸는 소형/로컬 모델은 캐시 쓰기 전에 자동으로 정리됩니다. 프롬프트는 `src/wiki/prompts/pdf.ts`로 중앙화되어 프로젝트의 다른 LLM 호출 프롬프트와 나란히 위치합니다.
- **⏹ 취소 가능한 PDF 수집.** 변환 중 상태 표시줄을 클릭하면 Vercel AI SDK v6의 AbortSignal을 통해 진행 중인 LLM 호출이 약 200 ms 안에 중단됩니다.
- **🌐 i18n 완전성** — 두 개의 새 설정, PDF 수집, 로컬 PDF OCR 경로에 대해 각 로케일별 10개의 새 키(Force PDF Support 토글, Write PDF Markdown to Vault 토글, source-rejected-pdf-unsupported Notice).

**점검할 설정:** Force PDF Support(Settings → LLM Configuration → Advanced, 기본값 꺼짐 — 비-NATIVE 공급자에만 관련), Write PDF Markdown to Vault(Settings → Wiki Configuration → Wiki Folder, 기본값 꺼짐 — 선택적 사이드카).

## ✨ 주요 기능

### 📊 지식 품질

- **Entity/Concept 추출** — LLM이 노트에서 Entity(인물, 조직, 제품, 이벤트)와 Concept(이론, 방법, 용어)을 추출합니다. 유연한 추출 세분화（최소~5개、굵음~10、표준~50、세밀~100、사용자 정의1~500）로 분석 깊이와 API 비용의 balance
- **필수 페이지 Alias** — 생성된 각 페이지에 최소 1개의 alias(번역, 약어, 대체 이름)를 포함해 교차 언어 중복 감지를 활성화합니다
- **중복 감지 및 병합** — Semantic tiering이 실제 중복(교차 언어 번역, 약어, 철자 변형)을 포착합니다. 지능형 LLM 병합이 콘텐츠를 융합하고 alias를 보존합니다
- **스마트 지식 융합** — 다중 source 업데이트가 새 정보를 중복 없이 병합하고, 모순은 출처와 함께 보존하고, `reviewed: true` 페이지는 덮어쓰기에서 보호됩니다
- **콘텐츠 잘림 보호** — 8000 max_tokens, 자동 stop_reason 감지, 모든 provider에서 2× token 재시도
- **원문 Source 인용 보존** — 원어 인용문을 보존하고 선택적 번역으로 추적 가능성을 확보합니다

- **🎨 사용자 정의 태그 어휘 (v1.18.0).** 설정 → Wiki → 태그 어휘 모드 → *사용자 정의*로 자체 엔티티 및 개념 타입 태그 목록을 정의할 수 있습니다 (예: `Medical_Arzneimittel`, `法规`). 플러그인은 추출 프롬프트와 frontmatter 검증에서 사용자 어휘를 존중합니다; 기존 Lint 감사(#85 v7)는 활성 어휘에서 벗어난 태그가 있는 페이지를 보고합니다.

### 📄 PDF 수집 (v1.25.0)

vault에서 PDF 하나를 고르면 — 플러그인이 LLM 프로바이더의 네이티브 파일 입력으로 읽어 Markdown으로 변환하고, 표준 Markdown 수집 파이프라인으로 다시 진입합니다. 기존 엔티티/개념/별칭/`[[wiki-link]]` 워크플로는 모두 그대로 적용됩니다.

- **🔌 프로바이더 게이트** — Anthropic, OpenAI, Bedrock Anthropic, Bedrock OpenAI는 PDF를 네이티브로 처리합니다. 그 외의 OpenAI/Anthropic 호환 엔드포인트에서는 Settings → LLM Configuration → Advanced에서 **Force PDF Support**를 활성화하면 플러그인이 호출을 시도합니다(성공/실패의 판단은 엔드포인트 측에 달려 있으며, 실패 시 토글을 끄도록 안내하는 로컬라이즈된 Notice가 표시됩니다). 로컬 권장 구성은 [로컬 PDF OCR 경로](#-로컬-pdf-ocr-경로-v1250)를 참조하세요.
- **🗄️ 콘텐츠 해시 캐시** — 동일한 PDF + 동일한 모델 + 동일한 converter version은 LLM 호출 없이 캐시된 Markdown을 반환합니다. 캐시는 `.obsidian/plugins/karpathywiki/pdf-cache/`에 저장되며, 키에 `converterVersion`이 내장되어 프롬프트 업그레이드 시 자동으로 무효화됩니다.
- **📏 제한된 증가** — 3계층 방어의 캐시 관리(총 100MB / 1000개 / 단일 10MB 상한) + LRU-by-mtime 축출. 구 항목은 시작 시 및 배치 수집 시작 시 정리됩니다. 기본값은 캐시 전용이며 vault를 수정하지 않습니다.
- **📝 선택적 vault 사이드카** — Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault**를 켜면 변환 후 소스 PDF 옆에 `<basename>.pdf.md`를 작성합니다(기본값은 꺼짐, 캐시 전용).
- **🛡️ Verbatim 트랜스크립터 프롬프트** — PDF→Markdown 프롬프트는 OCR 스타일의 문자 단위 변환으로 재구성되었으며 `[illegible]` / `[figure: ...]` / `[equation: ...]` 반환 환각 마커를 포함합니다. 출력을 ```markdown 펜스로 감싸는 소형/로컬 모델은 캐시 쓰기 전에 자동으로 정리됩니다.
- **⏹ 취소 가능** — 변환 중 상태 표시줄을 클릭하면 진행 중인 LLM 호출이 중단됩니다(Vercel AI SDK v6 경유).

### 💬 조회 및 피드백

- **🔍 5단계 PPR 시드 선택 캐스케이드 (v1.24.1 PATCH)** — 멀티홉 질문을 던지면 Query Wiki는 생성을 시작하기 전에 5개의 보완적 단계를 거쳐 답변을 구성합니다:
  1. **Lex 빠른 경로** — 모든 엔티티/컨셉 제목과 별칭에 대한 직접 토큰 중복 체크(무료·즉시, 후속 단계의 게이트)
  2. **LLM 키워드 생성** — LLM이 쿼리로부터 8–12개의 다국어 키워드를 생성(동의어·약어·토큰 중복에 약한 용어 흡수)
  3. **로컬 부분 문자열 스캔** — 생성된 각 키워드를 페이지 제목·별칭·본문 스니펫에 대해 로컬에서 재매칭(추가 LLM 호출 없음, 노이즈 허용 재현율 보완)
  4. **LLM KB 폴백** — lex + 키워드 스캔의 신호가 약할 때 LLM이 top-N 후보에 대해 전체 wiki를 대상으로 한 번 의미적으로 재시드
  5. **PPR 그래프 확장** — 후보 시드 집합에서 `[[wiki-link]]` 그래프 위 Personalized PageRank(Haveliwala 2002) 실행; LLM에 그래프 인지 멀티홉 문맥을 제공(선형 검색으로는 도달 불가)

  캐스케이드는 충분한 신호를 반환한 단계에서 자동으로 잘립니다 —— 고정된 5단계 비용 없음, lex로 충분할 땐 LLM 호출 없음, LLM 보강이 필요할 땐 정밀도 손실 없음. 엔드투엔드 관련성(프로젝트 자체 벤치마크에서 PPR @5 = 27.1%)은 임베딩을 옵트인하지 않고도 순수 knn 베이스라인(24.1%)을 능가합니다. Stage 1.5(단계 2–3)는 순수 lex가 놓치는 멀티홉을 처리하고, Stage 1.7(단계 4)는 LLM 주입 키워드의 신호 부족을 복구하며, Stage 1.9(단계 5)는 LLM이 평탄한 top-N이 아닌 이웃 문맥을 보도록 보장합니다. 기존의 이진 tier 캐스케이드를 대체.

- **대화형 조회** — ChatGPT 스타일 대화, 스트리밍 Markdown 출력, `[[wiki-links]]`, 다중 턴 이력
- **🪟 우측 도킹 사이드 패널 (v1.22.1, PR #196).** Query Wiki가 중앙 팝업 대신 Copilot 스타일의 우측 사이드바 leaf(기존 leaf 재사용)에서 열립니다. `message-circle` 리본 아이콘과 `Query Wiki` 명령으로 패널 활성화/표시; 노트가 대화 옆에 계속 표시됩니다. 모든 기능은 그대로 유지됩니다.
- **조회에서 Wiki로 피드백** — 가치 있는 대화를 Wiki에 저장하고 Entity/Concept 추출 및 저장 전 semantic dedup을 수행합니다
- **중복 저장 방지** — Hash 추적이 변경되지 않은 대화의 재평가를 방지합니다

### 🛠️ 유지 관리

- **Lint 상태 검사** — 포괄적인 보고서에서 중복, dead link, 빈 페이지, orphan, 누락된 alias, 모순을 감지합니다
- **Semantic-Tier 중복 감지** — Tier 1(직접 이름 일치: 교차 언어, 약어, 높은 유사도 제목)은 항상 검증됩니다. Tier 2(간접 신호: 공유 링크, 중간 유사도)은 token 예산을 채웁니다
- **스마트 일괄 수정** — 인과 관계 순서로 배치 수정: alias 완성 → 중복 병합 → dead link 해결 → orphan 연결 → 빈 페이지 확장
- **Alias 완성** — 누락된 alias의 일괄 병렬 생성을 원클릭으로 수행해 향후 중복 감지를 개선합니다
- **자동 유지 관리** — Startup Quick Fixes 기본 ON(시작 시 1회 건강 검사), 다중 폴다 파일 감시와 주기적 lint는 기본 OFF(필요 시 활성화)
- **모순 상태 머신** — `detected → review_ok → resolved`(AI 수정) 또는 `detected → pending_fix`(수동)
- **사전 수집 검사 게이트 (v1.21.0)** — 모든 LLM 호출 전에 소스 파일을 검증합니다: 빈/공백/frontmatter 전용 노트는 거부되며, 콘텐츠 해시 중복 제거로 경로 간 동일 파일을 감지합니다. 로컬 모델이 빈 입력에서 엔티티 이름을 만들어내는 것을 방지.
- **작업 이력 패널 (v1.21.0)** — 과거 인게스트, lint 보고서, 유지보수 실행을 검색·필터링 가능한 UI로 확인. 인사이트 기반 KPI 카드와 클릭 가능한 페이지 링크 제공.
- **불완전 페이지 정리 (v1.21.0)** — 중단된 인게스트로 남은 불완전 페이지를 시작 시 자동 보관 처리(Obsidian의 `.trash`에서 복구 가능).

### 🌐 LLM 및 언어

- **다중 Provider 지원** — Anthropic, Anthropic Compatible(Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, custom endpoint
- **5xx 자동 재시도** — 모든 클라이언트에서 HTTP 5xx/429/529 오류 시 지수 백오프 재시도(최대 2회)
- **동적 모델 목록** — Provider API에서 실시간 가져오기
- **Wiki 출력 언어** — 인터페이스와 독립적인 10개 언어(English / 简体中文 / 繁體中文 / 日本語 / 한국어 / Deutsch / Français / Español / Português / Italiano), custom 입력 지원
- **🌍 전면 UI 국제화** — 플러그인 UI 10개 언어 지원(EN/ZH/ZH-Hant/JA/KO/DE/FR/ES/PT/IT), 277+ UI 필드 완전 번역, 자연스러운 로컬 표현
- **⚡ Rate Limit Guardian** — 병렬 생성에서 rate limit 발생 시 자동 감지 및 제안: 동시성 낮춤, 배치 지연 증가, Provider 변경
- **🦙 Web Clipper Compatible** — Obsidian Web Clipper의 `Clippings/` 폴다를 1클릭으로 감시 목록에 추가, 웹 클립 자동 Wiki화

### 🏗️ 아키텍처 및 성능

- **🕸️ PPR over [[wiki-link]] 그래프 (v1.24.0+, v1.24.1 PATCH에서 성숙)** — Personalized PageRank(Haveliwala 2002)는 wiki 페이지 간 `[[wiki-link]]` 엣지로 구성된 유향 그래프 위에서 동작; 캐스케이드는 PPR 시드를 top-N 후보 집합에 고정하며, 멀티홉 문맥은 최대 3개의 확장 링을 따라 전달됩니다. 이것이 Query Wiki 답변에 그래프 인지 능력을 부여하는 메커니즘입니다("Microsoft 창업자" 질문이 Bill Gates → Microsoft → 경쟁사를 거쳐 해결되며, 단순한 표제어 일치에 그치지 않음). 2,137 페이지의 vault에서도 일반적으로 warm + 3홉 확장이 < 100 ms에 완료되어 vault 크기와 무관합니다. 조회 및 피드백 섹션의 4단계 시드 캐스케이드 전부에서 사용되며, lint 중복 감지(간접 링크로 두 후보 페이지가 연결될 때)에서도 사용됩니다.
- **병렬 페이지 생성** — 구성 가능한 1–5개 동시 페이지, 기본값 3(병렬), 큰 source에서 2–3× 속도 향상, 페이지별 오류 격리
- **반복적 배치 추출** — 적응형 배치 크기, 긴 문서의 max_tokens 병목을 해소합니다
- **3계층 아키텍처** — vault의 노트(읽기 전용) → `wiki/`(LLM 생성 페이지, `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`로 구성) → `schema/`(공동 진화 구성)
- **모듈형 코드베이스** — `src/`의 20+개 초점 모듈

### 🔒 개인정보 보호 및 보안

- **백엔드 없음, 원격 측정 없음.** 플러그인은 완전히 Obsidian 내부에서 실행됩니다——외부 서버, 분석, 데이터 수집이 전혀 없습니다. LLM 제공자를 명시적으로 설정하지 않는 한 노트가 Vault를 떠나지 않습니다.
- **데이터는 기본적으로 로컬에 유지됩니다.** 플러그인은 선택한 LLM API 이외의 장소에 콘텐츠를 저장, 캐시 또는 전송하지 않습니다. 수집 또는 쿼리를 위해 보내는 텍스트만 기기를 떠납니다——그것도 설정한 제공자에게만.
- **Ollama, LM Studio 또는 로컬 제공자를 통한 완전 로컬 모드.** 완전한 데이터 주권을 위해 로컬에서 실행되는 LLM을 사용하세요. 노트는 완전히 귀하의 기기에서 처리됩니다——인터넷에 연결되지 않습니다.
- **최소한의 권한.** Vault 파일 접근은 Wiki 관리에 필요합니다(노트 읽기, 페이지 생성, 데드 링크 감지). 네트워크 접근은 설정한 제공자와의 LLM API 호출에만 사용됩니다. 클립보드 접근은 Query 모달의 "복사" 버튼으로 제한됩니다——클릭할 때만입니다.

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

**출력 — Concept 페이지:** `wiki/concepts/supervised-learning.md`

```markdown
---
type: concept
created: 2025-12-01
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

### ☁️ 클라우드 모델 추천

| 등급 | 모델 | 컨텍스트 창 | 이유 |
|------|------|-------------|------|
| **🌟 가성비 최고** | **DeepSeek V4-Flash** | 1M tokens | 최저가($0.14/M), 284B MoE, 배치 처리에 최적 |
| **🌟 가성비 최고** | **Gemini-3.5-Flash** | 1M tokens | GPT-5.5보다 4배 빠른 출력, 에이전트 작업 우수 |
| **🌟 가성비 최고** | **Qwen3.6-Plus** | 1M tokens | 코딩 및 에이전트 능력 강력, 경쟁력 있는 가격 |
| **🌟 가성비 최고** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **균형형** | **Claude Sonnet 4.6** | 1M tokens | 품질과 비용의 좋은 균형, $3/$15 per 1M tokens |
| **경량형** | **Claude Haiku 4.5** | 200K tokens | 고속 경제, 소형 Wiki에 적합 |
| **경제형** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE, 2026-04 MIT 오픈소스, Agent·멀티모달 |
| **플래그십형** | Claude Opus 4.7 | 1M tokens | 최고 품질, 비용 높음 — 선택적으로 사용 |
| **플래그십형** | GPT-5.5 | 1M tokens | 최고 수준 추론, 비용 높음 — 선택적으로 사용 |

### 🦙 로컬 모델 추천 (Ollama / LM Studio)

로컬 추론의 최대 강점은 데이터 주권, 오프라인 사용, API 비용 제로입니다. 반면 컨텍스트 창이 작고(대부분 8K–128K, 최근 오픈웨이트는 262K까지 도달) 플래그십 클라우드 모델 대비 명령 수행력도 떨어집니다. **하드웨어 예산에 맞춰 선택하세요:** 파라미터 수가 클수록 세계 지식과 명령 수행이 강해지고(추출 품질이 올라가고 환각이 줄어듦), 작을수록 속도와 VRAM 여유는 늘어나는 대신 환각과 장문 컨텍스트 추론이 약해집니다. 24GB Apple Silicon 또는 단일 소비자 GPU의 스윗 스팟은 27B–35B-A3B 클래스입니다.

| 모델 | 파라미터 | 컨텍스트 | 이유 |
|------|----------|----------|------|
| **Qwen3.5 27B** | 27B dense | 262K | 수집 용도에서 품질과 크기의 최优 균형; MLX 4-bit로 24GB에 수용 가능 |
| **Qwen3.5 35B-A3B** | 35B 총 / 3B 활성 MoE | 262K | 27B dense보다 빠르면서 동등한 품질; VRAM 절약에 이상적 |
| **Qwen3.5 122B-A10B** | 122B / 10B MoE | 262K | 품질 상한; ≥48GB VRAM 또는 듀얼 GPU 필요 |
| **Qwen3.6 27B** | 27B dense | 256K+ | 2026-04 Qwen3.5 27B 리프레시, 하드웨어가 받쳐주면 우선 선택 |
| **Qwen3.6 35B-A3B** | 35B / 3B MoE | 262K | Qwen3.5 35B-A3B와 동일한 트레이드오프, 더 새로운 가중치 |
| **Gemma 4 31B IT** | 31B dense | 262K | 명령 수행 강하고 Markdown 출력이 깔끔 |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | 31B dense 대비 VRAM 절약, 동등한 품질 |
| **Gemma 4 E2B / E4B IT** | 2B / 4B | 131K | 순수 CPU 실행 가능; 소형 Wiki 또는 빠른 미리보기 전용 |

**양자화 가이드:** Apple Silicon에서 MLX 4-bit는 동일 실효 비트레이트의 GGUF Q4_K_M 대비 보통 1.5–2배 빠릅니다. GGUF Q4_K_M은 크로스 플랫폼 기본 선택. VRAM 여유가 있고 Q4에서 품질 열화가 보일 때만 Q5/Q8을 고려하세요.

**컨텍스트 전략:** Wiki가 약 500페이지를 넘으면 262K 로컬 모델도 Query 엔진이 구성하는 대부분의 컨텍스트를 커버할 수 있지만, 2000페이지 vault 수집에는 부족합니다. 일반적인 조합은 "수집은 클라우드, 조회는 로컬". 완전 로컬을 고수한다면 27B/35B-A3B 클래스가 스윗 스팟입니다.

### 📄 로컬 PDF OCR 경로 (v1.25.0+)

v1.25.0 PDF 수집은 PDF를 파일 파트로 받는 모든 프로바이더에서 동작합니다. Apple Silicon(oMLX가 현재 지원하는 유일한 플랫폼)에서 완전 로컬 파이프라인을 구성할 때의 권장 설정은 다음과 같습니다:

1. [oMLX](https://github.com/jundot/omlx)를 설치하고 내장 **Markitdown** 백엔드(로컬 PDF→Markdown 변환)를 활성화합니다.
2. **Baidu Unlimited-OCR**(2026-06-22 오픈소스, 3B 총 / 0.5B 활성, 엔드투엔드 OCR로 긴 문서에서 "생성할수록 느려지는" 구 모델의 문제를 해결)을 oMLX의 비전 모델로 로드합니다.
3. 본 플러그인 측: 프로바이더를 **Custom OpenAI-Compatible**로 설정하고(oMLX는 OpenAI 호환 프로토콜 사용) Base URL을 oMLX 로컬 서버로 지정합니다. Settings → LLM Configuration → Advanced에서 **Force PDF Support**를 켜고, 수집 요약에는 oMLX가 제공하는 멀티모달 모델을 선택합니다.

PDF는 사용자의 기기를 떠나지 않습니다 — Markitdown이 구조 변환을, Unlimited-OCR이 시각 인식을, 로컬 LLM이 요약을 담당합니다. 플러그인의 캐시(`.obsidian/plugins/karpathywiki/pdf-cache/`)가 재수집을 즉시 처리합니다.

**대안:** oMLX/Markitdown을 사용할 수 없는 경우(Linux/Windows 또는 구형 Mac)에는 **Force PDF Support**를 PDF 파일 파트를 받는 로컬 멀티모달 LLM으로 직접 지정하세요. 모델이 충분히 크면 품질이 좋지만, VRAM 요구량이 페이지 수에 따라 급격히 증가합니다.

**🔌 Anthropic Compatible(Coding Plan):** Provider가 Anthropic 호환 API 엔드포인트를 제공하는 경우, "Anthropic Compatible"을 선택하고 Provider의 Base URL과 API Key를 입력하세요.

**🦙 Ollama (로컬, API 키 불필요):** [Ollama](https://ollama.com)를 설치하고 모델을 pull(`ollama pull gemma4` 또는 `ollama pull qwen3.5:27b`)한 다음 Provider 드롭다운에서 "Ollama (Local)"을 선택하세요.

**🎛️ LM Studio (로컬, API 키 불필요):** [LM Studio](https://lmstudio.ai)를 설치하고 로컬 서버(기본 `http://localhost:1234/v1`)를 시작한 다음 Provider 드롭다운에서 "LM Studio (Local)"을 선택하세요. LM Studio는 OpenAI 호환 서버를 내장하고 있어 API 키 필드는 선택사항입니다.

> 💡 **구독 플랜:** Coding Plan, OpenAI Pro, Anthropic Pro 등의 구독 플랜은 빈번한 사용 시 비용 관리에 탁월한 선택입니다. 본 플러그인은 이러한 서비스들을 지원합니다.

---

## 🏗️ 아키텍처

Karpathy의 3계층 분리 설계를 기반으로 합니다:

```
📄 vault의 노트(임의 폴다)         # 📖 사용자가 수집할 노트를 선택
  ↓ ingest
wiki/                                # 🧠 LLM 생성 Wiki 페이지 (wiki/sources/, wiki/entities/, wiki/concepts/ 구성)
  ↓ query / maintain
schema/                              # 📋 Wiki 구성 설정(명명 규칙, 페이지 템플릿, 분류 규칙)
```

> 📖 전체 코드 구조는 [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure) 참조.

**생성된 페이지:**
- `wiki/sources/filename.md` — 📄 Source 요약
- `wiki/entities/entity-name.md` — 👤 Entity 페이지(인물, 조직, 프로젝트 등)
- `wiki/concepts/concept-name.md` — 💡 Concept 페이지(이론, 방법, 용어 등)
- `wiki/index.md` — 📑 자동 생성 인덱스
- `wiki/log.md` — 📝 작업 로그

---

## ❓ FAQ

> **플러그인을 최신 상태로 유지하세요.** 새로운 기능과 수정 사항이 자주 릴리스됩니다. **설정 → 커뮤니티 플러그인 → 업데이트 확인**을 정기적으로 실행하세요.
>
> 📖 더 많은 FAQ는 [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28)에서 확인하세요.

**이 플러그인은 실제로 무엇을 하나요?**
vault의 아무 노트, 폴다, 다중 선택을 선택하면 LLM이 Entity와 Concept을 추출하고 `[[양방향 링크]]`로 연결된 Wiki를 생성합니다. 질문하면 *당신의 노트*를 기반으로 한 대화형 답변을 받습니다 — 인터넷 검색이 아닙니다. 생성된 요약은 `wiki/sources/`, Entity는 `wiki/entities/`, Concept은 `wiki/concepts/`에 배치되며, 원본 vault 노트는 전혀 변경되지 않습니다.

**데이터가 제3자에게 전송되나요?**
🔒 **개인정보 최우선.** 백엔드 없음, 추적 없음, 분석 없음 — 플러그인은 완전히 Obsidian 내부에서 실행됩니다. 수집/조회를 위해 명시적으로 전송한 텍스트만 기기를 떠나며, 설정한 LLM 제공자에게만 전송됩니다. 완전한 데이터 로컬리티를 원하면 로컬 제공자(Ollama 또는 LM Studio, API 키 불필요)를 사용하세요 — 데이터는 인터넷에 접촉하지 않습니다.

**RAG 챗봇과의 차이점은 무엇인가요?**
청크화된 RAG가 컨텍스트를 단편화하는 것과 달리, LLM-Wiki는 기존의 `[[wiki-link]]` 그래프 위에서 **Personalized PageRank** 엔진을 실행 — 링크 구조로 관련 페이지를 찾습니다. 이는 임베딩 비용 ゼ로, 새로운 의존성 없음, 로컬 및 오프라인 모델 완전 지원을 의미합니다.

**어떤 LLM을 사용해야 하나요?**
긴 컨텍스트 창(≥200K 토큰)의 모델이 가장 적합합니다. 가성비 우선: DeepSeek V4-Flash($0.14/M), Gemini 3.5 Flash, Qwen3.6-Plus. Ollama/LM Studio의 로컬 모델은 조회에 사용할 수 있지만 컨텍스트 창이 작습니다(8K–128K). 자세한 내용은 [모델 권장 사항](#-모델-권장-사항)을 참조하세요.

**시작 방법은?**
Obsidian 커뮤니티 플러그인에서 설치 → LLM 제공자 선택 → **Test Connection** → vault의 아무 노트에 대해 **Ingest single source**(또는 **Ingest from folder**) 실행 → 몇 초 안에 첫 Wiki 페이지가 생성됩니다. 자세한 내용은 위의 [빠른 시작](#-빠른-시작)을 참조하세요.

**API 비용을 어떻게 관리할 수 있나요?**
배치 수집에는 거친/최소 추출 세분화를 사용(LLM 호출 감소). 스마트 배치 스킵이 이미 수집된 파일을 자동 감지합니다. 자동 유지보리는 기본적으로 OFF(필요한 경우에만 활성화). Lint는 실행 전 건수를 표시 — 승인 없이는 과금되지 않습니다.

**기존 Wiki는 안전한가요?**
✅ v1.0.0 이후 하위 호환성이 있습니다. 덮어쓰기로부터 보호하려면 원하는 페이지에 `reviewed: true`를 설정하세요. 플러그인은 원본 vault 노트를 절대 수정하지 않습니다 — `wiki/` 폴다 안에 새 페이지를 생성할 뿐입니다.

**내 언어로 사용할 수 있나요?**
🌐 UI와 Wiki 출력 모두 **10개 언어** 지원: English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. UI 언어와 Wiki 언어는 독립 — 인터페이스는 영어로 유지하면서 Wiki를 한국어로 출력할 수 있습니다. 11번째 언어는 기여자 주도(Italian PR #159 패턴을 따르세요).

**필요한 최소 설정은?**
Obsidian v1.11.0+(데스크톱: Windows/macOS/Linux). LLM 제공자 API 키(또는 로컬 Ollama/LM Studio, API 키 불필요). 플러그인의 **llmReady 가드**는 코어 기능 잠금 해제를 위해 성공적인 연결 테스트를 요구 — 이는 잘못 구성된 제공자의 조용한 실패를 방지합니다.

**실행 중인 작업을 취소하려면?**
상태 표시줄 텍스트("수집 중… 클릭하여 취소" 표시)를 클릭하거나 `Cmd+P` → "Cancel current ingestion"을 실행합니다. 다음 배치 경계에서 깔끔하게 중지하고 완료된 작업은 보존합니다.

**도움은 어디서 받나요?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — 버그 신고
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — 질문, 기능 요청, 업그레이드 도움말
- 개발자 콘솔(`Ctrl+Shift+I` / `Cmd+Option+I`) — 모듈 이름 접두사가 있는 로그를 복사하여 더 빠른 진단

## 🔒 투명성 및 규정 준수

이 플러그인은 Obsidian 커뮤니티 플러그인 마켓에 등록되어 있으며 보안 및 권한에 대한 자동 검토를 받습니다.

**이 플러그인에는 백엔드도, 서버 인프라도, 어떠한 데이터 수집도 없습니다.** Obsidian 내에서 실행되는 순수한 로컬 소프트웨어입니다. 플러그인은 어떤 방식으로도 데이터를 수집, 저장, 전송할 수 없습니다——그러한 서버가 존재하지 않기 때문입니다.

**네트워크 접근**은 설정한 LLM 제공자와의 통신에만 사용되며, 다른 네트워크 호출은 이루어지지 않습니다. 이는 완전히 귀하의 통제 하에 있습니다: 제공자를 선택하고, API 키를 입력하고, 데이터를 어디로 보낼지 결정하는 것은 귀하입니다.

**파일 시스템 접근**（Vault 열거）은 Wiki 구축 및 유지 관리에 필요합니다: 소스 노트 읽기, 페이지 생성, 데드 링크 스캔, 중복 페이지 감지. 플러그인은 소스 파일을 절대 수정하지 않습니다——wiki 폴다 내의 파일만.

**클립보드 접근**은 Query 모달의 "복사" 버튼에만 사용되며, 클릭할 때만입니다.

완전한 데이터 로컬리티를 원하시면 Ollama나 LM Studio와 같은 로컬 LLM 제공자를 사용하세요. 로컬 제공자를 사용하면 데이터가 기기를 떠나지 않습니다.

## 💖 프로젝트 지원하기

LLM-Wiki가 지식 워크플로의 중요한 부분이 되었다면, 지속적인 개발을 다음과 같이 지원할 수 있습니다:

- ☕ **[Ko-fi에서 커피 한 잔 사기](https://ko-fi.com/greenerdalii)** — Ko-fi를 통한 일회성 또는 월간 지원
- 💳 **[PayPal로 팁 보내기](https://paypal.me/greenerdalii)** — PayPal을 통한 일회성 팁

후원은 전적으로 자발적입니다. 플러그인은 Apache-2.0 라이선스로 유지되며 기능이 완전한 상태를 유지합니다.

### 후원자

다음 분들께 프로젝트 지원을 감사드립니다:

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 라이선스

Apache License, Version 2.0 — [LICENSE](LICENSE) 및 [NOTICE](NOTICE)를 참조하세요.

## 🙏 감사의 말

- **💡 개념:** [Andrej Karpathy의 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 이 플러그인에 영감을 준 원본 비전
- **🛠️ 플랫폼:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM transport:** [Vercel AI SDK v6](https://ai-sdk.dev/)(`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)


---

**공식 사이트:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)

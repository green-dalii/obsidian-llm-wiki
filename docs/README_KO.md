![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki — Obsidian 플러그인

> [Andrej Karpathy의 LLM Wiki 개념](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을 기반으로 한 지식베이스 생성 시스템. 노트에서 Entity와 Concept을 자동 추출해 연결된 Wiki 페이지를 구축합니다.

**작성자:** Greener-Dalii | **버전:** 1.7.20

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[공식 사이트](https://llmwiki.greenerai.top/) | [Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## LLM-Wiki란?

작성은 당신이, 정리는 AI가, 질문은 다시 당신이. 이것이 전부입니다.

**문제.** 노트는 인물, 개념, 아이디어, 연결고리의 금광입니다. 하지만 현재는 단지 폴더 안의 파일일 뿐입니다. 무엇이 무엇과 연결되는지 찾기 위해선 검색과 태깅, 그리고 기억에 의존해야 합니다.

**해결책.** [Andrej Karpathy가 제안한](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 우아한 방식: 노트를 원재료로 취급하고 LLM이 설계를 담당합니다. LLM이 작성 내용을 읽고 Entity와 Concept을 추출하여 구조화된 Wiki를 구축합니다 — `[[bidirectional links]]`, 자동 생성 인덱스, 그리고 지식베이스에 질문할 수 있는 채팅 인터페이스를 포함합니다.

**당신은 더 이상 사서가 아닙니다.** 어떤 내용을 페이지로 만들지 결정할 필요도, 교차 링크를 유지할 필요도, 정보가 오래되었는지 걱정할 필요도 없습니다. 노트를 `sources/`에 넣으면 LLM이 읽고, 추출하고, 작성하고, 연결하며, 심지어 모순까지 표시합니다 — 당신은 몰입을 유지하면서 작업을 계속합니다.

**그리고 이것은 또 다른 챗봇이 아닙니다.** ChatGPT는 인터넷을 알고 있습니다. LLM-Wiki는 *당신*을 압니다 — 정확히 말하자면 당신이 가르친 내용을 압니다. 모든 답변은 `[[wiki-links]]`를 통해 지식 그래프로 연결됩니다. 모든 응답은 끝이 아닌 탐색의 시작점입니다.

---

## Obsidian + LLM-Wiki를 선택하는 이유

Obsidian은 연결된 사고(Linked Thinking)에 탁월합니다. 하지만 한 가지 문제가 있습니다: 연결하는 사람은 항상 당신이어야 합니다.

LLM-Wiki는 이 관계를 뒤집습니다. 그래프를 수동으로 구축하는 대신 AI가 노트와 함께 성장합니다. 새로운 개념에 대한 노트를 추가하면 — 당신이 놓칠 수 있는 연결을 찾아냅니다. 질문을 하면 — 당신의 지식 그래프를 탐색하고 인용과 함께 답변을 가져옵니다.

- **Graph View가 활성화됩니다.** 새 노트는 그냥 놓여 있지 않습니다 — Entity, Concept, Source로 링크가 생성됩니다. 그래프는 유기적으로 성장하고 플러그인이 유지 관리합니다: 중복 감지, dead link 수정, alias를 통한 언어 연결.
- **노트가 응답하기 시작합니다.** 검색이 대화가 됩니다. "X에 대해 무엇을 썼었나?"가 대화가 되며, 스트리밍 응답과 `[[wiki-links]]`가 breadcrumb이 됩니다. 모든 답변은 당신의 지식으로 더 깊이 들어가는 경로입니다.
- **Obsidian이 사고의 파트너가 됩니다.** 노트를 보관하는 캐비닛이 아니라 *생각*을 돕는 도구가 됩니다 — 숨겨진 연결을 표면화하고, 모순을 표시하고, 잊고 있던 것을 기억해냅니다.

---

## 빠른 시작

### 설치

**권장 방법 — Obsidian Community Plugin Market:**

1. Obsidian에서 **설정 → Community plugins**로 이동합니다
2. **Browse**를 클릭하고 "Karpathy LLM Wiki"를 검색합니다
3. **Install**을 클릭한 후 **Enable**을 클릭합니다

**또는 Community Plugin 웹사이트에서 —** [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki)를 방문하고 **Add to Obsidian**을 클릭해 직접 설치합니다.

**수동 설치 (대안):**

1. [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)에서 `main.js`, `manifest.json`, `styles.css`를 다운로드합니다
2. Obsidian에서 설정 → Community plugins로 이동합니다. **Installed plugins** 탭에서 폴더 아이콘을 클릭해 plugins 디렉터리를 엽니다
3. `karpathywiki` 폴더를 생성하고 세 개의 파일을 안에 넣습니다
4. Obsidian으로 돌아가 새로고침 아이콘을 클릭합니다 — **Karpathy LLM Wiki**가 Installed plugins에 표시됩니다
5. 토글을 켜서 활성화합니다

**개발:** `git clone`, `pnpm install`, `pnpm build`.

### LLM Provider 설정

1. 설정 → Karpathy LLM Wiki를 엽니다
2. 드롭다운에서 provider를 선택합니다(Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter 또는 custom)
3. API key를 입력합니다(Ollama는 필요 없음)
4. **Fetch Models**를 클릭해 model 드롭다운을 채우거나, model 이름을 수동으로 입력합니다
5. **Test Connection**을 클릭한 후 **Save Settings**를 클릭합니다

**Ollama (로컬, API key 없음):** [Ollama](https://ollama.com)를 설치하고 model을 pull합니다(`ollama pull gemma4`), provider 드롭다운에서 "Ollama (Local)"을 선택합니다.

### 사용법

| 방법 | 방법 |
|------|------|
| **`sources/`에서 수집** | `Cmd+P` → "Ingest Sources" — `sources/` 폴더 전체를 처리합니다 |
| **임의 폴더에서 수집** | `Cmd+P` → "Ingest from Folder" — 폴더를 선택하고 기존 노트에서 Wiki를 생성합니다 |
| **Wiki 조회** | `Cmd+P` → "Query Wiki" — 질문하고 `[[wiki-links]]`가 포함된 스트리밍 답변을 받습니다 |
| **Wiki Lint** | `Cmd+P` → "Lint Wiki" — 중복 감지, dead link, orphan이 포함된 상태 검사를 수행합니다 |

동일한 source를 다시 수집하면 Entity/Concept 페이지에 incremental update가 적용됩니다(새 정보가 병합됨). Summary 페이지는 다시 생성됩니다.

**스마트 배치 스킵:** 폴더 수집 시 플러그인은 이미 처리된 파일을 자동으로 감지하고 스킵하여 시간과 API 비용을 절약합니다. 배치 보고서에 스킵된 횟수가 표시됩니다.

### 이전 버전에서 업그레이드하시나요?

**v1.7.11 이전** 버전(또는 그보다 훨씬 이전 버전)에서 업그레이드하는 경우, 기존 Wiki 페이지에는 여러 릴리스에 걸쳐 추가된 기능들이 누락되어 있습니다. 업그레이드 후 아래 단계를 따라 Wiki를 최신 상태로 업데이트하세요.

**1. 인덱스 재빌드**
`Cmd+P` → **"Regenerate index"** — 모든 페이지의 Alias 항목을 포함하여 `wiki/index.md`를 다시 빌드합니다. Alias 기반 검색이 활성화됩니다(예: "DSA" 검색으로 "DeepSeek-Sparse-Attention"을 찾을 수 있음). 기존 인덱스 형식은 페이지 제목만 나열했습니다.

**2. Lint Wiki 실행**
`Cmd+P` → **"Lint Wiki"** — 전체 Wiki를 스캔하여 다음을 표시합니다:
- **누락된 Alias**: Alias가 없는 페이지(모든 v1.7.11 이전 페이지). **"Complete Aliases"** 버튼을 클릭하면 LLM이 번역, 약어, 대체 이름을 일괄 생성합니다. 이는 중복 감지에 매우 중요합니다.
- **중복 페이지**: 콘텐츠가 중복되는 페이지(예: Alias 인식 중복 감지가 없던 이전 버전에서 생성된 "CoT"와 "사고사슬"). **"Merge Duplicates"** 버튼을 클릭하면 융합하고 모든 Alias를 보존합니다.
- **Dead link / 빈 페이지 / Orphan**: 표준 Wiki 유지보수 항목입니다.

**3. Smart Fix All 사용**
Lint 보고서에서 **"Smart Fix All"** 버튼을 클릭하면 인과 관계 순서로 원클릭 수정이 실행됩니다: Alias 완성 → 중복 병합 → Dead link 수정 → Orphan 연결 → 빈 페이지 확장. 여러 버전에 걸쳐 구축된 Wiki를 정리하는 가장 빠른 방법입니다.

**4. 병렬 페이지 생성 활성화**
설정 → **Ingestion Acceleration**:
- **Page Generation Concurrency**: 대부분의 Provider에서 3으로 설정(v1.7.3 이전에는 기본값이 1/직렬이었음). Entity가 10개 이상인 Source에서 수집 속도가 2~3배 빨라집니다.
- **Batch Delay**: 300ms부터 시작. Rate limit이 발생하면 500~800ms로 늘리세요.

**5. 새로운 설정 검토 (v1.4.0~v1.7.x에 추가됨):**
- **Wiki Output Language** (v1.6.5): UI 언어와 독립적 — Wiki는 한국어로, 플러그인 UI는 영어로 설정할 수 있으며 그 반대도 가능합니다.
- **Extraction Granularity** (v1.6.2): Fine/Standard/Coarse는 LLM이 Source에서 Entity를 얼마나 깊이 추출할지 제어합니다. "Standard"가 좋은 기본값입니다.
- **Auto-Maintenance** (v1.4.0): 선택적 파일 감시, 주기적 Lint, 시작 시 상태 검사. 모두 기본 OFF — 자동 백그라운드 처리가 필요할 때만 활성화하세요.

> **안전:** 병렬 생성은 `Promise.allSettled`를 사용합니다 — 한 페이지가 실패하면 다른 페이지는 계속됩니다. 실패한 페이지는 지수 백오프와 함께 개별적으로 재시도됩니다. Smart Batch Skip(v1.7.7)은 이미 처리된 파일을 자동으로 감지하여 시간과 API 비용을 절약합니다.

---

## 주요 기능

### 지식 품질

- **Entity/Concept 추출** — LLM이 노트에서 Entity(인물, 조직, 제품, 이벤트)와 Concept(이론, 방법, 용어)을 추출합니다
- **필수 페이지 Alias** — 생성된 각 페이지에 최소 1개의 alias(번역, 약어, 대체 이름)를 포함해 교차 언어 중복 감지를 활성화합니다
- **중복 감지 및 병합** — Semantic tiering이 실제 중복(교차 언어 번역, 약어, 철자 변형)을 포착합니다. 지능형 LLM 병합이 콘텐츠를 융합하고 alias를 보존합니다
- **스마트 지식 융합** — 다중 source 업데이트가 새 정보를 중복 없이 병합하고, 모순은 출처와 함께 보존하고, `reviewed: true` 페이지는 덮어쓰기에서 보호됩니다
- **콘텐츠 잘림 보호** — 8000 max_tokens, 자동 stop_reason 감지, 모든 provider에서 2× token 재시도
- **원문 Source 인용 보존** — 원어 인용문을 보존하고 선택적 번역으로 추적 가능성을 확보합니다

### 유지 관리

- **Lint 상태 검사** — 포괄적인 보고서에서 중복, dead link, 빈 페이지, orphan, 누락된 alias, 모순을 감지합니다
- **Semantic-Tier 중복 감지** — Tier 1(직접 이름 일치: 교차 언어, 약어, 높은 유사도 제목)은 항상 검증됩니다. Tier 2(간접 신호: 공유 링크, 중간 유사도)은 token 예산을 채웁니다
- **스마트 일괄 수정** — 인과 관계 순서로 배치 수정: 중복 병합 → dead link 해결 → orphan 연결 → 빈 페이지 확장
- **Alias 완성** — 누락된 alias의 일괄 병렬 생성을 원클릭으로 수행해 향후 중복 감지를 개선합니다
- **자동 유지 관리** — 다중 폴더 파일 감시, 주기적 lint, 시작 시 상태 검사(모두 선택적)
- **모순 상태 머신** — `detected → review_ok → resolved`(AI 수정) 또는 `detected → pending_fix`(수동)

### 조회 및 피드백

- **대화형 조회** — ChatGPT 스타일 대화, 스트리밍 Markdown 출력, `[[wiki-links]]`, 다중 턴 이력
- **조회에서 Wiki로 피드백** — 가치 있는 대화를 Wiki에 저장하고 Entity/Concept 추출 및 저장 전 semantic dedup을 수행합니다
- **중복 저장 방지** — Hash 추적이 변경되지 않은 대화의 재평가를 방지합니다

### LLM 및 언어

- **다중 Provider 지원** — Anthropic, Anthropic Compatible(Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, custom endpoint
- **5xx 자동 재시도** — 모든 클라이언트에서 HTTP 5xx/429 오류 시 지수 백오프 재시도(최대 2회)
- **동적 모델 목록** — Provider API에서 실시간 가져오기
- **Wiki 출력 언어** — 인터페이스와 독립적인 8개 언어(영어/중국어/일본어/한국어/독일어/프랑스어/스페인어/포르투갈어), custom 입력 지원
- **국제화** — 영어/중국어 인터페이스 토글(기본값 영어), 모든 프롬프트가 언어 설정을 따릅니다

### 아키텍처 및 성능

- **병렬 페이지 생성** — 구성 가능한 1–5개 동시 페이지, 큰 source에서 3× 속도 향상, 페이지별 오류 격리
- **반복적 배치 추출** — 적응형 배치 크기, 긴 문서의 max_tokens 병목을 해소합니다
- **3계층 아키텍처** — `sources/`(읽기 전용) → `wiki/`(LLM 생성) → `schema/`(공동 진화 구성)
- **모듈형 코드베이스** — `src/`의 13개 초점 모듈

---

## 명령어

| 명령어 | 설명 |
|--------|------|
| **Ingest single source** | 단일 노트를 선택 → Entity, Concept, 요약을 포함하는 Wiki 페이지를 생성합니다 |
| **Ingest from folder** | 임의 폴더를 선택 → 기존 노트에서 Wiki를 일괄 생성합니다 |
| **Query wiki** | 대화형 Q&A, 스트리밍 출력과 `[[wiki-links]]`를 포함합니다 |
| **Lint wiki** | 전체 상태 검사: 중복, dead link, 빈 페이지, orphan, 누락된 alias, 모순 |
| **Regenerate index** | `wiki/index.md`를 수동으로 다시 빌드합니다 |
| **Suggest schema updates** | LLM이 Wiki를 분석하고 Schema 개선을 제안합니다 |

---

## 모델 권장 사항

이 플러그인은 Karpathy의 핵심 철학을 따릅니다: **전체 Wiki 컨텍스트를 직접 LLM에 제공하고 RAG 검색으로 단편화하지 않음**. 긴 컨텍스트 창을 가진 모델을 강력히 권장합니다 — Wiki가 커질수록 LLM이 교차 페이지 일관성을 유지하는 데 더 많은 컨텍스트가 필요합니다.

> 왜 RAG를 사용하지 않나요? Karpathy는 [원 개념](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)에서 RAG가 지식을 단편화하고 완전한 지식 그래프에서 LLM의 추론 능력을 저해한다고 지적했습니다.

**상위 권장:**

| 모델 | 컨텍스트 창 | 이유 |
|------|-------------|------|
| **DeepSeek V4** | 1M tokens | 최우선 추천 — 매우 낮은 가격, 우수한 중국어 능력 |
| **Gemini 3.1 Pro** | 1M+ tokens | 가장 큰 컨텍스트 창, 강력한 추론 능력 |
| **Claude Opus 4.7** | 1M tokens | 가장 강력한 agent 프로그래밍 및 추론 능력 |
| **GPT-5.5** | 1M tokens | OpenAI 최신 플래그십, AI 지능 인덱스 상위 |
| **Claude Sonnet 4.6** | 1M tokens | 속도, 비용, 품질의 좋은 균형 |

로컬 모델(Ollama): 컨텍스트 창이 일반적으로 작습니다(8K–128K). 수집에는 cloud provider를, 조회에는 로컬 모델을 사용하는 것을 권장합니다.

---

## 아키텍처

Karpathy의 3계층 분리 설계를 기반으로 합니다:

```
sources/     # 사용자의 source 문서(읽기 전용)
  ↓ ingest
wiki/        # LLM 생성 Wiki 페이지
  ↓ query / maintain
schema/      # Wiki 구성 설정(명명 규칙, 페이지 템플릿, 분류 규칙)
```

**코드 구조** (`src/`):

```
wiki/               # Wiki 엔진 모듈
  wiki-engine.ts    # 오케스트레이터
  query-engine.ts   # 대화형 조회
  source-analyzer.ts # 반복적 배치 추출
  page-factory.ts   # Entity/Concept CRUD + 병합
  lint-controller.ts # Lint 오케스트레이션
  lint-fixes.ts     # 수정 로직 (dead link, 빈 페이지, orphan)
  lint/             # Lint 하위 모듈
    duplicate-detection.ts  # 프로그램 기반 중복 후보 생성
    fix-runners.ts          # 배치 수정 실행 헬퍼
  contradictions.ts # 모순 감지
  system-prompts.ts # 언어 지시 + 섹션 레이블
schema/             # Schema 공동 진화
  schema-manager.ts # Schema CRUD + 제안
  auto-maintain.ts  # 파일 감시 + 주기적 lint
ui/                 # 사용자 인터페이스
  settings.ts       # 설정 패널
  modals.ts         # Lint/Ingest/Query 모달
+ 공유 모듈: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

---

## 문제 해결

**"콘텐츠 잘림" 오류가 발생하나요?**
- max_tokens를 늘리세요(설정 → 고급 → Max Tokens)
- 더 큰 컨텍스트 창을 가진 모델을 사용하세요
- 로컬 모델의 경우 Ollama의 컨텍스트 창 설정을 확인하세요

**중복 페이지가 감지되지 않나요?**
- "Regenerate index"를 실행해 alias와 함께 다시 빌드하세요
- 페이지에 누락된 alias가 있는지 확인하세요(Lint → Alias Completion)

**수집 중 5xx 오류가 발생하나요?**
- 플러그인이 지수 백오프로 자동 재시도합니다
- 지속되는 경우 provider API 상태를 확인하세요
- Rate limit의 경우 Ingestion Acceleration의 Batch Delay를 늘리세요

**조회 결과가 관련이 없나요?**
- Wiki 인덱스를 다시 생성하세요(alias가 검색 정확도를 개선합니다)
- Wiki 출력 언어가 콘텐츠 언어와 일치하는지 확인하세요

**수동 편집 후 dead link가 생겼나요?**
- Lint → Fix Dead Links를 실행하세요
- Wiki 페이지를 수동으로 이름을 바꿀 때 링크를 업데이트하지 않도록 주의하세요

---

## 기여하기

**이슈 및 버그:** [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues)

**기능 요청:** [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

**Pull Requests:** 환영합니다! 다음을 따라주세요:
- `pnpm lint` 통과(0 오류)
- `pnpm build` 성공
- 영어 커밋 메시지(관례 형식)
- 기능 변경 시 문서 업데이트

---

## FAQ (자주 묻는 질문)

### Lint에서 거의 모든 페이지에 "Alias 누락"이 표시되는 이유는 무엇인가요?

v1.7.11 이전에 생성된 페이지에는 Alias가 포함되지 않았습니다. 이는 정상이며 문제가 되지 않습니다 — Alias는 필수가 아닌 개선 기능입니다. Lint 보고서에서 **"Complete Aliases"** 버튼을 클릭하면 LLM이 번역, 약어, 대체 이름을 모든 페이지에 대해 일괄 생성합니다. Alias가 생기면 중복 감지와 Alias 기반 검색이 훨씬 효과적이 됩니다.

### 이름이 비슷한 중복 페이지(예: "CoT"와 "사고사슬")가 보이는 이유는 무엇인가요?

이전 버전(v1.7.10 이전)에는 Alias를 인식하는 중복 감지 기능이 없었습니다. 같은 개념을 다른 이름으로 수집하면 LLM이 별도의 페이지를 생성했습니다. **Lint Wiki**를 실행하고 중복이 발견되면 **"Merge Duplicates"** 버튼을 클릭하여 융합하세요. 병합된 페이지는 양쪽의 Alias를 모두 보존하여 향후 중복을 방지합니다.

### 대용량 Source 파일의 수집 속도를 높이려면 어떻게 하나요?

**설정 → Ingestion Acceleration**에서 두 가지를 조정하세요:
- **Page Generation Concurrency**: 1에서 3으로 증가(Rate limit이 높은 Provider는 5까지 가능). 여러 Entity/Concept 페이지를 병렬로 처리합니다.
- **Batch Delay**: 값이 낮을수록 빠르지만 Rate limit 위험이 있습니다. 300ms부터 시작하고, HTTP 429 오류가 보이면 500~800ms로 늘리세요.

또한 **Extraction Granularity**를 확인하세요: "Standard"나 "Coarse"는 "Fine"보다 적은 페이지를 생성하여 더 빠릅니다.

### 큰 Wiki에서 Lint를 실행하면 플러그인이 멈춥니다. 문제가 무엇인가요?

v1.7.15 및 v1.7.17에서 수정된 알려진 문제입니다. v1.7.15 이전 버전을 사용 중이라면 최신 릴리스로 업그레이드하세요 — Lint 시스템에 비동기 Yield 지점이 추가되어 50페이지마다, 500회 비교마다 Obsidian UI 스레드에 제어권을 반환하므로, 1200페이지 이상의 Wiki에서 발생하던 10~40초 프리즈 현상이 해결되었습니다.

### Wiki 페이지를 수동으로 편집할 수 있나요?

네. 플러그인은 사용자의 편집을 존중합니다:
- Frontmatter에 `reviewed: true`를 설정하면 재수집 시 페이지가 덮어쓰기되지 않도록 보호됩니다. 검토된 페이지에는 진정으로 새로운 내용만 추가됩니다.
- `created` 날짜는 업데이트 시 보존되며, `updated`만 갱신됩니다.
- 수동으로 추가한 Alias, 태그, Source는 병합 시 보존됩니다.

### Ollama로 로컬 모델을 사용하려면 어떻게 하나요?

1. [Ollama](https://ollama.com)를 설치하고 모델을 Pull합니다: `ollama pull gemma4`
2. 플러그인 설정에서 Provider로 **"Ollama (Local)"** 을 선택합니다
3. **Fetch Models**를 클릭하여 모델 목록을 가져오거나, 모델 이름을 직접 입력합니다
4. API Key가 필요 없습니다

> 로컬 모델은 일반적으로 컨텍스트 창이 작습니다(8K~128K). 수집(가장 큰 컨텍스트 필요)에는 Cloud Provider를, Query에는 로컬 모델을 사용하는 것을 권장합니다.

### UI 언어와 Wiki 출력 언어의 차이는 무엇인가요?

- **Interface Language**(설정 상단): 플러그인 UI 자체를 제어합니다 — 설정 라벨, 버튼 텍스트, 알림. 현재 영어와 중국어를 지원합니다.
- **Wiki Output Language**(v1.6.5 추가): LLM이 Wiki 페이지를 작성할 언어를 제어합니다. 8개 언어(EN/ZH/JA/KO/DE/FR/ES/PT)와 Custom 입력을 지원합니다. UI는 영어로, Wiki는 일본어로 설정할 수 있습니다.

### Query가 분명 존재하는 페이지를 찾지 못하는 이유는 무엇인가요?

세 가지 일반적인 원인이 있습니다:
1. **인덱스가 오래됨**: `Cmd+P` → **"Regenerate index"** 를 실행하여 현재 페이지와 Alias로 다시 빌드하세요.
2. **Alias 누락**: Alias가 없으면(v1.7.11 이전 페이지) LLM은 정확한 페이지 제목으로만 매칭할 수 있습니다. Lint를 실행한 후 Complete Aliases로 수정하세요.
3. **검색어가 일치하지 않음**: 페이지 제목, Alias 또는 관련 용어를 시도해보세요. LLM은 키워드 검색이 아닌 의미 기반 매칭을 수행하므로 표현을 바꾸면 도움이 됩니다.

### "Smart Fix All"은 무엇을 하며 어떤 순서로 실행되나요?

Smart Fix All은 인과 관계 순서로 수정을 실행하여 새로운 문제를 최소화합니다:
1. **Phase 0 — Alias 완성**: 누락된 Alias를 채워 중복 감지가 제대로 작동하도록 합니다.
2. **Phase 1 — 중복 병합**: 중복 페이지를 융합합니다(많은 Dead link와 Orphan의 근본 원인).
3. **Phase 2 — Dead link 수정**: 깨진 `[[wiki-links]]`를 복구합니다(중복 병합 후 링크 재작성으로 대부분 해결됨).
4. **Phase 3 — Orphan 연결**: 인바운드 링크가 없는 페이지에 링크를 추가합니다.
5. **Phase 4 — 빈 페이지 확장**: Stub 페이지를 LLM이 생성한 콘텐츠로 채웁니다.

### 예상치 못한 API 비용을 방지하려면 어떻게 하나요?

- **Auto-Maintenance는 기본 OFF**입니다 — 지속적인 백그라운드 처리가 필요한 경우에만 활성화하세요.
- **Smart Batch Skip**(v1.7.7)이 이미 수집된 파일을 자동으로 건너뛰므로, 폴더 수집을 다시 실행해도 모든 것을 재처리하지 않습니다.
- **Extraction Granularity**를 "Standard"나 "Coarse"로 설정하면 "Fine"보다 API 호출이 적습니다.
- **Batch Delay**를 500ms 이상으로 설정하면 API에 더 여유를 주지만 Token 사용량이 늘어나지는 않습니다 — 단순히 호출 간격을 벌릴 뿐입니다.
- **Lint 보고서**는 수정을 실행하기 전에 각 항목의 개수를 보여주므로, API 비용을 들일 가치가 있는지 판단할 수 있습니다.

### Wiki 데이터를 잃지 않고 업그레이드하려면 어떻게 하나요?

플러그인은 `sources/`의 Source 파일을 절대 수정하지 않습니다. `wiki/`의 페이지는 사용자가 명시적으로 수정이나 재수집을 실행할 때만 변경됩니다. 안전을 위해:
1. Vault(또는 `wiki/` 폴더만)를 백업하세요
2. 플러그인을 업데이트하세요
3. 먼저 **Regenerate index**를 실행하세요
4. **Lint Wiki**를 실행하여 무엇에 주의가 필요한지 확인하세요
5. 선택적으로 수정을 적용하세요 — 한 번에 모두 수정할 필요는 없습니다

---

## 라이선스

MIT License — [LICENSE](LICENSE)를 참조하세요.

---

## 감사의 말

- [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 원본 LLM Wiki 개념
- Obsidian 팀 — 플러그인 플랫폼 및 API
- Anthropic, OpenAI, Google, DeepSeek, Kimi, GLM, OpenRouter, Ollama — LLM provider

---

**공식 사이트:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
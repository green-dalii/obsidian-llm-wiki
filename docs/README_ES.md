![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki Plugin para Obsidian

> Base de conocimiento estructurada impulsada por IA que ingiere tus notas y genera un Wiki conectado — basado en el concepto de [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Autor:** Greener-Dalii | **Versión:** 1.7.19

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Sitio oficial](https://llmwiki.greenerai.top/) | [Discusiones](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## ¿Qué es LLM-Wiki?

Escribe. La IA organiza. Pregunta. Así de simple.

**El problema.** Tus notas son una mina de oro: personas, conceptos, ideas, conexiones. Pero ahora mismo son solo archivos en carpetas. Buscar relaciones requiere etiquetado manual y memoria.

**La solución.** [Andrej Karpathy propuso](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) un enfoque elegante: trata tus notas como materia prima y deja que un LLM desempeñe el papel de arquitecto. Lee lo que escribes, extrae entities y concepts, y los teje en un Wiki estructurado — con `[[wiki-links]]` bidireccionales, índice generado automáticamente e interfaz de chat que responde desde *tu* conocimiento.

**No necesitas ser el bibliotecario.** No decidir qué merece página. No mantener enlaces cruzados. No verificar si algo está desactualizado. Deposita notas en `sources/` y el LLM lee, extrae, escribe, enlaza y señala contradicciones — mientras tú mantienes el flujo.

**No es un chatbot más.** ChatGPT conoce internet. LLM-Wiki te conoce *a ti* — o más bien, lo que le has enseñado. Cada respuesta incluye `[[wiki-links]]` de regreso a tu grafo de conocimiento. Cada respuesta es un punto de partida, no un callejón sin salida.

---

## ¿Por qué Obsidian + LLM-Wiki?

Obsidian destaca en el pensamiento enlazado. Pero hay un problema: eres tú quien crea todos los enlaces.

LLM-Wiki cambia esto. En lugar de construir el grafo manualmente, la IA lo hace crecer contigo. Agrega una nota sobre un concepto nuevo — encuentra conexiones que tú omitirías. Haz una pregunta — recorre tu grafo de conocimiento y obtén respuestas con citas.

- **El Graph View cobra vida.** Las notas nuevas no quedan aisladas: brotan enlaces a entities, concepts y sources. El grafo crece orgánicamente y el plugin lo mantiene: detecta duplicados, corrige dead links, unifica idiomas mediante aliases.
- **Tus notas aprenden a responder.** La búsqueda se convierte en conversación. "¿Qué escribí sobre X?" se transforma en diálogo, con respuestas en streaming y `[[wiki-links]]` como migas de pan. Cada respuesta profundiza en tu conocimiento.
- **Obsidian se convierte en compañero de pensamiento.** Deja de ser un armario de notas y empieza a ayudarte a *pensar*: revela conexiones ocultas, señala contradicciones, recupera lo que olvidaste haber sabido.

---

## Inicio Rápido

### Instalación

**Recomendado — Mercado de Plugins de la Comunidad Obsidian:**

1. En Obsidian, ve a **Configuración → Plugins de comunidad**
2. Haz clic en **Explorar** y busca "Karpathy LLM Wiki"
3. Haz clic en **Instalar**, luego **Habilitar**

**O desde el sitio web de Plugins de Comunidad:** visita [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) y haz clic en **Agregar a Obsidian** para instalar directamente.

**Manual (alternativa):**

1. Descarga `main.js`, `manifest.json`, `styles.css` de [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. En Obsidian, ve a Configuración → Plugins de comunidad. En la pestaña **Plugins instalados**, haz clic en el icono de carpeta para abrir el directorio de plugins
3. Crea una carpeta llamada `karpathywiki` y coloca los tres archivos dentro
4. Vuelve a Obsidian y haz clic en el icono de actualizar: **Karpathy LLM Wiki** aparecerá en Plugins instalados
5. Actívalo para habilitarlo

**Desarrollo:** `git clone`, `pnpm install`, `pnpm build`.

### Configurar un Provider de LLM

1. Abre Configuración → Karpathy LLM Wiki
2. Selecciona un provider del menú desplegable (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter o personalizado)
3. Ingresa tu API key (no requerida para Ollama)
4. Haz clic en **Fetch Models** para poblar el menú de models, o escribe un model name manualmente
5. Haz clic en **Test Connection**, luego **Save Settings**

**Ollama (local, sin API key):** Instala [Ollama](https://ollama.com), descarga un model (`ollama pull gemma4`), selecciona "Ollama (Local)" en el menú de provider.

> Consulta [README_CN.md](README_CN.md) para instrucciones de provider específicas en chino.

### Uso

| Método | Cómo |
|--------|------|
| **Ingest desde `sources/`** | `Cmd+P` → "Ingest Sources" — procesa toda la carpeta `sources/` |
| **Ingest cualquier carpeta** | `Cmd+P` → "Ingest from Folder" — selecciona carpeta, genera Wiki desde notas existentes |
| **Query Wiki** | `Cmd+P` → "Query Wiki" — consulta con respuestas en streaming y `[[wiki-links]]` |
| **Lint Wiki** | `Cmd+P` → "Lint Wiki" — escaneo de salud con detección de duplicados, dead links, orphans |

Re-ingesting la misma source realiza actualizaciones incrementales en entity/concept pages (información nueva fusionada). Las summary pages se regeneran.

**Smart Batch Skip:** Al ingerir una carpeta, el plugin detecta automáticamente archivos ya procesados y los omite para ahorrar tiempo y costos de API. El informe de batch muestra el conteo de omitidos.

### Actualizando desde una Versión Anterior

Si estás actualizando desde una versión **anterior a v1.7.11** (o mucho más antigua), tus páginas Wiki existentes se generaron sin varias capacidades añadidas a lo largo de muchas versiones. Sigue estos pasos tras actualizar para poner tu Wiki al día:

**1. Reconstruye tu índice**
`Cmd+P` → **"Regenerate index"** — Reconstruye `wiki/index.md` con entradas de alias para cada página, habilitando la búsqueda consciente de aliases (ej., buscar "DSA" encuentra "DeepSeek-Sparse-Attention"). El formato antiguo del índice solo listaba títulos de página.

**2. Ejecuta Lint Wiki**
`Cmd+P` → **"Lint Wiki"** — Escanea todo tu Wiki y muestra:
- **Aliases faltantes**: Páginas sin aliases (todas las anteriores a v1.7.11). Haz clic en **"Complete Aliases"** — el LLM genera traducciones, acrónimos y nombres alternativos en lote. Esto es crítico para la detección de duplicados.
- **Páginas duplicadas**: Páginas con contenido solapado (ej., "CoT" vs "Cadena-de-Pensamiento" creadas por versiones antiguas sin dedup consciente de aliases). Haz clic en **"Merge Duplicates"** para fusionarlas y preservar todos los aliases.
- **Dead links / Empty pages / Orphans**: Problemas estándar de mantenimiento del Wiki.

**3. Usa Smart Fix All**
Haz clic en **"Smart Fix All"** en el informe de Lint para una reparación con un solo clic ordenada por causalidad: aliases completados → duplicados fusionados → dead links corregidos → orphans enlazados → empty pages expandidas. Es la forma más rápida de limpiar un wiki construido a través de muchas versiones.

**4. Habilita la generación paralela de páginas**
Configuración → **Ingestion Acceleration**:
- **Page Generation Concurrency**: Ajústalo a 3 para la mayoría de providers (era 1/serial por defecto antes de v1.7.3). Acelera la ingestion 2–3× en sources con 10+ entities.
- **Batch Delay**: Empieza en 300ms. Auméntalo a 500–800ms si encuentras rate limiting.

**5. Revisa las nuevas opciones (añadidas desde v1.4.0–v1.7.x):**
- **Wiki Output Language** (v1.6.5): Independiente del idioma de la UI — tu Wiki puede estar en chino mientras la UI del plugin está en español, o viceversa.
- **Extraction Granularity** (v1.6.2): Fine/Standard/Coarse controla qué profundamente extrae el LLM entities de las sources. "Standard" es un buen valor por defecto.
- **Auto-Maintenance** (v1.4.0): File watcher opcional, Lint periódico y health check al inicio. Todo OFF por defecto — actívalo solo si quieres procesamiento automático en segundo plano.

> **Seguridad:** La generación paralela usa `Promise.allSettled` — si una página falla, las demás continúan. Las páginas fallidas se reintentan individualmente con backoff exponencial. Smart Batch Skip (v1.7.7) detecta automáticamente archivos ya ingestados para ahorrar tiempo y costos de API.

---

## Características

### Calidad del Conocimiento

- **Entity/Concept Extraction** — El LLM extrae entities (personas, organizaciones, productos, eventos) y concepts (teorías, métodos, términos) de tus notas
- **Mandatory Page Aliases** — Cada página generada incluye al menos 1 alias (traducción, acrónimo, nombre alternativo), habilitando detección de duplicados cross-language
- **Duplicate Detection & Merge** — El semantic tiering detecta duplicados verdaderos (traducciones cross-language, abreviaturas, variantes de ortografía); el merge inteligente de LLM fusiona contenido y preserva aliases
- **Smart Knowledge Fusion** — Las actualizaciones multi-source fusionan información nueva sin redundancia; las contradicciones se preservan con atribución; las páginas `reviewed: true` se protegen de sobrescritura
- **Content Truncation Protection** — 8000 max_tokens con detección automática de stop_reason y reintento a 2× tokens en todos los providers
- **Verbatim Source Mentions** — Las citas en idioma original se preservan con traducción opcional para trazabilidad

### Mantenimiento

- **Lint Health Scan** — Detecta duplicados, dead links, empty pages, orphans, aliases faltantes y contradicciones en informe integral
- **Semantic-Tier Duplicate Detection** — Tier 1 (coincidencias directas de nombre: cross-language, abreviaturas, títulos de alta similitud) siempre verificadas; Tier 2 (señales indirectas: enlaces compartidos, similitud moderada) llena el presupuesto de tokens
- **Smart Fix All** — Batch fix ordenado por causalidad: duplicados fusionados → dead links resueltos → orphans enlazados → empty pages expandidas
- **Alias Completion** — Generación paralela de batch de aliases faltantes en un clic, mejorando detección futura de duplicados
- **Auto-Maintenance** — File watcher multi-carpeta, lint periódico, health check al inicio (todos opcionales)
- **Contradiction State Machine** — `detected → review_ok → resolved` (AI fix) o `detected → pending_fix` (manual)

### Query & Feedback

- **Conversational Query** — Diálogo estilo ChatGPT con Markdown en streaming e `[[wiki-links]]`, historial multi-turn
- **Query-to-Wiki Feedback** — Guarda conversaciones valiosas al Wiki con entity/concept extraction, semantic dedup antes de guardar
- **Duplicate Save Prevention** — El hash tracking previene re-evaluación de conversaciones sin cambios

### LLM & Idioma

- **Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, custom endpoints
- **5xx Retry** — Reintento automático de backoff exponencial (máx 2) en errores HTTP 5xx/429 en todos los clientes
- **Dynamic Model List** — Fetching en tiempo real desde APIs de provider
- **Wiki Output Language** — 8 idiomas independientes de la UI (EN/ZH/JA/KO/DE/FR/ES/PT), con input personalizado
- **Internationalization** — UI en inglés y chino (predeterminado: inglés)

### Arquitectura & Rendimiento

- **Parallel Page Generation** — 1–5 páginas concurrentes configurables, 3× más rápido para sources grandes, aislamiento de errores por página
- **Iterative Batch Extraction** — El tamaño de batch adaptativo elimina el cuello de botella de max_tokens para documentos largos
- **Three-Layer Architecture** — `sources/` (solo lectura) → `wiki/` (generado por LLM) → `schema/` (config co-evolucionada)
- **Modular Codebase** — 13 módulos enfocados en `src/`

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| **Ingest single source** | Selecciona nota → genera Wiki pages con entities, concepts y summary |
| **Ingest from folder** | Selecciona carpeta → genera Wiki en batch desde notas existentes |
| **Query wiki** | Q&A conversacional sobre tu Wiki, respuestas en streaming con `[[wiki-links]]` |
| **Lint wiki** | Escaneo completo de salud: duplicados, dead links, empty pages, orphans, aliases faltantes, contradicciones |
| **Regenerate index** | Reconstruye manualmente `wiki/index.md` |
| **Suggest schema updates** | El LLM analiza el Wiki y propone mejoras al schema |

---

## Ejemplo

**Entrada:** `sources/machine-learning.md`

```markdown
# Machine Learning
Machine learning usa algoritmos para aprender de datos.

## Tipos
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Salida — Entity page:** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["Supervisado", "Supervised Learning"]
---

# Supervised Learning

## Información Básica
- Type: method
- Source: [[sources/machine-learning]]

## Descripción
Supervised learning es un paradigma de machine learning donde los modelos aprenden
de datos de entrenamiento etiquetados para hacer predicciones sobre datos no vistos...

## Conceptos Relacionados
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

## Entities Relacionados
- [[entities/Arthur-Samuel|Arthur Samuel]]

## Menciones en Source
- "Supervised learning usa datos etiquetados para entrenar modelos predictivos..."
```

---

## Guía de Selección de Models

Este plugin sigue la filosofía de Karpathy: **alimentar al LLM con el contexto completo del Wiki, no con recuperación RAG fragmentada**. Se recomiendan fuertemente los models de long-context: cuanto más crece tu Wiki, más contexto necesita el LLM.

> ¿Por qué no RAG? La [crítica original de Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) argumenta que RAG fragmenta el conocimiento y rompe la capacidad del LLM para razonar a través del grafo de conocimiento completo.

**Recomendaciones principales:**

| Model | Context Window | Por qué |
|-------|---------------|---------|
| **DeepSeek V4** | 1M tokens | Mejor valor: precio ultra bajo, fuerte soporte en chino |
| **Gemini 3.1 Pro** | 1M+ tokens | Ventana de contexto más grande, razonamiento fuerte |
| **Claude Opus 4.7** | 1M tokens | Codificación y razonamiento agentic más fuertes |
| **GPT-5.5** | 1M tokens | Último flagship de OpenAI, top índice de inteligencia AI |
| **Claude Sonnet 4.6** | 1M tokens | Gran equilibrio de velocidad, costo y calidad |

Para models locales (Ollama): las ventanas de contexto son típicamente más pequeñas (8K–128K). Considera usar un provider en la nube para ingestion + model local para query.

**Anthropic Compatible (Coding Plan):** Si tu provider ofrece un endpoint de API compatible con Anthropic, selecciona "Anthropic Compatible" e ingresa el Base URL y API Key de tu provider.

---

## Arquitectura

Diseño de tres capas de Karpathy:

```
sources/     # Tus documentos fuente (solo lectura)
  ↓ ingest
wiki/        # Wiki pages generadas por LLM
  ↓ query / maintain
schema/      # Configuración de estructura Wiki (nomenclatura, plantillas, categorías)
```

**Codebase** (`src/`):

```
wiki/               # Módulos del motor Wiki
  wiki-engine.ts    # Orquestador
  query-engine.ts   # Query conversacional
  source-analyzer.ts # Extracción batch iterativa
  page-factory.ts   # CRUD de entity/concept + merge
  lint-controller.ts # Orquestación de Lint
  lint-fixes.ts     # Lógica de fix (dead links, empty pages, orphans)
  lint/             # Submódulos de Lint
    duplicate-detection.ts  # Generación programática de candidatos duplicados
    fix-runners.ts          # Ejecutores de fix en lote
  contradictions.ts # Detección de contradicciones
  system-prompts.ts # Directiva de idioma + etiquetas de sección
schema/             # Co-evolución del schema
  schema-manager.ts # CRUD de schema + sugerencias
  auto-maintain.ts  # File watcher + lint periódico
ui/                 # Interfaz de usuario
  settings.ts       # Panel de configuración
  modals.ts         # Modales de Lint/Ingest/Query
+ módulos compartidos: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Páginas generadas:**
- `wiki/sources/filename.md` — Source summary
- `wiki/entities/entity-name.md` — Entity pages (personas, orgs, proyectos, etc.)
- `wiki/concepts/concept-name.md` — Concept pages (teorías, métodos, términos, etc.)
- `wiki/index.md` — Índice generado automáticamente
- `wiki/log.md` — Registro de operaciones

---

## FAQ

### ¿Por qué Lint muestra "aliases faltantes" en casi todas mis páginas?

Las páginas generadas antes de v1.7.11 no incluían aliases. Esto es normal e inofensivo — los aliases son una mejora, no un requisito. Haz clic en **"Complete Aliases"** en el informe de Lint para que el LLM genere traducciones, acrónimos y nombres alternativos para todas las páginas deficientes en un solo lote. Una vez que existen aliases, la detección de duplicados y la búsqueda consciente de aliases son mucho más efectivas.

### ¿Por qué veo páginas duplicadas con nombres similares (ej., "CoT" y "Cadena-de-Pensamiento")?

Las versiones antiguas (anteriores a v1.7.10) no tenían detección de duplicados consciente de aliases. Cuando ingestabas contenido sobre el mismo concepto con nombres diferentes, el LLM creaba páginas separadas. Ejecuta **Lint Wiki** → si se encuentran duplicados, haz clic en **"Merge Duplicates"** para fusionarlos. La página fusionada preserva los aliases de ambas, evitando futuros duplicados.

### ¿Cómo acelero la ingestion de archivos fuente grandes?

Dos opciones en **Configuración → Ingestion Acceleration**:
- **Page Generation Concurrency**: Auméntalo de 1 a 3 (o 5 para providers con límites generosos). Esto procesa múltiples páginas entity/concept en paralelo.
- **Batch Delay**: Valores más bajos son más rápidos pero pueden provocar rate limiting. Empieza en 300ms; aumenta a 500–800ms si ves errores HTTP 429.

También revisa **Extraction Granularity**: "Standard" o "Coarse" producen menos páginas que "Fine" y son más rápidos.

### El plugin se congela cuando ejecuto Lint en un Wiki grande. ¿Qué ocurre?

Este era un problema conocido solucionado en v1.7.15 y v1.7.17. Si estás en una versión anterior a v1.7.15, actualiza a la última versión — el sistema Lint ahora incluye puntos de yield asíncronos que devuelven el control al hilo de la UI de Obsidian cada 50 páginas y cada 500 comparaciones, evitando el congelamiento de 10–40 segundos que ocurría en wikis con 1200+ páginas.

### ¿Puedo editar páginas Wiki manualmente?

Sí. El plugin respeta tus ediciones:
- Establece `reviewed: true` en el frontmatter para proteger una página de ser sobrescrita durante la re-ingestion. Las páginas revisadas solo reciben contenido nuevo genuino añadido.
- La fecha `created` se preserva entre actualizaciones; solo se actualiza `updated`.
- Los aliases, tags y sources manuales se preservan durante las fusiones.

### ¿Cómo uso modelos locales con Ollama?

1. Instala [Ollama](https://ollama.com) y descarga un modelo: `ollama pull gemma4`
2. En la configuración del plugin, selecciona **"Ollama (Local)"** como Provider
3. Haz clic en **Fetch Models** para poblar la lista de modelos, o escribe el nombre del modelo manualmente
4. No necesita API Key

> Los modelos locales suelen tener ventanas de contexto más pequeñas (8K–128K). Considera usar un provider en la nube para ingestion (que necesita el contexto más grande) y tu modelo local para Query.

### ¿Cuál es la diferencia entre el Idioma de la UI y el Idioma de Salida del Wiki?

- **Interface Language** (arriba en configuración): Controla la UI del propio plugin — etiquetas de configuración, texto de botones, Notices. Actualmente soporta inglés y chino.
- **Wiki Output Language** (añadido en v1.6.5): Controla en qué idioma escribe el LLM las páginas Wiki. Soporta 8 idiomas (EN/ZH/JA/KO/DE/FR/ES/PT) más entrada personalizada. Puedes tener la UI en español mientras tu Wiki está en japonés.

### ¿Por qué Query no encuentra páginas que sé que existen?

Tres causas comunes:
1. **El índice está desactualizado**: Ejecuta `Cmd+P` → **"Regenerate index"** para reconstruirlo con las páginas y aliases actuales.
2. **Faltan aliases**: Sin aliases (páginas anteriores a v1.7.11), el LLM solo puede coincidir por título exacto. Ejecuta Lint → Complete Aliases para solucionarlo.
3. **Los términos de búsqueda no coinciden**: Prueba con el título de la página, un alias o un término relacionado. El LLM hace coincidencia semántica, no búsqueda por palabras clave — reformular la pregunta ayuda.

### ¿Qué hace "Smart Fix All" y en qué orden?

Smart Fix All ejecuta las reparaciones en orden de causalidad para minimizar la creación de nuevos problemas:
1. **Phase 0 — Complete Aliases**: Rellena aliases faltantes para que la detección de duplicados funcione correctamente.
2. **Phase 1 — Merge Duplicates**: Fusiona páginas duplicadas (causa raíz de muchos dead links y orphans).
3. **Phase 2 — Fix Dead Links**: Repara `[[wiki-links]]` rotos (muchos se resuelven tras la reescritura de enlaces por fusión de duplicados).
4. **Phase 3 — Link Orphans**: Añade enlaces entrantes a páginas que no tienen ninguno.
5. **Phase 4 — Expand Empty Pages**: Rellena páginas vacías con contenido generado por el LLM.

### ¿Cómo evito costos inesperados de API?

- **Auto-Maintenance está OFF por defecto** — no lo actives a menos que quieras procesamiento continuo en segundo plano.
- **Smart Batch Skip** (v1.7.7) salta automáticamente archivos ya ingestados, así que re-ejecutar la ingestion de una carpeta no reprocesa todo.
- **Extraction Granularity** en "Standard" o "Coarse" usa menos llamadas API que "Fine".
- **Batch Delay** por encima de 500ms da más margen pero no aumenta el consumo de tokens — solo espacia las llamadas.
- El **informe de Lint** muestra los conteos antes de ejecutar cualquier reparación, para que decidas qué vale la pena en costo de API.

### ¿Cómo actualizo sin perder mis datos del Wiki?

El plugin nunca modifica tus archivos fuente en `sources/`. Las páginas Wiki en `wiki/` solo se modifican cuando ejecutas explícitamente reparaciones o re-ingestas. Para estar seguro:
1. Haz una copia de seguridad de tu vault (o solo de la carpeta `wiki/`)
2. Actualiza el plugin
3. Ejecuta **Regenerate index** primero
4. Ejecuta **Lint Wiki** para ver qué necesita atención
5. Aplica las reparaciones de forma selectiva — no tienes que arreglar todo de una vez

---

## Licencia

MIT License — consulta [LICENSE](LICENSE).

## Agradecimientos

- **Concepto:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — la visión original que inspiró este plugin
- **Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK

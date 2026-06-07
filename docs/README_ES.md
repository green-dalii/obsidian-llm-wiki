![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conocimiento estructurada impulsada por IA que ingiere tus notas y genera un Wiki conectado — basado en el concepto de [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Puntuación oficial Obsidian 95/100** | Soporte nativo de 8 idiomas | Mantenimiento activo, evolución continua

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Sitio oficial](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Comentarios y debate](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código con DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ Aviso de actualización rápida：** Este proyecto evoluciona rápidamente – correcciones de errores, mejoras de rendimiento, nuevas funciones y optimizaciones de UX se publican con frecuencia. Recomendamos actualizar regularmente en Obsidian (**Configuración → Plugins comunitarios → Buscar actualizaciones**) o activar la actualización automática de plugins.

## 📑 Contents

- [💡 ¿Qué es LLM-Wiki?](#-qué-es-llm-wiki)
- [⚡ ¿Por qué Obsidian + LLM-Wiki?](#-por-qué-obsidian--llm-wiki)
- [🚀 Inicio Rápido](#-inicio-rápido)
  - [📦 Instalación](#-instalación)
  - [🔄 Actualizar el plugin](#-actualizar-el-plugin)
  - [🔑 Configurar un Provider de LLM](#-configurar-un-provider-de-llm)
  - [🎮 Uso](#-uso)
  - [⚠️ Actualizando desde una Versión Anterior](#️-actualizando-desde-una-versión-anterior)
- [⚡ Novedades en la v1.16.3](#-novedades-en-la-v1163)
- [✨ Características](#-características)
  - [📊 Calidad del Conocimiento](#-calidad-del-conocimiento)
  - [🛠️ Mantenimiento](#️-mantenimiento)
  - [💬 Query & Feedback](#-query--feedback)
  - [🌐 LLM & Idioma](#-llm--idioma)
  - [🏗️ Arquitectura & Rendimiento](#️-arquitectura--rendimiento)
  - [🔒 Privacidad y seguridad](#-privacidad-y-seguridad)
- [⌨️ Comandos](#️-comandos)
- [📖 Ejemplo](#-ejemplo)
- [🤖 Guía de Selección de Models](#-guía-de-selección-de-models)
- [🏗️ Arquitectura](#️-arquitectura)
- [❓ FAQ](#-faq)
  - [💡 General](#-general)
  - [🏷️ Aliases y Duplicados](#️-aliases-y-duplicados)
  - [⚡ Rendimiento y Control de costos](#-rendimiento-y-control-de-costos)
  - [🧹 Mantenimiento](#-mantenimiento)
  - [🔍 Solución de Problemas](#-solución-de-problemas)
  - [🔒 Transparencia y cumplimiento](#-transparencia-y-cumplimiento)
- [📜 Licencia](#-licencia)
- [🙏 Agradecimientos](#-agradecimientos)
## 💡 ¿Qué es LLM-Wiki?

Escribe. La IA organiza. Pregunta. Así de simple.

**🎯 El problema.** Tus notas son una mina de oro: personas, conceptos, ideas, conexiones. Pero ahora mismo son solo archivos en carpetas. Buscar relaciones requiere etiquetado manual y memoria.

**✨ La solución.** [Andrej Karpathy propuso](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) un enfoque elegante: trata tus notas como materia prima y deja que un LLM desempeñe el papel de arquitecto. Lee lo que escribes, extrae entities y concepts, y los teje en un Wiki estructurado — con `[[wiki-links]]` bidireccionales, índice generado automáticamente e interfaz de chat que responde desde *tu* conocimiento.

**📚 No necesitas ser el bibliotecario.** No decidir qué merece página. No mantener enlaces cruzados. No verificar si algo está desactualizado. Deposita notas en `sources/` y el LLM lee, extrae, escribe, enlaza y señala contradicciones — mientras tú mantienes el flujo.

**🤖 No es un chatbot más.** ChatGPT conoce internet. LLM-Wiki te conoce *a ti* — o más bien, lo que le has enseñado. Cada respuesta incluye `[[wiki-links]]` de regreso a tu grafo de conocimiento. Cada respuesta es un punto de partida, no un callejón sin salida.

---

## ⚡ Novedades en la v1.16.3

Esta **versión correctiva** completa el lote de correcciones de errores P0 de v1.16.2. La corrección de la barra de estado de cancelación de Lint de v1.16.2 estaba incompleta (el modal se cerraba inmediatamente al hacer clic en un botón de corrección, ocultando la barra de estado antes de que el usuario pudiera cancelar), y los cinco puntos de limpieza de la revisión de v1.16.2 ahora están incluidos. **Sin cambios incompatibles, sin reconfiguración.**

**Correcciones principales:**

- **La barra de estado de cancelación de Lint ahora realmente funciona (Issue #94).** v1.16.2 propagaba el AbortSignal a los fix-runners, pero el modal se cerraba al hacer clic en el botón — disparando onClose → endLintOperation y ocultando la barra de estado antes de que el usuario pudiera cancelar. La corrección da a cada fase de corrección su propio ciclo de vida de operación de lint: `startLintOperation` al hacer clic en un botón de corrección, `endLintOperation` al finalizar la corrección. El modal se cierra inmediatamente (preservando la UX original); el usuario ve la notificación de progreso arriba y la barra de estado abajo permanece visible durante toda la corrección — clic para cancelar.

- **El contador de progreso de verificación de duplicados coincide con la consola (Issue #94 continuación).** Antes mostraba "1/4" (contador de rondas externo) en lugar de "1-4/16" (rango de lotes interno). Corregido para que la notificación y el log de la consola permanezcan sincronizados — ya no hay confusión sobre el progreso.

- **Corrección de la clave de thinkingControlCache (Issue #243).** Con proveedores predefinidos sin sobrescritura de baseUrl, la escritura del caché usaba una clave vacía, la lectura usaba la URL predefinida — el caché fallaba para siempre, disparando un viaje de ida y vuelta 400 desperdiciado en cada llamada. Las rutas de lectura/escritura ahora usan el mismo helper `getThinkingControlCacheKey()`.

- **deleteEmptyStubs ahora es resiliente (Issue #244).** Un solo fallo de lectura de vault o de deleteFile ya no interrumpe el bucle completo. Cada archivo está independientemente envuelto en try/catch, y el usuario recibe una notificación clara con el conteo de eliminados/fallidos.

- **El fallback tras thinking-control cachea el resultado negativo (Issue #245).** `OpenAICompatibleClient` ahora establece `thinkingControlSupported = false` después de un fallback 400 exitoso, para que las llamadas posteriores a la misma baseUrl salten el viaje de ida y vuelta de prueba-fallo redundante.

- **Limpieza i18n (Issue #94 continuación + #248):** 3 cadenas de progreso en inglés codificadas de forma rígida reemplazadas por claves i18n oficiales (`lintCheckingDuplicatesProgress`, `lintFixingPolluted`, `lintModalFixPolluted`), en 8 idiomas. La detección de errores de thinking-control ahora requiere tanto un estado HTTP 400 como una palabra clave de campo rechazado — antes coincidía con cualquier error que contuviera "thinking", lo que causaba fallbacks falsos.

**¿Actualizar desde una versión anterior?** Sin cambios incompatibles, sin reconfiguración. Los wikis, ajustes y flujos de trabajo existentes se conservan.

**Recomendamos encarecidamente a todos los usuarios actualizar a esta versión** — la corrección de cancelación de Lint completa la historia de UX de cancelación, y las correcciones de caché y resiliencia operan silenciosamente en cada llamada de Lint.---

---

## ✨ Características

### 📊 Calidad del Conocimiento

- **🔍 Entity/Concept Extraction** — El LLM extrae entities (personas, organizaciones, productos, eventos) y concepts (teorías, métodos, términos) de tus notas con granularidad de extracción flexible (Mínima~5 elementos, Gruesa~10, Estándar~50, Fina~100, Personalizada 1–300) para balancear profundidad de análisis y costos de API
- **🏷️ Mandatory Page Aliases** — Cada página generada incluye al menos 1 alias (traducción, acrónimo, nombre alternativo), habilitando detección de duplicados cross-language
- **🔄 Duplicate Detection & Merge** — El semantic tiering detecta duplicados verdaderos (traducciones cross-language, abreviaturas, variantes de ortografía); el merge inteligente de LLM fusiona contenido y preserva aliases
- **🧩 Smart Knowledge Fusion** — Las actualizaciones multi-source fusionan información nueva sin redundancia; las contradicciones se preservan con atribución; las páginas `reviewed: true` se protegen de sobrescritura
- **📏 Content Truncation Protection** — 8000 max_tokens con detección automática de stop_reason y reintento a 2× tokens en todos los providers
- **📝 Verbatim Source Mentions** — Las citas en idioma original se preservan con traducción opcional para trazabilidad

### 🛠️ Mantenimiento

- **🔍 Lint Health Scan** — Detecta duplicados, dead links, empty pages, orphans, aliases faltantes y contradicciones en informe integral
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (coincidencias directas de nombre: cross-language, abreviaturas, títulos de alta similitud) siempre verificadas; Tier 2 (señales indirectas: enlaces compartidos, similitud moderada) llena el presupuesto de tokens
- **⚡ Smart Fix All** — Batch fix ordenado por causalidad: duplicados fusionados → dead links resueltos → orphans enlazados → empty pages expandidas
- **🏷️ Alias Completion** — Generación paralela de batch de aliases faltantes en un clic, mejorando detección futura de duplicados
- **🔄 Auto-Maintenance** — File watcher multi-carpeta, lint periódico, health check al inicio (todos opcionales)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (AI fix) o `detected → pending_fix` (manual)

### 💬 Query & Feedback

- **🤖 Conversational Query** — Diálogo estilo ChatGPT con Markdown en streaming e `[[wiki-links]]`, historial multi-turn
- **📤 Query-to-Wiki Feedback** — Guarda conversaciones valiosas al Wiki con entity/concept extraction, semantic dedup antes de guardar
- **🔒 Duplicate Save Prevention** — El hash tracking previene re-evaluación de conversaciones sin cambios

### 🌐 LLM & Idioma

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, custom endpoints
- **🔄 5xx Retry** — Reintento automático de backoff exponencial (máx 2) en errores HTTP 5xx/429/529/529 en todos los clientes
- **📋 Dynamic Model List** — Fetching en tiempo real desde APIs de provider
- **🌐 Wiki Output Language** — 8 idiomas independientes de la UI (EN/ZH/JA/KO/DE/FR/ES/PT), con input personalizado
- **🌍 Internacionalización completa de UI** — Interfaz del plugin en 8 idiomas (EN/ZH/JA/KO/DE/FR/ES/PT), 269+ campos UI totalmente traducidos, expresiones locales naturales
- **⚡ Rate Limit Guardian** — Cuando la generación paralela activa rate limits, auto-detección y sugerencias: reducir concurrencia, aumentar delay batch, cambiar provider
- **🦙 Web Clipper Compatible** — Agregar con un clic el folder `Clippings/` de Obsidian Web Clipper a la watchlist, clips web auto-ingestados en Wiki

### 🏗️ Arquitectura & Rendimiento

- **⚡ Parallel Page Generation** — 1–5 páginas concurrentes configurables, por defecto 3 (paralelo), 2–3× más rápido para sources grandes, aislamiento de errores por página
- **📚 Iterative Batch Extraction** — El tamaño de batch adaptativo elimina el cuello de botella de max_tokens para documentos largos
- **🏛️ Three-Layer Architecture** — `sources/` (solo lectura) → `wiki/` (generado por LLM) → `schema/` (config co-evolucionada)
- **🧩 Modular Codebase** — 13 módulos enfocados en `src/`

### 🔒 Privacidad y seguridad

- **Sin backend, sin telemetría.** El plugin se ejecuta completamente dentro de Obsidian — no hay servidor externo, ni análisis, ni recopilación de datos de ningún tipo. Tus notas nunca salen de tu bóveda a menos que configures explícitamente un proveedor LLM.
- **Tus datos permanecen locales por defecto.** El plugin no almacena, almacena en caché ni transmite tu contenido a ningún lugar más allá de la API LLM que elijas. Solo el texto que envías para ingesta o consulta sale de tu dispositivo — y solo al proveedor que configuraste.
- **Modo completamente local con Ollama, LM Studio o proveedores locales.** Para una soberanía total de datos, utiliza un LLM de ejecución local. Tus notas se procesan completamente en tu máquina — nada toca Internet.
- **Permisos mínimos.** El acceso a archivos de la bóveda es necesario para la gestión del wiki (leer notas, generar páginas, detectar enlaces rotos). El acceso a la red se usa exclusivamente para llamadas a la API LLM de tu proveedor elegido. El acceso al portapapeles se limita al botón "Copiar" en el modal de Consulta — solo cuando haces clic en él.

---


---

## ⌨️ Comandos

| Comando | Descripción |
|---------|-------------|
| **📥 Ingestar fuente individual** | Selecciona nota → genera Wiki pages con entities, concepts y summary |
| **📂 Ingestar desde carpeta** | Selecciona carpeta → genera Wiki en batch desde notas existentes |
| **🔍 Consultar wiki** | Q&A conversacional sobre tu Wiki, respuestas en streaming con `[[wiki-links]]` |
| **🛠️ Verificar wiki** | Escaneo completo de salud: duplicados, dead links, empty pages, orphans, aliases faltantes, contradicciones |
| **📋 Regenerar índice** | Reconstruye manualmente `wiki/index.md` |
| **⏹️ Cancelar operación** | `Cmd+P` → "Cancel current ingestion" o clic en barra de estado — parada segura en límites de lote |
| **💡 Sugerir actualizaciones del esquema** | El LLM analiza el Wiki y propone mejoras al schema |

---

## 📖 Ejemplo

**Entrada:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning usa algoritmos para aprender de datos.

### Tipos
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

### Supervised Learning

### Información Básica
- Type: method
- Source: [[sources/machine-learning]]

### Descripción
Supervised learning es un paradigma de machine learning donde los modelos aprenden
de datos de entrenamiento etiquetados para hacer predicciones sobre datos no vistos...

### Conceptos Relacionados
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### Entities Relacionados
- [[entities/Arthur-Samuel|Arthur Samuel]]

### Menciones en Source
- "Supervised learning usa datos etiquetados para entrenar modelos predictivos..."
```

---

## 🤖 Guía de Selección de Models

Este plugin sigue la filosofía de Karpathy: **alimentar al LLM con el contexto completo del Wiki, no con recuperación RAG fragmentada**. Se recomiendan fuertemente los models de long-context: cuanto más crece tu Wiki, más contexto necesita el LLM.

> 💡 **¿Por qué no RAG?** La [crítica original de Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) argumenta que RAG fragmenta el conocimiento y rompe la capacidad del LLM para razonar a través del grafo de conocimiento completo.

**🌟 Recomendaciones principales:**

| Tier | Model | Context Window | Por qué |
|------|-------|---------------|---------|
| **🌟 Valor** | **DeepSeek V4-Flash** | 1M tokens | Precio más bajo ($0.14/M), 284B MoE, ideal para ingestión batch |
| **🌟 Valor** | **Gemini-3.5-Flash** | 1M tokens | 4× más rápido que GPT-5.5, excelente para tareas agent |
| **🌟 Valor** | **Qwen3.6-Plus** | 1M tokens | Fuerte capacidad coding & agent, precio competitivo |
| **🌟 Valor** | **Grok-4** | 2M tokens | 2M contexto, ideal para wikis muy grandes |
| **Balanceado** | **Claude Sonnet 4.6** | 1M tokens | Buen equilibrio calidad/costo, $3/$15 por millón de tokens |
| **Ligero** | **Claude Haiku 4.5** | 200K tokens | Rápido y económico, para wikis pequeños |
| **Económico** | **MiMo-V2.5-Flash** | 1M tokens | Opción económica de Xiaomi, arquitectura MoE 309B |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Calidad máxima, costo alto — usar selectivamente |
| **Flagship** | GPT-5.5 | 1M tokens | Razonamiento top, costo alto — usar selectivamente |

Para models locales (Ollama): las ventanas de contexto son típicamente más pequeñas (8K–128K). Considera usar un provider en la nube para ingestion + model local para query.

**🔌 Anthropic Compatible (Coding Plan):** Si tu provider ofrece un endpoint de API compatible con Anthropic, selecciona "Anthropic Compatible" e ingresa el Base URL y API Key de tu provider.

> 💡 **Planes de suscripción:** Si tienes planes tipo Coding Plan, OpenAI Pro o Anthropic Pro, son excelentes opciones para controlar costos con uso frecuente. El plugin es compatible con estos servicios.

---

## 🏗️ Arquitectura

Diseño de tres capas de Karpathy:

```
sources/     # 📄 Tus documentos fuente (solo lectura)
  ↓ ingest
wiki/        # 🧠 Wiki pages generadas por LLM
  ↓ query / maintain
schema/      # 📋 Configuración de estructura Wiki (nomenclatura, plantillas, categorías)
```

**Codebase** (`src/`):

```
wiki/               # Módulos del motor Wiki
  wiki-engine.ts    # 🎯 Orquestador
  query-engine.ts   # 💬 Query conversacional
  source-analyzer.ts # 📊 Extracción batch iterativa
  page-factory.ts   # 🏗️ CRUD de entity/concept + merge
  lint-controller.ts # 🔍 Orquestación de Lint
  lint-fixes.ts     # 🛠️ Lógica de fix (dead links, empty pages, orphans)
  lint/             # Submódulos de Lint
    duplicate-detection.ts  # 🔄 Generación programática de candidatos duplicados
    fix-runners.ts          # ⚡ Ejecutores de fix en lote
  contradictions.ts # ⚠️ Detección de contradicciones
  system-prompts.ts # 🗣️ Directiva de idioma + etiquetas de sección
schema/             # Co-evolución del schema
  schema-manager.ts # 📋 CRUD de schema + sugerencias
  auto-maintain.ts  # 🔄 File watcher + lint periódico
ui/                 # Interfaz de usuario
  settings.ts       # ⚙️ Panel de configuración
  modals.ts         # 📦 Modales de Lint/Ingest/Query
+ módulos compartidos: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Páginas generadas:**
- `wiki/sources/filename.md` — 📄 Source summary
- `wiki/entities/entity-name.md` — 👤 Entity pages (personas, orgs, proyectos, etc.)
- `wiki/concepts/concept-name.md` — 💡 Concept pages (teorías, métodos, términos, etc.)
- `wiki/index.md` — 📑 Índice generado automáticamente
- `wiki/log.md` — 📝 Registro de operaciones

---

## ❓ FAQ

> **Mantén el plugin actualizado.** Este proyecto se actualiza con frecuencia — nuevas funciones y correcciones llegan cada pocos días. En Obsidian, ve regularmente a **Configuración → Plugins comunitarios → Buscar actualizaciones**.
>
> Más preguntas en la [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

### 💡 General

**¿Qué hace este plugin realmente?**
Coloca notas, extrae personas, conceptos y teorías, y genera un Wiki interconectado con `[[wiki-links]]`. Haz preguntas y obtén respuestas basadas en *tus* notas — no alucinaciones de internet.

**¿Requisitos mínimos?**
Obsidian v1.6.6+, escritorio (Windows/macOS/Linux), una API key de un provider LLM. Ollama funciona localmente sin API key.

**¿Por qué no puedo usar las funciones después de instalar?**
Configuración → Karpathy LLM Wiki → elegir proveedor → ingresar API Key → Fetch Models → seleccionar modelo → Test Connection. El indicador verde "LLM Ready" desbloquea todas las funciones.

**¿Cómo cancelar una ingesta/Lint en curso?**
Clic en la barra de estado o Ctrl+P → "Cancel current ingestion". Se detiene limpiamente al finalizar el lote actual.

**¿Cómo ingestionar rápidamente el archivo que estoy editando?**
Haz clic en el icono `sticker` de la barra lateral izquierda, o usa `Ctrl+P` → "Ingest current file". Omite el selector de archivos e ingiere directamente la pestaña activa del editor.

**¿Qué modelo elegir?**
Consulta [Recomendaciones de modelos](#-recomendaciones-de-modelos) arriba. Se recomiendan modelos de contexto largo — cuanto más grande tu Wiki, más contexto necesita el LLM.

### 🏷️ Aliases y Duplicados

**¿Por qué Lint muestra "aliases faltantes" en casi todas mis páginas?**
Las páginas Wiki de wikis antiguos no incluían aliases por defecto. Es inofensivo — los aliases son una mejora, no un defecto. Haz clic en **Complete Aliases** en el informe Lint para generar traducciones, acrónimos y nombres alternativos en un lote.

**¿Por qué veo páginas duplicadas con nombres similares?**
Las versiones antiguas no usaban detección de duplicados consciente de aliases. Ejecuta **Lint Wiki** → **Merge Duplicates** para fusionarlos.

**¿Cómo funciona la detección de duplicados?**
Detección semántica de dos niveles: Nivel 1 (siempre verificado por LLM) captura coincidencias entre idiomas, abreviaturas, títulos de alta similitud. Nivel 2 llena el presupuesto de tokens restante con candidatos de similitud moderada.

**¿Qué son las "páginas contaminadas"?**
Páginas con prefijos de carpeta incorporados accidentalmente en nombres de archivo (ej.: `concepts/conceptsOptimizaciónLayout.md`). Ejecuta **Lint Wiki** → **🧹 Fix Polluted Pages** para renombrar y actualizar todos los enlaces entrantes.

### ⚡ Rendimiento y Control de costos

**¿Cómo acelero la ingestión?**
En **Configuración → Ingestion Acceleration**: aumenta **Page Generation Concurrency** a 3–5, reduce **Batch Delay** a 100–300ms (cuidado con rate limiting). Elige granularidad "Mínima", "Gruesa" o "Estándar" para reducir el número de páginas y ahorrar costos de API.

**¿Por qué recibo errores HTTP 429?**
El plugin detecta automáticamente rate limiting y sugiere: reducir concurrencia a 1–2, aumentar Batch Delay a 500–800ms, o cambiar a un provider con límites más altos.

**¿Cómo controlo los costos de API?**
- Auto-Maintenance está OFF por defecto (activar solo si es necesario)
- Smart Batch Skip salta automáticamente archivos ya ingeridos
- Granularidad "Standard" o "Coarse" = menos llamadas LLM
- Batch Delay > 500ms solo espacia llamadas sin aumentar tokens
- El informe Lint muestra conteos antes de ejecutar correcciones

### 🧹 Mantenimiento

**¿Qué hace Smart Fix All?**
Ejecuta correcciones en orden causal:
1. 🧹 Corregir páginas contaminadas → 2. 🏷️ Completar aliases → 3. 🔄 Fusionar duplicados → 4. 🔗 Reparar dead links → 5. 🔗 Enlazar huérfanos → 6. 📝 Expandir páginas vacías

**¿Lint se congela en un Wiki grande?**
Lint cede el control al hilo UI de Obsidian cada 50 páginas, evitando congelamientos.

### 🔍 Solución de Problemas

**¿Dobles corchetes `[[[[entities/Foo|Foo]]]]` en mi log.md — cómo arreglarlo?**
Ejecuta **Lint Wiki** — el escáner detecta y corrige automáticamente todos los wiki-links doblemente anidados en todo tu directorio wiki (incluido log.md) sin coste de LLM. No necesitas limpieza manual.

**¿Por qué recibo errores "Overloaded"?**
El plugin ahora reconoce el error 529 (overload) de Anthropic como reintentable. Los errores de overload se reintentan automáticamente con backoff exponencial en todos los providers.

**¿Por qué se creó un stub duplicado cuando la página ya existe en entities/ o concepts/?**
El plugin ahora usa emparejamiento basado en slug — diferentes formatos del mismo nombre resuelven a la página existente en lugar de crear un stub duplicado.

**¿Query no encuentra páginas que sé que existen?**
Tres causas: (1) Índice desactualizado → **Regenerate index**. (2) Faltan aliases → **Complete Aliases**. (3) Reformula — el LLM hace coincidencia semántica, no búsqueda por palabras clave.

**¿Puedo editar páginas Wiki manualmente?**
Sí. Establece `reviewed: true` en el frontmatter para proteger de sobrescritura. Los aliases, tags y sources manuales se preservan durante fusiones.

**¿Actualización segura?**
El plugin nunca modifica tus archivos fuente. Respaldar `wiki/` → actualizar plugin → **Regenerate index** → **Lint Wiki** → corregir selectivamente.

**¿Cómo obtener ayuda?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — reportar errores
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — preguntas y comentarios
5. 🛠️ Aplica las reparaciones de forma selectiva — no tienes que arreglar todo de una vez

---

## 🔒 Transparencia y cumplimiento

Este plugin está listado en el Mercado de Plugins Comunitarios de Obsidian y se somete a revisión automatizada de seguridad y permisos.

**El plugin no tiene backend, ni infraestructura de servidor, ni recopilación de datos de ningún tipo.** Es software puramente local que se ejecuta dentro de Obsidian. El plugin no puede ni recopila, almacena o transmite tus datos a ningún servidor — porque dicho servidor no existe.

**El acceso a la red** se utiliza solo para comunicarse con el proveedor LLM que configures — no se realizan otras llamadas de red. Esto está completamente bajo tu control: tú eliges el proveedor, tú introduces la clave API, tú decides a dónde van tus datos.

**El acceso al sistema de archivos** (enumeración de la bóveda) es necesario para construir y mantener el wiki: leer tus notas fuente, generar páginas, escanear enlaces rotos y detectar páginas duplicadas. El plugin nunca modifica tus archivos fuente — solo los archivos dentro de la carpeta wiki.

**El acceso al portapapeles** se usa exclusivamente por el botón "Copiar" en el modal de Consulta, y solo cuando haces clic en él.

Si prefieres una localidad completa de datos, utiliza un proveedor LLM local como Ollama o LM Studio. Con un proveedor local, tus datos nunca salen de tu máquina.
## 📜 Licencia

MIT License — consulta [LICENSE](LICENSE).

## 🙏 Agradecimientos

- **💡 Concepto:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — la visión original que inspiró este plugin
- **🛠️ Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM SDKs:** Anthropic SDK, OpenAI SDK

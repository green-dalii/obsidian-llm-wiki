![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conocimiento estructurada impulsada por IA que ingiere tus notas y genera un Wiki conectado — basado en el concepto de [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Puntuación oficial Obsidian 95/100** | Soporte nativo de 8 idiomas | Mantenimiento activo, evolución continua

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Sitio oficial](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Comentarios y debate](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código con DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

## 📑 Contents

- [💡 ¿Qué es LLM-Wiki?](#-qué-es-llm-wiki)
- [⚡ ¿Por qué Obsidian + LLM-Wiki?](#-por-qué-obsidian--llm-wiki)
- [🚀 Inicio Rápido](#-inicio-rápido)
  - [📦 Instalación](#-instalación)
  - [🔄 Actualizar el plugin](#-actualizar-el-plugin)
  - [🔑 Configurar un Provider de LLM](#-configurar-un-provider-de-llm)
  - [🎮 Uso](#-uso)
  - [⚠️ Actualizando desde una Versión Anterior](#️-actualizando-desde-una-versión-anterior)
- [⚡ Novedades en la v1.15.0](#-novedades-en-la-v1150)
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

## ⚡ ¿Por qué Obsidian + LLM-Wiki?

Obsidian destaca en el pensamiento enlazado. Pero hay un problema: eres tú quien crea todos los enlaces.

LLM-Wiki cambia esto. En lugar de construir el grafo manualmente, la IA lo hace crecer contigo. Agrega una nota sobre un concepto nuevo — encuentra conexiones que tú omitirías. Haz una pregunta — recorre tu grafo de conocimiento y obtén respuestas con citas.

- **🔗 El Graph View cobra vida.** Las notas nuevas no quedan aisladas: brotan enlaces a entities, concepts y sources. El grafo crece orgánicamente y el plugin lo mantiene: detecta duplicados, corrige dead links, unifica idiomas mediante aliases.
- **💬 Tus notas aprenden a responder.** La búsqueda se convierte en conversación. "¿Qué escribí sobre X?" se transforma en diálogo, con respuestas en streaming y `[[wiki-links]]` como migas de pan. Cada respuesta profundiza en tu conocimiento.
- **🧠 Obsidian se convierte en compañero de pensamiento.** Deja de ser un armario de notas y empieza a ayudarte a *pensar*: revela conexiones ocultas, señala contradicciones, recupera lo que olvidaste haber sabido.

---

## 🚀 Inicio Rápido

### 📦 Instalación

**🌟 Recomendado — Mercado de Plugins de la Comunidad Obsidian:**

1. En Obsidian, ve a **Configuración → Plugins de comunidad**
2. Haz clic en **Explorar** y busca "Karpathy LLM Wiki"
3. Haz clic en **Instalar**, luego **Habilitar**

**🌐 O desde el sitio web de Plugins de Comunidad:** visita [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) y haz clic en **Agregar a Obsidian** para instalar directamente.

**⚙️ Manual (alternativa):**

1. Descarga `main.js`, `manifest.json`, `styles.css` de [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. En Obsidian, ve a Configuración → Plugins de comunidad. En la pestaña **Plugins instalados**, haz clic en el icono de carpeta para abrir el directorio de plugins
3. Crea una carpeta llamada `karpathywiki` y coloca los tres archivos dentro
4. Vuelve a Obsidian y haz clic en el icono de actualizar: **Karpathy LLM Wiki** aparecerá en Plugins instalados
5. Actívalo para habilitarlo

**🔨 Desarrollo:** `git clone`, `pnpm install`, `pnpm build`.

### 🔄 Actualizar el plugin

Este proyecto evoluciona rápidamente — nuevas funciones, correcciones de errores y mejoras se publican frecuentemente. Recomendamos mantenerse actualizado:

**Opción A — Actualización manual (recomendada):**
1. Abra **Configuración → Plugins de comunidad**
2. Haga clic en **Buscar actualizaciones**
3. Encuentre **Karpathy LLM Wiki** en la lista y haga clic en **Actualizar**

**Opción B — Activar actualización automática:**
1. Abra **Configuración → Plugins de comunidad**
2. Active **Buscar actualizaciones de plugins automáticamente**
3. Las nuevas versiones se detectarán automáticamente; actualice manualmente cuando lo prefiera

> 💡 **¿Por qué mantenerse actualizado?** Cada versión puede incluir nuevas funciones, mejoras de rendimiento y correcciones de errores importantes. Mantenemos activamente este plugin — perder actualizaciones significa perder una mejor experiencia.

### 🔑 Configurar un Provider de LLM

1. Abre Configuración → Karpathy LLM Wiki
2. Selecciona un provider del menú desplegable (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter o personalizado)
3. Ingresa tu API key (no requerida para Ollama)
4. Haz clic en **Fetch Models** para poblar el menú de models, o escribe un model name manualmente
5. Haz clic en **Test Connection**, luego **Save Settings**

**🦙 Ollama (local, sin API key):** Instala [Ollama](https://ollama.com), descarga un model (`ollama pull gemma4`), selecciona "Ollama (Local)" en el menú de provider.

> Consulta la [Guía de Selección de Models](#-guía-de-selección-de-models) para más detalles.

### 🎮 Uso

| Método | Cómo |
|--------|------|
| **📥 Ingestar fuente individual** | `Cmd+P` → "Ingestar fuente individual" — selecciona una nota específica para extraer entidades y conceptos en páginas Wiki |
| **📂 Ingestar desde carpeta** | `Cmd+P` → "Ingestar desde carpeta" — elige una carpeta, procesa todas las notas en lote |
| **🔍 Consultar wiki** | `Cmd+P` → "Consultar wiki" — haz preguntas, obtén respuestas en streaming con `[[wiki-links]]` |
| **🛠️ Verificar wiki** | `Cmd+P` → "Verificar wiki" — escaneo de salud: duplicados, enlaces rotos, páginas huérfanas, páginas vacías, alias faltantes |
| **📋 Regenerar índice** | `Cmd+P` → "Regenerar índice" — reconstruir `wiki/index.md` con páginas actuales y alias |
| **⏹️ Cancelar operación** | `Cmd+P` → "Cancel current ingestion" o clic en barra de estado — parada segura en límites de lote |
| **🎯 Ingesta en un clic** | Icono `sticker` en barra lateral o `Cmd+P` → "Ingest current file" — ingiere directamente el archivo activo |
| **💡 Sugerir actualizaciones del esquema** | `Cmd+P` → "Sugerir actualizaciones del esquema" — el LLM analiza la Wiki y propone mejoras al esquema |

Re-ingesting la misma source realiza actualizaciones incrementales en entity/concept pages (información nueva fusionada). Las summary pages se regeneran.

**Smart Batch Skip:** Al ingerir una carpeta, el plugin detecta automáticamente archivos ya procesados y los omite para ahorrar tiempo y costos de API. El informe de batch muestra el conteo de omitidos.

### ⚠️ Actualizando desde una Versión Anterior

**Esta versión es totalmente retrocompatible.** v1.14.0 no contiene cambios incompatibles — tus páginas Wiki, configuración y flujos de trabajo existentes se preservan. No necesitas reconfigurar ni migrar datos.

**Si tu Wiki existente fue construido a lo largo de muchas versiones**, algunas páginas pueden carecer de capacidades recientes (aliases, deduplicación consciente de aliases, prompts modernizados). Ejecuta **Lint Wiki** para ver qué necesita atención. Smart Fix All gestiona las limpiezas más comunes con un solo clic.

**Si actualizas desde una versión anterior a v1.14.0**, ejecuta **Lint Wiki** una vez para corregir automáticamente problemas históricos:
- **Enlaces doblemente anidados** `[[[[entities/Foo|Foo]]]]` en log.md — Lint los detecta y corrige sin coste de LLM
- **Stubs duplicados entre directorios** — páginas que existen tanto en `entities/` como en `concepts/` con el mismo slug ahora se emparejan correctamente

**Para Wikis construidos a lo largo de muchas versiones**, sigue estos pasos para llevar tu Wiki a los estándares actuales:

**1️⃣ Reconstruye tu índice**
`Cmd+P` → **"Regenerar índice"** — Reconstruye `wiki/index.md` con entradas de alias para cada página, habilitando la búsqueda consciente de aliases (ej., buscar "DSA" encuentra "DeepSeek-Sparse-Attention"). El formato antiguo del índice solo listaba títulos de página.

**2️⃣ Ejecuta Verificar wiki**
`Cmd+P` → **"Verificar wiki"** — Escanea todo tu Wiki y muestra:
- **🏷️ Aliases faltantes**: Páginas sin aliases (de cualquier versión, si nunca ejecutaste "Complete Aliases"). Haz clic en **"Complete Aliases"** — el LLM genera traducciones, acrónimos y nombres alternativos en lote. Esto es crítico para la detección de duplicados.
- **🔄 Páginas duplicadas**: Páginas con contenido solapado (ej., "CoT" vs "Cadena-de-Pensamiento" creadas por versiones antiguas sin dedup consciente de aliases). Haz clic en **"Merge Duplicates"** para fusionarlas y preservar todos los aliases.
- **💀 Dead links / Empty pages / Orphans**: Problemas estándar de mantenimiento del Wiki.

**3️⃣ Usa Smart Fix All**
Haz clic en **"Smart Fix All"** en el informe de Lint para una reparación con un solo clic ordenada por causalidad: aliases completados → duplicados fusionados → dead links corregidos → orphans enlazados → empty pages expandidas. Es la forma más rápida de limpiar un wiki construido a través de muchas versiones.

**4️⃣ Habilita la generación paralela de páginas**
Configuración → **Ingestion Acceleration**:
- **⚡ Page Generation Concurrency**: Ajústalo a 3 para la mayoría de providers. Acelera la ingestion 2–3× en sources con 10+ entities.
- **⏱️ Batch Delay**: Empieza en 300ms. Auméntalo a 500–800ms si encuentras rate limiting.

**5️⃣ Revisa las opciones actuales:**
- **🌐 Wiki Output Language**: Independiente del idioma de la UI — tu Wiki puede estar en chino mientras la UI del plugin está en español, o viceversa.
- **📊 Granularidad de extracción**: Cinco opciones controlan qué profundamente extrae el LLM entities de las sources:
  - **Fina** (~100 elementos) — Análisis profundo, menciones marginales incluidas. Alto costo de tokens, ideal para fuentes clave.
  - **Estándar** (~50 elementos) — Extracción equilibrada. Buen valor por defecto para notas diarias.
  - **Gruesa** (~10 elementos) — Vista rápida, solo entities principales. Bajo costo, ingestión rápida.
  - **Mínima** (~5 elementos) — Solo elementos esenciales. Ideal para procesar por lotes 100+ archivos o probar nuevas sources.
  - **Personalizada** (1–300 elementos) — Límites definidos por usuario para entity/concept, workflows especializados.
  > 💡 **Recomendación**: Usa Mínima o Gruesa para carpetas grandes para ahorrar tiempo y costos de API. Fina solo selectivamente para documentos clave que merecen análisis profundo.
- **🔄 Auto-Maintenance**: File watcher opcional, Lint periódico y health check al inicio. Todo OFF por defecto — actívalo solo si quieres procesamiento automático en segundo plano.

> **🛡️ Seguridad:** La generación paralela usa `Promise.allSettled` — si una página falla, las demás continúan. Las páginas fallidas se reintentan individualmente con backoff exponencial. Smart Batch Skip detecta automáticamente archivos ya ingestados para ahorrar tiempo y costos de API.

---
---

## ⚡ Novedades en la v1.15.0

Esta versión se centra en la **UX de inicialización de Wiki y la optimización de la arquitectura** – enfocada en una configuración inicial fluida y la expansión continua de la infraestructura de pruebas.

**Mejoras clave:**

- **Auto-inicialización de Wiki (Issue #80).** Después del primer test de conexión LLM exitoso, el plugin crea automáticamente la estructura de carpetas Wiki (entities, concepts, sources, schema). El indicador de estado (✅/⚠️) en el panel de Configuración muestra la salud del Wiki en tiempo real. Se resuelve el problema del botón "Regenerar esquema predeterminado" que no respondía en un vault nuevo.

- **Extracción del parser SSE.** La lógica de parsing de respuestas en streaming (formatos Anthropic + OpenAI) se extrajo como función pura compartida en `src/core/sse-parser.ts`. 11 tests cubriendo ambos formatos, normalización CRLF, tolerancia a JSON malformado y el terminador `[DONE]`.

- **Extracción del retry de truncamiento.** La política de retry de truncamiento de tokens (detección de `stop_reason=max_tokens` o `finish_reason=length`, duplicar max_tokens, un retry) se unificó en `src/core/truncation-retry.ts`. Eliminación de 3 bloques de código duplicados entre clientes LLM. 7 tests cubriendo comportamiento de cap, propagación de errores y registro de advertencias.

- **Crecimiento de la infraestructura de pruebas.** +37 tests (446 en total en 21 archivos). Tests de retry de truncamiento de AnthropicClient (9 tests, incluyendo restauración de llaves prefill, cap MAX_TOKENS_BATCH, passthrough de cacheBreakpoint). Tests de inicialización de Wiki (10 tests, mocks puros, sin runtime de Obsidian requerido).

- **Cierre de calidad de desarrollo.** El ciclo TDD + planificación está formalmente documentado en CLAUDE.md con un ejemplo real de violación (2026-06-02). Todas las nuevas alteraciones de código siguen el ciclo de 9 pasos.

**¿Actualizando desde una versión anterior?** Simplemente instale y use — cero cambios disruptivos. Sus páginas Wiki, configuraciones y flujos de trabajo existentes se preservan. No se necesita reconfiguración.

**Recomendamos encarecidamente a todos los usuarios actualizar a esta versión.**

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

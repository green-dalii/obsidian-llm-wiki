![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conocimiento estructurada impulsada por IA que ingiere tus notas y genera un Wiki conectado — basado en el concepto de [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Puntuación oficial Obsidian 95/100 | Soporte nativo de 10 idiomas | Búsqueda por grafo sin embeddings | Plena soberanía de datos | Compatible con cualquier proveedor de LLM**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | **Español** | [Português](README_PT.md) | [Italiano](README_IT.md)

[Sitio oficial](https://llmwiki.greenerai.top/) | [Mercado de Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Comentarios y debate](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código con DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Si este plugin te ha sido útil, invítame a un café♥️ o deja una estrella🌟↗

---

## 📑 Contents

- [🧠 Karpathy LLM Wiki Plugin para Obsidian](#-karpathy-llm-wiki-plugin-para-obsidian)
  - [📑 Contents](#-contents)
  - [💡 ¿Qué es LLM-Wiki?](#-qué-es-llm-wiki)
  - [⚡ ¿Por qué Obsidian + LLM-Wiki?](#-por-qué-obsidian--llm-wiki)
  - [🚀 Inicio rápido](#-inicio-rápido)
    - [📦 Instalación](#-instalación)
    - [🔄 Actualización](#-actualización)
    - [🔑 Configurar un proveedor LLM](#-configurar-un-proveedor-llm)
    - [🎮 Uso](#-uso)
    - [⚠️ ¿Actualizar desde una versión anterior?](#️-actualizar-desde-una-versión-anterior)
  - [⚡ Novedades de la v1.24.0](#-novedades-de-la-v1240)
  - [✨ Características](#-características)
    - [📊 Calidad del Conocimiento](#-calidad-del-conocimiento)
    - [📄 Ingesta de PDF (v1.25.0)](#-ingesta-de-pdf-v1250)
    - [💬 Query \& Feedback](#-query--feedback)
    - [🛠️ Mantenimiento](#️-mantenimiento)
    - [🌐 LLM \& Idioma](#-llm--idioma)
    - [🏗️ Arquitectura \& Rendimiento](#️-arquitectura--rendimiento)
    - [🔒 Privacidad y seguridad](#-privacidad-y-seguridad)
  - [📖 Ejemplo](#-ejemplo)
  - [🤖 Guía de Selección de Models](#-guía-de-selección-de-models)
    - [☁️ Modelos en la nube](#️-modelos-en-la-nube)
    - [🦙 Modelos locales (Ollama / LM Studio)](#-modelos-locales-ollama--lm-studio)
    - [📄 Ruta OCR PDF local (v1.25.0+)](#-ruta-ocr-pdf-local-v1250)
  - [🏗️ Arquitectura](#️-arquitectura)
  - [❓ FAQ](#-faq)
  - [🔒 Transparencia y cumplimiento](#-transparencia-y-cumplimiento)
  - [💖 Apoyar el proyecto](#-apoyar-el-proyecto)
    - [Patrocinadores](#patrocinadores)
  - [📜 Licencia](#-licencia)
  - [🙏 Agradecimientos](#-agradecimientos)
  - [Star History](#star-history)

## 💡 ¿Qué es LLM-Wiki?

Escribe. La IA organiza. Pregunta. Así de simple.

**🎯 El problema.** Tus notas son una mina de oro: personas, conceptos, ideas, conexiones. Pero ahora mismo son solo archivos en carpetas. Buscar relaciones requiere etiquetado manual y memoria.

**✨ La solución.** [Andrej Karpathy propuso](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) un enfoque elegante: trata tus notas como materia prima y deja que un LLM desempeñe el papel de arquitecto. Lee lo que escribes, extrae entities y concepts, y los teje en un Wiki estructurado — con `[[wiki-links]]` bidireccionales, índice generado automáticamente e interfaz de chat que responde desde *tu* conocimiento.

**📚 No necesitas ser el bibliotecario.** No decidir qué merece página. No mantener enlaces cruzados. No verificar si algo está desactualizado. Elige cualquier nota (o carpeta, o selección múltiple) de tu vault — el LLM lee, extrae, escribe, enlaza y señala contradicciones — mientras tú mantienes el flujo.

**🤖 No es un chatbot más.** ChatGPT conoce internet. LLM-Wiki te conoce *a ti* — o más bien, lo que le has enseñado. Cada respuesta incluye `[[wiki-links]]` de regreso a tu grafo de conocimiento. Cada respuesta es un punto de partida, no un callejón sin salida.

---

## ⚡ ¿Por qué Obsidian + LLM-Wiki?

Obsidian es brillante en el pensamiento conectado. Pero hay un inconveniente: eres tú quien hace todas las conexiones.

LLM-Wiki invierte eso. En lugar de que construyas el grafo a mano, la IA lo cultiva contigo. Agrega una nota sobre un nuevo concepto — encuentra las conexiones que habrías pasado por alto. Haz una pregunta — recorre tu propio grafo de conocimiento y trae respuestas con citas.

- **🔗 Tu Graph View cobra vida.** Las nuevas notas no simplemente están ahí — brotan enlaces a entidades, conceptos y fuentes. El grafo crece orgánicamente, y el plugin lo mantiene: detectando duplicados, corrigiendo enlaces rotos, poniendo puentes entre idiomas mediante aliases.
- **💬 Tus notas aprenden a responderte.** La búsqueda se convierte en conversación. "¿Qué escribí sobre X?" se transforma en un diálogo, con respuestas en streaming y `[[wiki-links]]` como migas de pan. Cada respuesta es un camino más profundo en tu propio conocimiento.
- **🧠 Obsidian se convierte en un compañero de pensamiento.** Deja de ser un archivador de notas y pasa a ser algo que te ayuda a *pensar* — revelando conexiones ocultas, señalando contradicciones, recordando lo que habías olvidado que sabías.

---

## 🚀 Inicio rápido

### 📦 Instalación

**🌟 Recomendado — Mercado de plugins comunitarios de Obsidian:**
1. En Obsidian, ve a **Configuración → Plugins comunitarios**
2. Haz clic en **Examinar** y busca "Karpathy LLM Wiki"
3. Haz clic en **Instalar**, luego **Habilitar**

**🌐 O desde el sitio web de plugins comunitarios —** visita [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) y haz clic en **Add to Obsidian**.

**⚙️ Manual (alternativa):**
1. Descarga `main.js`, `manifest.json`, `styles.css` desde [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. En Obsidian, ve a Configuración → Plugins comunitarios. Haz clic en el icono de carpeta para abrir el directorio de plugins
3. Crea una carpeta llamada `karpathywiki`, coloca los tres archivos dentro
4. De vuelta en Obsidian, haz clic en el icono de refrescar — **Karpathy LLM Wiki** aparecerá
5. Actívalo para habilitarlo

**🔨 Desarrollo:** `git clone`, `pnpm install`, `pnpm build`.

### 🔄 Actualización

Este proyecto evoluciona rápidamente. Recomendamos mantenerse actualizado:

**Opción A — Actualización manual (recomendada):**
1. Ve a **Configuración → Plugins comunitarios**
2. Haz clic en **Buscar actualizaciones**
3. Encuentra **Karpathy LLM Wiki** y haz clic en **Actualizar**

**Opción B — Habilitar actualización automática:**
1. Ve a **Configuración → Plugins comunitarios**
2. Activa **Comprobar automáticamente actualizaciones de plugins**

> 💡 **¿Por qué mantenerse actualizado?** Cada versión puede incluir nuevas funciones, mejoras de rendimiento y correcciones de errores importantes.

### 🔑 Configurar un proveedor LLM

1. Abre Configuración → Karpathy LLM Wiki
2. Elige un proveedor del menú desplegable
3. Ingresa tu clave API (no necesaria para Ollama)
4. Haz clic en **Fetch Models**, o escribe un nombre de modelo manualmente
5. Haz clic en **Test Connection**, luego **Guardar configuración**

**🦙 Ollama (local):** Instala [Ollama](https://ollama.com), descarga un modelo, selecciona "Ollama (Local)".

**🎛️ LM Studio (local):** Instala [LM Studio](https://lmstudio.ai), inicia el servidor local, selecciona "LM Studio (Local)".

### 🎮 Uso

| Método | Cómo |
|--------|------|
| **📥 Ingestar fuente individual** | `Cmd+P` → "Ingest single source" — selecciona una nota (Markdown o **PDF, v1.25.0+**) para generar páginas Wiki con entidades y conceptos |
| **📂 Ingestar desde carpeta** | `Cmd+P` → "Ingest from folder" — selecciona una carpeta para generar Wiki en lote |
| **📑 Ingerir varios archivos** | `Cmd+P` → "Ingest multiple files" — elige notas mediante árbol de carpetas + casillas, ingesta en lote (con cola en vivo + cancelación por archivo) |
| **🎯 Ingestar archivo actual** | Haz clic en el icono `sticker` de la cinta izquierda, o `Cmd+P` → "Ingest current file" |
| **🔍 Consultar wiki** | `Cmd+P` → "Query wiki" — Q&A conversacional con streaming y `[[wiki-links]]` |
| **🛠️ Verificar wiki** | `Cmd+P` → "Lint wiki" — análisis completo: duplicados, enlaces rotos, páginas vacías, huérfanas, alias faltantes, contradicciones |
| **📋 Regenerar índice** | `Cmd+P` → "Regenerate index" — reconstruye `wiki/index.md` con entradas de alias |
| **📊 Historial de ingesta (v1.21.0)** | `Cmd+P` → "View Ingestion History" — explora ingestiones, informes Lint y ejecuciones de mantenimiento |
| **⏹ Cancelar operación** | `Cmd+P` → "Cancel current ingestion" — se detiene de forma segura en el próximo límite de lote |
| **🎉 Recrear nota de bienvenida (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — regenera la nota de bienvenida |

La re-ingesta de la misma fuente fusiona nueva información de forma incremental. Los resúmenes se regeneran.

> 💡 **Smart Batch Skip:** Al ingestar una carpeta, el plugin detecta y salta automáticamente los archivos ya procesados — ahorra tiempo y costes de API.

![Paleta de comandos — busca "karpa" para ver todos los comandos](assets/command-panel.png)

### ⚠️ ¿Actualizar desde una versión anterior?

> 🔧 **Actualizar desde v1.24.x.** La ingesta de PDF (v1.25.0) escribe su caché en `.obsidian/plugins/karpathywiki/pdf-cache/` (hasta 100 MB / 1000 entradas / 10 MB por entrada individual; evicción LRU-by-mtime al iniciar y al comienzo de cada ingesta por lotes). Tu vault **no se modifica por defecto** — activa **Write PDF Markdown to Vault** (Settings → Wiki Configuration → Wiki Folder) sólo si quieres un sidecar `<basename>.pdf.md` junto al PDF fuente. Dos ajustes nuevos — **Force PDF Support** (avanzado, desactivado por defecto) y **Write PDF Markdown to Vault** (desactivado por defecto) — son totalmente retrocompatibles: un `data.json` antiguo sin estos campos volverá a `false`.

> 🔧 **Actualizar desde v1.24.0.** Se ha eliminado el marcador de comentario interno `<!-- reviewed: keep -->` (v1.24.0, #244) que protegía únicamente la sección *Menciones en Source* de una página. Para conservar una sección de Menciones curada, establece `reviewed: true` en el frontmatter de la página: protege toda la página (Menciones incluidas) y, a diferencia del comentario oculto, permanece visible en el panel de Propiedades y resiste los linters de Markdown.

**Retrocompatible.** Sin cambios incompatibles desde v1.0.0 — tus páginas Wiki, configuración y flujos de trabajo existentes se conservan sin reconfiguración.

**Después de actualizar**, ejecuta **Lint Wiki** → **Smart Fix All** para una reparación automática en orden causal:
1. 🏷️ Completar alias (LLM genera traducciones, abreviaturas, nombres alternativos)
2. 🔄 Fusionar duplicados (multilingüe, abreviaturas, alta similitud)
3. 🔗 Reparar enlaces rotos / vincular huérfanos / expandir páginas vacías

Luego **Regenerar índice** para reconstruir `wiki/index.md` con entradas de alias.

> 📖 Guías detalladas para saltos de versión específicos en [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Ajustes a revisar:** Force PDF Support (Settings → LLM Configuration → Advanced, desactivado por defecto — sólo relevante para proveedores no NATIVE), Write PDF Markdown to Vault (Settings → Wiki Configuration → Wiki Folder, desactivado por defecto), Idioma de salida del Wiki (independiente de la UI), Granularidad de extracción, Concurrencia (predet. 3), Retraso de lote (predet. 300ms).

## ⚡ Novedades de la v1.25.0

Cuatro temas: ingesta de PDF solo en caché, recomendaciones de modelos locales, centralización del prompt transcodificador de PDF, y ocho correcciones de errores e2e. Actualización recomendada para todos los usuarios de v1.24.x.

- **📄 Ingesta de PDF (Nivel 1).** Elige un PDF de tu vault — el plugin lo lee a través de la entrada nativa de archivo de tu proveedor LLM (anthropic / openai / bedrock-anthropic / bedrock-openai; cualquier otro endpoint compatible con OpenAI/Anthropic requiere **Force PDF Support** en Settings → LLM Configuration → Advanced), lo convierte a Markdown mediante transcripción literal estilo OCR, y vuelve a entrar en el pipeline estándar de ingesta Markdown. Todos los flujos existentes de entidad/concepto/alias/`[[wiki-link]]` se aplican sin cambios. El resultado se **almacena en caché por hash de contenido** en `.obsidian/plugins/karpathywiki/pdf-cache/` (la clave lleva `converterVersion` para invalidar automáticamente las entradas obsoletas cuando se actualice el prompt). Consulta la [Ruta OCR PDF local](#-ruta-ocr-pdf-local-v1250) para la configuración recomendada en Apple Silicon.
- **🗄️ Crecimiento acotado del caché.** Housekeeping de caché en tres capas de defensa (100 MB total / 1000 entradas / 10 MB por entrada individual) con evicción LRU-by-mtime; las entradas antiguas se purgan al iniciar y al comenzar cada ingesta por lotes. Solo caché — tu vault no se modifica por defecto.
- **📝 Sidecar opcional en el vault (avanzado).** Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** escribe un `<basename>.pdf.md` junto al PDF fuente tras la conversión. Desactivado por defecto.
- **🦙 Recomendaciones de modelos locales.** La sección Guía de Selección de Modelo se ha dividido en secciones separadas de local y nube que cubren Qwen3.5 / Qwen3.6 / Gemma 4 (compromisos parámetro vs calidad, cuantización MLX vs GGUF, estrategia de contexto).
- **🛡️ Prompt transcodificador de PDF literal.** El prompt PDF→Markdown se reformula como conversión literal estilo OCR con marcadores anti-alucinación `[illegible]` / `[figure: ...]` / `[equation: ...]`; los modelos pequeños/locales que envuelven su salida en fences ```markdown se limpian automáticamente antes de escribir en caché. Prompt centralizado en `src/wiki/prompts/pdf.ts` junto al resto de prompts de llamadas LLM del proyecto.
- **⏹ Ingesta de PDF cancelable.** Hacer clic en la barra de estado durante la conversión interrumpe la llamada LLM en curso a través de AbortSignal de Vercel AI SDK v6 en unos 200 ms.
- **🌐 Completitud i18n** — 10 nuevas claves por locale para los dos nuevos ajustes, ingesta de PDF y Ruta OCR PDF local (toggle Force PDF Support, toggle Write PDF Markdown to Vault, Notice source-rejected-pdf-unsupported).

**Configuraciones a revisar:** Force PDF Support (Settings → LLM Configuration → Advanced, desactivado por defecto — solo relevante para proveedores no NATIVE), Write PDF Markdown to Vault (Settings → Wiki Configuration → Wiki Folder, desactivado por defecto — sidecar opcional).

### v1.24.1 — 2026-07-14 (PATCH)

Actualización recomendada para todos los usuarios de v1.24.0.

- **🔍 Cascada de selección de semillas PPR en 5 etapas.** Query Wiki ahora ejecuta cinco etapas complementarias antes de generar una respuesta (camino rápido Lex → palabras clave LLM → escaneo local de subcadenas → fallback LLM KB → expansión de grafo PPR). Las preguntas multi-hop obtienen contexto consciente del grafo sin opt-in de embeddings.
- **🤫 Ruta silenciosa para respuestas vacías.** `parseJsonResponse` ya no registra errores ruidosos para cuerpos LLM vacíos en rutas Lint/Query, corrigiendo el spam de consola reportado por algunos usuarios (#255, #274). El selector de semillas también lanza antes con cuerpos vacíos para una recuperación más clara (#275).
- **🧹 Páginas de entidades más limpias.** Se eliminó el bloque redundante `## Basic Information` / `## Basic Info` de los prompts y el esquema de generación de páginas de entidades; las nuevas páginas de entidades van directamente de frontmatter a H1 → descripción → secciones relacionadas (#258).
- **☁️ Proveedores Bedrock Stage 1.** Se añadieron las opciones `bedrock-anthropic` y `bedrock-openai` enrutadas a través del endpoint AWS bedrock-mantle. Cero nuevas dependencias npm, bundle ~+3 KB.
- **🦙 Ingesta LM Studio sin clave API.** La ingesta ahora funciona con la clave API vacía de LM Studio, igual que el comportamiento del test de conexión.
- **🏗️ Limpiezas internas.** `page-factory.ts` se dividió en 10 módulos enfocados (+99 tests); la re-ingesta no destructiva de Mentions preserva las citas de fuentes anteriores en la fusión (#267).

**Nota de actualización:** Si añadiste manualmente marcadores `<!-- reviewed: keep -->` en v1.24.0, cambia al frontmatter `reviewed: true` — protege toda la página y sobrevive a los linters Markdown.

## ✨ Características

### 📊 Calidad del Conocimiento

- **🔍 Entity/Concept Extraction** — El LLM extrae entities (personas, organizaciones, productos, eventos) y concepts (teorías, métodos, términos) de tus notas con granularidad de extracción flexible (Mínima~5 elementos, Gruesa~10, Estándar~50, Fina~100, Personalizada 1–500) para balancear profundidad de análisis y costos de API
- **🏷️ Mandatory Page Aliases** — Cada página generada incluye al menos 1 alias (traducción, acrónimo, nombre alternativo), habilitando detección de duplicados cross-language
- **🔄 Duplicate Detection & Merge** — El semantic tiering detecta duplicados verdaderos (traducciones cross-language, abreviaturas, variantes de ortografía); el merge inteligente de LLM fusiona contenido y preserva aliases
- **🧩 Smart Knowledge Fusion** — Las actualizaciones multi-source fusionan información nueva sin redundancia; las contradicciones se preservan con atribución; las páginas `reviewed: true` se protegen de sobrescritura
- **📏 Content Truncation Protection** — 8000 max_tokens con detección automática de stop_reason y reintento a 2× tokens en todos los providers
- **📝 Verbatim Source Mentions** — Las citas en idioma original se preservan con traducción opcional para trazabilidad

- **🎨 Vocabulario de etiquetas personalizable (v1.18.0).** Ajustes → Wiki → Modo de vocabulario de etiquetas → *Personalizado* te permite definir tus propias listas de etiquetas de tipo de entidad y concepto (por ejemplo, `Medical_Arzneimittel`, `法规`). El plugin respeta tu vocabulario en los prompts de extracción y en la validación de frontmatter; la auditoría de Lint (Issue #85 v7) reporta cualquier página cuyas etiquetas estén fuera del vocabulario activo.

### 📄 Ingesta de PDF (v1.25.0)

Elige un PDF de tu vault — el plugin lo lee a través de la entrada nativa de archivo de tu proveedor LLM, lo convierte a Markdown y vuelve a entrar en el pipeline estándar de ingesta Markdown. Todos los flujos existentes de entidad/concepto/alias/`[[wiki-link]]` se aplican sin cambios.

- **🔌 Puerta de proveedor** — Anthropic, OpenAI, Bedrock Anthropic y Bedrock OpenAI manejan PDF de forma nativa. Para cualquier otro endpoint compatible con OpenAI/Anthropic, activa **Force PDF Support** en Settings → LLM Configuration → Advanced para que el plugin intente la llamada (tu endpoint decide; los fallos se muestran como un Notice localizado guiándote a desactivar el toggle). La configuración local recomendada está en [Ruta OCR PDF local](#-ruta-ocr-pdf-local-v1250).
- **🗄️ Caché por hash de contenido** — un mismo PDF + mismo modelo + misma versión de convertidor devuelve el Markdown en caché sin llamar al LLM. La caché vive en `.obsidian/plugins/karpathywiki/pdf-cache/`; la clave lleva `converterVersion` para invalidar automáticamente las entradas obsoletas cuando se actualice el prompt.
- **📏 Crecimiento acotado** — limpieza de caché en tres capas de defensa (100 MB total / 1000 entradas / 10 MB por entrada individual) con evicción LRU-by-mtime; las entradas antiguas se purgan al iniciar y al comenzar cada ingesta por lotes. Solo caché — tu vault no se modifica por defecto.
- **📝 Sidecar opcional en el vault** — Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** escribe un `<basename>.pdf.md` junto al PDF fuente tras la conversión. Desactivado por defecto (solo caché).
- **🛡️ Prompt transcripción literal** — el prompt de PDF→Markdown se reformula como conversión literal estilo OCR con marcadores anti-alucinación `[illegible]` / `[figure: ...]` / `[equation: ...]`; los modelos pequeños/locales que envuelven su salida en fences ```markdown se limpian automáticamente antes de escribir en caché.
- **⏹ Cancelable** — al hacer clic en la barra de estado durante la conversión se interrumpe la llamada LLM en curso (vía Vercel AI SDK v6).

### 💬 Query & Feedback

- **🔍 Cascada de selección de semillas PPR en 5 etapas (v1.24.1 PATCH).** Cuando formulas una pregunta multi-hop, Query Wiki compone la respuesta a través de cinco etapas complementarias antes de que arranque cualquier generación:
  1. **Camino rápido Lex** — comprobación directa de solapamiento de tokens contra cada título/alias de entity/concept (gratis, instantánea; controla las etapas siguientes)
  2. **Generación de palabras clave LLM** — el LLM propone 8–12 palabras clave inter-idiomas desde tu consulta (absorbe sinónimos, acrónimos, términos resistentes al solapamiento de tokens)
  3. **Escaneo local de subcadenas** — cada palabra clave generada se re-matchea localmente contra títulos de página, aliases y fragmentos de cuerpo (sin llamada LLM adicional; completa el recall tolerante al ruido)
  4. **Fallback LLM KB** — cuando lex + escaneo de palabras clave devuelven señales débiles, el LLM re-siembra los top-N candidatos con una pasada semántica sobre el wiki completo
  5. **Expansión de grafo PPR** — Personalized PageRank (Haveliwala 2002) ejecutado sobre el grafo `[[wiki-link]]` desde el conjunto de semillas candidatas; aporta al LLM el contexto multi-hop consciente del grafo que la búsqueda lineal no alcanza

  La cascada se trunca automáticamente en la etapa que devuelva suficiente señal — sin coste fijo de 5 etapas, sin llamadas LLM cuando Lex basta, sin pérdida de precisión cuando se necesita la augmentación LLM. La relevancia end-to-end (PPR @5 = 27,1% sobre el corpus de benchmark interno del proyecto) supera a las líneas base knn puras (24,1%) sin opt-in de embedding. Stage 1.5 (pasos 2–3) absorbe los tipos de pregunta multi-hop que el Lex puro pierde; Stage 1.7 (paso 4) recupera señales débiles de palabras clave inyectadas por LLM; Stage 1.9 (paso 5) garantiza que el LLM vea contexto de vecinos en vez de un top-N plano. Reemplaza la antigua cascada binaria por tiers.

- **🤖 Conversational Query** — Diálogo estilo ChatGPT con Markdown en streaming e `[[wiki-links]]`, historial multi-turn
- **🪟 Panel lateral acoplado a la derecha (v1.22.1, PR #196).** Query Wiki se abre en un leaf del sidebar derecho estilo Copilot (reutilizando un leaf existente) en lugar de un popup centrado. El icono ribbon `message-circle` y el comando `Query Wiki` activan/muestran el panel; tus notas quedan visibles junto a la conversación. Toda la funcionalidad se conserva sin cambios.
- **📤 Query-to-Wiki Feedback** — Guarda conversaciones valiosas al Wiki con entity/concept extraction, semantic dedup antes de guardar
- **🔒 Duplicate Save Prevention** — El hash tracking previene re-evaluación de conversaciones sin cambios

### 🛠️ Mantenimiento

- **🔍 Lint Health Scan** — Detecta duplicados, dead links, empty pages, orphans, aliases faltantes y contradicciones en informe integral
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (coincidencias directas de nombre: cross-language, abreviaturas, títulos de alta similitud) siempre verificadas; Tier 2 (señales indirectas: enlaces compartidos, similitud moderada) llena el presupuesto de tokens
- **⚡ Smart Fix All** — Batch fix ordenado por causalidad: aliases completados → duplicados fusionados → dead links resueltos → orphans enlazados → empty pages expandidas
- **🏷️ Alias Completion** — Generación paralela de batch de aliases faltantes en un clic, mejorando detección futura de duplicados
- **🔄 Auto-Maintenance** — File watcher multi-carpeta, lint periódico, health check al inicio (Startup Quick Fixes activado por defecto, File Watcher y Periodic Lint desactivados por defecto)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (AI fix) o `detected → pending_fix` (manual)
- **🛡️ Portal de pre-ingestión (v1.21.0)** — Cada archivo fuente se valida *antes* de cualquier llamada LLM: las notas vacías/en blanco/solo frontmatter son rechazadas; el dedup por hash de contenido detecta archivos idénticos a través de rutas. Previene que los modelos locales alucinen nombres de entidades en entradas vacías.
- **📊 Panel de historial de operaciones (v1.21.0)** — UI buscable y filtrable para ingestiones pasadas, informes de lint y ejecuciones de mantenimiento, con tarjetas KPI impulsadas por insights y enlaces clickeables a páginas.
- **🧹 Limpiador de páginas incompletas (v1.21.0)** — Las páginas que quedaron en un estado parcial tras ingestiones interrumpidas se archivan automáticamente al inicio (recuperables desde la `.trash` de Obsidian).

### 🌐 LLM & Idioma

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, custom endpoints
- **🔄 5xx Retry** — Reintento automático de backoff exponencial (máx 2) en errores HTTP 5xx/429/529 en todos los clientes
- **📋 Dynamic Model List** — Fetching en tiempo real desde APIs de provider
- **🌐 Idioma de salida Wiki** — 10 idiomas independientes de la UI (EN/ZH simplif/ZH trad/JA/KO/DE/FR/ES/PT/IT), con input personalizado.
- **🌍 Internacionalización completa de UI** — Interfaz del plugin en 10 idiomas (EN/ZH simplif/ZH trad/JA/KO/DE/FR/ES/PT/IT), 269+ campos UI totalmente traducidos, expresiones locales naturales.
- **⚡ Rate Limit Guardian** — Cuando la generación paralela activa rate limits, auto-detección y sugerencias: reducir concurrencia, aumentar delay batch, cambiar provider
- **🦙 Web Clipper Compatible** — Agregar con un clic el folder `Clippings/` de Obsidian Web Clipper a la watchlist, clips web auto-ingestados en Wiki

### 🏗️ Arquitectura & Rendimiento

- **🕸️ PPR sobre el grafo [[wiki-link]] (v1.24.0+, madurado en v1.24.1 PATCH).** Personalized PageRank (Haveliwala 2002) se ejecuta sobre el grafo dirigido de aristas `[[wiki-link]]` entre tus páginas wiki; la cascada ancla las semillas PPR en el conjunto de candidatos top-N, y el contexto multi-hop viaja hasta 3 anillos de expansión. Esto es lo que hace que las respuestas de Query Wiki tengan conciencia del grafo (una pregunta «fundadores de Microsoft» se resuelve vía Bill Gates → Microsoft → competidores, no sólo por solapamiento literal de títulos). Vaults de 2.137 páginas suelen ver <100 ms para warm + expansión de 3 saltos, independientemente del tamaño del vault. Es usado por las 4 etapas de la cascada de selección de semillas (sección Query & Feedback arriba) y por la detección de duplicados de Lint cuando enlaces indirectos conectan dos páginas candidatas.
- **⚡ Parallel Page Generation** — 1–5 páginas concurrentes configurables, por defecto 3 (paralelo), 2–3× más rápido para sources grandes, aislamiento de errores por página
- **📚 Iterative Batch Extraction** — El tamaño de batch adaptativo elimina el cuello de botella de max_tokens para documentos largos
- **🏛️ Three-Layer Architecture** — Tus notas del vault (solo lectura) → `wiki/` (páginas generadas por el LLM, organizadas como `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`) → `schema/` (config co-evolucionada)
- **🧩 Modular Codebase** — 20+ módulos enfocados en `src/`

### 🔒 Privacidad y seguridad

- **Sin backend, sin telemetría.** El plugin se ejecuta completamente dentro de Obsidian — no hay servidor externo, ni análisis, ni recopilación de datos de ningún tipo. Tus notas nunca salen de tu bóveda a menos que configures explícitamente un proveedor LLM.
- **Tus datos permanecen locales por defecto.** El plugin no almacena, almacena en caché ni transmite tu contenido a ningún lugar más allá de la API LLM que elijas. Solo el texto que envías para ingesta o consulta sale de tu dispositivo — y solo al proveedor que configuraste.
- **Modo completamente local con Ollama, LM Studio o proveedores locales.** Para una soberanía total de datos, utiliza un LLM de ejecución local. Tus notas se procesan completamente en tu máquina — nada toca Internet.
- **Permisos mínimos.** El acceso a archivos de la bóveda es necesario para la gestión del wiki (leer notas, generar páginas, detectar enlaces rotos). El acceso a la red se usa exclusivamente para llamadas a la API LLM de tu proveedor elegido. El acceso al portapapeles se limita al botón "Copiar" en el modal de Consulta — solo cuando haces clic en él.

---


---

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
created: 2025-12-01
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

### ☁️ Modelos en la nube

| Tier | Model | Context Window | Por qué |
|------|-------|---------------|---------|
| **🌟 Valor** | **DeepSeek V4-Flash** | 1M tokens | Precio más bajo ($0.14/M), 284B MoE, ideal para ingestión batch |
| **🌟 Valor** | **Gemini-3.5-Flash** | 1M tokens | 4× más rápido que GPT-5.5, excelente para tareas agent |
| **🌟 Valor** | **Qwen3.6-Plus** | 1M tokens | Fuerte capacidad coding & agent, precio competitivo |
| **🌟 Valor** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **Balanceado** | **Claude Sonnet 4.6** | 1M tokens | Buen equilibrio calidad/costo, $3/$15 por millón de tokens |
| **Ligero** | **Claude Haiku 4.5** | 200K tokens | Rápido y económico, para wikis pequeños |
| **Económico** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE, open-source MIT 2026-04, agente y multimodal |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Calidad máxima, costo alto — usar selectivamente |
| **Flagship** | GPT-5.5 | 1M tokens | Razonamiento top, costo alto — usar selectivamente |

### 🦙 Modelos locales (Ollama / LM Studio)

La inferencia local gana en soberanía de datos, uso sin conexión y cero coste de API. La contraprestación es una ventana de contexto menor (suelen estar entre 8K–128K; las familias open-weight recientes llegan a 262K) y un seguimiento de instrucciones más débil frente a los modelos cloud flagship. **Elige según tu presupuesto de hardware:** más parámetros = más conocimiento del mundo y mejor fidelidad a las instrucciones (mayor calidad de extracción, menos alucinaciones); menos parámetros = más velocidad y holgura de memoria, a costa de más alucinaciones y razonamiento de contexto largo más débil. El sweet spot en 24 GB Apple Silicon o una GPU de consumo única es la clase 27B–35B-A3B.

| Model | Parámetros | Contexto | Por qué |
|-------|------------|----------|---------|
| **Qwen3.5 27B** | 27B dense | 262K | Mejor equilibrio calidad/tamaño para ingestión; MLX 4-bit cabe en 24 GB |
| **Qwen3.5 35B-A3B** | 35B total / 3B activos MoE | 262K | Más rápido que 27B dense con calidad similar; ahorrador ideal de memoria |
| **Qwen3.5 122B-A10B** | 122B / 10B MoE | 262K | Techo de calidad; requiere ≥48 GB VRAM o doble GPU |
| **Qwen3.6 27B** | 27B dense | 256K+ | Refresh 2026-04 sobre Qwen3.5 27B — preferido si tu hardware lo soporta |
| **Qwen3.6 35B-A3B** | 35B / 3B MoE | 262K | Misma disyuntiva que Qwen3.5 35B-A3B, con pesos más nuevos |
| **Gemma 4 31B IT** | 31B dense | 262K | Fuerte seguimiento de instrucciones, salida Markdown limpia |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | Menos memoria que 31B dense con calidad comparable |
| **Gemma 4 E2B / E4B IT** | 2B / 4B | 131K | Ejecutable en CPU pura; solo para wikis pequeños o vistas previas rápidas |

**Cuantización:** MLX 4-bit en Apple Silicon suele ser 1,5–2× más rápido que GGUF Q4_K_M a la misma tasa de bits efectiva. GGUF Q4_K_M es la opción por defecto multiplataforma; pasa a Q5/Q8 solo si tienes holgura de VRAM y notas regresión de calidad en Q4.

**Estrategia de contexto:** Cuando tu Wiki crece por encima de ~500 páginas, un modelo local de 262K aún cubre la mayor parte del contexto que ensambla el motor de Query, pero la ingestión de un vault de 2000 páginas lo sobrepasará. Patrón habitual: cloud para ingestión + local para query. Para setups totalmente locales, la clase 27B/35B-A3B es el sweet spot.

### 📄 Ruta OCR PDF local (v1.25.0+)

La ingesta de PDF de v1.25.0 funciona con cualquier proveedor que acepte PDF como parte de archivo. Para un pipeline totalmente local en Apple Silicon (la única plataforma que oMLX soporta actualmente), esta es la configuración recomendada:

1. Instala [oMLX](https://github.com/jundot/omlx) y activa su backend integrado **Markitdown** (conversión local PDF→Markdown).
2. Carga **Baidu Unlimited-OCR** (open-source el 22/06/2026, 3B total / 0,5B activos, OCR de extremo a extremo que maneja documentos largos sin el modo de fallo "cuanto más genera, más lento va" de los modelos OCR antiguos) como modelo de visión en oMLX.
3. En este plugin: elige el proveedor **Custom OpenAI-Compatible** (oMLX habla el protocolo compatible con OpenAI), apunta la Base URL al servidor local de oMLX, activa **Force PDF Support** en Settings → LLM Configuration → Advanced, y elige el modelo multimodal que sirve oMLX para el resumen de la ingestión.

El PDF nunca sale de tu máquina — Markitdown hace la conversión estructural en local, Unlimited-OCR el reconocimiento visual en local, y el LLM local el resumen en local. La caché del plugin (`.obsidian/plugins/karpathywiki/pdf-cache/`) mantiene las re-ingestiones instantáneas.

**Fallback:** si oMLX/Markitdown no está disponible (Linux/Windows o Macs antiguos), apunta **Force PDF Support** directamente a un LLM multimodal local que acepte partes de archivo PDF — la calidad es buena cuando el modelo es suficientemente grande, pero los requisitos de VRAM crecen de forma pronunciada con el número de páginas.

**🔌 Anthropic Compatible (Coding Plan):** Si tu provider ofrece un endpoint de API compatible con Anthropic, selecciona "Anthropic Compatible" e ingresa el Base URL y API Key de tu provider.

**🦙 Ollama (local, sin clave API):** Instala [Ollama](https://ollama.com), descarga un modelo (`ollama pull gemma4` o `ollama pull qwen3.5:27b`), selecciona "Ollama (Local)" en el desplegable de provider.

**🎛️ LM Studio (local, sin clave API):** Instala [LM Studio](https://lmstudio.ai), inicia su servidor local (por defecto `http://localhost:1234/v1`), selecciona "LM Studio (Local)" en el desplegable de provider. LM Studio ejecuta un servidor compatible con OpenAI integrado — el campo de clave API es opcional.

> 💡 **Planes de suscripción:** Si tienes planes tipo Coding Plan, OpenAI Pro o Anthropic Pro, son excelentes opciones para controlar costos con uso frecuente. El plugin es compatible con estos servicios.

---

## 🏗️ Arquitectura

Diseño de tres capas de Karpathy:

```
📄 Tus notas del vault (cualquier carpeta)   # 📖 Tú eliges qué notas ingestar
  ↓ ingest
wiki/                                         # 🧠 Páginas Wiki generadas por el LLM (wiki/sources/, wiki/entities/, wiki/concepts/)
  ↓ query / maintain
schema/                                       # 📋 Configuración de estructura Wiki
```

> 📖 Ver la estructura completa del código en [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure).

**Páginas generadas:**
- wiki/sources/filename.md — 📄 Resumen de la fuente
- wiki/entities/entity-name.md — 👤 Páginas de entidades
- wiki/concepts/concept-name.md — 💡 Páginas de conceptos
- wiki/index.md — 📑 Índice generado automáticamente
- wiki/log.md — 📝 Registro de operaciones

---

---


## ❓ FAQ

> **Mantén tu plugin actualizado.** Ejecuta **Configuración → Plugins comunitarios → Buscar actualizaciones** regularmente.
>
> 📖 Más FAQ en [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

**¿Qué hace exactamente este plugin?**
Elige cualquier nota, carpeta o selección múltiple de tu vault; el LLM extrae entidades y conceptos y genera un Wiki interconectado con `[[wiki-links]]`. Obtén respuestas basadas en *tus* notas — no búsqueda en Internet. Los resúmenes generados viven bajo `wiki/sources/`, las entidades bajo `wiki/entities/`, los conceptos bajo `wiki/concepts/` — tus notas originales del vault nunca se modifican.

**¿Mis datos se envían a terceros?**
🔒 **Privacidad primero.** Sin backend, sin seguimiento, sin análisis — el plugin funciona completamente dentro de Obsidian. Solo el texto que envías explícitamente sale de tu dispositivo.

**¿En qué se diferencia de los chatbots RAG?**
LLM-Wiki ejecuta un motor **Personalized PageRank** sobre tu grafo `[[wiki-link]]` — encontrando páginas mediante estructura de enlaces, no embeddings. Costo cero, sin nuevas dependencias.

**¿Qué LLM debería usar?**
Modelos de contexto largo (≥200K tokens). Opciones económicas: DeepSeek V4-Flash ($0.14/M), Gemini 3.5 Flash, Qwen3.6-Plus.

**¿Cómo empiezo?**
Instala → elige proveedor LLM → **Test Connection** → ejecuta **Ingest single source** (o **Ingest from folder**) sobre cualquier nota de tu vault → tus primeras páginas Wiki aparecen en segundos. Ver [Inicio rápido](#-inicio-rápido) arriba.

**¿Cómo controlo costos de API?**
Granularidad Gruesa o Mínima para lotes. Smart Batch Skip salta archivos ya procesados. Mantenimiento automático DESACTIVADO por defecto.

**¿Mi wiki está segura?**
✅ Retrocompatible desde v1.0.0. `reviewed: true` protege páginas de sobrescritura. El plugin nunca modifica tus notas originales del vault — solo genera nuevas páginas dentro de la carpeta `wiki/`.

**¿Puedo usar el plugin en mi idioma?**
🌐 **10 idiomas** para UI y salida Wiki: English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano.

**¿Requisitos mínimos?**
Obsidian v1.11.0+ (escritorio). Clave API LLM (u Ollama/LM Studio local, sin clave). El **guardián llmReady** requiere Test Connection.

**¿Cómo cancelar una operación?**
Barra de estado o `Cmd+P` → "Cancel current ingestion".

**¿Dónde obtener ayuda?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — reportar errores
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — preguntas
- Consola (`Ctrl+Shift+I`) — copia logs

## 🔒 Transparencia y cumplimiento

Este plugin está listado en el Mercado de Plugins Comunitarios de Obsidian y se somete a revisión automatizada de seguridad y permisos.

**El plugin no tiene backend, ni infraestructura de servidor, ni recopilación de datos de ningún tipo.** Es software puramente local que se ejecuta dentro de Obsidian. El plugin no puede ni recopila, almacena o transmite tus datos a ningún servidor — porque dicho servidor no existe.

**El acceso a la red** se utiliza solo para comunicarse con el proveedor LLM que configures — no se realizan otras llamadas de red. Esto está completamente bajo tu control: tú eliges el proveedor, tú introduces la clave API, tú decides a dónde van tus datos.

**El acceso al sistema de archivos** (enumeración de la bóveda) es necesario para construir y mantener el wiki: leer tus notas fuente, generar páginas, escanear enlaces rotos y detectar páginas duplicadas. El plugin nunca modifica tus archivos fuente — solo los archivos dentro de la carpeta wiki.

**El acceso al portapapeles** se usa exclusivamente por el botón "Copiar" en el modal de Consulta, y solo cuando haces clic en él.

Si prefieres una localidad completa de datos, utiliza un proveedor LLM local como Ollama o LM Studio. Con un proveedor local, tus datos nunca salen de tu máquina.

## 💖 Apoyar el proyecto

Si LLM-Wiki se ha convertido en una parte importante de tu flujo de trabajo de conocimiento, puedes apoyar su desarrollo continuo:

- ☕ **[Invítame a un café en Ko-fi](https://ko-fi.com/greenerdalii)** — apoyo único o mensual vía Ko-fi
- 💳 **[Propina vía PayPal](https://paypal.me/greenerdalii)** — propina única vía PayPal

El patrocinio es totalmente opcional. El plugin sigue siendo Apache-2.0 y completo en funciones.

### Patrocinadores

Gracias a las siguientes personas por apoyar el proyecto:

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 Licencia

Apache License 2.0 — consulta [LICENSE](LICENSE) y [NOTICE](NOTICE).

## 🙏 Agradecimientos

- **💡 Concepto:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — la visión original que inspiró este plugin
- **🛠️ Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Transporte LLM:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)

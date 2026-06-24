![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conocimiento estructurada impulsada por IA que ingiere tus notas y genera un Wiki conectado — basado en el concepto de [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Puntuación oficial Obsidian 95/100** | Soporte nativo de 10 idiomas | Mantenimiento activo, evolución continua

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | **Español** | [Português](README_PT.md) | [Italiano](README_IT.md)

[Sitio oficial](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Comentarios y debate](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código con DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ Aviso de actualización rápida：** Este proyecto evoluciona rápidamente – correcciones de errores, mejoras de rendimiento, nuevas funciones y optimizaciones de UX se publican con frecuencia. Recomendamos actualizar regularmente en Obsidian (**Configuración → Plugins comunitarios → Buscar actualizaciones**) o activar la actualización automática de plugins.

## 📑 Contents

- [💡 ¿Qué es LLM-Wiki?](#-qué-es-llm-wiki)
- [⚡ ¿Por qué Obsidian + LLM-Wiki?](#-por-qué-obsidian--llm-wiki)
- [🚀 Inicio rápido](#-inicio-rápido)
  - [📦 Instalación](#-instalación)
  - [🔄 Actualización](#-actualización)
  - [🔑 Configurar un proveedor LLM](#-configurar-un-proveedor-llm)
  - [🎮 Uso](#-uso)
  - [⚠️ ¿Actualizar desde una versión anterior?](#️-actualizar-desde-una-versión-anterior)
- [⚡ Novedades de la v1.22.0](#-novedades-de-la-v1220)
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
| **📥 Ingestar fuente individual** | `Cmd+P` → "Ingestar fuente individual" |
| **📂 Ingestar desde carpeta** | `Cmd+P` → "Ingestar desde carpeta" |
| **🔍 Consultar wiki** | `Cmd+P` → "Consultar wiki" |
| **🛠️ Verificar wiki** | `Cmd+P` → "Verificar wiki" |
| **📋 Regenerar índice** | `Cmd+P` → "Regenerar índice" |
| **🎯 Ingestión con un clic** | Icono de la barra lateral o `Cmd+P` → "Ingestar archivo actual" |

![Paleta de comandos — busca "karpa" para ver todos los comandos de Karpathy LLM Wiki](assets/command-panel.png)

### ⚠️ ¿Actualizar desde una versión anterior?

**Esta versión es completamente retrocompatible.** Sin cambios incompatibles desde v1.0.0.

**Actualización a v1.20.3 desde cualquier versión anterior**: los slugs de páginas fuente ahora llevan huella digital (cada `sources/<slug>.md` se convierte en `sources/<nombre_base>_<6 hex>.md`). En tu próxima ingesta, las páginas `sources/` existentes se renombran en su lugar y todos los backlinks `[[sources/<slug>]]` se actualizan automáticamente — no requiere acción, pero el renombrado de archivo puede aparecer brevemente en el explorador de archivos de Obsidian. Si tienes scripts externos o marcadores que referencian directamente rutas `sources/<slug>.md`, actualízalos a las nuevas rutas con huella digital.

**Para wikis construidos con múltiples versiones:**
1️⃣ Reconstruye tu índice — "Regenerar índice"
2️⃣ Ejecuta Verificar wiki — escanea problemas
3️⃣ Usa Smart Fix All — reparación con un clic
4️⃣ Habilita generación de páginas paralela — Concurrencia: 3, Retraso: 300ms
5️⃣ Revisa la configuración — Idioma, Granularidad, Auto-Mantenimiento

---

## ⚡ Novedades de la v1.22.0

La v1.22.0 es una **release MINOR** que aporta un flujo de trabajo de actualización de esquema con un solo clic, chino tradicional como 10º idioma y una barra de estado de ingestión mejorada.

- **📝 Aplicación de esquema con un clic (Issue #97).** Las sugerencias generadas por LLM ahora se muestran en un Modal de diff de doble panel estilo IDE, con botones de Aplicar/Cancelar/Abrir archivo. Al aplicar una sugerencia, se respalda automáticamente el esquema anterior (rotación, máx. 3 backups) antes de escribir el nuevo. "Actualizar esquema" ahora se accede desde el Modal de Lint — la entrada de la paleta de comandos se eliminó para forzar un único punto de entrada.
- **🏷️ Sincronización dinámica de tags del esquema.** El vocabulario del esquema es ahora la única fuente de verdad — los tags activos se inyectan automáticamente en cada llamada LLM, eliminando el bug de "plantilla del esquema sobrescrita por secciones codificadas" de v1.21.0 Fase 1.
- **🇹🇼 Chino tradicional (zh-TW).** La interfaz del plugin y la salida Wiki ahora soportan chino tradicional como 10º idioma. La protección de paridad bidireccional se extendió a todos los 10 idiomas.
- **📊 Barra de estado de ingestión con nombre de documento (PR #189).** La barra de estado ahora muestra el nombre del documento actual (`Mi Nota · Ingiriendo...`) y el progreso del lote durante la ingestión de carpetas (`[4/10] Mi Nota · Ingiriendo...`). Contribución de @YounianC.

Recomendamos encarecidamente actualizar — la función de aplicación de esquema con un clic convierte el refinamiento del esquema en una operación de un paso, y el idioma chino tradicional mejora significativamente la experiencia para los usuarios de zh-TW.

Detalles en [CHANGELOG.md](../CHANGELOG.md).

### v1.22.1 — 2026-06-24 (PATCH)

Un PATCH enfocado que cierra tres errores P0 reportados por usuarios y aporta una mejora de UX.

- **🛡️ Fix Dead Links ya no fabrica páginas stub expandidas por IA (#197).** Cuando `fixDeadLink` no podía resolver un dead link a una página existente, creaba un stub y llamaba a `fillEmptyPage()` — dejando que la IA inventara alias y enlaces relacionados sin contenido fuente. Los stubs ahora son marcadores honestos con la marca `generation_complete: false`.
- **✅ El toggle "Ejecutar correcciones rápidas al inicio" ahora persiste (#199).** Una migración de v1.18.3 forzaba `startupCheck: false → true` en cada carga. Eliminada; migraciones restantes extraídas a `applySettingsMigrations()`.
- **🎨 Advertencia de revisión CSS `:has()` corregida.** Reemplazado por selector de clase directo. Nuevo `scripts/css-lint.mjs` para prevenir regresiones.
- **🪟 Query Wiki ahora es un panel lateral acoplado a la derecha estilo Copilot (#196, @YounianC).** `QueryModal extends Modal` se convirtió en `QueryView extends ItemView`. Todas las funcionalidades se conservan sin cambios.
- **🧹 Prefijo de related link re-afirmado determinísticamente (#200, @DocTpoint, #187).** Nueva función pura `correctRelatedLinkPrefixes()`.

Recomendamos actualizar.

## ✨ Características

### 📊 Calidad del Conocimiento

- **🔍 Entity/Concept Extraction** — El LLM extrae entities (personas, organizaciones, productos, eventos) y concepts (teorías, métodos, términos) de tus notas con granularidad de extracción flexible (Mínima~5 elementos, Gruesa~10, Estándar~50, Fina~100, Personalizada 1–300) para balancear profundidad de análisis y costos de API
- **🏷️ Mandatory Page Aliases** — Cada página generada incluye al menos 1 alias (traducción, acrónimo, nombre alternativo), habilitando detección de duplicados cross-language
- **🔄 Duplicate Detection & Merge** — El semantic tiering detecta duplicados verdaderos (traducciones cross-language, abreviaturas, variantes de ortografía); el merge inteligente de LLM fusiona contenido y preserva aliases
- **🧩 Smart Knowledge Fusion** — Las actualizaciones multi-source fusionan información nueva sin redundancia; las contradicciones se preservan con atribución; las páginas `reviewed: true` se protegen de sobrescritura
- **📏 Content Truncation Protection** — 8000 max_tokens con detección automática de stop_reason y reintento a 2× tokens en todos los providers
- **📝 Verbatim Source Mentions** — Las citas en idioma original se preservan con traducción opcional para trazabilidad

- **🎨 Vocabulario de etiquetas personalizable (v1.18.0).** Ajustes → Wiki → Modo de vocabulario de etiquetas → *Personalizado* te permite definir tus propias listas de etiquetas de tipo de entidad y concepto (por ejemplo, `Medical_Arzneimittel`, `法规`). El plugin respeta tu vocabulario en los prompts de extracción y en la validación de frontmatter; la auditoría de Lint (Issue #85 v7) reporta cualquier página cuyas etiquetas estén fuera del vocabulario activo.

### 🛠️ Mantenimiento

- **🔍 Lint Health Scan** — Detecta duplicados, dead links, empty pages, orphans, aliases faltantes y contradicciones en informe integral
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (coincidencias directas de nombre: cross-language, abreviaturas, títulos de alta similitud) siempre verificadas; Tier 2 (señales indirectas: enlaces compartidos, similitud moderada) llena el presupuesto de tokens
- **⚡ Smart Fix All** — Batch fix ordenado por causalidad: duplicados fusionados → dead links resueltos → orphans enlazados → empty pages expandidas
- **🏷️ Alias Completion** — Generación paralela de batch de aliases faltantes en un clic, mejorando detección futura de duplicados
- **🔄 Auto-Maintenance** — File watcher multi-carpeta, lint periódico, health check al inicio (Startup Quick Fixes activado por defecto, File Watcher y Periodic Lint desactivados por defecto)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (AI fix) o `detected → pending_fix` (manual)
- **🛡️ Portal de pre-ingestión (v1.21.0)** — Cada archivo fuente se valida *antes* de cualquier llamada LLM: las notas vacías/en blanco/solo frontmatter son rechazadas; el dedup por hash de contenido detecta archivos idénticos a través de rutas. Previene que los modelos locales alucinen nombres de entidades en entradas vacías.
- **📊 Panel de historial de operaciones (v1.21.0)** — UI buscable y filtrable para ingestiones pasadas, informes de lint y ejecuciones de mantenimiento, con tarjetas KPI impulsadas por insights y enlaces clickeables a páginas.
- **🧹 Limpiador de páginas incompletas (v1.21.0)** — Las páginas que quedaron en un estado parcial tras ingestiones interrumpidas se archivan automáticamente al inicio (recuperables desde la `.trash` de Obsidian).

### 💬 Query & Feedback

- **🤖 Conversational Query** — Diálogo estilo ChatGPT con Markdown en streaming e `[[wiki-links]]`, historial multi-turn
- **🪟 Panel lateral acoplado a la derecha (v1.22.1, PR #196).** Query Wiki se abre en un leaf del sidebar derecho estilo Copilot (reutilizando un leaf existente) en lugar de un popup centrado. El icono ribbon `message-circle` y el comando `Query Wiki` activan/muestran el panel; tus notas quedan visibles junto a la conversación. Toda la funcionalidad se conserva sin cambios.
- **📤 Query-to-Wiki Feedback** — Guarda conversaciones valiosas al Wiki con entity/concept extraction, semantic dedup antes de guardar
- **🔒 Duplicate Save Prevention** — El hash tracking previene re-evaluación de conversaciones sin cambios

### 🌐 LLM & Idioma

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, custom endpoints
- **🔄 5xx Retry** — Reintento automático de backoff exponencial (máx 2) en errores HTTP 5xx/429/529 en todos los clientes
- **📋 Dynamic Model List** — Fetching en tiempo real desde APIs de provider
- **🌐 Wiki Output Language** — 9 idiomas independientes de la UI (EN/ZH/JA/KO/DE/FR/ES/PT/IT), con input personalizado
- **🌍 Internacionalización completa de UI** — Interfaz del plugin en 9 idiomas (EN/ZH/JA/KO/DE/FR/ES/PT/IT), 269+ campos UI totalmente traducidos, expresiones locales naturales
- **⚡ Rate Limit Guardian** — Cuando la generación paralela activa rate limits, auto-detección y sugerencias: reducir concurrencia, aumentar delay batch, cambiar provider
- **🦙 Web Clipper Compatible** — Agregar con un clic el folder `Clippings/` de Obsidian Web Clipper a la watchlist, clips web auto-ingestados en Wiki

### 🏗️ Arquitectura & Rendimiento

- **⚡ Parallel Page Generation** — 1–5 páginas concurrentes configurables, por defecto 3 (paralelo), 2–3× más rápido para sources grandes, aislamiento de errores por página
- **📚 Iterative Batch Extraction** — El tamaño de batch adaptativo elimina el cuello de botella de max_tokens para documentos largos
- **🏛️ Three-Layer Architecture** — `sources/` (solo lectura) → `wiki/` (generado por LLM) → `schema/` (config co-evolucionada)
- **🧩 Modular Codebase** — 20+ módulos enfocados en `src/`

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
| **📊 Ver historial de ingestión (v1.21.0)** | Explora ingestiones pasadas, informes de lint y ejecuciones de mantenimiento en una UI buscable y filtrable |

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

Para models locales (Ollama): las ventanas de contexto son típicamente más pequeñas (8K–128K). Considera usar un provider en la nube para ingestion + model local para query.

**🔌 Anthropic Compatible (Coding Plan):** Si tu provider ofrece un endpoint de API compatible con Anthropic, selecciona "Anthropic Compatible" e ingresa el Base URL y API Key de tu provider.

**🦙 Ollama (local, sin clave API):** Instala [Ollama](https://ollama.com), descarga un modelo (`ollama pull gemma4` o `ollama pull qwen3.5:27b`), selecciona "Ollama (Local)" en el desplegable de provider.

**🎛️ LM Studio (local, sin clave API):** Instala [LM Studio](https://lmstudio.ai), inicia su servidor local (por defecto `http://localhost:1234/v1`), selecciona "LM Studio (Local)" en el desplegable de provider. LM Studio ejecuta un servidor compatible con OpenAI integrado — el campo de clave API es opcional.

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
main.ts              # 🔌 Punto de entrada del plugin
wiki/                # Módulos del motor Wiki
  wiki-engine.ts     # 🎯 Orquestador
  query-engine.ts    # 💬 Query conversacional
  source-analyzer.ts # 📊 Extracción batch iterativa
  page-factory.ts    # 🏗️ CRUD de entity/concept + merge
  conversation-ingest.ts # 📥 Chat → conocimiento Wiki
  contradictions.ts  # ⚠️ Detección de contradicciones
  system-prompts.ts  # 🗣️ Directiva de idioma + etiquetas de sección
  lint/              # Submódulos de Lint
    controller.ts        # 🔍 Orquestación de Lint
    fix-runners.ts       # ⚡ Ejecutores de fix en lote
    scanners.ts          # 🔍 Scanners (dead links, orphans, aliases, anclaje de citas)
    duplicate-detection.ts # 🔄 Generación programática de candidatos duplicados
    report-builder.ts    # 📋 Constructor de informes de función pura
    phases/              # Ejecución de Lint por fases
  prompts/           # Plantillas de prompts LLM por dominio
schema/              # Co-evolución del schema
  manager.ts         # 📋 CRUD de schema + sugerencias
  auto-maintain.ts   # 🔄 File watcher + lint periódico + quick fixes al inicio
  analyze.ts         # 📊 Análisis de schema con cableado de cancelación
ui/                  # Interfaz de usuario
  settings.ts        # ⚙️ Panel de configuración
  modals.ts          # 📦 Modales de Lint / Ingest / Query / History
core/                # 🧩 Módulos de función pura (cero IO, totalmente testeables)
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ compartidos: llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
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
Obsidian v1.11.0+, escritorio (Windows/macOS/Linux), una API key de un provider LLM. Ollama funciona localmente sin API key.

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
En **Configuración → LLM Configuration**: aumenta **Page Generation Concurrency** a 3–5, reduce **Batch Delay** a 100–300ms (cuidado con rate limiting). Elige granularidad "Mínima", "Gruesa" o "Estándar" para reducir el número de páginas y ahorrar costos de API.

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

**Mis archivos `sources/` se renombraron tras actualizar a v1.20.3 — ¿hay algún problema? (v1.20.3+)**
No — es la nueva huella digital de slug de fuente anti-colisión en acción. Cada `sources/<slug>.md` ahora es `sources/<nombre_base>_<6 hex>.md` (el hex es un hash FNV-1a de la ruta completa del archivo). Los archivos con el mismo nombre base en diferentes carpetas (p. ej. 11× `About this course.md` en cursos Academy) ya no colisionan. La re-ingesta renombra las páginas `sources/` existentes en su lugar y todos los backlinks `[[sources/<slug>]]` se actualizan automáticamente. Si tienes scripts externos o marcadores que apunten a `sources/<slug-antiguo>.md`, actualízalos a las nuevas rutas con huella digital.

**¿Re-ingestar una fuente no relacionada sobrescribirá una página bloqueada con `reviewed: true`? (v1.20.3+)**
No — Stage 4 (`updateRelatedPage`) ahora respeta `reviewed: true` y enruta a la ruta append-only, igual que la ruta de ingesta. Tu cuerpo curado sobrevive tal cual; solo se añade contenido verdaderamente nuevo.

**Mi modelo local (Ollama, LM Studio) está fabricando nombres de entidades extraños a partir de notas en blanco o con solo frontmatter. (v1.21.0)**
Corregido en v1.21.0 con el portal de pre-ingestión: las notas vacías/en blanco/solo frontmatter ahora se rechazan *antes* de cualquier llamada LLM, y el dedup por hash de contenido detecta archivos idénticos a través de rutas. Actualiza a v1.21.0+ para detener la clase de bugs "archivo vacío → alucinación" (modelos pequeños inventando nombres de entidades con un prompt vacío).

**¿Cómo obtener ayuda?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — reportar errores
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — preguntas y comentarios

**¿Cómo obtener logs de depuración para solución de problemas?**

1. Abre las herramientas de desarrollo (`Ctrl+Shift+I` / `Cmd+Option+I`)
2. Ve a la pestaña **Console**
3. Ejecuta tu operación (ingesta, consulta o lint)
4. Busca mensajes con prefijos de nombre de módulo como `[Step]`, `[LLM]`, nombres de módulos
5. Para pruebas locales, usa `pnpm build:dev` en vez de `pnpm build` para preservar la salida de depuración completa
6. Copia las líneas de log relevantes e inclúyelas en tu issue de GitHub — esto acelera mucho el diagnóstico

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
- **🔌 Transporte LLM:** `requestUrl` de Obsidian (Anthropic) + cliente HTTP compatible con OpenAI hecho a mano (proveedores terceros compatibles con OpenAI)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)

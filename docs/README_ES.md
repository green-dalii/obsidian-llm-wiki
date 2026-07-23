![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Un plugin de Obsidian que convierte tus notas en una base de conocimiento conectada y consultable: la idea del [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), integrada en el editor donde ya escribes.

> **Recuperación por grafo sin embeddings • 10 idiomas nativos • Funciona con cualquier proveedor**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | **Español** | [Português](README_PT.md) | [Italiano](README_IT.md)

[Sitio oficial](https://llmwiki.greenerai.top/) | [Mercado de Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Debate](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [Contenido](#-contenido) • 🚀 [Inicio rápido](#-inicio-rápido) • ✨ [Características](#-características) • 🔍 [Cómo funciona la recuperación](#-cómo-funciona-la-recuperación) • 🤖 [Modelos](#-modelos) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Si este plugin te ha sido útil, invítame a un café♥️ o deja una estrella🌟↗

---

## 📑 Contenido

- [🤔 Por qué este plugin?](#-por-qué-este-plugin)
- [🎯 Es para mí?](#-es-para-mí)
- [🚀 Inicio rápido](#-inicio-rápido)
- [✨ Características](#-características)
- [🔍 Cómo funciona la recuperación](#-cómo-funciona-la-recuperación)
- [🤖 Modelos](#-modelos)
- [❓ FAQ](#-faq)
- [🔒 Privacidad](#-privacidad)
- [💖 Apoyar el proyecto](#-apoyar-el-proyecto)
- [📜 Licencia y créditos](#-licencia-y-créditos)

---

## 🤔 Por qué este plugin?

Escribes notas. Se quedan en carpetas. Encontrar relaciones significa recordar hilos que olvidaste hace meses.

**Existen otras reimplementaciones open-source de la idea de Karpathy, pero ninguna llega como un plugin de Obsidian listo para usar.** La mayoría son herramientas CLI, skills de Claude Code o aplicaciones de escritorio separadas. Somos el único con UI nativa, almacenamiento dentro del vault y el Graph View de Obsidian integrado.

### Cómo nos comparamos

|  | Karpathy LLM Wiki (este plugin) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **Forma de entrega** | ✅ Plugin de Obsidian listo para usar | ❌ App de escritorio Tauri separada | ❌ Skill de Claude Code | ❌ Skill de Claude Code / Codex | ❌ CLI + SDK + servidor MCP |
| **Esfuerzo de configuración** | ✅ **5 minutos** — Plugins comunitarios → Instalar → elegir proveedor → Ingestar | ❌ 30 min+ — compilar/descargar binario, configurar CLI | ❌ 15 min — requiere suscripción Claude Code + instalar skill | ❌ 10 min — requiere suscripción Claude Code/Codex + configurar skill | ❌ 30 min+ — pip install + SDK + configuración MCP |
| **Instalación** | ✅ Obsidian → Plugins comunitarios → buscar → Instalar | ❌ Compilar o descargar binario, luego configurar CLI | ❌ Requiere suscripción Claude Code + guía de instalación | ❌ Requiere suscripción Claude Code o Codex + pasos de configuración | ❌ pip install + Python SDK + servidor local |
| **Complejidad arquitectónica** | ✅ **Cero dependencias** — sin base de datos vectorial, sin modelo de embeddings, sin procesos externos | 🟡 Incluye su propio runtime Python + sigma.js + sqlite | 🟡 Usa el entorno de Claude Code — no es autónomo | 🟡 Requiere plataforma de ejecución separada | ❌ Requiere Python, modelo de embeddings, BD vectorial |
| **i18n (UI + salida wiki)** | ✅ 10 idiomas (UI / salida independientes) | 🟡 2 (EN / 中文) | ❌ Solo inglés | ❌ Solo inglés | ❌ Solo inglés |
| **Proveedores LLM** | ✅ 12+ (incluye Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-compatible, Kimi, GLM, MiniMax, DeepSeek) | 🟡 Compatible con OpenAI | 🟡 Suscripción vía Claude Code | 🟡 Suscripción vía Claude Code / Codex | 🟡 Compatible con OpenAI |
| **Algoritmo de recuperación** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 Heurística de 4 señales (Adamic-Adar + decaimiento de 2 saltos) | ❌ Solo detección de comunidades Louvain | ❌ Louvain + previsualizaciones k-hop | ❌ Híbrido: BM25 + semántico + wikilink |
| **Pipeline de consulta (cascada de 5 etapas)** | ✅ Lex → palabras clave LLM → escaneo de subcadenas → fallback LLM KB → expansión PPR (se trunca al llegar a suficiente señal) | 🟡 Solo decaimiento de 2 saltos | ❌ Solo clustering Louvain | ❌ Previsualizaciones k-hop (sin aumento LLM) | ❌ BM25 + semántico sobre fragmentos (sin grafo) |
| **Embeddings necesarios** | ✅ No (cero costo de embeddings, por diseño) | 🟡 Opcional, desactivado por defecto | ✅ No | ✅ No | ❌ **Sí — obligatorio** |
| **Visualización de grafo** | ✅ Graph View nativo de Obsidian (integrado, cero tamaño extra) | ❌ sigma.js personalizado + graphology en app de escritorio | 🟡 graph.html vis.js (archivo separado) | ❌ sigma.js HTML offline personalizado | ❌ Visor de solo lectura en navegador |
| **Honestidad del Wiki** | ✅ Cartel "Stage FALLBACK" cuando ninguna fuente del wiki coincide con tu consulta | ❌ Sin equivalente | ❌ Sin equivalente | ❌ Sin equivalente | ❌ Sin equivalente |
| **Benchmark de recuperación publicado** | ✅ PPR @5 = 27.1% vs knn puro 24.1% (único número publicado en este espacio) | ❌ 58% → 71% *solo con embeddings activados*, no en nuestro formato comparable | ❌ No publicado | ❌ No publicado | ❌ No publicado |

### Tres cosas que elegimos a propósito, no por accidente

- **🪟 Obsidian es el runtime.** Sin terminal, sin aplicación separada, sin Docker, sin Python. Instálalo desde Plugins Comunitarios, haz clic en Ingestar, el wiki vive en tu vault desde el primer segundo. El Graph View nativo de Obsidian renderiza tu grafo `[[wiki-link]]` — integrado, cero tamaño extra.
- **🧑‍🍳 Limpio y autocontenido.** Cero dependencias. Sin modelo de embeddings, sin base de datos vectorial, sin paquete pip — un solo plugin que lee tus notas, habla con un LLM y escribe páginas wiki. Todo vive dentro de Obsidian.
- **🔌 Cualquier modelo por el que ya pagas.** Anthropic, Bedrock, OpenAI, ChatGPT Plan (Codex OAuth), DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, Anthropic-compatible, endpoint personalizado — más de doce proveedores, ninguno requiere tener un endpoint de embeddings.

---

## 🎯 Es para mí?

**✅ Sí, si:**

- **Quieres una configuración de 5 minutos, no un proyecto de 5 horas.** Instala desde Plugins Comunitarios → elige un proveedor → ingesta una nota. Sin CLI, sin Python, sin runtime separado, sin BD vectorial. Ves páginas wiki en `wiki/` en segundos.
- **Quieres algo limpio y autocontenido.** El plugin tiene exactamente cero dependencias externas: sin modelo de embeddings, sin base de datos vectorial, sin paquete pip, sin contenedor Docker. Es un solo plugin de Obsidian que lee tus notas, habla con un LLM y escribe páginas wiki en tu vault. Todo vive dentro de Obsidian.
- **Quieres un chat consultable que responda desde *tus* notas** — no desde internet — con cada respuesta llevando `[[wiki-links]]` de vuelta a tu grafo de conocimiento.
- **Te importa la soberanía de datos** — funciona completamente en local con Ollama o LM Studio, sin tocar internet.
- **Escribes o lees en cualquiera de los 10 idiomas compatibles** — la UI y el idioma de salida del wiki son independientes (tu wiki puede estar en chino mientras la interfaz está en inglés).
- **Mantienes el grafo escribiendo `[[wiki-links]]`** — cada enlace que escribes ya enriquece la recuperación; sin paso separado de etiquetado/embedding/indexación.
- **Quieres mantenimiento con un clic** — Escaneo de salud Lint + Smart Fix All mantienen a raya duplicados, enlaces rotos y páginas huérfanas sin que tengas que curar manualmente.

**❌ No, si:**

- **Quieres un reemplazo de ChatGPT de uso general** — este plugin responde solo desde *tu* conocimiento.
- **Necesitas un pipeline RAG sobre PDFs / páginas web / corpus externos** — nos enfocamos en la ruta dentro del vault (los PDFs son compatibles desde v1.25.0).
- **Buscas un SaaS alojado** — no hay backend, ni servidor, ni cuenta.

---

## 🚀 Inicio rápido

1. **Instala.** Obsidian → Configuración → Plugins comunitarios → Examinar → busca "Karpathy LLM Wiki" → Instalar → Habilitar. O visita la [página del Plugin Comunitario](https://community.obsidian.md/plugins/karpathywiki) y haz clic en **Add to Obsidian**.
2. **Configura un proveedor.** Abre Configuración → Karpathy LLM Wiki → elige un proveedor (OpenAI, Anthropic, Ollama, ChatGPT Plan (Codex OAuth), etc.) → introduce la clave API (no necesaria para local) → haz clic en **Test Connection** → Guardar.
3. **Ingesta una nota.** `Cmd+P/Ctrl+P` → "Ingest single source" → elige cualquier archivo Markdown (o **PDF**, v1.25.0+). Tus primeras páginas wiki aparecen en `wiki/sources/`, `wiki/entities/`, `wiki/concepts/` en segundos.

Eso es todo. El plugin no modifica nada en tus notas originales — solo crea páginas nuevas dentro de `wiki/`. Para chatear con tu wiki: `Cmd+P/Ctrl+P` → "Query wiki". (`Cmd` en macOS, `Ctrl` en Windows/Linux.)

### Comandos principales

| Comando | Qué hace |
|---------|----------|
| **📥 Ingest single source** | `Cmd+P/Ctrl+P` → "Ingest single source" — elige un archivo Markdown o **PDF (v1.25.0+)**, obtén páginas de entidades/conceptos/wiki |
| **📂 Ingest from folder** | `Cmd+P/Ctrl+P` → "Ingest from folder" — ingesta por lotes cada nota de una carpeta, con salto inteligente de lotes |
| **📑 Ingest multiple files** | `Cmd+P/Ctrl+P` → "Ingest multiple files" — selecciona un subconjunto mediante un árbol de carpetas de dos paneles (con cola en vivo + cancelación por archivo) |
| **🔍 Query wiki** | `Cmd+P/Ctrl+P` → "Query wiki" — chatea con tu wiki en un panel lateral derecho; las respuestas llevan `[[wiki-links]]` |
| **🛠️ Lint wiki** | `Cmd+P/Ctrl+P` → "Lint wiki" — escaneo de salud completo: duplicados, enlaces rotos, páginas vacías, huérfanas, alias faltantes, contradicciones |
| **⚡ Smart Fix All** | dentro del Modal Lint — reparación en orden causal con un clic e informe por fase |
| **📋 Regenerate index** | `Cmd+P/Ctrl+P` → "Regenerate index" — reconstruye `wiki/index.md` con páginas y alias actuales |
| **⏹ Cancelar** | `Cmd+P/Ctrl+P` → "Cancel current ingestion" o haz clic en la barra de estado — se detiene limpiamente en el próximo límite de lote |
| **📊 Ingestion history** | `Cmd+P/Ctrl+P` → "View Ingestion History" — interfaz buscable para ingestiones pasadas, informes Lint y ejecuciones de mantenimiento |

| Antes | Después |
|-------|---------|
| `notes/machine-learning.md` (un archivo plano) | `wiki/concepts/supervised-learning.md` con `[[enlaces bidireccionales]]`, alias, atribución de fuente y una entrada en `wiki/index.md` |

> 💡 **Mantenerse actualizado.** Las nuevas funciones, correcciones y mejoras de rendimiento se publican con frecuencia. Configuración → Plugins comunitarios → Buscar actualizaciones, o activa las actualizaciones automáticas de plugins.
> 📖 Guías detalladas (instalación, configuración PDF, notas multi-proveedor, actualizaciones) se mantienen en [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides).

---

## ✨ Características

### 📚 Calidad del conocimiento

- **🔍 Extracción de entidades y conceptos** — El LLM extrae entidades (personas, organizaciones, productos, eventos) y conceptos (teorías, métodos, términos) en páginas independientes. La granularidad es configurable (Mínima → Fina, más Personalizada) para que puedas equilibrar costo vs. profundidad.
- **🏷️ Alias obligatorios** — cada página incluye al menos un alias (traducción, abreviatura, variante) para que la detección de duplicados entre idiomas funcione.
- **🔄 Detección de duplicados por niveles** — Nivel 1 (coincidencia directa de nombre: entre idiomas, abreviatura, títulos de alta similitud) siempre se verifica; Nivel 2 (enlaces compartidos, similitud media) llena el presupuesto de tokens restante.
- **🧩 Fusión inteligente y máquina de estados de contradicción** — los duplicados se fusionan preservando alias; las contradicciones se marcan con atribución de fuente; las páginas con `reviewed: true` están protegidas contra sobrescritura.
- **🎨 Vocabulario de etiquetas personalizable** — define tus propias listas de etiquetas de tipo de entidad y concepto en Configuración → Wiki → Tag Vocabulary → *Custom*; Lint informa de cualquier página cuyas etiquetas estén fuera del vocabulario activo.

### 📄 Ingesta de PDF (v1.25.0+)

- **🔌 Puerta de proveedor** — Anthropic, OpenAI y Bedrock manejan PDF de forma nativa. Para cualquier otro endpoint compatible con OpenAI/Anthropic, activa **Force PDF Support** en Configuración → LLM Configuration → Advanced para que el plugin intente la llamada. Para OCR local en Apple Silicon, extractores de terceros (MinerU, Docling, Mathpix, Adobe) y la guía completa de ingesta PDF, consulta [Rutas de OCR PDF](#-rutas-de-ocr-pdf) más abajo y [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md).
- **🗄️ Caché acotada** — `.obsidian/plugins/karpathywiki/pdf-cache/` almacena el Markdown convertido, indexado por hash de contenido + modelo + versión del convertidor. Mantenimiento de tres capas de defensa: 100 MB total / 1000 entradas / 10 MB por entrada individual con evicción LRU por mtime.
- **📝 Sidecar opcional en el vault** — Configuración → Wiki Configuration → Wiki Folder → *Write PDF Markdown to Vault* escribe `<basename>.pdf.md` junto al PDF fuente (desactivado por defecto — solo caché es el valor predeterminado).
- **🛡️ Prompt de transcripción literal** — conversión estilo OCR con marcadores anti-alucinación `[illegible]` / `[figure: ...]`; el envoltorio de fences markdown de modelos locales pequeños se limpia automáticamente antes de escribir en caché.

### 📄 Rutas de OCR PDF

Tres rutas, elige la que se ajuste a tu configuración:

1. **☁️ Proveedor cloud con soporte PDF nativo** — Anthropic, OpenAI o AWS Bedrock leen PDFs sin configuración adicional. Solo ingesta; no se necesita configuración extra. Para cualquier otro endpoint compatible con OpenAI/Anthropic, activa **Force PDF Support** en Configuración → LLM Configuration → Advanced para que el plugin intente la llamada.
2. **🖥️ OCR local en Apple Silicon** — [oMLX](https://github.com/jundot/omlx) integra Microsoft Markitdown como backend PDF→Markdown incorporado. Activa Markitdown en oMLX, carga [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M activos, open-source 2026-06) como modelo de visión, apunta el plugin a oMLX como proveedor Custom OpenAI-Compatible, activa **Force PDF Support** y elige el modelo multimodal que oMLX está sirviendo. El PDF nunca sale de tu máquina.
3. **🛠️ Extractor de terceros (MinerU, Docling, Mathpix, Adobe)** — ejecuta un extractor separado en tus PDFs para producir archivos `.md`, luego ingéstalos como notas Markdown regulares a través del pipeline estándar del plugin. La opción más fiable para artículos científicos, documentos escaneados y PDFs con muchas matemáticas.

📖 **Guías de configuración completas** para las tres rutas (proveedores cloud, niveles de hardware oMLX, instalación de MinerU, mantenimiento de caché) → [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)

### 💬 Consulta y mantenimiento

- **🧭 Cascada PPR de 5 etapas** — consulta [Cómo funciona la recuperación](#-cómo-funciona-la-recuperación). Personalized PageRank sobre `[[wiki-link]]` proporciona contexto multi-hop consciente del grafo.
- **🪟 Panel lateral acoplado a la derecha** — Query Wiki se abre en un panel lateral derecho estilo Copilot (v1.22.1+) en lugar de un modal centrado.
- **🔍 Escaneo de salud Lint** — un solo comando detecta: duplicados, enlaces rotos, páginas vacías, huérfanas, alias faltantes, contradicciones.
- **⚡ Smart Fix All** — reparación en orden causal con un clic: completar alias → fusionar duplicados → arreglar enlaces rotos → enlazar huérfanas → expandir páginas vacías, con informe por fase.
- **📊 Panel de historial de operaciones** — interfaz buscable y filtrable para ingestiones pasadas, informes Lint y ejecuciones de mantenimiento.
- **🛡️ Portal de pre-ingestión** — las notas vacías / solo espacios / solo frontmatter se rechazan antes de cualquier llamada LLM; el dedup por hash de contenido detecta archivos idénticos en distintas rutas.

### 🔒 Privacidad

- **🚫 Sin backend, sin seguimiento, sin análisis.** Se ejecuta completamente dentro de Obsidian. La red se usa solo para comunicarse con el proveedor LLM que configures.
- **📁 Los archivos fuente son de solo lectura.** El plugin nunca modifica tus notas originales del vault — solo crea páginas nuevas dentro de `wiki/`.
- **🦙 Modo local completo.** Ollama, LM Studio o cualquier endpoint local compatible con OpenAI → tus notas nunca salen de tu máquina.
- **🔐 Permisos mínimos.** Acceso a archivos del vault para la gestión del wiki. Acceso al portapapeles solo cuando haces clic en el botón "Copiar" en el modal de Consulta.

### 🦙 Local-first

- **🖥️ Ollama, LM Studio, OpenRouter, endpoint personalizado** — listos para usar. Los modelos locales funcionan para consulta (ventanas de contexto más pequeñas); la ingesta en un vault de 2000 páginas normalmente necesita un modelo cloud de contexto largo.
- **📄 La ruta de OCR PDF es completamente local en Apple Silicon** — consulta [Rutas de OCR PDF](#-rutas-de-ocr-pdf) más abajo.
- **🔐 ChatGPT Plan (Codex OAuth)** — callback loopback de escritorio en `127.0.0.1:1455`; móvil mediante código de dispositivo. Las credenciales viven solo en Obsidian SecretStorage; cerrar sesión las borra. Compatibilidad de terceros con Codex, no una asociación con OpenAI.

### 🌐 Idioma

- **🌍 10 idiomas de UI** — English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. La UI y el idioma de salida del wiki son independientes — tu wiki puede estar en chino mientras la interfaz está en inglés.
- **📚 10 idiomas de salida del wiki** — el mismo conjunto; elige en Configuración → Wiki Configuration. Opción *Custom input* para prompts ad-hoc.
- **🈶 269+ cadenas de UI traducidas** — cada etiqueta, modal y aviso. Añadir un 11.º idioma es impulsado por contribuciones (patrón PR #159).

---

## 🔍 Cómo funciona la recuperación

La mayoría de los plugins de "búsqueda AI" fragmentan tus notas en trozos y los incrustan en una base de datos vectorial. Nosotros no. El argumento de Karpathy contra RAG es que la fragmentación rompe la capacidad del LLM para razonar a través de todo tu grafo de conocimiento — y ese argumento se sostiene en la práctica. En su lugar, recorremos el grafo que ya mantienes al escribir `[[wiki-links]]`.

### La cascada de selección de semillas de 5 etapas

Cuando preguntas "Quién fundó Microsoft?", Query Wiki ejecuta cinco etapas antes de comenzar a generar cualquier respuesta:

1. **Ruta rápida Lex** — superposición directa de tokens contra cada título de entidad/concepto y sus alias. Gratis, instantánea, y es el paso de control para todo lo que sigue.
2. **Generación de palabras clave LLM** — el LLM propone de 8 a 12 palabras clave inter-idiomas a partir de tu consulta (maneja sinónimos, abreviaturas y términos resistentes a la superposición de tokens en una sola llamada LLM).
3. **Escaneo local de subcadenas** — cada palabra clave generada se vuelve a cotejar localmente contra títulos de página, alias y fragmentos del cuerpo. Sin llamada LLM adicional; completa el recall tolerante al ruido.
4. **Fallback LLM KB** — cuando lex + escaneo de palabras clave devuelven señales débiles, el LLM resiembra los N mejores candidatos contra el wiki completo en una pasada semántica.
5. **Expansión de grafo PPR** — Personalized PageRank (Haveliwala 2002) sobre el grafo `[[wiki-link]]` partiendo del conjunto de semillas candidatas. Esto es lo que proporciona contexto multi-hop consciente del grafo: "Bill Gates" → "Microsoft" → "competidores", no solo superposición literal de títulos.

La cascada se trunca en el paso que devuelva suficiente señal — sin costo fijo de 5 etapas, sin llamadas LLM cuando lex es suficiente, sin pérdida de precisión cuando se necesita aumento LLM.

### Personalized PageRank a escala

Usamos Monte Carlo PPR (Fogaras 2005) — 3000 caminatas aleatorias × 50 pasos cada una — con la regla de dead-end de Haveliwala 2002. El costo es **O(K × L)** independiente del número de páginas, por lo que un vault de 2000 páginas ve la misma latencia de expansión que uno de 200 páginas.

**PPR @5 = 27.1% vs línea base knn puro 24.1%** en el corpus de benchmark del proyecto (el único benchmark de recuperación publicado en este espacio open-source de LLM-Wiki).

### Por qué no embeddings

Rechazamos deliberadamente la ruta de embeddings en [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175). La señal del grafo ya está ahí — cada `[[wiki-link]]` es una arista "estos están relacionados" curada a mano, y la mayoría de los proveedores que soportamos (Ollama, LM Studio, Anthropic, Bedrock, Kimi, GLM, MiniMax) no tienen ningún endpoint `/v1/embeddings`. Añadir un modelo de embeddings significaría una descarga por página, un adaptador por proveedor y cero beneficio en la calidad de recuperación.

---

## 🤖 Modelos

**Proveedores compatibles (12+, cotejados con models.dev en 2026-07):**

| Proveedor | Series | Notas |
|-----------|--------|-------|
| **Anthropic** | Claude 5 series | PDF nativo; protocolo `/v1/messages` |
| **OpenAI** | GPT-5.6 series (Sol / Terra / Luna) | PDF nativo; clave API Platform |
| **Google Gemini** | Gemini 3.6 series | PDF nativo (file parts desde 1.5); endpoint compatible con OpenAI |
| **DeepSeek** | DeepSeek V4 series | Compatible con OpenAI; nivel de costo más bajo |
| **Alibaba Qwen** | Qwen3.7/3.8 series | Compatible con OpenAI (DashScope) |
| **xAI Grok** | Grok 4 series | Compatible con OpenAI; contexto largo |
| **Moonshot Kimi** | Kimi K3 series | Compatible con OpenAI; 2.8T MoE frontier |
| **Zhipu GLM** | GLM-5 series | Compatible con OpenAI; bilingüe fuerte |
| **MiniMax** | MiniMax M3 series | Compatible con OpenAI; contexto de 1M |
| **Step (阶跃星辰)** | Step 3 series (Flash) | Compatible con OpenAI; inferencia rápida |
| **Tencent Hunyuan** | Hy3 series | Compatible con OpenAI; MoE de peso abierto |
| **Xiaomi MiMo** | MiMo V2.5 series | MIT open-source; precio plano |
| **Google Gemma** | Gemma 4 series | Peso abierto; contexto 262K |
| **AWS Bedrock** | Variantes Anthropic + OpenAI | Ruta VPC / cumplimiento normativo |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | Inicio de sesión por navegador/código de dispositivo; SecretStorage |
| **Local: Ollama, LM Studio, OpenRouter, Anthropic-Compatible** | Cualquier modelo de protocolo OpenAI-/Anthropic- | Custom OpenAI-Compatible + Anthropic-Compatible (Token Plan / Coding Plan) |

Este plugin alimenta al LLM con el contexto completo de tu Wiki por consulta — por lo que **los modelos de contexto largo ganan**. La tabla completa por niveles (cloud + local) vive en [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md), cotejada con [models.dev](https://models.dev/) para que las recomendaciones se mantengan actualizadas.

### Qué importa

- **🧠 Ventana de contexto ≥ 200K tokens** para vaults de más de ~500 páginas. Por debajo de 200K, el contexto ensamblado de la cascada empieza a truncarse.
- **⚖️ La calidad de seguimiento de instrucciones importa más que el IQ bruto** para la tarea de extracción — elige un modelo que siga la plantilla del esquema, no el número más grande en el leaderboard.
- **🔌 El endpoint de embeddings es irrelevante** — no usamos embeddings. Un proveedor que carezca de `/v1/embeddings` funciona bien (la mayoría de nuestros 12+ proveedores lo son).
- **🦙 Local funciona para consulta, cloud para ingesta** — la ingesta en un vault de 2000 páginas normalmente necesita un modelo cloud de contexto largo; un modelo local de 262K cubre la mayoría de las consultas.

### Anthropic vs OpenAI vs Codex OAuth — son proveedores distintos

- **Anthropic** (y su variante Bedrock) — clave API de Anthropic Platform facturada por separado.
- **OpenAI** — clave API de OpenAI Platform facturada por separado.
- **ChatGPT Plan (Codex OAuth)** — experimental, proveedor distinto que usa la asignación Codex elegible después de iniciar sesión por navegador o código de dispositivo; la disponibilidad sigue las políticas de autenticación y asignación de OpenAI Codex, no el nombre del plan. Compatibilidad de terceros con Codex, no una asociación con OpenAI ni una API general de ChatGPT.

> 📖 **Tabla completa de selección** (cloud + local + OCR PDF + Codex OAuth + cuantización + niveles de hardware) → [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)

---

## ❓ FAQ

### Qué hace exactamente el plugin?

Elige cualquier nota, carpeta o selección; el LLM extrae entidades y conceptos y genera un wiki interconectado con `[[enlaces bidireccionales]]`. Haz preguntas y recibe respuestas conversacionales basadas en *tus* notas, no en internet. Tus notas originales del vault nunca se modifican.

### Cómo empiezo?

Instala desde Plugins Comunitarios de Obsidian → elige un proveedor → **Test Connection** → ejecuta **Ingest single source** en cualquier nota. Las primeras páginas wiki aparecen en segundos. Consulta [Inicio rápido](#-inicio-rápido).

### Mi wiki existente está segura?

✅ Retrocompatible desde v1.0.0. Establece `reviewed: true` en cualquier página para protegerla contra sobrescritura. Actualizar desde v1.24.x no reescribe tu vault; la ingesta de PDF de v1.25.0 es solo caché por defecto.

### Mis datos se envían a algún sitio?

🚫 Sin backend, sin análisis — el plugin se ejecuta completamente dentro de Obsidian. Solo el texto que envías explícitamente para ingesta/consulta sale de tu dispositivo, y solo al proveedor LLM que configures. Para localidad completa de datos, usa Ollama o LM Studio.

### Puedo usar el plugin en mi idioma?

🌍 10 idiomas tanto para la UI como para la salida del wiki. La UI y el idioma del wiki son independientes. Añadir un 11.º idioma es impulsado por contribuciones (patrón PR #159).

### En qué se diferencia de un chatbot RAG?

🚫 Sin fragmentación. 🚫 Sin embeddings. 🚫 Sin BD vectorial. ✅ Personalized PageRank sobre tu grafo `[[wiki-link]]` existente — contexto multi-hop consciente del grafo, cero costo de embeddings, soporte completo de modelos locales.

### Qué LLM debería usar?

Los modelos de contexto largo (≥200K tokens) funcionan mejor. La [sección Modelos](#-modelos) cubre los principios; la tabla completa por niveles está en [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md).

### Hay un benchmark publicado?

Sí — PPR @5 = 27.1% vs línea base knn puro 24.1% en el corpus del proyecto. El pipeline completo y el script de benchmark se describen en [Cómo funciona la recuperación](#-cómo-funciona-la-recuperación).

### Cómo controlo los costos de API?

Usa granularidad Gruesa o Mínima para ingesta por lotes. Smart Batch Skip detecta automáticamente archivos ya procesados. El Mantenimiento Automático está DESACTIVADO por defecto. Lint muestra recuentos antes de ejecutar correcciones — no se cobra nada sin tu aprobación.

### Cómo cancelo una operación en curso?

Haz clic en la barra de estado (muestra "Ingesting… click to cancel") o `Cmd+P/Ctrl+P` → "Cancel current ingestion". Se detiene limpiamente en el próximo límite de lote.

### Dónde obtengo ayuda?

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) para informes de errores · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) para preguntas y solicitudes de funciones · Consola del desarrollador (`Ctrl+Shift+I` / `Cmd+Option+I`) para los registros del plugin.

---

## 🔒 Privacidad

Este plugin está listado en el Mercado de Plugins Comunitarios de Obsidian y se somete a revisión automatizada de seguridad y permisos.

- **🚫 Sin backend, sin servidor, sin recopilación de datos.** Software puramente local que se ejecuta dentro de Obsidian. El plugin no puede ni recopila, almacena ni transmite tus datos a ningún servidor — porque dicho servidor no existe.
- **🔐 El acceso a la red es opt-in.** Se usa únicamente para comunicarse con el proveedor LLM que configures. Tú eliges el proveedor, tú introduces la clave API, tú decides a dónde van tus datos.
- **📁 El acceso a los archivos del vault** se usa para la gestión del wiki (leer notas, generar páginas, escanear enlaces rotos, detectar duplicados). El plugin nunca modifica tus archivos fuente.
- **📋 El acceso al portapapeles** se usa exclusivamente por el botón "Copiar" en el modal de Consulta, y solo cuando haces clic en él.

Para una localidad completa de datos, utiliza Ollama o LM Studio. Con un proveedor local, tus datos nunca salen de tu máquina.

---

## 💖 Apoyar el proyecto

Si LLM-Wiki se ha convertido en una parte importante de tu flujo de trabajo de conocimiento:

- ☕ **[Invítame a un café en Ko-fi](https://ko-fi.com/greenerdalii)** — apoyo único o mensual
- 💳 **[Propina vía PayPal](https://paypal.me/greenerdalii)** — propina única

El patrocinio es totalmente opcional. El plugin sigue siendo Apache-2.0 y completo en funciones.

Gracias a [@jameses-cyber](https://github.com/jameses-cyber) y [@issaqua](https://github.com/issaqua) por apoyar el proyecto.

---

## 📜 Licencia y créditos

Apache License, Versión 2.0 — consulta [LICENSE](../LICENSE) y [NOTICE](../NOTICE).

**Construido sobre:**
- 💡 [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — el concepto original
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) y [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — algoritmos de recuperación

**Mantenedor:** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)


// System prompt builder — extracted from WikiEngine for modularity.
// Pure functions with no Obsidian vault dependencies.

import { LLMWikiSettings, WIKI_LANGUAGES } from '../types';

export function buildWikiLanguageDirective(settings: LLMWikiSettings): string {
  const lang = settings.wikiLanguage || 'en';
  const langName = WIKI_LANGUAGES[lang] || lang;
  return `IMPORTANT: You MUST write ALL content in ${langName}. Every page title, summary, description, and label must be in ${langName}. Do NOT output any content in other languages.`;
}

export const SECTION_LABELS: Record<string, Record<string, string>> = {
  en: {
    basic_information: 'Basic Information', description: 'Description',
    related_content: 'Related Content', mentions_in_source: 'Mentions in Source',
    new_information: 'New Information', definition: 'Definition',
    key_characteristics: 'Key Characteristics', applications: 'Applications',
    related_concepts: 'Related Concepts', related_entities: 'Related Entities',
    source: 'Source', core_content: 'Core Content', key_entities: 'Key Entities',
    key_concepts: 'Key Concepts', main_points: 'Main Points',
    resolved_contradictions: 'Resolved Contradictions', new_claim: 'New Claim',
    existing_knowledge: 'Existing Knowledge', resolution_suggestion: 'Resolution Suggestion',
    source_page: 'Source Page', related_pages: 'Related Pages', updated: 'Updated',
  },
  zh: {
    basic_information: '基本信息', description: '描述',
    related_content: '相关内容', mentions_in_source: '来源提及',
    new_information: '新信息', definition: '定义',
    key_characteristics: '关键特征', applications: '应用',
    related_concepts: '相关概念', related_entities: '相关实体',
    source: '来源', core_content: '核心内容', key_entities: '关键实体',
    key_concepts: '关键概念', main_points: '要点',
    resolved_contradictions: '已解决的矛盾', new_claim: '新主张',
    existing_knowledge: '已有知识', resolution_suggestion: '解决建议',
    source_page: '来源页面', related_pages: '相关页面', updated: '更新于',
  },
  ja: {
    basic_information: '基本情報', description: '説明',
    related_content: '関連コンテンツ', mentions_in_source: 'ソースでの言及',
    new_information: '新情報', definition: '定義',
    key_characteristics: '主な特徴', applications: '応用',
    related_concepts: '関連概念', related_entities: '関連エンティティ',
    source: 'ソース', core_content: '核心内容', key_entities: '主要エンティティ',
    key_concepts: '主要概念', main_points: '要点',
    resolved_contradictions: '解決済みの矛盾', new_claim: '新しい主張',
    existing_knowledge: '既存の知識', resolution_suggestion: '解決案',
    source_page: 'ソースページ', related_pages: '関連ページ', updated: '更新日',
  },
  ko: {
    basic_information: '기본 정보', description: '설명',
    related_content: '관련 콘텐츠', mentions_in_source: '출처 언급',
    new_information: '새 정보', definition: '정의',
    key_characteristics: '주요 특징', applications: '응용',
    related_concepts: '관련 개념', related_entities: '관련 엔티티',
    source: '출처', core_content: '핵심 내용', key_entities: '주요 엔티티',
    key_concepts: '주요 개념', main_points: '주요 사항',
    resolved_contradictions: '해결된 모순', new_claim: '새 주장',
    existing_knowledge: '기존 지식', resolution_suggestion: '해결 제안',
    source_page: '출처 페이지', related_pages: '관련 페이지', updated: '업데이트',
  },
  de: {
    basic_information: 'Grundlegende Informationen', description: 'Beschreibung',
    related_content: 'Verwandte Inhalte', mentions_in_source: 'Erwähnungen in der Quelle',
    new_information: 'Neue Informationen', definition: 'Definition',
    key_characteristics: 'Hauptmerkmale', applications: 'Anwendungen',
    related_concepts: 'Verwandte Konzepte', related_entities: 'Verwandte Entitäten',
    source: 'Quelle', core_content: 'Kerninhalt', key_entities: 'Wichtige Entitäten',
    key_concepts: 'Wichtige Konzepte', main_points: 'Hauptpunkte',
    resolved_contradictions: 'Aufgelöste Widersprüche', new_claim: 'Neue Behauptung',
    existing_knowledge: 'Bestehendes Wissen', resolution_suggestion: 'Lösungsvorschlag',
    source_page: 'Quellseite', related_pages: 'Verwandte Seiten', updated: 'Aktualisiert',
  },
  fr: {
    basic_information: 'Informations de base', description: 'Description',
    related_content: 'Contenu associé', mentions_in_source: 'Mentions dans la source',
    new_information: 'Nouvelles informations', definition: 'Définition',
    key_characteristics: 'Caractéristiques principales', applications: 'Applications',
    related_concepts: 'Concepts associés', related_entities: 'Entités associées',
    source: 'Source', core_content: 'Contenu principal', key_entities: 'Entités clés',
    key_concepts: 'Concepts clés', main_points: 'Points principaux',
    resolved_contradictions: 'Contradictions résolues', new_claim: 'Nouvelle affirmation',
    existing_knowledge: 'Connaissances existantes', resolution_suggestion: 'Suggestion de résolution',
    source_page: 'Page source', related_pages: 'Pages associées', updated: 'Mis à jour',
  },
  es: {
    basic_information: 'Información básica', description: 'Descripción',
    related_content: 'Contenido relacionado', mentions_in_source: 'Menciones en la fuente',
    new_information: 'Nueva información', definition: 'Definición',
    key_characteristics: 'Características clave', applications: 'Aplicaciones',
    related_concepts: 'Conceptos relacionados', related_entities: 'Entidades relacionadas',
    source: 'Fuente', core_content: 'Contenido principal', key_entities: 'Entidades clave',
    key_concepts: 'Conceptos clave', main_points: 'Puntos principales',
    resolved_contradictions: 'Contradicciones resueltas', new_claim: 'Nueva afirmación',
    existing_knowledge: 'Conocimiento existente', resolution_suggestion: 'Sugerencia de resolución',
    source_page: 'Página de origen', related_pages: 'Páginas relacionadas', updated: 'Actualizado',
  },
  pt: {
    basic_information: 'Informações básicas', description: 'Descrição',
    related_content: 'Conteúdo relacionado', mentions_in_source: 'Menções na fonte',
    new_information: 'Novas informações', definition: 'Definição',
    key_characteristics: 'Características principais', applications: 'Aplicações',
    related_concepts: 'Conceitos relacionados', related_entities: 'Entidades relacionadas',
    source: 'Fonte', core_content: 'Conteúdo principal', key_entities: 'Entidades principais',
    key_concepts: 'Conceitos principais', main_points: 'Pontos principais',
    resolved_contradictions: 'Contradições resolvidas', new_claim: 'Nova afirmação',
    existing_knowledge: 'Conhecimento existente', resolution_suggestion: 'Sugestão de resolução',
    source_page: 'Página de origem', related_pages: 'Páginas relacionadas', updated: 'Atualizado',
  },
};

export function getSectionLabels(settings: LLMWikiSettings): Record<string, string> {
  const lang = settings.wikiLanguage || 'en';
  return SECTION_LABELS[lang] || SECTION_LABELS.en;
}

export function applySectionLabels(prompt: string, settings: LLMWikiSettings): string {
  const labels = getSectionLabels(settings);
  let result = prompt;
  for (const [key, label] of Object.entries(labels)) {
    result = result.replace(new RegExp(`\\{\\{section_${key}\\}\\}`, 'g'), label);
  }
  return result;
}

export async function buildSystemPrompt(
  settings: LLMWikiSettings,
  getSchemaContext: (task: string) => Promise<string | undefined>,
  task: string
): Promise<string | undefined> {
  const parts: string[] = [];
  const langDirective = buildWikiLanguageDirective(settings);
  if (langDirective) parts.push(langDirective);
  if (settings.enableSchema) {
    const schemaContext = await getSchemaContext(task);
    if (schemaContext) parts.push(schemaContext);
  }
  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

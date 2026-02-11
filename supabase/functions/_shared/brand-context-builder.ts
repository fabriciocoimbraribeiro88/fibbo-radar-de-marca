import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Builds a comprehensive brand context string from all available sources:
 * - Project metadata (name, segment, audience, tone, etc.)
 * - Full briefing JSON (12 sections + pillars + hashtags + calendar)
 * - Extracted text from brand_context_sources (documents, URLs)
 * - Recent Instagram posts (captions, hashtags, types)
 */
export async function buildFullBrandContext(projectId: string): Promise<string> {
  const supabase = getSupabase();

  // 1. Project data with full briefing
  const { data: project } = await supabase
    .from("projects")
    .select("brand_name, brand_description, target_audience, tone_of_voice, keywords, segment, instagram_handle, website_url, briefing")
    .eq("id", projectId)
    .single();

  // 2. Processed sources (documents, URLs, text)
  const { data: sources } = await supabase
    .from("brand_context_sources")
    .select("source_type, content, extracted_text")
    .eq("project_id", projectId)
    .eq("status", "processed");

  // 3. Brand entity + recent posts
  const { data: entities } = await supabase
    .from("project_entities")
    .select("entity_id, entity_role, monitored_entities(name, instagram_handle)")
    .eq("project_id", projectId);

  const brandEntity = entities?.find((e: any) => e.entity_role === "brand");
  const brandEntityId = brandEntity?.entity_id;

  let postsContext = "";
  if (brandEntityId) {
    const { data: posts } = await supabase
      .from("instagram_posts")
      .select("caption, hashtags, post_type, likes_count, comments_count, saves_count, shares_count, posted_at")
      .eq("entity_id", brandEntityId)
      .order("posted_at", { ascending: false })
      .limit(100);

    if (posts?.length) {
      postsContext = posts
        .map((p: any, i: number) => {
          const metrics = [
            p.likes_count ? `${p.likes_count} likes` : null,
            p.comments_count ? `${p.comments_count} comments` : null,
            p.saves_count ? `${p.saves_count} saves` : null,
          ].filter(Boolean).join(", ");
          return `Post ${i + 1} [${p.post_type ?? "Image"}]${metrics ? ` (${metrics})` : ""}: ${(p.caption ?? "").slice(0, 300)}${p.hashtags?.length ? ` | Hashtags: ${p.hashtags.join(", ")}` : ""}`;
        })
        .join("\n");
    }
  }

  // Build comprehensive context
  const parts: string[] = [];

  // Basic project info
  if (project?.brand_name) parts.push(`MARCA: ${project.brand_name}`);
  if (project?.segment) parts.push(`SEGMENTO: ${project.segment}`);
  if (project?.brand_description) parts.push(`DESCRIÇÃO: ${project.brand_description}`);
  if (project?.target_audience) parts.push(`PÚBLICO-ALVO: ${project.target_audience}`);
  if (project?.tone_of_voice) parts.push(`TOM DE VOZ: ${project.tone_of_voice}`);
  if (project?.keywords?.length) parts.push(`KEYWORDS: ${project.keywords.join(", ")}`);
  if (project?.instagram_handle) parts.push(`INSTAGRAM: ${project.instagram_handle}`);
  if (project?.website_url) parts.push(`WEBSITE: ${project.website_url}`);

  // Full briefing context (all 12 sections + extras)
  if (project?.briefing && typeof project.briefing === "object") {
    const b = project.briefing as Record<string, any>;
    const sectionLabels: Record<string, string> = {
      basic_info: "Informações Básicas",
      tone_of_voice: "Tom de Voz",
      word_universe: "Universo de Palavras",
      values_essence: "Valores e Essência",
      target_audience: "Público-Alvo",
      competitive_edge: "Diferencial Competitivo",
      communication_guidelines: "Diretrizes de Comunicação",
      specific_language: "Linguagem Específica",
      emotional_context: "Contexto Emocional",
      references: "Referências",
      practical_application: "Aplicação Prática",
      success_metrics: "Métricas de Sucesso",
    };

    for (const [key, label] of Object.entries(sectionLabels)) {
      if (b[key] && typeof b[key] === "object") {
        const values = Object.entries(b[key])
          .filter(([, v]) => v && typeof v === "string" && (v as string).trim())
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n");
        if (values) parts.push(`\n--- ${label} ---\n${values}`);
      }
    }

    // Content pillars
    if (Array.isArray(b.content_pillars) && b.content_pillars.length > 0) {
      parts.push(`\n--- Pilares de Conteúdo Atuais ---\n${b.content_pillars.map((p: any) => `• ${p.name} (${p.percentage}%) — ${p.description} [Obj: ${p.objective}] [Formatos: ${p.preferred_formats?.join(", ")}]`).join("\n")}`);
    }

    // Hashtag strategy
    if (b.hashtag_strategy) {
      const hs = b.hashtag_strategy;
      if (hs.proprietary?.length) parts.push(`Hashtags Proprietárias: ${hs.proprietary.join(", ")}`);
      if (hs.community?.length) parts.push(`Hashtags Comunidade: ${hs.community.join(", ")}`);
    }

    // Products
    if (Array.isArray(b.products) && b.products.length > 0) {
      parts.push(`\n--- Produtos/Serviços ---\n${b.products.map((p: any) => `• ${p.name} (${p.category}, Curva ${p.curve}, Margem ${p.margin}) — ${p.description}`).join("\n")}`);
    }
  }

  // Document sources
  for (const src of (sources ?? [])) {
    if (src.extracted_text) {
      parts.push(`\n--- Documento (${src.source_type}) ---\n${src.extracted_text.slice(0, 5000)}`);
    }
  }

  // Recent posts
  if (postsContext) {
    parts.push(`\n--- Histórico de Posts Recentes (${brandEntity ? (brandEntity as any).monitored_entities?.instagram_handle : "marca"}) ---\n${postsContext}`);
  }

  return parts.join("\n");
}

export async function getCompetitorHashtags(projectId: string) {
  const supabase = getSupabase();

  const { data: projectEntities } = await supabase
    .from("project_entities")
    .select("entity_id, entity_role, monitored_entities(name, instagram_handle)")
    .eq("project_id", projectId);

  const results: Array<{ name: string; handle: string; role: string; hashtags: Record<string, number> }> = [];

  for (const pe of (projectEntities ?? [])) {
    const entity = (pe as any).monitored_entities;
    const { data: posts } = await supabase
      .from("instagram_posts")
      .select("hashtags")
      .eq("entity_id", pe.entity_id)
      .order("posted_at", { ascending: false })
      .limit(50);

    const freq: Record<string, number> = {};
    for (const post of posts ?? []) {
      for (const tag of post.hashtags ?? []) {
        const normalized = tag.startsWith("#") ? tag : `#${tag}`;
        freq[normalized] = (freq[normalized] ?? 0) + 1;
      }
    }

    results.push({
      name: entity?.name ?? "Unknown",
      handle: entity?.instagram_handle ?? "",
      role: pe.entity_role,
      hashtags: freq,
    });
  }

  return results;
}

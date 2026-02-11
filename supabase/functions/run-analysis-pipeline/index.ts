import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY não configurado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { analysis_id } = await req.json();
    if (!analysis_id) {
      return new Response(
        JSON.stringify({ success: false, error: "analysis_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch analysis
    const { data: analysis, error: aErr } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", analysis_id)
      .single();
    if (aErr || !analysis) {
      return new Response(
        JSON.stringify({ success: false, error: "Análise não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch project + briefing
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", analysis.project_id)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: "Projeto não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status
    await supabase.from("analyses").update({ status: "agents_running" }).eq("id", analysis_id);

    // 3. Fetch entities
    const entityIds: string[] = analysis.entities_included ?? [];
    const { data: entities } = await supabase
      .from("monitored_entities")
      .select("*")
      .in("id", entityIds.length > 0 ? entityIds : ["__none__"]);

    // 4. Fetch posts for all entities in period
    const allEntityIds = [...entityIds];
    const { data: posts } = await supabase
      .from("instagram_posts")
      .select("*")
      .in("entity_id", allEntityIds.length > 0 ? allEntityIds : ["__none__"])
      .gte("posted_at", analysis.period_start ?? "2000-01-01")
      .lte("posted_at", analysis.period_end ?? "2099-12-31")
      .order("posted_at", { ascending: false })
      .limit(200);

    // 5. Fetch profiles
    const { data: profiles } = await supabase
      .from("instagram_profiles")
      .select("*")
      .in("entity_id", allEntityIds.length > 0 ? allEntityIds : ["__none__"])
      .order("snapshot_date", { ascending: false });

    // 5b. Identify brand entity from project_entities
    const { data: projectEntities } = await supabase
      .from("project_entities")
      .select("entity_id, entity_role, monitored_entities(name, instagram_handle)")
      .eq("project_id", analysis.project_id);

    const brandPe = projectEntities?.find((pe: any) => pe.entity_role === "brand")
      ?? projectEntities?.find((pe: any) => pe.monitored_entities?.instagram_handle === project.instagram_handle);
    const brandEntityId = brandPe?.entity_id ?? null;

    // 6. Create sections for each entity
    const sectionsToCreate = [];

    // Brand section — use the actual brand entity_id
    sectionsToCreate.push({
      analysis_id,
      entity_id: brandEntityId,
      section_type: "brand",
      status: "pending",
    });

    // Entity sections (skip the brand entity to avoid duplication)
    for (const eid of entityIds) {
      if (eid === brandEntityId) continue; // already handled as brand section
      const entity = entities?.find((e) => e.id === eid);
      if (!entity) continue;
      sectionsToCreate.push({
        analysis_id,
        entity_id: eid,
        section_type: entity.type,
        status: "pending",
      });
    }

    // Synthesis section
    sectionsToCreate.push({
      analysis_id,
      entity_id: null,
      section_type: "synthesis",
      status: "pending",
    });

    const { data: createdSections } = await supabase
      .from("analysis_sections")
      .insert(sectionsToCreate)
      .select();

    if (!createdSections) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao criar seções" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Calculate metrics
    const metrics = calculateMetrics(posts ?? [], entityIds);

    // 8. Run agents in parallel (except synthesis)
    const agentSections = createdSections.filter((s) => s.section_type !== "synthesis");
    const synthSection = createdSections.find((s) => s.section_type === "synthesis");

    const agentResults: string[] = [];

    await Promise.all(
      agentSections.map(async (section) => {
        try {
          // Mark as running
          await supabase
            .from("analysis_sections")
            .update({ status: "running", started_at: new Date().toISOString() })
            .eq("id", section.id);

          const entityPosts = section.entity_id
            ? (posts ?? []).filter((p) => p.entity_id === section.entity_id)
            : [];

          const entityProfile = section.entity_id
            ? (profiles ?? []).find((p) => p.entity_id === section.entity_id)
            : null;

          const entity = section.entity_id
            ? entities?.find((e) => e.id === section.entity_id)
            : null;

          const entityName = entity?.name ?? project.brand_name;
          const entityType = section.section_type;

          const systemPrompt = buildAgentSystemPrompt(project, entityName, entityType);
          const userPrompt = buildAgentUserPrompt(
            entityName,
            entityType,
            entityProfile,
            entityPosts,
            metrics,
            analysis.parameters as any,
            section.entity_id
          );

          const result = await callClaude(anthropicKey!, systemPrompt, userPrompt);

          // Save result
          await supabase
            .from("analysis_sections")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              content_markdown: result,
              agent_response: result,
            })
            .eq("id", section.id);

          agentResults.push(`## ${entityName} (${entityType})\n\n${result}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro no agente";
          console.error(`Agent error for section ${section.id}:`, msg);
          await supabase
            .from("analysis_sections")
            .update({ status: "failed", completed_at: new Date().toISOString() })
            .eq("id", section.id);
        }
      })
    );

    // 9. Orchestrator: synthesis
    if (synthSection && agentResults.length > 0) {
      await supabase
        .from("analysis_sections")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", synthSection.id);

      await supabase.from("analyses").update({ status: "synthesizing" }).eq("id", analysis_id);

      try {
        const synthSystemPrompt = buildOrchestratorSystemPrompt(project);
        const synthUserPrompt = buildOrchestratorUserPrompt(project, agentResults, analysis.type ?? "");

        const synthResult = await callClaude(anthropicKey!, synthSystemPrompt, synthUserPrompt);

        await supabase
          .from("analysis_sections")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            content_markdown: synthResult,
            agent_response: synthResult,
          })
          .eq("id", synthSection.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro no orquestrador";
        console.error("Orchestrator error:", msg);
        await supabase
          .from("analysis_sections")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", synthSection.id);
      }
    }

    // 10. Mark analysis as review
    await supabase.from("analyses").update({ status: "review", updated_at: new Date().toISOString() }).eq("id", analysis_id);

    return new Response(
      JSON.stringify({ success: true, message: "Análise concluída" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Pipeline error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ---- Helpers ----

function calculateMetrics(posts: any[], entityIds: string[]) {
  const byEntity: Record<string, any> = {};
  for (const eid of entityIds) {
    const ep = posts.filter((p) => p.entity_id === eid);
    const totalLikes = ep.reduce((s, p) => s + (p.likes_count ?? 0), 0);
    const totalComments = ep.reduce((s, p) => s + (p.comments_count ?? 0), 0);
    const totalViews = ep.reduce((s, p) => s + (p.views_count ?? 0), 0);
    byEntity[eid] = {
      posts_count: ep.length,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_views: totalViews,
      avg_likes: ep.length ? Math.round(totalLikes / ep.length) : 0,
      avg_comments: ep.length ? Math.round(totalComments / ep.length) : 0,
      avg_engagement: ep.length ? Math.round((totalLikes + totalComments) / ep.length) : 0,
    };
  }
  return byEntity;
}

function buildAgentSystemPrompt(project: any, entityName: string, entityType: string): string {
  return `Você é um analista sênior de inteligência digital especializado em análise de performance de redes sociais, trabalhando para a Agência Fibbo.

CONTEXTO DO PROJETO:
- Marca: ${project.brand_name}
- Segmento: ${project.segment ?? "Não definido"}
- Público-alvo: ${project.target_audience ?? "Não definido"}
- Tom de voz: ${project.tone_of_voice ?? "Não definido"}
- Palavras-chave: ${(project.keywords ?? []).join(", ")}

SUA TAREFA:
Analisar a entidade "${entityName}" (${entityType}) considerando os dados quantitativos fornecidos e os posts.

DIRETRIZES:
1. Tom empático e consultivo (nunca crítico ou acusatório)
2. Substituir termos negativos: "erro" → "oportunidade de melhoria", "problema" → "ponto de atenção"
3. Sempre citar evidências concretas (posts específicos com métricas)
4. Focar em insights acionáveis, não descrições genéricas
5. Considerar o contexto do segmento ${project.segment ?? "geral"}

FORMATO DE OUTPUT:
Responda em Markdown bem formatado com:
- Resumo Executivo (2-3 parágrafos)
- Big Numbers (tabela com métricas principais — use emojis 🔴🟡🟢 APENAS na coluna Status para indicar performance)
- Análise de Performance (insights sobre engajamento)
- Análise de Formatos (o que funciona melhor)
- Análise de Temas (padrões de conteúdo)
- Recomendações (lista priorizada)

REGRAS DE FORMATAÇÃO:
- NÃO use emojis nos títulos das seções. Use apenas texto limpo nos headers (##, ###).
- Use emojis SOMENTE dentro de tabelas para indicar status de métricas (🔴 negativo, 🟡 neutro, 🟢 positivo).
- Exemplo correto: "## Big Numbers" (sem emoji no título)
- Exemplo errado: "## 🔢 Big Numbers" (emoji no título)
- Os dados DEVEM refletir os números reais fornecidos nos dados. NÃO invente números.`;
}

function buildAgentUserPrompt(
  entityName: string,
  entityType: string,
  profile: any,
  posts: any[],
  metrics: Record<string, any>,
  parameters: any,
  entityId?: string | null
): string {
  const topPosts = posts
    .sort((a, b) => (b.engagement_total ?? 0) - (a.engagement_total ?? 0))
    .slice(0, 10);

  let prompt = `# Dados para análise de: ${entityName} (${entityType})\n\n`;

  if (profile) {
    prompt += `## Perfil\n- Seguidores: ${profile.followers_count ?? "N/A"}\n- Seguindo: ${profile.following_count ?? "N/A"}\n- Posts: ${profile.posts_count ?? "N/A"}\n- Bio: ${profile.bio ?? "N/A"}\n\n`;
  }

  prompt += `## Métricas Resumidas\n- Total de posts analisados: ${posts.length}\n`;

  const entityMetrics = entityId ? metrics[entityId] : Object.values(metrics)[0];
  if (entityMetrics) {
    prompt += `- Média de curtidas: ${entityMetrics.avg_likes}\n- Média de comentários: ${entityMetrics.avg_comments}\n- Engajamento médio: ${entityMetrics.avg_engagement}\n\n`;
  }

  prompt += `## Top 10 Posts (por engajamento)\n`;
  for (const p of topPosts) {
    prompt += `\n### Post (${p.post_type ?? "N/A"}) — ${p.posted_at ? new Date(p.posted_at).toLocaleDateString("pt-BR") : "Data N/A"}\n`;
    prompt += `- Curtidas: ${p.likes_count ?? 0} | Comentários: ${p.comments_count ?? 0} | Views: ${p.views_count ?? 0}\n`;
    prompt += `- Caption: ${(p.caption ?? "").slice(0, 300)}\n`;
    if (p.hashtags?.length) prompt += `- Hashtags: ${p.hashtags.join(", ")}\n`;
  }

  prompt += `\nAnalise esses dados e gere o relatório completo em Markdown.`;
  return prompt;
}

function buildOrchestratorSystemPrompt(project: any): string {
  return `Você é o estrategista-chefe de inteligência digital da Agência Fibbo, responsável por sintetizar múltiplas análises individuais em um relatório estratégico integrado.

CONTEXTO:
- Marca: ${project.brand_name}
- Segmento: ${project.segment ?? "Não definido"}
- Público-alvo: ${project.target_audience ?? "Não definido"}

SUA TAREFA:
1. Sintetizar as análises individuais em uma visão estratégica unificada
2. Identificar padrões cruzados entre a marca e concorrentes/influencers
3. Mapear oceanos azuis (oportunidades não exploradas pela concorrência)
4. Criar matriz de diferenciação competitiva
5. Gerar recomendações estratégicas priorizadas

IMPORTANTE:
- Não repetir informações verbatim
- Focar em INSIGHTS CRUZADOS
- Cada recomendação deve ser específica, acionável e priorizada
- Usar dados concretos como evidência

REGRAS DE FORMATAÇÃO:
- NÃO use emojis nos títulos das seções (##, ###). Use apenas texto limpo.
- Use emojis SOMENTE dentro de tabelas para indicar status de métricas (🔴 negativo, 🟡 neutro, 🟢 positivo).

FORMATO: Markdown completo e bem estruturado.`;
}

function buildOrchestratorUserPrompt(project: any, agentResults: string[], analysisType: string): string {
  let prompt = `# Síntese Estratégica para: ${project.brand_name}\n\nTipo de análise: ${analysisType}\n\n---\n\n`;
  prompt += agentResults.join("\n\n---\n\n");
  prompt += `\n\n---\n\nCom base nas análises individuais acima, gere o relatório de síntese estratégica integrada.`;
  return prompt;
}

async function callClaude(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API error (${response.status}): ${text.substring(0, 300)}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

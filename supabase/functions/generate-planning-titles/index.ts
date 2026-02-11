import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const { calendar_id, analysis_id, project_id, channel, period_start, period_end, parameters } = await req.json();

    // 1. Fetch project with full briefing (includes content_pillars)
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";
    const briefing = project?.briefing as any;

    // 2. Build pillar context from brand context
    const contentPillars = briefing?.content_pillars ?? [];
    let pillarContext = "";
    if (contentPillars.length > 0) {
      pillarContext = "PILARES DE CONTEÚDO DA MARCA:\n" + contentPillars.map((p: any, i: number) =>
        `${i + 1}. [${p.id?.slice(0, 4)?.toUpperCase() ?? `P${i + 1}`}] ${p.name} (${p.percentage}%)\n   Objetivo: ${p.objective ?? "—"}\n   Descrição: ${p.description ?? "—"}\n   Formatos preferidos: ${(p.preferred_formats ?? []).join(", ")}`
      ).join("\n") + "\n\nIMPORTANTE: Use o NOME COMPLETO de cada pilar no campo content_type. Exemplo: 'O Movimento Brandformance', NÃO códigos genéricos.\n";
    }

    // 3. Build brand identity context
    let brandContext = `Marca: ${brandName}\nSegmento: ${project?.segment ?? "—"}\nTom de voz: ${project?.tone_of_voice ?? "—"}\nPúblico-alvo: ${project?.target_audience ?? "—"}\nDescrição: ${project?.brand_description ?? "—"}\n`;

    // 4. Fetch analysis sections for deep context
    const { data: sections } = await supabase
      .from("analysis_sections")
      .select("content_markdown, section_type, entity_id")
      .eq("analysis_id", analysis_id)
      .eq("status", "completed");

    // Separate brand analysis from competitor/influencer/inspiration analysis
    let brandAnalysis = "";
    let competitorAnalysis = "";
    let influencerAnalysis = "";
    let inspirationAnalysis = "";
    let synthesisAnalysis = "";

    // Get entity info to categorize sections
    const entityIds = [...new Set((sections ?? []).map(s => s.entity_id).filter(Boolean))];
    const { data: entities } = entityIds.length > 0
      ? await supabase.from("monitored_entities").select("id, name, type").in("id", entityIds)
      : { data: [] };
    const entityMap = new Map((entities ?? []).map(e => [e.id, e]));

    for (const s of sections ?? []) {
      if (!s.content_markdown) continue;
      const entity = s.entity_id ? entityMap.get(s.entity_id) : null;
      const type = entity?.type ?? s.section_type;

      if (type === "brand" || s.section_type === "brand") {
        brandAnalysis += s.content_markdown + "\n\n";
      } else if (type === "competitor") {
        competitorAnalysis += `### ${entity?.name ?? "Concorrente"}\n${s.content_markdown}\n\n`;
      } else if (type === "influencer") {
        influencerAnalysis += `### ${entity?.name ?? "Influencer"}\n${s.content_markdown}\n\n`;
      } else if (type === "inspiration") {
        inspirationAnalysis += `### ${entity?.name ?? "Inspiração"}\n${s.content_markdown}\n\n`;
      } else if (s.section_type === "cross_analysis" || s.section_type === "synthesis") {
        synthesisAnalysis += s.content_markdown + "\n\n";
      }
    }

    // 5. Fetch brand references (successful posts, campaigns)
    const { data: references } = await supabase
      .from("brand_references")
      .select("title, type, description, why_it_worked, format, platform, tags, campaign_results, campaign_learnings")
      .eq("project_id", project_id)
      .limit(30);

    let referencesContext = "";
    if (references && references.length > 0) {
      const successes = references.filter(r => r.type === "success_post" || r.type === "kv");
      const failures = references.filter(r => r.type === "failure_post");
      const campaigns = references.filter(r => r.type === "campaign");

      if (successes.length > 0) {
        referencesContext += "\nPOSTS/KVs QUE FUNCIONARAM:\n" + successes.map(r =>
          `- "${r.title}" (${r.format ?? "—"}): ${r.why_it_worked ?? r.description ?? "—"}`
        ).join("\n") + "\n";
      }
      if (failures.length > 0) {
        referencesContext += "\nPOSTS QUE NÃO FUNCIONARAM (EVITAR):\n" + failures.map(r =>
          `- "${r.title}" (${r.format ?? "—"}): ${r.why_it_worked ?? r.description ?? "—"}`
        ).join("\n") + "\n";
      }
      if (campaigns.length > 0) {
        referencesContext += "\nCAMPANHAS ANTERIORES:\n" + campaigns.map(r =>
          `- "${r.title}": Resultado: ${r.campaign_results ?? "—"} | Aprendizado: ${r.campaign_learnings ?? "—"}`
        ).join("\n") + "\n";
      }
    }

    // 6. Fetch brand memory entries
    const { data: memories } = await supabase
      .from("brand_memory_entries")
      .select("month, year, summary, learnings, pillar_performance, metrics")
      .eq("project_id", project_id)
      .eq("is_active", true)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(3);

    let memoryContext = "";
    if (memories && memories.length > 0) {
      memoryContext = "\nMEMÓRIA ESTRATÉGICA (meses anteriores):\n" + memories.map(m => {
        const learnings = m.learnings as any;
        const pillarPerf = m.pillar_performance as any;
        let text = `${m.month}/${m.year}: ${m.summary ?? "—"}`;
        if (learnings && Array.isArray(learnings)) {
          text += "\n  Aprendizados: " + learnings.map((l: any) => l.text ?? l).join("; ");
        }
        if (pillarPerf && Array.isArray(pillarPerf)) {
          text += "\n  Performance por pilar: " + pillarPerf.map((p: any) => `${p.name}: ${p.rating ?? p.performance ?? "—"}`).join(", ");
        }
        return text;
      }).join("\n") + "\n";
    }

    // 7. Fetch hashtag strategy
    let hashtagContext = "";
    if (parameters.context_includes?.includes("hashtags") && briefing?.hashtag_strategy) {
      const hs = briefing.hashtag_strategy;
      hashtagContext = "\nESTRATÉGIA DE HASHTAGS:\n" + JSON.stringify(hs, null, 2).slice(0, 2000) + "\n";
    }

    // 8. Fetch seasonal calendar
    let seasonalContext = "";
    if (parameters.context_includes?.includes("seasonal") && briefing?.seasonal_calendar) {
      const sc = briefing.seasonal_calendar;
      seasonalContext = "\nCALENDÁRIO SAZONAL:\n" + JSON.stringify(sc, null, 2).slice(0, 2000) + "\n";
    }

    // 9. Fetch products catalog
    let productsContext = "";
    if (parameters.context_includes?.includes("products") && briefing?.products_catalog) {
      const pc = briefing.products_catalog;
      productsContext = "\nPRODUTOS/SERVIÇOS:\n" + (Array.isArray(pc) ? pc.map((p: any) =>
        `- ${p.name} (Curva ${p.curve ?? "—"}): ${p.description ?? "—"}`
      ).join("\n") : JSON.stringify(pc, null, 2).slice(0, 2000)) + "\n";
    }

    const { posts_per_week, extra_percentage, format_mix, responsibles, preferred_times, special_instructions } = parameters;
    const weeks = Math.max(1, Math.round((new Date(period_end).getTime() - new Date(period_start).getTime()) / (7 * 86400000)));
    const totalBase = posts_per_week * weeks;
    const totalWithExtra = Math.ceil(totalBase * (1 + (extra_percentage ?? 25) / 100));

    const prompt = `Gere um calendário de ${totalWithExtra} títulos/temas DIVERSOS e ÚNICOS para posts de Instagram.

PERÍODO: ${period_start} a ${period_end} (${weeks} semanas)
MARCA: ${brandName}

${pillarContext}

DISTRIBUIÇÃO DE FORMATOS:
${Object.entries(format_mix ?? {}).map(([k, v]) => `- ${k}: ${v}%`).join("\n")}

RESPONSÁVEIS:
${(responsibles ?? []).map((r: any) => `- ${r.name} (${r.code}): ${r.percentage}%`).join("\n")}

${preferred_times ? `HORÁRIOS PREFERENCIAIS:\n- Dias úteis: ${preferred_times.weekday?.join(", ")}\n- Fins de semana: ${preferred_times.weekend?.join(", ")}` : ""}

${special_instructions ? `INSTRUÇÕES ESPECIAIS: ${special_instructions}` : ""}

CONTEXTO DA MARCA:
${brandContext}

${referencesContext}
${memoryContext}
${hashtagContext}
${seasonalContext}
${productsContext}

─── ANÁLISE DA MARCA ───
${brandAnalysis.slice(0, 4000)}

${competitorAnalysis ? `─── ANÁLISE DE CONCORRENTES (o que funciona pra eles, adaptar para a marca) ───\n${competitorAnalysis.slice(0, 4000)}` : ""}

${influencerAnalysis ? `─── ANÁLISE DE INFLUENCERS (estilos e temas que engajam) ───\n${influencerAnalysis.slice(0, 3000)}` : ""}

${inspirationAnalysis ? `─── ANÁLISE DE INSPIRAÇÕES (referências criativas) ───\n${inspirationAnalysis.slice(0, 3000)}` : ""}

${synthesisAnalysis ? `─── SÍNTESE ESTRATÉGICA ───\n${synthesisAnalysis.slice(0, 3000)}` : ""}

REGRAS CRÍTICAS:
1. O campo "content_type" DEVE ser o NOME COMPLETO do pilar, exatamente como listado acima (ex: "O Movimento Brandformance")
2. Respeitar a distribuição percentual de pilares definida
3. CADA POST DEVE TER UMA ABORDAGEM ÚNICA — não repetir o mesmo ângulo/tema com palavras diferentes
4. Variar temas e formatos ao longo da semana (não repetir pilar em dias consecutivos)
5. Títulos devem ser concretos, específicos e provocativos (não genéricos como "Dicas de...")
6. Use os aprendizados dos posts que funcionaram como inspiração
7. Evite abordagens similares aos posts que NÃO funcionaram
8. Posts de fim de semana devem ser mais leves (descoberta, lifestyle, bastidores)
9. Posts de dia útil podem ser mais informativos/educativos
10. Para influencers como responsáveis, criar temas alinhados ao estilo deles
11. Horários devem variar entre os preferenciais definidos
12. Não usar emojis nos títulos
13. Considere datas sazonais do período quando relevantes

Responda APENAS com JSON válido no formato:
{
  "items": [
    {
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "content_type": "NOME COMPLETO DO PILAR",
      "format": "Reels|Carrossel|Estático|Stories",
      "responsible_code": "CODE",
      "title": "Título concreto e único do post"
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Você é um estrategista de conteúdo digital sênior especializado em Instagram. 
Você analisa profundamente o histórico de performance, referências de sucesso/fracasso, concorrentes e influencers para criar calendários editoriais com posts GENUINAMENTE DIVERSOS.

Cada post deve ter uma abordagem, ângulo e gancho completamente diferente dos demais — mesmo dentro do mesmo pilar.

Exemplos de diversidade dentro de um pilar:
- Post 1: Pergunta provocativa que desafia uma crença comum
- Post 2: Case real com números e resultados
- Post 3: Bastidor de processo mostrando como funciona na prática
- Post 4: Comparação "antes vs depois" ou "certo vs errado"
- Post 5: Tutorial rápido com passo-a-passo

NUNCA crie posts genéricos como "Dicas para melhorar X" ou "Você sabia que...". Cada título deve ser específico o suficiente para que alguém consiga visualizar o post final.

Responda em JSON.` },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
      }),
    });

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content ?? "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("IA não retornou JSON válido");
    const parsed = JSON.parse(jsonMatch[0]);
    const generatedItems = parsed.items ?? [];

    // Insert items into planning_items
    for (const item of generatedItems) {
      await supabase.from("planning_items").insert({
        calendar_id,
        title: item.title,
        scheduled_date: item.scheduled_date || null,
        scheduled_time: item.scheduled_time || null,
        content_type: item.content_type || null,
        format: item.format || null,
        channel: channel ?? "social",
        status: "idea",
        metadata: { responsible_code: item.responsible_code, title_status: "pending" },
      });
    }

    return new Response(JSON.stringify({ success: true, count: generatedItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

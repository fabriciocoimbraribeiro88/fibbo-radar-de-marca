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

    // 1. Fetch project with full briefing
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";
    const briefing = project?.briefing as any;

    const contentApproach = parameters.content_approach ?? "pillars";
    const selectedLenses = parameters.selected_lenses ?? [];
    const provocationLevel = parameters.provocation_level ?? 3;

    // 2. Build pillar context
    const contentPillars = briefing?.content_pillars ?? [];
    let pillarContext = "";
    if (contentPillars.length > 0) {
      pillarContext = "PILARES DE CONTEÚDO DA MARCA:\n" + contentPillars.map((p: any, i: number) =>
        `${i + 1}. [${p.id?.slice(0, 4)?.toUpperCase() ?? `P${i + 1}`}] ${p.name} (${p.percentage}%)\n   Objetivo: ${p.objective ?? "—"}\n   Descrição: ${p.description ?? "—"}\n   Formatos preferidos: ${(p.preferred_formats ?? []).join(", ")}`
      ).join("\n") + "\n\nIMPORTANTE: Use o NOME COMPLETO de cada pilar no campo content_type.\n";
    }

    // 3. Build tension territories context
    const tensionTerritories = briefing?.tension_territories ?? [];
    let territoriesContext = "";
    if (contentApproach === "theses" && tensionTerritories.length > 0) {
      territoriesContext = "TERRITÓRIOS DE TENSÃO DA MARCA:\n" + tensionTerritories.map((t: any, i: number) =>
        `${i + 1}. ${t.name}\n   Polo A: ${t.pole_a}\n   Polo B: ${t.pole_b}\n   Tensão: ${t.description}\n   Posicionamento: ${t.brand_position}\n   Pilar relacionado: ${t.related_pillar ?? "—"}`
      ).join("\n") + "\n";
    }

    // 4. Build brand identity context
    let brandContext = `Marca: ${brandName}\nSegmento: ${project?.segment ?? "—"}\nTom de voz: ${project?.tone_of_voice ?? "—"}\nPúblico-alvo: ${project?.target_audience ?? "—"}\nDescrição: ${project?.brand_description ?? "—"}\n`;

    // 5. Fetch analysis sections
    const { data: sections } = await supabase
      .from("analysis_sections")
      .select("content_markdown, section_type, entity_id")
      .eq("analysis_id", analysis_id)
      .eq("status", "completed");

    const entityIds = [...new Set((sections ?? []).map(s => s.entity_id).filter(Boolean))];
    const { data: entities } = entityIds.length > 0
      ? await supabase.from("monitored_entities").select("id, name, type").in("id", entityIds)
      : { data: [] };
    const entityMap = new Map((entities ?? []).map(e => [e.id, e]));

    let brandAnalysis = "";
    let competitorAnalysis = "";
    let influencerAnalysis = "";
    let inspirationAnalysis = "";
    let synthesisAnalysis = "";

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

    // 6. Fetch brand references
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

    // 7. Fetch brand memory entries
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

    // 8. Fetch optional contexts
    let hashtagContext = "";
    if (parameters.context_includes?.includes("hashtags") && briefing?.hashtag_strategy) {
      hashtagContext = "\nESTRATÉGIA DE HASHTAGS:\n" + JSON.stringify(briefing.hashtag_strategy, null, 2).slice(0, 2000) + "\n";
    }

    let seasonalContext = "";
    if (parameters.context_includes?.includes("seasonal") && briefing?.seasonal_calendar) {
      seasonalContext = "\nCALENDÁRIO SAZONAL:\n" + JSON.stringify(briefing.seasonal_calendar, null, 2).slice(0, 2000) + "\n";
    }

    let productsContext = "";
    if (parameters.context_includes?.includes("products") && briefing?.products_catalog) {
      const pc = briefing.products_catalog;
      productsContext = "\nPRODUTOS/SERVIÇOS:\n" + (Array.isArray(pc) ? pc.map((p: any) =>
        `- ${p.name} (Curva ${p.curve ?? "—"}): ${p.description ?? "—"}`
      ).join("\n") : JSON.stringify(pc, null, 2).slice(0, 2000)) + "\n";
    }

    const { posts_per_week, format_mix, responsibles, preferred_times, special_instructions } = parameters;
    const weeks = Math.max(1, Math.round((new Date(period_end).getTime() - new Date(period_start).getTime()) / (7 * 86400000)));
    const totalBase = posts_per_week * weeks;
    const totalWithExtra = Math.ceil(totalBase * 1.25);

    // Build the prompt based on content approach
    const isTheses = contentApproach === "theses";

    const provocationGuide = {
      1: "Tom consultivo e educativo. Apresente insights de forma construtiva e propositiva.",
      2: "Tom moderado. Questione práticas comuns de forma respeitosa mas com opinião clara.",
      3: "Tom assertivo. Defenda posições claras com argumentos sólidos. Não tenha medo de contrariar o senso comum.",
      4: "Tom provocativo. Desafie crenças estabelecidas com teses ousadas. Gere desconforto produtivo.",
      5: "Tom confrontador. Teses radicais que forçam a audiência a repensar tudo. Polêmica intelectual controlada.",
    }[provocationLevel] ?? "";

    const lensesDescription = `AS LENTES NARRATIVAS ATIVAS PARA ESTE PERÍODO:
${selectedLenses.map((l: string) => {
  const descs: Record<string, string> = {
    "Sociológica": "Impacto no coletivo, normas sociais, estruturas de poder, movimentos culturais",
    "Psicológica": "Ansiedades, desejos, vieses cognitivos, saúde mental do indivíduo",
    "Econômica": "Quem ganha/perde, fluxo de capital, o que está sendo mercantilizado",
    "Tecnológica": "Como a inovação acelera, distorce ou redefine a tensão",
    "Contraintuitiva": "Verdade surpreendente, inversão de lógica, paradoxos ocultos",
    "Histórica/Futurista": "De onde veio, para onde vai, padrões cíclicos, projeções",
  };
  return `- ${l}: ${descs[l] ?? ""}`;
}).join("\n")}`;

    let systemPrompt: string;
    let userPrompt: string;

    if (isTheses) {
      systemPrompt = `Você é um Arquiteto de Narrativas de Marca e Estrategista de Conteúdo. Seu trabalho é criar um calendário EQUILIBRADO que combina diferentes tipos de conteúdo para maximizar resultados.

O calendário deve ter um MIX OBRIGATÓRIO de 4 categorias de posts:

## CATEGORIA 1: TESES NARRATIVAS (~40% dos posts)
Posts provocativos que cruzam Territórios de Tensão com Lentes Narrativas.
- Headlines no formato: [FRASE CURTA E FORTE] - [COMPLEMENTO PROVOCADOR] (caixa alta)
- Cada post é uma TESE — um argumento original que gera reflexão
- O objetivo é diferenciar a marca com perspectivas únicas

## CATEGORIA 2: CASES DE SUCESSO & MELHORES PRÁTICAS (~25% dos posts)
Posts baseados no que JÁ FUNCIONOU para a marca e nas melhores práticas identificadas na análise.
- Replicar formatos, ângulos e abordagens que geraram alto engajamento
- Adaptar cases de sucesso com novos ângulos (não repetir exatamente)
- Aplicar aprendizados da memória estratégica e da análise de performance
- Headlines diretas e claras (não precisam ser provocativas)

## CATEGORIA 3: DATAS SAZONAIS & MOMENTOS CULTURAIS (~15% dos posts)
Posts conectados ao calendário sazonal, datas comemorativas e momentos culturais relevantes.
- Usar as datas do calendário sazonal fornecido
- Conectar a data com o posicionamento da marca (não ser genérico)
- Pode combinar com uma lente narrativa para dar profundidade

## CATEGORIA 4: CONTEÚDO DE CONEXÃO (~20% dos posts)
Posts que constroem proximidade com a persona: bastidores, produto, educativo, storytelling.
- Conteúdo que humaniza a marca
- Posts sobre produtos/serviços com ângulo de valor (não venda direta)
- Conteúdo educativo baseado na expertise da marca
- Storytelling e narrativas que conectam emocionalmente

${lensesDescription}

NÍVEL DE PROVOCAÇÃO (aplica-se às Teses Narrativas): ${provocationLevel}/5
${provocationGuide}

REGRAS CRÍTICAS:
- RESPEITAR O MIX de categorias (40% teses, 25% cases/práticas, 15% sazonal, 20% conexão)
- Para TESES: headlines em CAIXA ALTA no formato [FRASE] - [COMPLEMENTO]
- Para outros tipos: headlines normais, claras e específicas
- NUNCA crie algo que o concorrente poderia ter escrito
- SEM jargões corporativos (sinergia, paradigma, disruptivo, game-changer)
- SEM clichês ("em um mundo cada vez mais...", "pensando fora da caixa")
- Use os posts que FUNCIONARAM como base para a categoria de Cases/Práticas
- Use a análise de concorrentes para garantir DIFERENCIAÇÃO
- Considere a memória estratégica para NÃO REPETIR abordagens recentes
- Variar as categorias ao longo da semana (não agrupar teses juntas)

Responda em JSON.`;

      userPrompt = `Gere um calendário de ${totalWithExtra} posts EQUILIBRADOS para Instagram, com o MIX OBRIGATÓRIO de categorias.

PERÍODO: ${period_start} a ${period_end} (${weeks} semanas)
MARCA: ${brandName}

${territoriesContext}
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

${competitorAnalysis ? `─── ANÁLISE DE CONCORRENTES ───\n${competitorAnalysis.slice(0, 4000)}` : ""}

${influencerAnalysis ? `─── ANÁLISE DE INFLUENCERS ───\n${influencerAnalysis.slice(0, 3000)}` : ""}

${inspirationAnalysis ? `─── ANÁLISE DE INSPIRAÇÕES ───\n${inspirationAnalysis.slice(0, 3000)}` : ""}

${synthesisAnalysis ? `─── SÍNTESE ESTRATÉGICA ───\n${synthesisAnalysis.slice(0, 3000)}` : ""}

REGRAS:
1. content_type = NOME COMPLETO do pilar relacionado
2. MIX OBRIGATÓRIO: ~40% teses narrativas, ~25% cases/melhores práticas, ~15% datas sazonais, ~20% conexão
3. Para TESES: cruzar território + lente, headline em CAIXA ALTA
4. Para CASES/PRÁTICAS: basear nos posts que funcionaram e nas análises de performance
5. Para SAZONAL: usar datas do calendário sazonal, conectar com a marca
6. Para CONEXÃO: humanizar, educar, mostrar bastidores ou produto com valor
7. Variar categorias ao longo da semana (não agrupar)
8. Respeitar distribuição de formatos e responsáveis
9. Cada post deve indicar sua "category" no JSON
10. NÃO repetir ângulos de posts anteriores

${tensionTerritories.length === 0 ? `NOTA: Não há territórios de tensão definidos. Para posts de TESES, gere as teses transformando cada pilar em uma tensão/dualidade automaticamente.` : ""}

Responda APENAS com JSON válido:
{
  "items": [
    {
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "content_type": "NOME COMPLETO DO PILAR",
      "format": "Reels|Carrossel|Estático|Stories",
      "responsible_code": "CODE",
      "title": "Título do post (CAIXA ALTA só para teses)",
      "category": "thesis|best_practice|seasonal|connection",
      "territory": "Nome do Território (só para category=thesis, null para outros)",
      "lens": "Nome da Lente (só para category=thesis, null para outros)",
      "thesis": "A tese em 1-2 frases (só para category=thesis, null para outros)"
    }
  ]
}`;
    } else {
      // Traditional pillars approach (existing behavior)
      systemPrompt = `Você é um estrategista de conteúdo digital sênior especializado em Instagram. 
Você analisa profundamente o histórico de performance, referências de sucesso/fracasso, concorrentes e influencers para criar calendários editoriais com posts GENUINAMENTE DIVERSOS.

Cada post deve ter uma abordagem, ângulo e gancho completamente diferente dos demais — mesmo dentro do mesmo pilar.

NUNCA crie posts genéricos como "Dicas para melhorar X" ou "Você sabia que...". Cada título deve ser específico o suficiente para que alguém consiga visualizar o post final.

Responda em JSON.`;

      userPrompt = `Gere um calendário de ${totalWithExtra} títulos/temas DIVERSOS e ÚNICOS para posts de Instagram.

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

${competitorAnalysis ? `─── ANÁLISE DE CONCORRENTES ───\n${competitorAnalysis.slice(0, 4000)}` : ""}
${influencerAnalysis ? `─── ANÁLISE DE INFLUENCERS ───\n${influencerAnalysis.slice(0, 3000)}` : ""}
${inspirationAnalysis ? `─── ANÁLISE DE INSPIRAÇÕES ───\n${inspirationAnalysis.slice(0, 3000)}` : ""}
${synthesisAnalysis ? `─── SÍNTESE ESTRATÉGICA ───\n${synthesisAnalysis.slice(0, 3000)}` : ""}

REGRAS:
1. content_type = NOME COMPLETO do pilar
2. Cada post deve ter abordagem única
3. Variar temas e formatos ao longo da semana
4. Títulos concretos e específicos
5. Respeitar distribuição de formatos e responsáveis

Responda APENAS com JSON válido:
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
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
      const metadata: any = {
        responsible_code: item.responsible_code,
        title_status: "pending",
      };

      // Add theses-specific metadata
      if (isTheses) {
        metadata.category = item.category ?? "thesis";
        metadata.territory = item.territory ?? null;
        metadata.lens = item.lens ?? null;
        metadata.thesis = item.thesis ?? null;
        metadata.content_approach = "theses";
      }

      await supabase.from("planning_items").insert({
        calendar_id,
        title: item.title,
        scheduled_date: item.scheduled_date || null,
        scheduled_time: item.scheduled_time || null,
        content_type: item.content_type || null,
        format: item.format || null,
        channel: channel ?? "social",
        status: "idea",
        metadata,
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

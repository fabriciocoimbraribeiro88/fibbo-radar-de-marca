import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Frame labels in Portuguese
const FRAME_LABELS: Record<string, string> = {
  villain: "Vilão Claro",
  surprising_number: "Número Surpreendente",
  binary_comparison: "Comparação Binária",
  future_vs_past: "Futuro vs Passado",
  myth_vs_reality: "Mito vs Realidade",
  own_framework: "Framework Próprio",
  timing: "Timing",
  problem_solution: "Problema→Solução",
  behind_scenes: "Behind the Scenes",
  contrarian: "Contrarian",
  extreme_case: "Caso Extremo",
  actionable_checklist: "Checklist Acionável",
  timeline_journey: "Timeline/Jornada",
  aggressive_comparison: "Comparativo Agressivo",
  prediction: "Predição",
  vulnerable: "Vulnerável",
};

// Method labels in Portuguese
const METHOD_LABELS: Record<string, string> = {
  pas: "PAS",
  bab: "BAB",
  numbered_list: "Lista Numerada",
  timeline: "Timeline",
  comparative: "Comparativo",
  framework: "Framework",
  case_study: "Case Study",
  myth_busting: "Mito-Detonado",
  checklist: "Checklist",
  behind_scenes: "Behind the Scenes",
  strong_opinion: "Opinião Forte",
  trend: "Tendência",
  common_mistake: "Erro Comum",
  competitor_comparison: "Competidor",
  data_storytelling: "Data Storytelling",
  ugc_testimonial: "UGC/Depoimento",
};

// Objective labels in Portuguese
const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: "Awareness",
  education: "Educação",
  authority: "Autoridade",
  conversion: "Conversão",
  community: "Comunidade",
  social_proof: "Prova Social",
  product: "Produto",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const body = await req.json();
    const { calendar_id, analysis_id, project_id, channel, period_start, period_end, regenerate_slot, count } = body;
    const parameters = body.parameters ?? {};

    // 1. Fetch project with full briefing
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";
    const briefing = project?.briefing as any;

    const contentApproach = parameters.content_approach ?? "formula";
    const selectedLenses = parameters.selected_lenses ?? [];
    const provocationLevel = parameters.provocation_level ?? 3;

    // ── F.O.R.M.U.L.A.™ detection ──
    const formulaConfig = parameters.formula_config ?? null;
    const formulaEnabled = formulaConfig?.enabled === true;
    const formula = briefing?.formula ?? null;

    // 2. Build pillar context
    const contentPillars = briefing?.content_pillars ?? [];
    let pillarContext = "";
    if (contentPillars.length > 0) {
      pillarContext = "PILARES DE CONTEÚDO DA MARCA:\n" + contentPillars.map((p: any, i: number) =>
        `${i + 1}. [${p.id?.slice(0, 4)?.toUpperCase() ?? `P${i + 1}`}] ${p.name} (${p.percentage}%)\n   Objetivo: ${p.objective ?? "—"}\n   Descrição: ${p.description ?? "—"}\n   Formatos preferidos: ${(p.preferred_formats ?? []).join(", ")}`
      ).join("\n") + "\nIMPORTANTE: Use o NOME COMPLETO de cada pilar no campo content_type.\n";
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

    // Build tactical banks context
    let tacticalBanksContext = "";
    if (briefing) {
      if (Array.isArray(briefing.hook_bank) && briefing.hook_bank.length > 0) {
        tacticalBanksContext += `\nBanco de Hooks da Marca:\n${briefing.hook_bank.map((h: any) => `[${h.frame}/${h.style}] ${h.text}`).join("\n")}`;
      }
      if (Array.isArray(briefing.cta_bank) && briefing.cta_bank.length > 0) {
        const ctasByObj: Record<string, string[]> = {};
        for (const cta of briefing.cta_bank) {
          if (!ctasByObj[cta.objective]) ctasByObj[cta.objective] = [];
          ctasByObj[cta.objective].push(`[${cta.intensity}] ${cta.text}`);
        }
        tacticalBanksContext += `\nBanco de CTAs da Marca:\n${Object.entries(ctasByObj).map(([obj, ctas]) => `${obj}: ${ctas.join(" | ")}`).join("\n")}`;
      }
      if (Array.isArray(briefing.objection_bank) && briefing.objection_bank.length > 0) {
        tacticalBanksContext += `\nObjeções do Público:\n${briefing.objection_bank.map((o: any) => `[${o.severity}] "${o.objection}"`).join("\n")}`;
      }
    }

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

    const { posts_per_week, format_mix, responsibles, preferred_times, special_instructions, category_mix } = parameters;
    const startMs = period_start ? new Date(period_start).getTime() : 0;
    const endMs = period_end ? new Date(period_end).getTime() : 0;
    const weeks = (startMs && endMs && endMs > startMs)
      ? Math.max(1, Math.round((endMs - startMs) / (7 * 86400000)))
      : 1;
    const totalBase = (posts_per_week ?? 3) * weeks;
    // Generate 2 options per post (A/B selection)
    const totalWithExtra = totalBase * 2;

    let systemPrompt: string;
    let userPrompt: string;

    // ════════════════════════════════════════════════════════════════
    // ██  F.O.R.M.U.L.A.™ MODE
    // ════════════════════════════════════════════════════════════════
    if (formulaEnabled) {
      const frameWeights = formulaConfig.frame_weights ?? {};
      const objectiveMix = formulaConfig.objective_mix ?? {};
      const methodWeights = formulaConfig.method_weights ?? {};
      const varietyRules = formulaConfig.variety_rules ?? {};

      // Build active frames list
      const activeFrames = Object.entries(frameWeights)
        .filter(([, w]) => (w as number) !== 0)
        .map(([key]) => FRAME_LABELS[key] ?? key)
        .join(", ");

      // Build objective distribution
      const objectiveDistribution = Object.entries(objectiveMix)
        .filter(([, v]) => (v as number) > 0)
        .map(([key, v]) => `${OBJECTIVE_LABELS[key] ?? key}: ${v}%`)
        .join(", ");

      // Build active methods list
      const activeMethods = Object.entries(methodWeights)
        .filter(([, w]) => (w as number) !== 0)
        .map(([key]) => METHOD_LABELS[key] ?? key)
        .join(", ");

      // Build uniqueness elements
      const uniquenessElements = (formula?.uniqueness_elements ?? [])
        .map((u: any) => `- ${u.label}: ${u.description}`)
        .join("\n");

      // Build power words and forbidden patterns
      const powerWords = (formula?.power_words ?? []).join(", ");
      const forbiddenPatterns = (formula?.forbidden_patterns ?? []).join(", ");

      // Build CTAs by objective
      const ctasByObjective = Object.entries(formula?.ctas_by_objective ?? {})
        .map(([key, cta]) => `- ${OBJECTIVE_LABELS[key] ?? key}: ${cta}`)
        .join("\n");

      // Build variety rules text
      let varietyRulesText = "";
      if (varietyRules.noRepeatFrame) varietyRulesText += "- Nunca usar o mesmo frame 2x seguidas\n";
      if (varietyRules.noRepeatMethod) varietyRulesText += "- Nunca repetir método em posts consecutivos\n";
      if (varietyRules.maxSameObjective) varietyRulesText += `- Máximo ${varietyRules.maxSameObjective}% de posts com mesmo objetivo\n`;
      if (varietyRules.minRealData) varietyRulesText += `- Pelo menos ${varietyRules.minRealData}% dos posts devem citar dados/números reais\n`;
      if (varietyRules.minProvocative) varietyRulesText += `- Pelo menos ${varietyRules.minProvocative}% dos posts devem ter elemento provocativo/contrarian\n`;

      systemPrompt = `Você é um Estrategista de Conteúdo que aplica a Metodologia F.O.R.M.U.L.A.™ para criar calendários anti-genéricos.

## METODOLOGIA F.O.R.M.U.L.A.™ OBRIGATÓRIA

Cada post DEVE seguir os 7 filtros:

1. **Frame (Enquadramento)** — Escolha 1 dos ângulos de ataque ATIVOS:
   ${activeFrames}

2. **Objective (Objetivo)** — Cada post tem UM objetivo com a distribuição:
   ${objectiveDistribution}

3. **Reference (Referência)** — OBRIGATÓRIO evidência concreta:
   - Número específico, case, citação, comparativo antes/depois, screenshot
   - Posts sem evidência são PROIBIDOS

4. **Method (Método)** — Formato narrativo ATIVO:
   ${activeMethods}

5. **Uniqueness (Singularidade)** — Cada post deve usar 1 elemento da marca:
${uniquenessElements || "   (não definidos — gere com base no posicionamento da marca)"}
   Se o concorrente pode copiar o post trocando o logo, o post está ERRADO.

6. **Language (Linguagem)** — Regras:
   - Palavras de força: ${powerWords || "(não definidas)"}
   - PROIBIDO: ${forbiddenPatterns || "(não definidos)"}
   - Tom: ${project?.tone_of_voice ?? "—"}

7. **Action (CTA)** — CTA específico por objetivo:
${ctasByObjective || "   (não definidos — gere CTAs específicos por objetivo)"}

### REGRAS ANTI-GENÉRICO:
❌ NÃO criar posts tipo "O que é X?", "Entenda Y", "Conheça Z", "A importância de W", "Como fazer K" (sem especificidade)
✅ CRIAR posts com tese única, ângulo diferenciado, evidência concreta
${varietyRulesText}

HOOKS: Se o contexto incluir "Banco de Hooks da Marca", use como INSPIRAÇÃO para as headlines. Adapte cada hook ao tema específico do post — não copie literalmente. Varie os frames ao longo do calendário.

Responda em JSON.`;

      userPrompt = `Gere um calendário de ${totalBase} posts usando a Metodologia F.O.R.M.U.L.A.™ para Instagram.
Para CADA post, crie DUAS alternativas (option_a e option_b). Ambas devem:
- Manter o MESMO formato, data, horário, objetivo e content_type
- Ter TÍTULOS DIFERENTES com ângulos/abordagens criativas distintas
- Usar frames e/ou métodos diferentes entre si quando possível
O usuário vai escolher a opção preferida de cada par.

PERÍODO: ${period_start} a ${period_end} (${weeks} semanas)
MARCA: ${brandName}

${pillarContext}

DISTRIBUIÇÃO DE FORMATOS:
${Object.entries(format_mix ?? {}).map(([k, v]) => `- ${k}: ${v}%`).join("\n")}

${preferred_times ? `HORÁRIOS PREFERENCIAIS:\n- Dias úteis: ${preferred_times.weekday?.join(", ")}\n- Fins de semana: ${preferred_times.weekend?.join(", ")}` : ""}

${special_instructions ? `INSTRUÇÕES ESPECIAIS: ${special_instructions}` : ""}

CONTEXTO DA MARCA:
${brandContext}

${referencesContext}
${memoryContext}
${hashtagContext}
${seasonalContext}
${productsContext}
${tacticalBanksContext}

─── ANÁLISE DA MARCA ───
${brandAnalysis.slice(0, 4000)}

${competitorAnalysis ? `─── ANÁLISE DE CONCORRENTES ───\n${competitorAnalysis.slice(0, 4000)}` : ""}

${influencerAnalysis ? `─── ANÁLISE DE INFLUENCERS ───\n${influencerAnalysis.slice(0, 3000)}` : ""}

${inspirationAnalysis ? `─── ANÁLISE DE INSPIRAÇÕES ───\n${inspirationAnalysis.slice(0, 3000)}` : ""}

${synthesisAnalysis ? `─── SÍNTESE ESTRATÉGICA ───\n${synthesisAnalysis.slice(0, 3000)}` : ""}

REGRAS:
1. Gere exatamente ${totalBase} slots, cada um com option_a e option_b
2. Cada opção DEVE preencher TODOS os 7 filtros F.O.R.M.U.L.A.™
3. As duas opções do mesmo slot DEVEM ter títulos e abordagens DIFERENTES
4. Respeitar distribuição de formatos
5. Variar frames e métodos ao longo da semana

Responda APENAS com JSON válido:
{
  "slots": [
    {
      "slot_index": 0,
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "content_type": "tema ou pilar",
      "format": "Reels|Carrossel|Estático|Stories",
      "option_a": {
        "title": "Título com ângulo A",
        "formula": {
          "frame": "key",
          "objective": "key",
          "reference_type": "number|case|quote|comparison|screenshot",
          "method": "key",
          "uniqueness_element": "texto",
          "cta": "CTA específico"
        }
      },
      "option_b": {
        "title": "Título com ângulo B diferente",
        "formula": {
          "frame": "key diferente se possível",
          "objective": "mesmo objetivo do slot",
          "reference_type": "number|case|quote|comparison|screenshot",
          "method": "key diferente se possível",
          "uniqueness_element": "texto",
          "cta": "CTA específico"
        }
      }
    }
  ]
}`;

    // ════════════════════════════════════════════════════════════════
    // ██  THESES MODE (existing)
    // ════════════════════════════════════════════════════════════════
    } else if (contentApproach === "theses") {
      const catMix = category_mix ?? { thesis: 40, best_practice: 25, seasonal: 15, connection: 20 };

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

      systemPrompt = `Você é um Arquiteto de Narrativas de Marca e Estrategista de Conteúdo. Seu trabalho é criar um calendário EQUILIBRADO que combina diferentes tipos de conteúdo para maximizar resultados.

O calendário deve ter um MIX OBRIGATÓRIO de 4 categorias de posts:

## CATEGORIA 1: TESES NARRATIVAS (~${catMix.thesis}% dos posts)
Posts provocativos que cruzam Territórios de Tensão com Lentes Narrativas.
- Headlines no formato: [FRASE CURTA E FORTE] - [COMPLEMENTO PROVOCADOR] (caixa alta)
- Cada post é uma TESE — um argumento original que gera reflexão
- O objetivo é diferenciar a marca com perspectivas únicas

## CATEGORIA 2: CASES DE SUCESSO & MELHORES PRÁTICAS (~${catMix.best_practice}% dos posts)
Posts baseados no que JÁ FUNCIONOU para a marca e nas melhores práticas identificadas na análise.
- Replicar formatos, ângulos e abordagens que geraram alto engajamento
- Adaptar cases de sucesso com novos ângulos (não repetir exatamente)
- Aplicar aprendizados da memória estratégica e da análise de performance
- Headlines diretas e claras (não precisam ser provocativas)

## CATEGORIA 3: DATAS SAZONAIS & MOMENTOS CULTURAIS (~${catMix.seasonal}% dos posts)
Posts conectados ao calendário sazonal, datas comemorativas e momentos culturais relevantes.
- Usar as datas do calendário sazonal fornecido
- Conectar a data com o posicionamento da marca (não ser genérico)
- Pode combinar com uma lente narrativa para dar profundidade

## CATEGORIA 4: CONTEÚDO DE CONEXÃO (~${catMix.connection}% dos posts)
Posts que constroem proximidade com a persona: bastidores, produto, educativo, storytelling.
- Conteúdo que humaniza a marca
- Posts sobre produtos/serviços com ângulo de valor (não venda direta)
- Conteúdo educativo baseado na expertise da marca
- Storytelling e narrativas que conectam emocionalmente

${lensesDescription}

NÍVEL DE PROVOCAÇÃO (aplica-se às Teses Narrativas): ${provocationLevel}/5
${provocationGuide}

REGRAS CRÍTICAS:
- RESPEITAR O MIX de categorias (${catMix.thesis}% teses, ${catMix.best_practice}% cases/práticas, ${catMix.seasonal}% sazonal, ${catMix.connection}% conexão)
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
${tacticalBanksContext}

─── ANÁLISE DA MARCA ───
${brandAnalysis.slice(0, 4000)}

${competitorAnalysis ? `─── ANÁLISE DE CONCORRENTES ───\n${competitorAnalysis.slice(0, 4000)}` : ""}

${influencerAnalysis ? `─── ANÁLISE DE INFLUENCERS ───\n${influencerAnalysis.slice(0, 3000)}` : ""}

${inspirationAnalysis ? `─── ANÁLISE DE INSPIRAÇÕES ───\n${inspirationAnalysis.slice(0, 3000)}` : ""}

${synthesisAnalysis ? `─── SÍNTESE ESTRATÉGICA ───\n${synthesisAnalysis.slice(0, 3000)}` : ""}

REGRAS:
1. content_type = NOME COMPLETO do pilar relacionado
2. MIX OBRIGATÓRIO: ~${catMix.thesis}% teses narrativas, ~${catMix.best_practice}% cases/melhores práticas, ~${catMix.seasonal}% datas sazonais, ~${catMix.connection}% conexão
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

    // ════════════════════════════════════════════════════════════════
    // ██  PILLARS MODE (existing legacy)
    // ════════════════════════════════════════════════════════════════
    } else {
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
${tacticalBanksContext}

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

    // Robust JSON extraction: strip markdown fences, find JSON boundaries
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = content.search(/[\{\[]/);
    const lastBrace = content.lastIndexOf("}");
    const lastBracket = content.lastIndexOf("]");
    const jsonEnd = Math.max(lastBrace, lastBracket);
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("AI raw response (no JSON found):", content.slice(0, 500));
      throw new Error("IA não retornou JSON válido");
    }
    let jsonStr = content.substring(jsonStart, jsonEnd + 1);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_e) {
      // Try fixing common issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e2) {
        console.error("JSON parse failed after repair:", jsonStr.slice(0, 500));
        throw new Error("IA não retornou JSON válido");
      }
    }

    const isTheses = contentApproach === "theses";
    const colabs = parameters.colabs ?? [];
    const colabPercentage = parameters.colab_percentage ?? 0;
    const useColabs = colabs.length > 0 && colabPercentage > 0;

    let insertCount = 0;

    // Handle new slots format (A/B pairs) — F.O.R.M.U.L.A.™ mode
    if (parsed.slots && Array.isArray(parsed.slots)) {
      const totalSlots = parsed.slots.length;
      const colabSlotCount = Math.round(totalSlots * (colabPercentage / 100));

      for (let loopIndex = 0; loopIndex < parsed.slots.length; loopIndex++) {
        const slot = parsed.slots[loopIndex];
        const slotIdx = regenerate_slot ?? loopIndex;
        const isColab = useColabs && slotIdx < colabSlotCount;
        const colabHandle = isColab && colabs.length > 0
          ? colabs[slotIdx % colabs.length]?.instagram ?? null
          : null;

        for (const optionKey of ["option_a", "option_b"]) {
          const option = slot[optionKey];
          if (!option) continue;

          const metadata: any = {
            title_status: "pending",
            slot_index: slotIdx,
            is_colab: isColab,
            colab_handle: colabHandle,
            content_approach: "formula",
            formula: option.formula ?? null,
          };

          await supabase.from("planning_items").insert({
            calendar_id,
            title: option.title,
            scheduled_date: slot.scheduled_date || null,
            scheduled_time: slot.scheduled_time || null,
            content_type: slot.content_type || null,
            format: slot.format || null,
            channel: channel ?? "social",
            status: "idea",
            metadata,
          });
          insertCount++;
        }
      }
    }
    // Fallback: handle flat items array (legacy / theses / regeneration)
    else {
      const generatedItems = parsed.items ?? [];
      for (let i = 0; i < generatedItems.length; i++) {
        const item = generatedItems[i];
        const slotIndex = regenerate_slot != null ? regenerate_slot : Math.floor(i / 2);
        const totalSlots = Math.ceil(generatedItems.length / 2);
        const colabSlotCount = Math.round(totalSlots * (colabPercentage / 100));
        const isColab = useColabs && slotIndex < colabSlotCount;
        const colabHandle = isColab && colabs.length > 0
          ? colabs[slotIndex % colabs.length]?.instagram ?? null
          : null;

        const metadata: any = {
          title_status: "pending",
          slot_index: slotIndex,
          is_colab: isColab,
          colab_handle: colabHandle,
        };

        if (formulaEnabled) {
          metadata.formula = item.formula ?? null;
          metadata.content_approach = "formula";
        } else if (isTheses) {
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
        insertCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, count: insertCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

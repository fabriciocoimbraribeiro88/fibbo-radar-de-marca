import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const { calendar_id, project_id, approved_items } = await req.json();

    // 1. Fetch full project context
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";
    const briefing = project?.briefing as any;

    // 2. Build comprehensive brand context
    let brandContext = `MARCA: ${brandName}
Segmento: ${project?.segment ?? "—"}
Tom de voz: ${project?.tone_of_voice ?? "—"}
Público-alvo: ${project?.target_audience ?? "—"}
Descrição: ${project?.brand_description ?? "—"}`;

    // Add briefing sections
    if (briefing) {
      const sectionLabels: Record<string, string> = {
        values_essence: "Valores e Essência",
        competitive_edge: "Diferencial Competitivo",
        communication_guidelines: "Diretrizes de Comunicação",
        emotional_context: "Contexto Emocional",
      };
      for (const [key, label] of Object.entries(sectionLabels)) {
        if (briefing[key] && typeof briefing[key] === "object") {
          const values = Object.entries(briefing[key])
            .filter(([, v]) => v && typeof v === "string" && (v as string).trim())
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n");
          if (values) brandContext += `\n\n${label}:\n${values}`;
        }
      }
    }

    // 3. Fetch brand references for richer context
    const { data: references } = await supabase
      .from("brand_references")
      .select("title, type, description, why_it_worked, format")
      .eq("project_id", project_id)
      .limit(10);

    let referencesContext = "";
    if (references && references.length > 0) {
      const successes = references.filter(r => r.type === "success_post" || r.type === "kv");
      if (successes.length > 0) {
        referencesContext = "\nREFERÊNCIAS DE SUCESSO:\n" + successes.map(r =>
          `- "${r.title}": ${r.why_it_worked ?? r.description ?? "—"}`
        ).join("\n");
      }
    }

    // 4. Fetch brand memory
    const { data: memories } = await supabase
      .from("brand_memory_entries")
      .select("month, year, summary, learnings")
      .eq("project_id", project_id)
      .eq("is_active", true)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(2);

    let memoryContext = "";
    if (memories && memories.length > 0) {
      memoryContext = "\nMEMÓRIA ESTRATÉGICA:\n" + memories.map(m => {
        const learnings = m.learnings as any;
        let text = `${m.month}/${m.year}: ${m.summary ?? "—"}`;
        if (learnings && Array.isArray(learnings)) {
          text += " | Aprendizados: " + learnings.map((l: any) => l.text ?? l).join("; ");
        }
        return text;
      }).join("\n");
    }

    // 5. Build items list with thesis context
    const itemsList = (approved_items ?? []).map((i: any, idx: number) => {
      const md = i.metadata ?? {};
      const isThesis = md.content_approach === "theses" || md.territory;
      let line = `POST ${idx + 1}: Data=${i.scheduled_date} Horário=${i.scheduled_time} Formato=${i.format} Pilar=${i.content_type} Resp=${i.responsible_code ?? md.responsible_code} Título="${i.title}"`;
      if (isThesis) {
        line += `\n  Território: ${md.territory ?? "—"}`;
        line += `\n  Lente: ${md.lens ?? "—"}`;
        line += `\n  Tese: ${md.thesis ?? "—"}`;
      }
      return line;
    }).join("\n");

    // Detect if using theses approach
    const firstItem = approved_items?.[0];
    const isThesesApproach = firstItem?.metadata?.content_approach === "theses" || firstItem?.metadata?.territory;

    let systemPrompt: string;
    let userPrompt: string;

    if (isThesesApproach) {
      systemPrompt = `Você é um Arquiteto de Narrativas de Marca que cria briefings profundos seguindo o micro-framework de Teses Narrativas.

Cada briefing segue esta estrutura:
1. HEADLINE DE TENSÃO: Já vem aprovada no título (manter)
2. ARGUMENTO CENTRAL: 2-3 parágrafos defendendo a tese com linguagem acessível. Use analogias do dia a dia. Seja um intelectual acessível, NÃO um acadêmico pedante.
3. EVIDÊNCIA/EXEMPLO: Dado concreto, case real, analogia poderosa ou história curta que ancora o argumento na realidade.
4. RESOLUÇÃO/PROVOCAÇÃO FINAL: Conexão com a marca ou pergunta aberta que deixa a audiência pensando.

TOM: Fale como quem conversa com um colega inteligente. Respeito mútuo, não professor-aluno.
SEM jargões corporativos. SEM clichês. Use "você" para falar direto com o leitor.

Responda em JSON.`;

      userPrompt = `Gere briefings detalhados para cada post aprovado seguindo o micro-framework de Teses Narrativas.

${brandContext}
${referencesContext}
${memoryContext}

POSTS APROVADOS:
${itemsList}

Para cada post, gere:
- objective: objetivo do post conectado à tese (1-2 frases)
- concept: conceito criativo que materializa a tese
- argument: o argumento central (2-3 parágrafos com linguagem acessível, analogias do dia a dia)
- evidence: evidência ou exemplo concreto que ancora a tese
- resolution: resolução/provocação final (conexão com a marca ou pergunta aberta)
- copy_text: caption completa para Instagram (usando a estrutura: gancho provocativo + argumento + evidência + CTA)
- theme: CTA principal
- visual_brief: brief para o designer (deve refletir a tensão do território)
- hashtags: array de hashtags relevantes
- target_audience: segmento específico da audiência que esta tese atinge
- Para Carrossel: slides (array com {slide, type, text}) — slide 1=capa com headline, últimos=argumento+CTA
- Para Reels: script (roteiro com indicações de cena, seguindo: hook provocativo → argumento → evidência → provocação final)
- Para Estático: image_text (texto da imagem — a headline de tensão)

Responda APENAS com JSON válido:
{
  "briefings": [
    {
      "item_index": 0,
      "objective": "...",
      "concept": "...",
      "argument": "...",
      "evidence": "...",
      "resolution": "...",
      "copy_text": "...",
      "theme": "...",
      "visual_brief": "...",
      "hashtags": ["#tag1"],
      "target_audience": "...",
      "slides": null,
      "script": null,
      "image_text": null
    }
  ]
}`;
    } else {
      // Traditional briefing approach
      systemPrompt = "Você é um estrategista de conteúdo digital expert em criar briefings detalhados para redes sociais. Responda em JSON.";

      userPrompt = `Gere briefings detalhados para cada post aprovado.

${brandContext}
${referencesContext}
${memoryContext}

POSTS APROVADOS:
${itemsList}

Para cada post, gere:
- objective: objetivo do post (1-2 frases)
- concept: conceito criativo
- copy_text: caption completa com emojis e formatação
- theme: CTA principal
- visual_brief: brief para o designer
- hashtags: array de hashtags relevantes
- target_audience: público específico
- Para Carrossel: slides (array com {slide, type, text})
- Para Reels: script (roteiro com indicações de cena)
- Para Estático: image_text (texto da imagem)

Responda APENAS com JSON válido:
{
  "briefings": [
    {
      "item_index": 0,
      "objective": "...",
      "concept": "...",
      "copy_text": "...",
      "theme": "...",
      "visual_brief": "...",
      "hashtags": ["#tag1"],
      "target_audience": "...",
      "slides": null,
      "script": null,
      "image_text": null
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
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("IA não retornou JSON válido");
    const parsed = JSON.parse(jsonMatch[0]);
    const briefings = parsed.briefings ?? [];

    // Update each planning_item with briefing data
    for (const briefing of briefings) {
      const itemIndex = briefing.item_index ?? 0;
      const approvedItem = approved_items[itemIndex];
      if (!approvedItem?.id) continue;

      const existingItem = await supabase.from("planning_items").select("metadata").eq("id", approvedItem.id).single();
      const existingMeta = (existingItem.data?.metadata as any) ?? {};

      await supabase.from("planning_items").update({
        copy_text: briefing.copy_text || null,
        theme: briefing.theme || null,
        visual_brief: briefing.visual_brief || null,
        target_audience: briefing.target_audience || null,
        description: briefing.concept || null,
        hashtags: briefing.hashtags || null,
        metadata: {
          ...existingMeta,
          objective: briefing.objective,
          concept: briefing.concept,
          argument: briefing.argument ?? null,
          evidence: briefing.evidence ?? null,
          resolution: briefing.resolution ?? null,
          slides: briefing.slides,
          script: briefing.script,
          image_text: briefing.image_text,
          briefing_status: "pending",
        },
      }).eq("id", approvedItem.id);
    }

    return new Response(JSON.stringify({ success: true, count: briefings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

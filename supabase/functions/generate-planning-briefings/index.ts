import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const { calendar_id, project_id, approved_items } = await req.json();

    console.log(`[generate-planning-briefings] Processing ${approved_items?.length ?? 0} items for calendar ${calendar_id}`);

    // 1. Fetch full project context
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";
    const briefing = project?.briefing as any;
    const formula = briefing?.formula ?? null;

    // 2. Build brand context (compact)
    let brandContext = `MARCA: ${brandName} | Segmento: ${project?.segment ?? "—"} | Tom: ${project?.tone_of_voice ?? "—"} | Público: ${project?.target_audience ?? "—"}`;

    if (briefing) {
      for (const key of ["values_essence", "competitive_edge", "communication_guidelines"]) {
        if (briefing[key] && typeof briefing[key] === "object") {
          const values = Object.entries(briefing[key])
            .filter(([, v]) => v && typeof v === "string" && (v as string).trim())
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
          if (values) brandContext += `\n${key}: ${values}`;
        }
      }
    }

    // 3. Fetch references (compact)
    const { data: references } = await supabase
      .from("brand_references")
      .select("title, type, why_it_worked")
      .eq("project_id", project_id)
      .limit(5);

    let referencesContext = "";
    if (references?.length) {
      const successes = references.filter(r => r.type === "success_post" || r.type === "kv");
      if (successes.length > 0) {
        referencesContext = "\nREFS: " + successes.map(r => `"${r.title}": ${r.why_it_worked ?? "—"}`).join(" | ");
      }
    }

    // 4. Fetch brand memory (compact)
    const { data: memories } = await supabase
      .from("brand_memory_entries")
      .select("summary")
      .eq("project_id", project_id)
      .eq("is_active", true)
      .order("year", { ascending: false })
      .limit(1);

    let memoryContext = "";
    if (memories?.length) {
      memoryContext = `\nMEMÓRIA: ${memories[0].summary ?? ""}`;
    }

    const fullContext = brandContext + referencesContext + memoryContext;

    // Build F.O.R.M.U.L.A.™ language context (used when items have formula metadata)
    let formulaLanguageContext = "";
    if (formula) {
      const powerWords = (formula.power_words ?? []).join(", ");
      const forbiddenPatterns = (formula.forbidden_patterns ?? []).join(", ");
      if (powerWords) formulaLanguageContext += `\nPalavras de força: ${powerWords}`;
      if (forbiddenPatterns) formulaLanguageContext += `\nPROIBIDO usar: ${forbiddenPatterns}`;
    }

    // 5. Process in batches
    const allItems = approved_items ?? [];
    let totalBriefings = 0;

    for (let batchStart = 0; batchStart < allItems.length; batchStart += BATCH_SIZE) {
      const batch = allItems.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allItems.length / BATCH_SIZE);

      console.log(`[generate-planning-briefings] Batch ${batchNum}/${totalBatches} (${batch.length} items)`);

      // Detect if batch has formula items
      const hasFormulaItems = batch.some((i: any) => i.metadata?.formula);
      const isTheses = batch.some((i: any) => i.metadata?.territory);

      const itemsList = batch.map((i: any, idx: number) => {
        const md = i.metadata ?? {};
        const globalIdx = batchStart + idx;
        let line = `POST ${globalIdx}: ${i.scheduled_date} ${i.scheduled_time} ${i.format} "${i.title}"`;

        // F.O.R.M.U.L.A.™ item context
        if (md.formula) {
          const f = md.formula;
          line += `\n  F.O.R.M.U.L.A.™: Frame=${f.frame} | Objetivo=${f.objective} | Referência=${f.reference_type} | Método=${f.method} | Singularidade=${f.uniqueness_element} | CTA=${f.cta}`;
        }
        // Theses item context
        else if (md.territory) {
          line += ` [${md.territory}|${md.lens ?? ""}]`;
          if (md.thesis) line += ` Tese: ${md.thesis.substring(0, 150)}`;
        }
        return line;
      }).join("\n");

      let systemPrompt: string;
      let userPrompt: string;

      if (hasFormulaItems) {
        // ── F.O.R.M.U.L.A.™ briefing mode ──
        systemPrompt = `Você é um Estrategista de Conteúdo que aplica a Metodologia F.O.R.M.U.L.A.™. Crie briefings detalhados seguindo rigorosamente os 7 filtros de cada post.

Para cada post:
1) HEADLINE — manter o título original
2) ARGUMENTO CENTRAL — desenvolver o ângulo de ataque (frame) em 2-3 parágrafos
3) EVIDÊNCIA — incluir evidência concreta alinhada ao reference_type definido
4) RESOLUÇÃO — CTA claro e específico alinhado ao objetivo

Regras de linguagem:${formulaLanguageContext}
Tom: ${project?.tone_of_voice ?? "intelectual acessível"}

Ao gerar cada briefing:
- Desenvolva o ângulo de ataque (frame) no argumento central
- Alinhe o CTA ao objetivo definido
- Inclua evidência concreta (reference)
- Siga a estrutura narrativa do método escolhido
- Destaque o elemento proprietário da marca (uniqueness)
- Use as palavras de força e respeite os proibidos

Após gerar cada briefing, avalie com formula_score (0-100) e formula_analysis.

Responda em JSON.`;

        userPrompt = `Gere briefings F.O.R.M.U.L.A.™ para estes ${batch.length} posts.

${fullContext}

POSTS:
${itemsList}

Para cada post gere:
- objective, concept, copy_text (caption Instagram completa), theme (CTA), visual_brief, hashtags (array), target_audience
- argument (2-3 parágrafos desenvolvendo o frame), evidence (exemplo concreto do reference_type), resolution (provocação final com CTA)
- Para Carrossel: slides (array {slide, type, text})
- Para Reels: script (roteiro)
- Para Estático: image_text
- formula_score (0-100): pontuação de aderência à F.O.R.M.U.L.A.™
- formula_analysis: {"frame_applied": bool, "objective_clear": bool, "reference_present": bool, "method_followed": bool, "uniqueness_present": bool, "language_compliant": bool, "cta_specific": bool}

JSON: {"briefings": [{"item_index": N, "objective": "...", "formula_score": 85, "formula_analysis": {...}, ...}]}
item_index deve usar os números dos posts acima (${batchStart} a ${batchStart + batch.length - 1}).`;

      } else if (isTheses) {
        systemPrompt = `Você é um Arquiteto de Narrativas de Marca. Crie briefings seguindo: 1) HEADLINE (manter título), 2) ARGUMENTO CENTRAL (2-3 parágrafos acessíveis), 3) EVIDÊNCIA (dado/case/analogia), 4) RESOLUÇÃO (conexão com marca ou pergunta). Tom: intelectual acessível. Responda em JSON.`;

        userPrompt = `Gere briefings para estes ${batch.length} posts.

${fullContext}

POSTS:
${itemsList}

Para cada post gere:
- objective, concept, copy_text (caption Instagram completa), theme (CTA), visual_brief, hashtags (array), target_audience
- argument (2-3 parágrafos), evidence (exemplo concreto), resolution (provocação final)
- Para Carrossel: slides (array {slide, type, text})
- Para Reels: script (roteiro)
- Para Estático: image_text

JSON: {"briefings": [{"item_index": N, "objective": "...", ...}]}
item_index deve usar os números dos posts acima (${batchStart} a ${batchStart + batch.length - 1}).`;

      } else {
        systemPrompt = `Você é um estrategista de conteúdo digital. Crie briefings detalhados para redes sociais. Responda em JSON.`;

        userPrompt = `Gere briefings para estes ${batch.length} posts.

${fullContext}

POSTS:
${itemsList}

Para cada post gere:
- objective, concept, copy_text (caption Instagram completa), theme (CTA), visual_brief, hashtags (array), target_audience
- Para Carrossel: slides (array {slide, type, text})
- Para Reels: script (roteiro)
- Para Estático: image_text

JSON: {"briefings": [{"item_index": N, "objective": "...", ...}]}
item_index deve usar os números dos posts acima (${batchStart} a ${batchStart + batch.length - 1}).`;
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

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`[generate-planning-briefings] AI error batch ${batchNum}: ${errText}`);
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content ?? "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`[generate-planning-briefings] No JSON in AI response batch ${batchNum}`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const briefings = parsed.briefings ?? [];

      for (const b of briefings) {
        const itemIndex = b.item_index ?? 0;
        const approvedItem = allItems[itemIndex];
        if (!approvedItem?.id) continue;

        const existingItem = await supabase.from("planning_items").select("metadata").eq("id", approvedItem.id).single();
        const existingMeta = (existingItem.data?.metadata as any) ?? {};

        const updatedMetadata: any = {
          ...existingMeta,
          objective: b.objective,
          concept: b.concept,
          argument: b.argument ?? null,
          evidence: b.evidence ?? null,
          resolution: b.resolution ?? null,
          slides: b.slides,
          script: b.script,
          image_text: b.image_text,
          briefing_status: "pending",
        };

        // Save F.O.R.M.U.L.A.™ score and analysis if present
        if (b.formula_score !== undefined) {
          updatedMetadata.formula_score = b.formula_score;
        }
        if (b.formula_analysis) {
          updatedMetadata.formula_analysis = b.formula_analysis;
        }

        await supabase.from("planning_items").update({
          copy_text: b.copy_text || null,
          theme: b.theme || null,
          visual_brief: b.visual_brief || null,
          target_audience: b.target_audience || null,
          description: b.concept || null,
          hashtags: b.hashtags || null,
          metadata: updatedMetadata,
        }).eq("id", approvedItem.id);
        totalBriefings++;
      }
    }

    console.log(`[generate-planning-briefings] Done. ${totalBriefings} briefings generated.`);

    return new Response(JSON.stringify({ success: true, count: totalBriefings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(`[generate-planning-briefings] Error: ${e.message}`);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

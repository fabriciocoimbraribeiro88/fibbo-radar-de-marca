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

    // 5. Process in batches
    const allItems = approved_items ?? [];
    let totalBriefings = 0;

    for (let batchStart = 0; batchStart < allItems.length; batchStart += BATCH_SIZE) {
      const batch = allItems.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allItems.length / BATCH_SIZE);

      console.log(`[generate-planning-briefings] Batch ${batchNum}/${totalBatches} (${batch.length} items)`);

      const itemsList = batch.map((i: any, idx: number) => {
        const md = i.metadata ?? {};
        const globalIdx = batchStart + idx;
        let line = `POST ${globalIdx}: ${i.scheduled_date} ${i.scheduled_time} ${i.format} "${i.title}"`;
        if (md.territory) line += ` [${md.territory}|${md.lens ?? ""}]`;
        if (md.thesis) line += ` Tese: ${md.thesis.substring(0, 150)}`;
        return line;
      }).join("\n");

      const isTheses = batch.some((i: any) => i.metadata?.territory);

      const systemPrompt = isTheses
        ? `Você é um Arquiteto de Narrativas de Marca. Crie briefings seguindo: 1) HEADLINE (manter título), 2) ARGUMENTO CENTRAL (2-3 parágrafos acessíveis), 3) EVIDÊNCIA (dado/case/analogia), 4) RESOLUÇÃO (conexão com marca ou pergunta). Tom: intelectual acessível. Responda em JSON.`
        : `Você é um estrategista de conteúdo digital. Crie briefings detalhados para redes sociais. Responda em JSON.`;

      const userPrompt = `Gere briefings para estes ${batch.length} posts.

${fullContext}

POSTS:
${itemsList}

Para cada post gere:
- objective, concept, copy_text (caption Instagram completa), theme (CTA), visual_brief, hashtags (array), target_audience
${isTheses ? "- argument (2-3 parágrafos), evidence (exemplo concreto), resolution (provocação final)" : ""}
- Para Carrossel: slides (array {slide, type, text})
- Para Reels: script (roteiro)
- Para Estático: image_text

JSON: {"briefings": [{"item_index": N, "objective": "...", ...}]}
item_index deve usar os números dos posts acima (${batchStart} a ${batchStart + batch.length - 1}).`;

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

        await supabase.from("planning_items").update({
          copy_text: b.copy_text || null,
          theme: b.theme || null,
          visual_brief: b.visual_brief || null,
          target_audience: b.target_audience || null,
          description: b.concept || null,
          hashtags: b.hashtags || null,
          metadata: {
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
          },
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

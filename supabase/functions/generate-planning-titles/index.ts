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

    // Fetch analysis sections for context
    const { data: sections } = await supabase.from("analysis_sections").select("content_markdown, section_type").eq("analysis_id", analysis_id).eq("status", "completed");
    const analysisContext = sections?.map((s: any) => s.content_markdown).filter(Boolean).join("\n\n---\n\n") ?? "";

    // Fetch project info
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";

    // Build context
    let brandContext = `Marca: ${brandName}\nSegmento: ${project?.segment ?? "—"}\nTom de voz: ${project?.tone_of_voice ?? "—"}\n`;

    // Fetch pillars if included
    if (parameters.context_includes?.includes("pillars")) {
      const briefing = project?.briefing as any;
      if (briefing?.content_pillars) {
        brandContext += `\nPilares de Conteúdo:\n${JSON.stringify(briefing.content_pillars, null, 2)}\n`;
      }
    }

    const { posts_per_week, extra_percentage, format_mix, responsibles, preferred_times, special_instructions } = parameters;
    const weeks = Math.max(1, Math.round((new Date(period_end).getTime() - new Date(period_start).getTime()) / (7 * 86400000)));
    const totalBase = posts_per_week * weeks;
    const totalWithExtra = Math.ceil(totalBase * (1 + (extra_percentage ?? 25) / 100));

    const prompt = `Gere um calendário de títulos/temas para ${totalWithExtra} posts de Instagram.

PERÍODO: ${period_start} a ${period_end} (${weeks} semanas)
MARCA: ${brandName}

DISTRIBUIÇÃO DE FORMATOS:
${Object.entries(format_mix ?? {}).map(([k, v]) => `- ${k}: ${v}%`).join("\n")}

RESPONSÁVEIS:
${(responsibles ?? []).map((r: any) => `- ${r.name} (${r.code}): ${r.percentage}%`).join("\n")}

${preferred_times ? `HORÁRIOS PREFERENCIAIS:\n- Dias úteis: ${preferred_times.weekday?.join(", ")}\n- Fins de semana: ${preferred_times.weekend?.join(", ")}` : ""}

${special_instructions ? `INSTRUÇÕES ESPECIAIS: ${special_instructions}` : ""}

CONTEXTO DA MARCA:
${brandContext}

ANÁLISE BASE (resumo):
${analysisContext.slice(0, 8000)}

REGRAS:
- Respeitar distribuição de pilares, formatos e responsáveis
- Variar temas e formatos ao longo da semana
- Títulos devem ser concretos e específicos
- Posts de fim de semana mais leves
- Horários devem variar entre os preferenciais
- Não usar emojis nos títulos

Responda APENAS com JSON válido no formato:
{
  "items": [
    {
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "content_type": "PILAR_CODE",
      "format": "Reels|Carrossel|Estático|Stories",
      "responsible_code": "CODE",
      "title": "Título concreto do post"
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um estrategista de conteúdo digital. Gere calendários editoriais precisos em JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content ?? "";
    
    // Extract JSON from response
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

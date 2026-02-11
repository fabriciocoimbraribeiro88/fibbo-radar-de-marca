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
    const { calendar_id, project_id, approved_items } = await req.json();

    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const brandName = project?.brand_name ?? project?.name ?? "Marca";

    const itemsList = (approved_items ?? []).map((i: any, idx: number) =>
      `POST ${idx + 1}: Data=${i.scheduled_date} Horário=${i.scheduled_time} Formato=${i.format} Pilar=${i.content_type} Resp=${i.responsible_code} Título="${i.title}"`
    ).join("\n");

    const prompt = `Gere briefings detalhados para cada post aprovado.

MARCA: ${brandName}
Segmento: ${project?.segment ?? "—"}
Tom de voz: ${project?.tone_of_voice ?? "—"}

POSTS APROVADOS:
${itemsList}

Para cada post, gere:
- objective: objetivo do post (1-2 frases)
- concept: conceito criativo
- copy_text: caption completa com emojis e formatação
- theme: CTA principal
- visual_brief: brief para o designer
- hashtags: array de hashtags relevantes
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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um estrategista de conteúdo digital expert em criar briefings detalhados para redes sociais. Responda em JSON." },
          { role: "user", content: prompt },
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

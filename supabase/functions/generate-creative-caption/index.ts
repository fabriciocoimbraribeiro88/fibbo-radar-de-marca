import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildFullBrandContext } from "../_shared/brand-context-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { planning_item_id, project_id, creative_id } = await req.json();
    if (!planning_item_id || !project_id || !creative_id) {
      return new Response(JSON.stringify({ error: "planning_item_id, project_id, and creative_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch planning item
    const { data: item, error: itemErr } = await supabase
      .from("planning_items")
      .select("title, description, copy_text, visual_brief, format, channel, theme, metadata, hashtags, target_audience")
      .eq("id", planning_item_id)
      .single();
    if (itemErr || !item) throw new Error("Planning item not found");

    // Build full brand context
    const brandContext = await buildFullBrandContext(project_id);

    // Fetch creative output for image context
    const { data: creative } = await supabase
      .from("creative_outputs")
      .select("option_a_url, option_b_url, selected_option")
      .eq("id", creative_id)
      .single();

    const selectedImage = creative?.selected_option === "a" ? "Opção A" : "Opção B";
    const metadata = (item.metadata as any) ?? {};
    const briefing = metadata.briefing_text || metadata.briefing || "";

    const prompt = `Você é um copywriter especialista em redes sociais. Gere EXATAMENTE 2 legendas únicas e criativas para o post descrito abaixo.

CONTEXTO COMPLETO DA MARCA:
${brandContext}

---

DETALHES DO POST:
- Título: ${item.title}
- Descrição: ${item.description ?? ""}
- Copy original: ${item.copy_text ?? ""}
- Briefing visual: ${item.visual_brief ?? ""}
- Formato: ${item.format ?? "feed"}
- Canal: ${item.channel ?? "instagram"}
- Tema: ${item.theme ?? ""}
- Público-alvo: ${item.target_audience ?? ""}
- Hashtags sugeridas: ${item.hashtags?.join(", ") ?? ""}
- Briefing completo: ${briefing}
- Criativo selecionado: ${selectedImage}

---

REGRAS OBRIGATÓRIAS:
1. Cada legenda deve ter um ângulo/abordagem DIFERENTE
2. Use o tom de voz da marca conforme definido no contexto
3. Incorpore hooks do banco de hooks quando relevante
4. Use CTAs do banco de CTAs da marca quando relevante
5. Aplique provas sociais do banco quando relevante
6. Considere os pilares de conteúdo da marca
7. As legendas devem ser prontas para publicação
8. Inclua hashtags relevantes ao final
9. NÃO use emojis nos títulos/cabeçalhos
10. Siga o formato [FRASE CURTA E FORTE] quando aplicável

Responda EXATAMENTE neste formato JSON:
{
  "caption_a": "legenda completa A com hashtags",
  "caption_b": "legenda completa B com hashtags"
}

Responda APENAS o JSON, sem texto adicional.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";
    
    // Parse JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");
    
    const parsed = JSON.parse(jsonMatch[0]);
    const { caption_a, caption_b } = parsed;

    if (!caption_a || !caption_b) throw new Error("AI did not generate both captions");

    // Update creative_outputs with captions
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await serviceClient
      .from("creative_outputs")
      .update({ caption_a, caption_b, selected_caption: null })
      .eq("id", creative_id);

    return new Response(JSON.stringify({ caption_a, caption_b }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative-caption error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

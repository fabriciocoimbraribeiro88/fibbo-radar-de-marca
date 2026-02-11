import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("brand_name, segment, brand_description, briefing")
      .eq("id", project_id)
      .single();

    // Get brand entity
    const { data: entities } = await supabase
      .from("project_entities")
      .select("entity_id, entity_role")
      .eq("project_id", project_id)
      .eq("entity_role", "brand");

    const brandEntityId = entities?.[0]?.entity_id;

    let postsContext = "";
    if (brandEntityId) {
      const { data: posts } = await supabase
        .from("instagram_posts")
        .select("caption, hashtags, post_type")
        .eq("entity_id", brandEntityId)
        .order("posted_at", { ascending: false })
        .limit(100);

      if (posts?.length) {
        postsContext = posts
          .map((p, i) => `Post ${i + 1} [${p.post_type ?? "Image"}]: ${(p.caption ?? "").slice(0, 200)}${p.hashtags?.length ? ` | Hashtags: ${p.hashtags.join(", ")}` : ""}`)
          .join("\n");
      }
    }

    const contextParts: string[] = [];
    if (project?.brand_name) contextParts.push(`Marca: ${project.brand_name}`);
    if (project?.segment) contextParts.push(`Segmento: ${project.segment}`);
    if (project?.brand_description) contextParts.push(`Descrição: ${project.brand_description}`);

    const userPrompt = `${contextParts.join("\n")}\n\nÚltimos posts da marca:\n${postsContext || "Nenhum post disponível."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é especialista em estratégia de conteúdo para redes sociais. Analise os posts desta marca e sugira 3-5 pilares de conteúdo. Cada pilar deve ter nome, descrição, porcentagem ideal do calendário (a soma deve ser 100%), formatos preferenciais e objetivo. Responda em português brasileiro.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_pillars",
              description: "Retorna 3-5 pilares de conteúdo sugeridos",
              parameters: {
                type: "object",
                properties: {
                  pillars: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome do pilar" },
                        description: { type: "string", description: "Descrição do pilar" },
                        percentage: { type: "number", description: "% ideal do calendário" },
                        preferred_formats: {
                          type: "array",
                          items: { type: "string", enum: ["Reels", "Carrossel", "Estático", "Stories", "Vídeo"] },
                        },
                        objective: {
                          type: "string",
                          enum: ["Awareness", "Engajamento", "Conversão", "Autoridade", "Comunidade"],
                        },
                      },
                      required: ["name", "description", "percentage", "preferred_formats", "objective"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["pillars"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_pillars" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured data");

    const parsed = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify({ success: true, pillars: parsed.pillars }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content-pillars error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

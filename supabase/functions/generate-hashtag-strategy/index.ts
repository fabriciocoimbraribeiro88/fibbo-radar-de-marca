import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildFullBrandContext, getCompetitorHashtags } from "../_shared/brand-context-builder.ts";

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

    // Get full brand context + competitor hashtag data
    const [brandContext, entityHashtags] = await Promise.all([
      buildFullBrandContext(project_id),
      getCompetitorHashtags(project_id),
    ]);

    // Build hashtag comparison section
    const hashtagParts: string[] = [];
    for (const e of entityHashtags) {
      const role = e.role === "brand" ? "MARCA" : "Concorrente";
      const top = Object.entries(e.hashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([tag, count]) => `${tag} (${count}x)`)
        .join(", ");
      hashtagParts.push(`${role} ${e.name} (@${e.handle}): ${top || "sem hashtags"}`);
    }

    const userPrompt = `CONTEXTO COMPLETO DA MARCA:\n${brandContext.slice(0, 30000)}\n\nHASHTAGS USADAS PELA MARCA E CONCORRENTES:\n${hashtagParts.join("\n\n")}\n\nCom base em TODO o contexto da marca (briefing, documentos, posicionamento, público-alvo) e na análise de hashtags, identifique:\n1. Hashtags proprietárias (únicas/exclusivas da marca)\n2. Hashtags de comunidade (do nicho/setor)\n3. Hashtags de alcance para descoberta (relevantes ao posicionamento da marca)\n4. Hashtags a evitar (que não combinam com o posicionamento)`;

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
            content: `Você é um estrategista sênior de hashtags para redes sociais.

IMPORTANTE: Leia ATENTAMENTE todo o contexto da marca — briefing, documentos, público-alvo, tom de voz, posicionamento — antes de sugerir hashtags. As hashtags devem refletir o universo REAL da marca, não genéricas.

Cada hashtag deve começar com #. Justifique suas escolhas. Responda em português brasileiro.`,
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_hashtag_strategy",
              description: "Retorna estratégia de hashtags em 4 categorias com justificativas",
              parameters: {
                type: "object",
                properties: {
                  proprietary: { type: "array", items: { type: "string" }, description: "Hashtags proprietárias da marca" },
                  community: { type: "array", items: { type: "string" }, description: "Hashtags de comunidade do nicho" },
                  reach: { type: "array", items: { type: "string" }, description: "Hashtags para alcance/descoberta" },
                  forbidden: { type: "array", items: { type: "string" }, description: "Hashtags a evitar" },
                  justification: { type: "string", description: "Explicação geral da estratégia sugerida, baseada no contexto da marca" },
                },
                required: ["proprietary", "community", "reach", "forbidden", "justification"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_hashtag_strategy" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    return new Response(JSON.stringify({ success: true, strategy: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-hashtag-strategy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

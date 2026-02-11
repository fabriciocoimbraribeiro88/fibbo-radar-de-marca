import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildFullBrandContext } from "../_shared/brand-context-builder.ts";

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

    const brandContext = await buildFullBrandContext(project_id);

    if (!brandContext.trim()) {
      throw new Error("Nenhum contexto de marca encontrado. Preencha o briefing primeiro.");
    }

    const currentYear = new Date().getFullYear();

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
            content: `Você é um estrategista sênior de marketing de conteúdo.

IMPORTANTE: Leia ATENTAMENTE todo o contexto da marca — segmento, público-alvo, produtos, posicionamento, tom de voz — antes de sugerir datas sazonais.

Suas sugestões devem:
1. Incluir datas ESPECÍFICAS do setor/nicho da marca (não apenas datas genéricas como Natal e Dia das Mães)
2. Incluir datas relevantes para o público-alvo específico da marca
3. Incluir eventos do setor (feiras, congressos, semanas temáticas)
4. Incluir campanhas de conscientização relevantes ao posicionamento
5. Justificar por que cada data é relevante PARA ESTA MARCA especificamente
6. Usar datas de ${currentYear} e ${currentYear + 1}

Responda em português brasileiro.`,
          },
          {
            role: "user",
            content: `Analise TODO o contexto abaixo e sugira 10-20 datas sazonais estratégicas ESPECÍFICAS para esta marca:\n\n${brandContext.slice(0, 40000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_seasonal_dates",
              description: "Retorna datas sazonais estratégicas específicas para a marca",
              parameters: {
                type: "object",
                properties: {
                  dates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome da data/evento" },
                        date_start: { type: "string", description: "Data início YYYY-MM-DD" },
                        date_end: { type: "string", description: "Data fim YYYY-MM-DD (opcional, só se for um período)" },
                        recurrence: { type: "string", enum: ["annual", "one_time"], description: "Anual ou pontual" },
                        relevance: { type: "string", enum: ["high", "medium", "low"] },
                        type: { type: "string", enum: ["commercial", "institutional", "social", "cultural"] },
                        justification: { type: "string", description: "Por que esta data é relevante para ESTA marca especificamente" },
                      },
                      required: ["name", "date_start", "recurrence", "relevance", "type", "justification"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["dates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_seasonal_dates" } },
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

    return new Response(JSON.stringify({ success: true, dates: parsed.dates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-seasonal-calendar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

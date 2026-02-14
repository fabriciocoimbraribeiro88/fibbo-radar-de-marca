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
    const { project_id, mode } = await req.json();
    if (!project_id) throw new Error("project_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brandContext = await buildFullBrandContext(project_id);

    if (!brandContext.trim()) {
      throw new Error("Nenhum contexto de marca encontrado. Preencha o briefing primeiro.");
    }

    const currentYear = new Date().getFullYear();

    // Full calendar mode — returns complete annual plan
    if (mode === "full_calendar") {
      return await handleFullCalendar(LOVABLE_API_KEY, brandContext, currentYear);
    }

    // Default: dates_only mode (existing behavior)
    return await handleDatesOnly(LOVABLE_API_KEY, brandContext, currentYear);
  } catch (e) {
    console.error("generate-seasonal-calendar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function handleFullCalendar(apiKey: string, brandContext: string, currentYear: number) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Você é um estrategista sênior de marketing que cria calendários anuais de planejamento estratégico.

IMPORTANTE: Leia ATENTAMENTE todo o contexto da marca — segmento, público-alvo, produtos, posicionamento, tom de voz, documentos e histórico de posts — antes de criar o calendário.

Para CADA um dos 12 meses, você deve definir:
1. **theme** — Tema criativo do mês (frase curta e impactante, ex: "Ano novo, obra nova!")
2. **focus** — Foco estratégico (descrição curta do que priorizar no mês)
3. **kv_planning** — Quando o KV deve ser planejado (ex: "novembro/${currentYear - 1}")
4. **kv_production** — Quando as peças devem ser produzidas (ex: "dezembro/${currentYear - 1}")
5. **notes** — Notas adicionais, ideias extras, lembretes
6. **dates** — Lista de datas relevantes com:
   - name: nome do evento/data
   - date: formato "dd/mm"
   - action_types: array com tipos de ação aplicáveis

Tipos de ação possíveis: "conteudo digital", "acao em loja", "PDV", "relacionamento", "endomarketing", "acao social", "evento", "guerrilha"

REGRAS:
- Crie um calendário para o ano ${currentYear}
- Cada mês DEVE ter pelo menos um tema e 2-5 datas relevantes
- As datas devem ser relevantes para o setor e público da marca
- Os temas devem ser criativos e alinhados ao posicionamento da marca
- O KV planning deve ser ~2 meses antes, e a produção ~1 mês antes
- Distribua os tipos de ação de forma variada ao longo do ano

Responda em português brasileiro.`,
        },
        {
          role: "user",
          content: `Crie o calendário anual estratégico completo para esta marca:\n\n${brandContext.slice(0, 40000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_annual_calendar",
            description: "Retorna o calendário anual estratégico completo com 12 meses",
            parameters: {
              type: "object",
              properties: {
                year: { type: "number", description: "Ano do calendário" },
                months: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      month: { type: "number", description: "Índice do mês (0=Janeiro, 11=Dezembro)" },
                      theme: { type: "string", description: "Tema criativo do mês" },
                      focus: { type: "string", description: "Foco estratégico do mês" },
                      kv_planning: { type: "string", description: "Quando planejar o KV" },
                      kv_production: { type: "string", description: "Quando produzir as peças" },
                      notes: { type: "string", description: "Notas e observações extras" },
                      dates: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            date: { type: "string", description: "Formato dd/mm" },
                            action_types: {
                              type: "array",
                              items: { type: "string", enum: ["conteudo digital", "acao em loja", "PDV", "relacionamento", "endomarketing", "acao social", "evento", "guerrilha"] },
                            },
                          },
                          required: ["name", "date", "action_types"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["month", "theme", "focus", "kv_planning", "kv_production", "notes", "dates"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["year", "months"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_annual_calendar" } },
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

  // Add UUIDs to dates
  const calendar = {
    year: parsed.year || currentYear,
    months: (parsed.months || []).map((m: any) => ({
      ...m,
      dates: (m.dates || []).map((d: any) => ({
        ...d,
        id: crypto.randomUUID(),
      })),
    })),
  };

  return new Response(JSON.stringify({ success: true, annual_calendar: calendar }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleDatesOnly(apiKey: string, brandContext: string, currentYear: number) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Você é um estrategista sênior de marketing de conteúdo especializado em calendário editorial.

IMPORTANTE: Leia ATENTAMENTE todo o contexto da marca — segmento, público-alvo, produtos, posicionamento, tom de voz, documentos e histórico de posts — antes de sugerir datas.

Você DEVE classificar cada data em uma dessas 6 categorias:

1. **tradicional** — Datas comemorativas amplamente conhecidas (Natal, Dia das Mães, Dia dos Pais, Ano Novo, etc.) MAS que façam sentido para o setor e público da marca. NÃO inclua datas tradicionais irrelevantes para o negócio.

2. **mercado** — Datas comerciais e marcos do mercado (Black Friday, Cyber Monday, Dia do Consumidor, início de planejamento anual, virada fiscal, etc.)

3. **setorial** — Datas específicas do setor/nicho da marca (Dia do Publicitário, Dia do E-commerce, Dia do Programador, Semana do Design, etc.). Devem ser datas REAIS e reconhecidas.

4. **eventos** — Eventos, conferências e feiras do setor (RD Summit, Web Summit, SXSW, NRF, E-commerce Brasil, etc.). Use datas aproximadas de ${currentYear}/${currentYear + 1}. Devem ser eventos REAIS.

5. **marca** — Marcos específicos da marca (aniversário da empresa, lançamentos de produto, datas que a marca já celebra). Baseie-se no contexto fornecido.

6. **ideias** — Datas INVENTADAS que façam sentido estratégico para a marca. Ex: "Semana do [tema relevante]", "Dia do [público-alvo]", marcos que a marca poderia criar. Estas são sugestões criativas, não datas existentes.

REGRAS:
- Sugira 25-40 datas distribuídas ao longo dos 12 meses
- NUNCA invente uma data e classifique como tradicional, mercado, setorial ou eventos — se for inventada, DEVE ser "ideias"
- Para cada data, explique POR QUE é relevante PARA ESTA MARCA especificamente
- Use datas de ${currentYear} e ${currentYear + 1}
- Distribua as datas equilibradamente entre os meses
- Inclua pelo menos 3-5 "ideias" criativas específicas para o negócio

Responda em português brasileiro.`,
        },
        {
          role: "user",
          content: `Analise TODO o contexto abaixo e sugira datas sazonais estratégicas para esta marca, classificadas nas 6 categorias:\n\n${brandContext.slice(0, 40000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_seasonal_dates",
            description: "Retorna datas sazonais classificadas em 6 categorias",
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
                      date_end: { type: "string", description: "Data fim YYYY-MM-DD (opcional)" },
                      recurrence: { type: "string", enum: ["annual", "one_time"] },
                      relevance: { type: "string", enum: ["high", "medium", "low"] },
                      type: { type: "string", enum: ["tradicional", "mercado", "setorial", "eventos", "marca", "ideias"], description: "Classificação da data" },
                      justification: { type: "string", description: "Por que esta data é relevante para ESTA marca" },
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
}

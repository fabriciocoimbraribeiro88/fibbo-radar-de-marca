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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all processed sources
    const { data: sources, error: srcErr } = await supabase
      .from("brand_context_sources")
      .select("source_type, content, extracted_text")
      .eq("project_id", project_id)
      .eq("status", "processed");

    if (srcErr) throw srcErr;

    // Fetch existing project data for additional context
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("brand_name, brand_description, target_audience, tone_of_voice, keywords, segment, instagram_handle, website_url")
      .eq("id", project_id)
      .single();

    if (projErr) throw projErr;

    // Build context from all sources
    const contextParts: string[] = [];

    if (project.brand_name) contextParts.push(`Nome da marca: ${project.brand_name}`);
    if (project.brand_description) contextParts.push(`Descrição: ${project.brand_description}`);
    if (project.segment) contextParts.push(`Segmento: ${project.segment}`);
    if (project.target_audience) contextParts.push(`Público-alvo: ${project.target_audience}`);
    if (project.tone_of_voice) contextParts.push(`Tom de voz: ${project.tone_of_voice}`);
    if (project.keywords?.length) contextParts.push(`Keywords: ${project.keywords.join(", ")}`);
    if (project.instagram_handle) contextParts.push(`Instagram: ${project.instagram_handle}`);
    if (project.website_url) contextParts.push(`Website: ${project.website_url}`);

    for (const src of (sources ?? [])) {
      if (src.extracted_text) {
        contextParts.push(`\n--- Fonte (${src.source_type}) ---\n${src.extracted_text}`);
      }
    }

    const fullContext = contextParts.join("\n");

    if (!fullContext.trim()) {
      return new Response(
        JSON.stringify({ error: "Nenhum conteúdo encontrado para processar. Adicione fontes de contexto primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um especialista em branding e comunicação. Analise todo o material fornecido sobre uma marca e preencha o formulário de contexto de marca completo. Seja específico, detalhado e use exemplos concretos. Responda sempre em português brasileiro.`;

    const userPrompt = `Com base no seguinte material sobre a marca, preencha o formulário de contexto de marca usando a função fornecida:\n\n${fullContext.slice(0, 30000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_brand_context",
              description: "Preenche o formulário completo de contexto de marca com 12 seções",
              parameters: {
                type: "object",
                properties: {
                  basic_info: {
                    type: "object",
                    properties: {
                      sector: { type: "string", description: "Setor de atuação" },
                      positioning: { type: "string", description: "Posicionamento da marca" },
                      purpose: { type: "string", description: "Propósito da marca" },
                    },
                    required: ["sector", "positioning", "purpose"],
                  },
                  tone_of_voice: {
                    type: "object",
                    properties: {
                      personality: { type: "string" },
                      communication_style: { type: "string" },
                      characteristics: {
                        type: "object",
                        properties: {
                          how_speaks: { type: "string" },
                          feeling: { type: "string" },
                          approach: { type: "string" },
                        },
                        required: ["how_speaks", "feeling", "approach"],
                      },
                    },
                    required: ["personality", "communication_style", "characteristics"],
                  },
                  word_universe: {
                    type: "object",
                    properties: {
                      technical: { type: "string" },
                      emotional: { type: "string" },
                      benefits: { type: "string" },
                      experience: { type: "string" },
                    },
                    required: ["technical", "emotional", "benefits", "experience"],
                  },
                  values_essence: {
                    type: "object",
                    properties: {
                      values: { type: "string" },
                      essence: { type: "string" },
                      mission: { type: "string" },
                      vision: { type: "string" },
                    },
                    required: ["values", "essence", "mission", "vision"],
                  },
                  target_audience: {
                    type: "object",
                    properties: {
                      demographics: { type: "string" },
                      psychographics: { type: "string" },
                      pain_points: { type: "string" },
                      language: { type: "string" },
                    },
                    required: ["demographics", "psychographics", "pain_points", "language"],
                  },
                  competitive_edge: {
                    type: "object",
                    properties: {
                      unique: { type: "string" },
                      advantages: { type: "string" },
                      value_proposition: { type: "string" },
                    },
                    required: ["unique", "advantages", "value_proposition"],
                  },
                  communication_guidelines: {
                    type: "object",
                    properties: {
                      always: { type: "string" },
                      never: { type: "string" },
                      avoid: { type: "string" },
                    },
                    required: ["always", "never", "avoid"],
                  },
                  specific_language: {
                    type: "object",
                    properties: {
                      jargon: { type: "string" },
                      expressions: { type: "string" },
                      forbidden_words: { type: "string" },
                      preferred_synonyms: { type: "string" },
                    },
                    required: ["jargon", "expressions", "forbidden_words", "preferred_synonyms"],
                  },
                  emotional_context: {
                    type: "object",
                    properties: {
                      desired_emotion: { type: "string" },
                      memory: { type: "string" },
                      connection: { type: "string" },
                    },
                    required: ["desired_emotion", "memory", "connection"],
                  },
                  references: {
                    type: "object",
                    properties: {
                      success_cases: { type: "string" },
                      positive_benchmarks: { type: "string" },
                      cases_to_avoid: { type: "string" },
                    },
                    required: ["success_cases", "positive_benchmarks", "cases_to_avoid"],
                  },
                  practical_application: {
                    type: "object",
                    properties: {
                      channels: { type: "string" },
                      channel_adaptations: { type: "string" },
                      seasonality: { type: "string" },
                    },
                    required: ["channels", "channel_adaptations", "seasonality"],
                  },
                  success_metrics: {
                    type: "object",
                    properties: {
                      effectiveness_metrics: { type: "string" },
                      expected_feedback: { type: "string" },
                    },
                    required: ["effectiveness_metrics", "expected_feedback"],
                  },
                },
                required: [
                  "basic_info", "tone_of_voice", "word_universe", "values_essence",
                  "target_audience", "competitive_edge", "communication_guidelines",
                  "specific_language", "emotional_context", "references",
                  "practical_application", "success_metrics",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_brand_context" } },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    let briefing: Record<string, unknown>;
    try {
      briefing = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Save to projects.briefing
    const { error: updateErr } = await supabase
      .from("projects")
      .update({ briefing })
      .eq("id", project_id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fill-brand-context error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

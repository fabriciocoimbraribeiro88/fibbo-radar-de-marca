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

    // Get all entities for this project
    const { data: projectEntities } = await supabase
      .from("project_entities")
      .select("entity_id, entity_role, monitored_entities(name, instagram_handle)")
      .eq("project_id", project_id);

    if (!projectEntities?.length) throw new Error("Nenhuma entidade encontrada no projeto.");

    // For each entity, get hashtags from recent posts
    const entityHashtags: Array<{ name: string; handle: string; role: string; hashtags: Record<string, number> }> = [];

    for (const pe of projectEntities) {
      const entity = (pe as any).monitored_entities;
      const { data: posts } = await supabase
        .from("instagram_posts")
        .select("hashtags")
        .eq("entity_id", pe.entity_id)
        .order("posted_at", { ascending: false })
        .limit(50);

      const freq: Record<string, number> = {};
      for (const post of posts ?? []) {
        for (const tag of post.hashtags ?? []) {
          const normalized = tag.startsWith("#") ? tag : `#${tag}`;
          freq[normalized] = (freq[normalized] ?? 0) + 1;
        }
      }

      entityHashtags.push({
        name: entity?.name ?? "Unknown",
        handle: entity?.instagram_handle ?? "",
        role: pe.entity_role,
        hashtags: freq,
      });
    }

    // Build prompt
    const parts: string[] = [];
    for (const e of entityHashtags) {
      const role = e.role === "brand" ? "MARCA" : "Concorrente";
      const top = Object.entries(e.hashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([tag, count]) => `${tag} (${count}x)`)
        .join(", ");
      parts.push(`${role} ${e.name} (@${e.handle}): ${top || "sem hashtags"}`);
    }

    const userPrompt = parts.join("\n\n") +
      "\n\nIdentifique:\n1. Hashtags proprietárias (só a marca usa)\n2. Hashtags de comunidade (usadas por todos no nicho)\n3. Hashtags de alcance que a marca deveria usar\n4. Hashtags que a marca deve evitar";

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
            content: "Você é especialista em estratégia de hashtags para Instagram. Analise as hashtags usadas pela marca e seus concorrentes e sugira uma estratégia organizada em 4 categorias. Cada hashtag deve começar com #. Responda em português brasileiro.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_hashtag_strategy",
              description: "Retorna estratégia de hashtags em 4 categorias",
              parameters: {
                type: "object",
                properties: {
                  proprietary: {
                    type: "array", items: { type: "string" },
                    description: "Hashtags proprietárias da marca",
                  },
                  community: {
                    type: "array", items: { type: "string" },
                    description: "Hashtags de comunidade do nicho",
                  },
                  reach: {
                    type: "array", items: { type: "string" },
                    description: "Hashtags para alcance/descoberta",
                  },
                  forbidden: {
                    type: "array", items: { type: "string" },
                    description: "Hashtags a evitar",
                  },
                },
                required: ["proprietary", "community", "reach", "forbidden"],
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
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
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

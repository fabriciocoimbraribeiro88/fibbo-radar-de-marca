import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 50;

const SYSTEM_PROMPT = `Você é um analista de sentimento de marca especializado em Instagram.
Analise cada comentário e classifique com:
- sentiment: "positive", "neutral" ou "negative"
- sentiment_category: uma categoria curta em português (ex: "elogio", "dúvida", "reclamação", "spam", "pedido", "sugestão", "humor", "engajamento", "crítica", "suporte")

Critérios:
- POSITIVO: elogios, emojis positivos (❤️🔥👏), expressões de admiração, agradecimento, interesse genuíno
- NEUTRO: perguntas simples, marcações de amigos, emojis neutros, respostas genéricas, spam comercial
- NEGATIVO: reclamações, críticas, insatisfação, cobranças, decepção, problemas com produto/serviço

Retorne APENAS o JSON no formato tool_call sem texto adicional.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_id } = await req.json();

    if (!entity_id) {
      return new Response(
        JSON.stringify({ error: "entity_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all posts for this entity
    const { data: postIds } = await supabase
      .from("instagram_posts")
      .select("id")
      .eq("entity_id", entity_id);

    if (!postIds || postIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, analyzed: 0, message: "No posts found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pIds = postIds.map((p: any) => p.id);

    // Get unanalyzed comments for these posts
    // Paginate to get all
    let allComments: any[] = [];
    const PAGE = 1000;
    let offset = 0;

    while (true) {
      const { data: comments, error } = await supabase
        .from("instagram_comments")
        .select("id, text, username")
        .in("post_id", pIds)
        .is("sentiment", null)
        .not("text", "is", null)
        .range(offset, offset + PAGE - 1);

      if (error) throw new Error(error.message);
      if (!comments || comments.length === 0) break;
      allComments = allComments.concat(comments);
      if (comments.length < PAGE) break;
      offset += PAGE;
    }

    if (allComments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, analyzed: 0, message: "All comments already analyzed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing ${allComments.length} comments for entity ${entity_id}`);

    let totalAnalyzed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < allComments.length; i += BATCH_SIZE) {
      const batch = allComments.slice(i, i + BATCH_SIZE);
      
      const commentsForPrompt = batch.map((c: any, idx: number) => 
        `${idx + 1}. [@${c.username || "anon"}]: "${(c.text || "").substring(0, 300)}"`
      ).join("\n");

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Analise estes ${batch.length} comentários:\n\n${commentsForPrompt}` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "classify_comments",
                  description: "Classifica sentimento de cada comentário",
                  parameters: {
                    type: "object",
                    properties: {
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            index: { type: "number", description: "1-based index" },
                            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                            sentiment_category: { type: "string" },
                          },
                          required: ["index", "sentiment", "sentiment_category"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["results"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "classify_comments" } },
          }),
        });

        if (!aiResponse.ok) {
          const statusCode = aiResponse.status;
          const errText = await aiResponse.text();
          if (statusCode === 429) {
            errors.push(`Rate limited at batch ${Math.floor(i / BATCH_SIZE) + 1}. Stopping.`);
            break;
          }
          if (statusCode === 402) {
            errors.push(`Payment required. Please add credits.`);
            break;
          }
          errors.push(`AI error (${statusCode}): ${errText.substring(0, 200)}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          errors.push(`No tool_call in batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          continue;
        }

        const parsed = JSON.parse(toolCall.function.arguments);
        const results = parsed.results;

        if (!Array.isArray(results)) {
          errors.push(`Invalid results in batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          continue;
        }

        // Update each comment
        for (const r of results) {
          const comment = batch[r.index - 1];
          if (!comment) continue;

          const { error: updateErr } = await supabase
            .from("instagram_comments")
            .update({
              sentiment: r.sentiment,
              sentiment_category: r.sentiment_category,
            })
            .eq("id", comment.id);

          if (updateErr) {
            errors.push(`Update ${comment.id}: ${updateErr.message}`);
          } else {
            totalAnalyzed++;
          }
        }
      } catch (batchErr) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchErr.message}`);
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < allComments.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Analyzed ${totalAnalyzed}/${allComments.length} comments`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        analyzed: totalAnalyzed,
        total: allComments.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("analyze-sentiment error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { planning_item_id, project_id, variant } = await req.json();
    if (!planning_item_id || !project_id) {
      return new Response(JSON.stringify({ error: "planning_item_id and project_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch planning item
    const { data: item, error: itemErr } = await supabase
      .from("planning_items")
      .select("title, description, copy_text, visual_brief, format, channel, theme, metadata")
      .eq("id", planning_item_id)
      .single();
    if (itemErr || !item) throw new Error("Planning item not found");

    // Fetch project for logo and brand info
    const { data: project } = await supabase
      .from("projects")
      .select("logo_url, brand_name, brand_description, segment, tone_of_voice")
      .eq("id", project_id)
      .single();

    // Fetch brand references for visual context
    const { data: refs } = await supabase
      .from("brand_references")
      .select("title, description, type, image_url, why_it_worked")
      .eq("project_id", project_id)
      .limit(5);

    const refsContext = (refs ?? [])
      .map((r) => `- ${r.title}: ${r.description ?? ""} ${r.why_it_worked ?? ""}`)
      .join("\n");

    const variantLabel = variant === "b" ? "Opção B (ângulo alternativo, composição diferente)" : "Opção A (conceito principal)";

    const prompt = `Crie uma imagem para um post de redes sociais com as seguintes especificações:

MARCA: ${project?.brand_name ?? "N/A"}
SEGMENTO: ${project?.segment ?? "N/A"}
TOM DE VOZ: ${project?.tone_of_voice ?? "N/A"}
DESCRIÇÃO DA MARCA: ${project?.brand_description ?? "N/A"}

TÍTULO DO POST: ${item.title}
DESCRIÇÃO: ${item.description ?? ""}
COPY/TEXTO: ${item.copy_text ?? ""}
BRIEFING VISUAL: ${item.visual_brief ?? ""}
FORMATO: ${item.format ?? "feed quadrado"}
CANAL: ${item.channel ?? "instagram"}
TEMA: ${item.theme ?? ""}

${refsContext ? `REFERÊNCIAS DA MARCA (usar como inspiração de estilo):\n${refsContext}` : ""}

${project?.logo_url ? `A logo da marca deve ser incorporada sutilmente na composição.` : ""}

VARIANTE: ${variantLabel}

Gere uma imagem profissional, moderna e visualmente impactante para este post. A imagem deve ser adequada para ${item.format ?? "feed"} do ${item.channel ?? "Instagram"}. Use cores, tipografia e composição que reflitam a identidade da marca. Ultra high resolution.`;

    // Build messages - include logo as image if available
    const messages: any[] = [];
    const userContent: any[] = [{ type: "text", text: prompt }];

    if (project?.logo_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: project.logo_url },
      });
    }

    messages.push({ role: "user", content: userContent });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error("No image generated by AI");
    }

    // Upload to storage
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const fileName = `${project_id}/creatives/${planning_item_id}_${variant}_${Date.now()}.png`;

    // Use service role for storage upload
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: uploadErr } = await serviceClient.storage
      .from("brand-documents")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (uploadErr) throw new Error(`Upload error: ${uploadErr.message}`);

    // Create a signed URL valid for 30 days
    const { data: signedData, error: signedErr } = await serviceClient.storage
      .from("brand-documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days
    if (signedErr) throw new Error(`Signed URL error: ${signedErr.message}`);
    const publicUrl = signedData.signedUrl;

    return new Response(JSON.stringify({ url: publicUrl, variant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Map a planning item format to a reference format filter */
function getFormatFilter(format: string): string[] {
  const f = format.toLowerCase();
  if (f.includes("stories") || f.includes("story")) return ["stories", "story"];
  if (f.includes("reel")) return ["reel", "reels"];
  if (f.includes("carrossel") || f.includes("carousel")) return ["carrossel", "carousel", "feed", "estático"];
  return ["feed", "estático", "static", "quadrado"];
}

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

    const { planning_item_id, project_id, variant, slide_index, total_slides } = await req.json();
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

    // Fetch brand references filtered by format
    const formatLower = (item.format ?? "").toLowerCase();
    const formatFilters = getFormatFilter(formatLower);

    let refsQuery = supabase
      .from("brand_references")
      .select("title, description, type, image_url, why_it_worked, format")
      .eq("project_id", project_id)
      .limit(10);

    const { data: allRefs } = await refsQuery;

    // Filter refs that match the format
    const matchingRefs = (allRefs ?? []).filter((r) => {
      if (!r.format) return false;
      const rf = r.format.toLowerCase();
      return formatFilters.some((f) => rf.includes(f));
    });

    // Fallback to unfiltered if no matching refs
    const refs = matchingRefs.length > 0 ? matchingRefs.slice(0, 5) : (allRefs ?? []).slice(0, 3);

    const refsContext = refs
      .map((r) => `- [${r.format ?? "geral"}] ${r.title}: ${r.description ?? ""} ${r.why_it_worked ?? ""}`)
      .join("\n");

    // Determine if this is a carousel slide
    const isCarousel = formatLower.includes("carrossel") || formatLower.includes("carousel");
    const currentSlide = slide_index ?? 0;
    const slides = total_slides ?? 1;

    let slideContext = "";
    if (isCarousel && slides > 1) {
      slideContext = `\nESTE É O SLIDE ${currentSlide + 1} DE ${slides} de um carrossel.`;
      if (currentSlide === 0) {
        slideContext += " Este é o slide de CAPA - deve ser impactante e chamar atenção para o swipe.";
      } else if (currentSlide === slides - 1) {
        slideContext += " Este é o ÚLTIMO slide - deve ter um CTA claro ou conclusão.";
      } else {
        slideContext += ` Este é um slide de CONTEÚDO - deve desenvolver o tema de forma progressiva.`;
      }
    }

    const variantLabel = variant === "b" ? "Opção B (ângulo alternativo, composição diferente)" : "Opção A (conceito principal)";

    // Map format to aspect ratio and dimensions
    let aspectInfo = "Formato quadrado 1:1 (1080x1080px) para feed do Instagram";
    if (formatLower.includes("stories") || formatLower.includes("story")) {
      aspectInfo = "Formato vertical 9:16 (1080x1920px) para Stories do Instagram. A imagem DEVE ser vertical/retrato";
    } else if (formatLower.includes("reel") || formatLower.includes("reels")) {
      aspectInfo = "Formato vertical 9:16 (1080x1920px) para Reels do Instagram. A imagem DEVE ser vertical/retrato";
    } else if (isCarousel) {
      aspectInfo = "Formato quadrado 1:1 (1080x1080px) para carrossel do Instagram";
    } else if (formatLower.includes("estático") || formatLower.includes("static") || formatLower.includes("feed")) {
      aspectInfo = "Formato quadrado 1:1 (1080x1080px) para feed do Instagram";
    } else if (formatLower.includes("landscape") || formatLower.includes("horizontal")) {
      aspectInfo = "Formato horizontal 16:9 (1920x1080px)";
    }

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
DIMENSÕES: ${aspectInfo}
CANAL: ${item.channel ?? "instagram"}
TEMA: ${item.theme ?? ""}
${slideContext}

${refsContext ? `REFERÊNCIAS DA MARCA (filtradas para o formato ${item.format ?? "feed"}):\n${refsContext}` : ""}

${project?.logo_url ? `A logo da marca deve ser incorporada sutilmente na composição.` : ""}

VARIANTE: ${variantLabel}

IMPORTANTE: A imagem DEVE respeitar as dimensões especificadas (${aspectInfo}). Gere uma imagem profissional, moderna e visualmente impactante. Use cores, tipografia e composição que reflitam a identidade da marca. Ultra high resolution.`;

    // Build messages - include logo as image if available
    const messages: any[] = [];
    const userContent: any[] = [{ type: "text", text: prompt }];

    if (project?.logo_url) {
      userContent.push({
        type: "image_url",
        image_url: { url: project.logo_url },
      });
    }

    // Include matching reference images for visual style
    for (const ref of refs.slice(0, 2)) {
      if (ref.image_url) {
        userContent.push({
          type: "image_url",
          image_url: { url: ref.image_url },
        });
      }
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
    console.log("AI response keys:", JSON.stringify(Object.keys(aiData)));
    console.log("First choice keys:", JSON.stringify(aiData.choices?.[0]?.message ? Object.keys(aiData.choices[0].message) : "no message"));
    
    // Try multiple possible response structures
    let imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Fallback: check if image is inline in content
    if (!imageData) {
      const content = aiData.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.startsWith("data:image")) {
        imageData = content;
      } else if (Array.isArray(content)) {
        const imgPart = content.find((p: any) => p.type === "image_url" || p.type === "image");
        if (imgPart) {
          imageData = imgPart.image_url?.url ?? imgPart.url;
        }
      }
    }

    if (!imageData) {
      console.error("Full AI response (truncated):", JSON.stringify(aiData).slice(0, 2000));
      throw new Error("No image generated by AI");
    }

    // Upload to storage
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const slideSuffix = isCarousel ? `_slide${currentSlide}` : "";
    const fileName = `${project_id}/creatives/${planning_item_id}_${variant}${slideSuffix}_${Date.now()}.png`;

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: uploadErr } = await serviceClient.storage
      .from("brand-documents")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (uploadErr) throw new Error(`Upload error: ${uploadErr.message}`);

    const { data: signedData, error: signedErr } = await serviceClient.storage
      .from("brand-documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 30);
    if (signedErr) throw new Error(`Signed URL error: ${signedErr.message}`);
    const publicUrl = signedData.signedUrl;

    return new Response(JSON.stringify({ url: publicUrl, variant, slide_index: currentSlide }), {
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

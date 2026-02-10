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
    const { source_id, source_type, content } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let extractedText = "";

    if (source_type === "url") {
      // Basic scraping: fetch HTML and extract text
      try {
        const resp = await fetch(content, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FibboBot/1.0)" },
        });
        const html = await resp.text();
        // Strip HTML tags, scripts, styles
        extractedText = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 50000); // Limit to 50k chars
      } catch (e) {
        console.error("Scraping error:", e);
        await supabase
          .from("brand_context_sources")
          .update({ status: "error" })
          .eq("id", source_id);
        return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (source_type === "text") {
      extractedText = content?.slice(0, 50000) ?? "";
    } else if (source_type === "document") {
      // For documents, the text would be extracted client-side or via a parsing service
      // For now, store what we have
      extractedText = content?.slice(0, 50000) ?? "";
    }

    const { error } = await supabase
      .from("brand_context_sources")
      .update({
        extracted_text: extractedText,
        status: extractedText ? "processed" : "error",
      })
      .eq("id", source_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, chars: extractedText.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-brand-source error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

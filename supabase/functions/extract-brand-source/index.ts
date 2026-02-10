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
    const { source_id, source_type, content, file_path } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let extractedText = "";

    if (source_type === "url") {
      try {
        const resp = await fetch(content, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FibboBot/1.0)" },
        });
        const html = await resp.text();
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
          .slice(0, 50000);
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
    } else if (source_type === "document" && file_path) {
      // Download file from storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("brand-documents")
        .download(file_path);

      if (dlErr || !fileData) {
        console.error("Download error:", dlErr);
        await supabase
          .from("brand_context_sources")
          .update({ status: "error" })
          .eq("id", source_id);
        return new Response(JSON.stringify({ error: "Failed to download file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fileName = (file_path as string).toLowerCase();

      if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
        // Plain text files — read directly
        extractedText = await fileData.text();
      } else if (fileName.endsWith(".pdf")) {
        // PDF — use pdfjs-serverless to extract text
        try {
          const { getDocument } = await import("https://esm.sh/pdfjs-serverless@0.6.0");
          const arrayBuffer = await fileData.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          const doc = await getDocument(data).promise;

          let text = "";
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const pageContent = await page.getTextContent();
            text += pageContent.items.map((item: any) => item.str).join(" ") + "\n";
          }
          extractedText = text;
        } catch (pdfErr) {
          console.error("PDF extraction error:", pdfErr);
          // Fallback: store raw text attempt
          extractedText = await fileData.text();
        }
      } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        // DOCX — extract text from the XML inside the zip
        try {
          const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
          const arrayBuffer = await fileData.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const docXml = await zip.file("word/document.xml")?.async("text");

          if (docXml) {
            // Strip XML tags to get plain text
            extractedText = docXml
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          } else {
            extractedText = "Não foi possível extrair texto do documento.";
          }
        } catch (docErr) {
          console.error("DOCX extraction error:", docErr);
          extractedText = await fileData.text();
        }
      } else {
        // Unknown format — try reading as text
        extractedText = await fileData.text();
      }

      extractedText = extractedText.slice(0, 50000);
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

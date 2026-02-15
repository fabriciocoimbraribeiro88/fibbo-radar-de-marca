import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: conn } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("project_id", project_id)
      .eq("platform", "google_ads")
      .single();

    if (!conn || conn.status !== "connected") {
      return new Response(JSON.stringify({ success: false, error: "Google Ads não está conectado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Implement Google Ads API calls
    // 1. Use OAuth credentials from conn.credentials_ref
    // 2. Fetch campaigns via Google Ads API
    // 3. Fetch keywords and metrics
    // 4. Upsert into ads_campaigns and ads_adsets

    await supabase
      .from("platform_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", conn.id);

    return new Response(JSON.stringify({ success: true, message: "Google Ads sync placeholder — credenciais necessárias." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

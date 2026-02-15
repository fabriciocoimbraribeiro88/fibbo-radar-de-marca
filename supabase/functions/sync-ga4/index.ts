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
      .eq("platform", "ga4")
      .single();

    if (!conn || conn.status !== "connected") {
      return new Response(JSON.stringify({ success: false, error: "Google Analytics não está conectado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Implement GA4 Data API calls
    // 1. Use OAuth credentials from conn.credentials_ref
    // 2. Fetch traffic data (sessions, users, bounce rate)
    // 3. Fetch page performance data
    // 4. Upsert into ga4_traffic and ga4_pages

    await supabase
      .from("platform_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", conn.id);

    return new Response(JSON.stringify({ success: true, message: "GA4 sync placeholder — credenciais necessárias." }), {
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

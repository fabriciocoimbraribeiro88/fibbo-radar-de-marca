import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildFullBrandContext } from "../_shared/brand-context-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function calculatePeriod(type: string, customStart?: string, customEnd?: string) {
  const end = customEnd ? new Date(customEnd) : new Date();
  let start: Date;
  switch (type) {
    case "weekly_checkin":
    case "weekly_report":
      start = new Date(end);
      start.setDate(end.getDate() - 7);
      break;
    case "monthly_report":
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      break;
    case "quarterly_report":
      start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
      break;
    case "annual_report":
      start = new Date(end.getFullYear() - 1, end.getMonth(), 1);
      break;
    default:
      start = new Date(end);
      start.setDate(end.getDate() - 7);
  }
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

function generateTitle(type: string, start: string, end: string) {
  const labels: Record<string, string> = {
    weekly_checkin: "Check-in Semanal",
    weekly_report: "Report Semanal",
    monthly_report: "Relatório Mensal",
    quarterly_report: "Relatório Trimestral",
    annual_report: "Relatório Anual",
  };
  const endDate = new Date(end);
  const month = endDate.toLocaleString("pt-BR", { month: "long" });
  return `${labels[type] ?? "Relatório"} — ${month} ${endDate.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, report_type, period_start, period_end, include_ai = true } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { start, end } = calculatePeriod(report_type, period_start, period_end);

    // Fetch project + brand entity
    const { data: project } = await supabase.from("projects").select("*, contracted_services").eq("id", project_id).single();
    const contractedChannels: string[] = (project?.contracted_services as any)?.channels ?? ["social"];

    const { data: entities } = await supabase
      .from("project_entities")
      .select("entity_id, entity_role")
      .eq("project_id", project_id)
      .eq("entity_role", "brand");
    const brandEntityId = entities?.[0]?.entity_id;

    // Fetch posts in period
    let posts: any[] = [];
    let profiles: any[] = [];
    if (brandEntityId && contractedChannels.includes("social")) {
      const { data: p } = await supabase
        .from("instagram_posts")
        .select("*")
        .eq("entity_id", brandEntityId)
        .gte("posted_at", start)
        .lte("posted_at", end)
        .order("posted_at", { ascending: false });
      posts = p ?? [];

      const { data: pr } = await supabase
        .from("instagram_profiles")
        .select("*")
        .eq("entity_id", brandEntityId)
        .gte("snapshot_date", start)
        .lte("snapshot_date", end)
        .order("snapshot_date", { ascending: true });
      profiles = pr ?? [];
    }

    // Fetch OKRs
    const { data: okrs } = await supabase
      .from("okr_objectives")
      .select("*, okr_key_results(*)")
      .eq("project_id", project_id);

    // Compute metrics
    const totalLikes = posts.reduce((s, p) => s + (p.likes_count ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0);
    const totalViews = posts.reduce((s, p) => s + (p.views_count ?? 0), 0);
    const avgEngagement = posts.length ? posts.reduce((s, p) => s + (p.engagement_total ?? 0), 0) / posts.length : 0;
    const followers = profiles.length ? profiles[profiles.length - 1]?.followers_count ?? 0 : 0;
    const engagementRate = followers > 0 ? (avgEngagement / followers) * 100 : 0;

    const big_numbers: Record<string, any> = {};
    if (contractedChannels.includes("social")) {
      big_numbers.followers = followers;
      big_numbers.total_posts = posts.length;
      big_numbers.total_likes = totalLikes;
      big_numbers.avg_engagement = Math.round(avgEngagement);
      big_numbers.engagement_rate = Number(engagementRate.toFixed(2));
    }
    big_numbers.okrs_total = okrs?.length ?? 0;
    big_numbers.okrs_on_track = okrs?.filter(o => o.status === "on_track" || o.status === "achieved").length ?? 0;

    // Build sections
    const sections: Record<string, any> = {
      highlights: [],
      next_period: [],
    };

    if (contractedChannels.includes("social") && posts.length > 0) {
      const topPosts = [...posts].sort((a, b) => (b.engagement_total ?? 0) - (a.engagement_total ?? 0)).slice(0, 5);
      sections.social_performance = {
        total_posts: posts.length,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_views: totalViews,
        avg_engagement: Math.round(avgEngagement),
        engagement_rate: Number(engagementRate.toFixed(2)),
        top_posts: topPosts.map(p => ({
          caption: (p.caption ?? "").slice(0, 100),
          likes: p.likes_count,
          comments: p.comments_count,
          type: p.post_type,
        })),
      };
    }

    // AI analysis
    let ai_analysis = null;
    let ai_recommendations = null;
    let model_used = "none";

    if (include_ai) {
      try {
        const brandContext = await buildFullBrandContext(project_id);
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableApiKey) {
          const prompt = `Você é um analista de marketing digital da Fibbo. Gere uma análise para o relatório ${report_type} do período ${start} a ${end}.

CONTEXTO DA MARCA:
${brandContext.slice(0, 3000)}

MÉTRICAS DO PERÍODO:
${JSON.stringify(big_numbers, null, 2)}

${sections.social_performance ? `PERFORMANCE SOCIAL:\n${JSON.stringify(sections.social_performance, null, 2)}` : ""}

Gere:
1. Um resumo executivo de 3-4 linhas
2. 3-5 destaques do período
3. 3-5 recomendações para o próximo período

Formato: texto corrido, direto, sem jargões. Tom: intelectual acessível.`;

          const aiResp = await fetch("https://api.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}` },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 2000,
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const fullText = aiData.choices?.[0]?.message?.content ?? "";
            ai_analysis = fullText;
            model_used = "google/gemini-2.5-flash";
          }
        }
      } catch (e) {
        console.error("AI analysis failed:", e);
      }
    }

    const summary = ai_analysis?.slice(0, 200) ?? `Relatório gerado com ${posts.length} posts analisados.`;
    const status_color = engagementRate > 2 ? "green" : engagementRate > 1 ? "yellow" : "red";

    const { data: report, error } = await supabase
      .from("automated_reports")
      .insert({
        project_id,
        report_type,
        period_start: start,
        period_end: end,
        year: new Date(start).getFullYear(),
        title: generateTitle(report_type, start, end),
        summary,
        status_color,
        sections,
        big_numbers,
        raw_data_snapshot: { postsCount: posts.length, profilesCount: profiles.length },
        ai_analysis,
        ai_recommendations,
        model_used,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ report_id: report.id, big_numbers, status_color }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

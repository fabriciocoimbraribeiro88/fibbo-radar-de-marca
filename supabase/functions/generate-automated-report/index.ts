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

function generateTitle(type: string, start: string, end: string, brandName: string) {
  const labels: Record<string, string> = {
    weekly_checkin: "Check-in Semanal",
    weekly_report: "Report Semanal",
    monthly_report: "Relatório Mensal",
    quarterly_report: "Relatório Trimestral",
    annual_report: "Relatório Anual",
  };
  const endDate = new Date(end);
  const month = endDate.toLocaleString("pt-BR", { month: "long" });
  return `${labels[type] ?? "Relatório"} — ${brandName} — ${month} ${endDate.getFullYear()}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(2)}`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString("pt-BR");
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "R$0,00";
  return `R$${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPercent(n: number | null | undefined): string {
  if (n == null) return "0%";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

// Build WhatsApp-formatted weekly check-in text
function buildWeeklyCheckinText(
  brandName: string,
  instagramHandle: string | null,
  start: string,
  end: string,
  socialMetrics: any,
  adsMetrics: any,
  contractedChannels: string[],
) {
  let text = `👋 Olá! Bom dia!\n\n📊 Check-in Semanal – ${brandName}\n\nPeríodo de análise: ${fmtDate(start)} a ${fmtDate(end)}\n`;

  if (contractedChannels.includes("social") && socialMetrics) {
    text += `\n🔹 Instagram Business - ${instagramHandle ?? brandName}\n`;
    text += `Alcance total: ${fmtNum(socialMetrics.total_views)}\n`;
    text += `Aumento de Seguidores: ${fmtNum(socialMetrics.followers_growth)}\n`;
    text += `Engajamento:\n`;
    text += `    Likes: ${fmtNum(socialMetrics.total_likes)}\n`;
    text += `    Comentários: ${fmtNum(socialMetrics.total_comments)}\n`;
    text += `    Compartilhamentos: ${fmtNum(socialMetrics.total_shares)}\n`;
  }

  if (contractedChannels.includes("ads") && adsMetrics) {
    // Meta Ads
    if (adsMetrics.meta) {
      text += `\n🔹 Meta Ads - ${brandName}\n`;
      text += `Alcance total: ${fmtNum(adsMetrics.meta.reach)}\n`;
      text += `Total de cliques no link: ${fmtNum(adsMetrics.meta.clicks)}\n`;
      text += `Custo por clique no link: ${fmtCurrency(adsMetrics.meta.cpc)}\n`;
      text += `Valor investido: ${fmtCurrency(adsMetrics.meta.investment)}\n`;
    }

    // Google Ads
    if (adsMetrics.google) {
      text += `\n🔹 Google Ads - ${brandName}\n`;
      text += `CTR: ${fmtPercent(adsMetrics.google.ctr)}\n`;
      text += `CPC médio: ${fmtCurrency(adsMetrics.google.cpc)}\n`;
      text += `CPA médio: ${fmtCurrency(adsMetrics.google.cpa)}\n`;
      text += `Valor investido: ${fmtCurrency(adsMetrics.google.investment)}\n`;
    }
  }

  return text;
}

// Build structured monthly report sections
function buildMonthlyReportSections(
  socialMetrics: any,
  adsMetrics: any,
  seoMetrics: any,
  posts: any[],
  profiles: any[],
  adsData: any[],
  contractedChannels: string[],
  previousBigNumbers: any,
) {
  const sections: Record<string, any> = {};

  // Social section
  if (contractedChannels.includes("social") && socialMetrics) {
    const topPosts = [...posts]
      .sort((a, b) => (b.engagement_total ?? 0) - (a.engagement_total ?? 0))
      .slice(0, 10);

    // Performance by type
    const typeGroups: Record<string, any[]> = {};
    posts.forEach(p => {
      const t = p.post_type ?? "unknown";
      if (!typeGroups[t]) typeGroups[t] = [];
      typeGroups[t].push(p);
    });

    const performanceByType = Object.entries(typeGroups).map(([type, typePosts]) => ({
      type,
      count: typePosts.length,
      avg_likes: Math.round(typePosts.reduce((s, p) => s + (p.likes_count ?? 0), 0) / typePosts.length),
      avg_comments: Math.round(typePosts.reduce((s, p) => s + (p.comments_count ?? 0), 0) / typePosts.length),
      avg_saves: Math.round(typePosts.reduce((s, p) => s + (p.saves_count ?? 0), 0) / typePosts.length),
      avg_shares: Math.round(typePosts.reduce((s, p) => s + (p.shares_count ?? 0), 0) / typePosts.length),
      avg_engagement: Math.round(typePosts.reduce((s, p) => s + (p.engagement_total ?? 0), 0) / typePosts.length),
    }));

    sections.instagram = {
      followers: socialMetrics.followers,
      followers_growth: socialMetrics.followers_growth,
      total_reach: socialMetrics.total_views,
      organic_reach: socialMetrics.organic_reach,
      paid_reach: socialMetrics.paid_reach,
      total_interactions: socialMetrics.total_likes + socialMetrics.total_comments + socialMetrics.total_saves + socialMetrics.total_shares,
      total_likes: socialMetrics.total_likes,
      total_comments: socialMetrics.total_comments,
      total_saves: socialMetrics.total_saves,
      total_shares: socialMetrics.total_shares,
      total_posts: posts.length,
      engagement_rate: socialMetrics.engagement_rate,
      avg_engagement: socialMetrics.avg_engagement,
      top_posts: topPosts.map(p => ({
        caption: (p.caption ?? "").slice(0, 120),
        type: p.post_type,
        likes: p.likes_count,
        comments: p.comments_count,
        saves: p.saves_count,
        shares: p.shares_count,
        views: p.views_count,
        engagement: p.engagement_total,
        engagement_rate: socialMetrics.followers > 0
          ? Number(((p.engagement_total ?? 0) / socialMetrics.followers * 100).toFixed(2))
          : 0,
      })),
      performance_by_type: performanceByType,
      // Comparison with previous
      previous: previousBigNumbers ? {
        followers: previousBigNumbers.followers,
        total_likes: previousBigNumbers.total_likes,
        engagement_rate: previousBigNumbers.engagement_rate,
      } : null,
    };
  }

  // Ads section (from ads_library + manual data)
  if (contractedChannels.includes("ads")) {
    const metaAds = adsData.filter(a => a.platform === "meta");
    const googleAds = adsData.filter(a => a.platform === "google");

    sections.meta_ads = {
      total_ads: metaAds.length,
      active_ads: metaAds.filter(a => a.is_active).length,
      total_investment: metaAds.reduce((s, a) => s + (a.estimated_spend_max ?? 0), 0),
      top_ads: metaAds
        .sort((a, b) => (b.estimated_spend_max ?? 0) - (a.estimated_spend_max ?? 0))
        .slice(0, 5)
        .map(a => ({
          title: a.ad_title ?? a.ad_body?.slice(0, 80) ?? "Sem título",
          type: a.ad_type,
          spend: a.estimated_spend_max,
          cta: a.cta_text,
          is_active: a.is_active,
          started_at: a.started_at,
        })),
    };

    if (googleAds.length > 0) {
      sections.google_ads = {
        total_ads: googleAds.length,
        total_investment: googleAds.reduce((s, a) => s + (a.estimated_spend_max ?? 0), 0),
      };
    }
  }

  // SEO section
  if (contractedChannels.includes("seo") && seoMetrics) {
    sections.seo = seoMetrics;
  }

  return sections;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, report_type, period_start, period_end, include_ai = true, manual_data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { start, end } = calculatePeriod(report_type, period_start, period_end);

    // Fetch project
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).single();
    const contractedChannels: string[] = (project?.contracted_services as any)?.channels ?? ["social"];
    const brandName = project?.brand_name ?? project?.name ?? "Marca";
    const instagramHandle = project?.instagram_handle ?? null;

    // Fetch brand entity
    const { data: entities } = await supabase
      .from("project_entities")
      .select("entity_id, entity_role, monitored_entities!inner(instagram_handle)")
      .eq("project_id", project_id)
      .eq("entity_role", "brand");
    const brandEntityId = entities?.[0]?.entity_id;
    const entityHandle = (entities?.[0] as any)?.monitored_entities?.instagram_handle ?? instagramHandle;

    // Fetch previous report for comparison
    const { data: prevReports } = await supabase
      .from("automated_reports")
      .select("big_numbers")
      .eq("project_id", project_id)
      .eq("report_type", report_type)
      .order("period_end", { ascending: false })
      .limit(1);
    const previousBigNumbers = prevReports?.[0]?.big_numbers ?? null;

    // Fetch social data
    let posts: any[] = [];
    let profiles: any[] = [];
    let socialMetrics: any = null;

    if (brandEntityId && contractedChannels.includes("social")) {
      const [postsRes, profilesRes] = await Promise.all([
        supabase
          .from("instagram_posts")
          .select("*")
          .eq("entity_id", brandEntityId)
          .gte("posted_at", start)
          .lte("posted_at", end)
          .order("posted_at", { ascending: false }),
        supabase
          .from("instagram_profiles")
          .select("*")
          .eq("entity_id", brandEntityId)
          .order("snapshot_date", { ascending: false })
          .limit(2),
      ]);
      posts = postsRes.data ?? [];
      profiles = profilesRes.data ?? [];

      const currentFollowers = profiles[0]?.followers_count ?? 0;
      const prevFollowers = profiles[1]?.followers_count ?? currentFollowers;

      socialMetrics = {
        followers: currentFollowers,
        followers_growth: currentFollowers - prevFollowers,
        total_views: posts.reduce((s, p) => s + (p.views_count ?? 0), 0),
        organic_reach: posts.reduce((s, p) => s + (p.views_count ?? 0), 0), // approximation
        paid_reach: 0,
        total_likes: posts.reduce((s, p) => s + (p.likes_count ?? 0), 0),
        total_comments: posts.reduce((s, p) => s + (p.comments_count ?? 0), 0),
        total_saves: posts.reduce((s, p) => s + (p.saves_count ?? 0), 0),
        total_shares: posts.reduce((s, p) => s + (p.shares_count ?? 0), 0),
        avg_engagement: posts.length
          ? Math.round(posts.reduce((s, p) => s + (p.engagement_total ?? 0), 0) / posts.length)
          : 0,
        engagement_rate: currentFollowers > 0 && posts.length > 0
          ? Number(((posts.reduce((s, p) => s + (p.engagement_total ?? 0), 0) / posts.length) / currentFollowers * 100).toFixed(2))
          : 0,
      };
    }

    // Fetch ads data
    let adsData: any[] = [];
    let adsMetrics: any = null;

    if (contractedChannels.includes("ads") && brandEntityId) {
      const { data: ads } = await supabase
        .from("ads_library")
        .select("*")
        .eq("entity_id", brandEntityId)
        .or(`started_at.gte.${start},ended_at.lte.${end},is_active.eq.true`);
      adsData = ads ?? [];

      const metaAds = adsData.filter(a => a.platform === "meta" || !a.platform);
      const googleAds = adsData.filter(a => a.platform === "google");

      adsMetrics = {};

      if (metaAds.length > 0 || manual_data?.meta_ads) {
        adsMetrics.meta = manual_data?.meta_ads ?? {
          reach: metaAds.reduce((s, a) => s + ((a.metadata as any)?.reach ?? 0), 0),
          impressions: metaAds.reduce((s, a) => s + ((a.metadata as any)?.impressions ?? 0), 0),
          clicks: metaAds.reduce((s, a) => s + ((a.metadata as any)?.clicks ?? 0), 0),
          investment: metaAds.reduce((s, a) => s + (a.estimated_spend_max ?? 0), 0),
          ctr: 0,
          cpc: 0,
          cpm: 0,
        };
        if (adsMetrics.meta.impressions > 0 && adsMetrics.meta.clicks > 0) {
          adsMetrics.meta.ctr = Number((adsMetrics.meta.clicks / adsMetrics.meta.impressions * 100).toFixed(2));
          adsMetrics.meta.cpc = Number((adsMetrics.meta.investment / adsMetrics.meta.clicks).toFixed(2));
          adsMetrics.meta.cpm = Number((adsMetrics.meta.investment / adsMetrics.meta.impressions * 1000).toFixed(2));
        }
      }

      if (googleAds.length > 0 || manual_data?.google_ads) {
        adsMetrics.google = manual_data?.google_ads ?? {
          ctr: 0,
          cpc: 0,
          cpa: 0,
          investment: googleAds.reduce((s, a) => s + (a.estimated_spend_max ?? 0), 0),
        };
      }
    }

    // Fetch SEO data
    let seoMetrics: any = null;
    if (contractedChannels.includes("seo") && brandEntityId) {
      const { data: seoData } = await supabase
        .from("seo_data")
        .select("*")
        .eq("entity_id", brandEntityId)
        .gte("snapshot_date", start)
        .lte("snapshot_date", end);

      if (seoData && seoData.length > 0) {
        seoMetrics = {
          keywords_count: seoData.length,
          avg_position: Number((seoData.reduce((s, d) => s + (d.position ?? 0), 0) / seoData.length).toFixed(1)),
          keywords_top3: seoData.filter(d => (d.position ?? 999) <= 3).length,
          keywords_top10: seoData.filter(d => (d.position ?? 999) <= 10).length,
          organic_traffic: seoData.reduce((s, d) => s + (d.organic_traffic_estimate ?? 0), 0),
          domain_authority: seoData[0]?.domain_authority ?? null,
        };
      }
    }

    // Fetch OKRs
    const { data: okrs } = await supabase
      .from("okr_objectives")
      .select("*, okr_key_results(*)")
      .eq("project_id", project_id);

    // Build big_numbers
    const big_numbers: Record<string, any> = {
      okrs_total: okrs?.length ?? 0,
      okrs_on_track: okrs?.filter(o => o.status === "on_track" || o.status === "achieved").length ?? 0,
    };

    if (socialMetrics) {
      big_numbers.followers = socialMetrics.followers;
      big_numbers.followers_growth = socialMetrics.followers_growth;
      big_numbers.total_posts = posts.length;
      big_numbers.total_likes = socialMetrics.total_likes;
      big_numbers.total_comments = socialMetrics.total_comments;
      big_numbers.total_saves = socialMetrics.total_saves;
      big_numbers.total_shares = socialMetrics.total_shares;
      big_numbers.total_views = socialMetrics.total_views;
      big_numbers.avg_engagement = socialMetrics.avg_engagement;
      big_numbers.engagement_rate = socialMetrics.engagement_rate;
    }

    if (adsMetrics?.meta) {
      big_numbers.meta_investment = adsMetrics.meta.investment;
      big_numbers.meta_reach = adsMetrics.meta.reach;
      big_numbers.meta_clicks = adsMetrics.meta.clicks;
      big_numbers.meta_ctr = adsMetrics.meta.ctr;
      big_numbers.meta_cpc = adsMetrics.meta.cpc;
    }
    if (adsMetrics?.google) {
      big_numbers.google_investment = adsMetrics.google.investment;
      big_numbers.google_ctr = adsMetrics.google.ctr;
      big_numbers.google_cpc = adsMetrics.google.cpc;
      big_numbers.google_cpa = adsMetrics.google.cpa;
    }

    if (seoMetrics) {
      big_numbers.organic_traffic = seoMetrics.organic_traffic;
      big_numbers.avg_position = seoMetrics.avg_position;
      big_numbers.keywords_top10 = seoMetrics.keywords_top10;
    }

    // Build sections based on report type
    let sections: Record<string, any> = {};
    let formattedText: string | null = null;

    if (report_type === "weekly_checkin") {
      formattedText = buildWeeklyCheckinText(
        brandName, entityHandle, start, end, socialMetrics, adsMetrics, contractedChannels
      );
      sections = { formatted_text: formattedText };
    } else {
      sections = buildMonthlyReportSections(
        socialMetrics, adsMetrics, seoMetrics, posts, profiles, adsData, contractedChannels, previousBigNumbers
      );
    }

    // AI analysis
    let ai_analysis = null;
    let ai_recommendations = null;
    let model_used = "none";

    if (include_ai && report_type !== "weekly_checkin") {
      try {
        const brandContext = await buildFullBrandContext(project_id);
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableApiKey) {
          let channelInstructions = "";
          if (contractedChannels.includes("social")) {
            channelInstructions += `\nANÁLISE SOCIAL MEDIA:\n- Performance orgânica: ${JSON.stringify(socialMetrics)}\n- Top posts por engajamento\n- Crescimento de seguidores e comunidade\n`;
          }
          if (contractedChannels.includes("ads")) {
            channelInstructions += `\nANÁLISE TRÁFEGO PAGO:\n- Meta Ads: ${JSON.stringify(adsMetrics?.meta ?? {})}\n- Google Ads: ${JSON.stringify(adsMetrics?.google ?? {})}\n- ROI e otimizações\n`;
          }
          if (contractedChannels.includes("seo")) {
            channelInstructions += `\nANÁLISE SEO:\n- Métricas: ${JSON.stringify(seoMetrics ?? {})}\n`;
          }

          const prompt = `Você é um analista de marketing digital. Gere uma análise completa para o ${generateTitle(report_type, start, end, brandName)}.

CONTEXTO DA MARCA:
${brandContext.slice(0, 3000)}

MÉTRICAS DO PERÍODO (${fmtDate(start)} a ${fmtDate(end)}):
${JSON.stringify(big_numbers, null, 2)}

${channelInstructions}

${previousBigNumbers ? `COMPARATIVO COM PERÍODO ANTERIOR:\n${JSON.stringify(previousBigNumbers, null, 2)}` : ""}

Gere EM PORTUGUÊS:
1. **Resumo Executivo** (3-4 linhas)
2. **Destaques** (5 pontos principais do período)
3. **Pontos de Atenção** (o que precisa melhorar)
4. **Recomendações** (5 ações concretas para o próximo período)

Tom: profissional, direto, com dados. Formato: markdown.`;

          const aiResp = await fetch("https://api.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}` },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 3000,
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
        console.error("AI analysis failed:", e instanceof Error ? e.message : e);
      }
    }

    const summary = formattedText?.slice(0, 200) ?? ai_analysis?.slice(0, 200) ?? `Relatório gerado com ${posts.length} posts analisados.`;
    const engRate = socialMetrics?.engagement_rate ?? 0;
    const status_color = engRate > 2 ? "green" : engRate > 1 ? "yellow" : posts.length === 0 && !adsMetrics ? "yellow" : "red";

    const { data: report, error } = await supabase
      .from("automated_reports")
      .insert({
        project_id,
        report_type,
        period_start: start,
        period_end: end,
        year: new Date(start).getFullYear(),
        title: generateTitle(report_type, start, end, brandName),
        summary,
        status_color,
        sections,
        big_numbers,
        raw_data_snapshot: {
          postsCount: posts.length,
          profilesCount: profiles.length,
          adsCount: adsData.length,
          contractedChannels,
        },
        ai_analysis,
        ai_recommendations,
        model_used,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ report_id: report!.id, big_numbers, status_color }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-automated-report error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

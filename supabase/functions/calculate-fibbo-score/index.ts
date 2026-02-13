import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: "project_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch project entities
    const { data: projectEntities, error: peErr } = await supabase
      .from("project_entities")
      .select("entity_id, entity_role")
      .eq("project_id", project_id);
    if (peErr) throw peErr;
    if (!projectEntities || projectEntities.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scores: [], message: "Nenhuma entidade no projeto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const entityIds = projectEntities.map((pe: any) => pe.entity_id);
    const entityRoles = new Map(projectEntities.map((pe: any) => [pe.entity_id, pe.entity_role]));

    // 2. Fetch all data in parallel
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const d90 = new Date(now.getTime() - 90 * 86400000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const d60 = new Date(now.getTime() - 60 * 86400000).toISOString();

    const [
      postsRes,
      profilesRes,
      commentsRes,
      seoRes,
      planningRes,
      planningItemsRes,
    ] = await Promise.all([
      fetchAll(supabase, "instagram_posts", "entity_id", entityIds,
        "id, entity_id, posted_at, likes_count, comments_count, views_count, saves_count, shares_count, engagement_total, post_type, hashtags, caption"),
      supabase.from("instagram_profiles").select("entity_id, snapshot_date, followers_count").in("entity_id", entityIds).order("snapshot_date", { ascending: false }),
      fetchAll(supabase, "instagram_comments", "post_id", null,
        "id, post_id, sentiment_category", undefined, undefined, entityIds),
      supabase.from("seo_data").select("entity_id, position, search_volume, snapshot_date").in("entity_id", entityIds),
      supabase.from("planning_calendars").select("id").eq("project_id", project_id),
      // items fetched after we know calendar ids
      Promise.resolve({ data: null, error: null }),
    ]);

    const allPosts = postsRes ?? [];
    const allProfiles = profilesRes.data ?? [];
    const allComments = commentsRes ?? [];
    const seoData = seoRes.data ?? [];

    // Fetch planning items if calendars exist
    const calendarIds = (planningRes.data ?? []).map((c: any) => c.id);
    let planningItems: any[] = [];
    if (calendarIds.length > 0) {
      const { data } = await supabase
        .from("planning_items")
        .select("id, calendar_id, status, theme, content_type, channel")
        .in("calendar_id", calendarIds);
      planningItems = data ?? [];
    }

    // Build post-to-entity map for comments
    const postEntityMap = new Map<string, string>();
    for (const p of allPosts) {
      postEntityMap.set(p.id, p.entity_id);
    }

    // Group data by entity
    const postsByEntity = groupBy(allPosts, "entity_id");
    const profilesByEntity = groupBy(allProfiles, "entity_id");
    const seoByEntity = groupBy(seoData, "entity_id");

    // Group comments by entity (via post)
    const commentsByEntity = new Map<string, any[]>();
    for (const c of allComments) {
      const eid = postEntityMap.get(c.post_id);
      if (!eid) continue;
      if (!commentsByEntity.has(eid)) commentsByEntity.set(eid, []);
      commentsByEntity.get(eid)!.push(c);
    }

    // Identify brand and competitors
    const brandIds = entityIds.filter((id: string) => entityRoles.get(id) === "brand");
    const competitorIds = entityIds.filter((id: string) => entityRoles.get(id) === "competitor");

    // 3. Calculate score for each entity
    const scores: any[] = [];

    for (const entityId of entityIds) {
      const posts = postsByEntity.get(entityId) ?? [];
      const profiles = profilesByEntity.get(entityId) ?? [];
      const comments = commentsByEntity.get(entityId) ?? [];
      const seo = seoByEntity.get(entityId) ?? [];
      const role = entityRoles.get(entityId);

      const latestFollowers = profiles.length > 0 ? (profiles[0].followers_count ?? 0) : 0;
      const oldestIn90d = profiles.filter((p: any) => p.snapshot_date >= d90.split("T")[0]);
      const followers90d = oldestIn90d.length > 0 ? (oldestIn90d[oldestIn90d.length - 1].followers_count ?? latestFollowers) : latestFollowers;

      const posts90d = posts.filter((p: any) => p.posted_at && p.posted_at >= d90);
      const posts30d = posts.filter((p: any) => p.posted_at && p.posted_at >= d30);
      const posts30to60 = posts.filter((p: any) => p.posted_at && p.posted_at >= d60 && p.posted_at < d30);

      // ── PRESENÇA (0-25) ──
      const followerGrowth = followers90d > 0 ? ((latestFollowers - followers90d) / followers90d) * 100 : 0;
      // Recalibrado: 5% growth in 90d = max (era 20%)
      const crescimentoScore = clamp(mapRange(followerGrowth, -2, 5, 0, 8), 0, 8);

      const weeks90d = 90 / 7;
      const postsPerWeek = posts90d.length / weeks90d;
      // 3 posts/week = max (era 5)
      const volumeScore = clamp(mapRange(postsPerWeek, 0, 3, 0, 5), 0, 5);

      const weeklyPostCounts = getWeeklyDistribution(posts90d);
      const cvInverse = weeklyPostCounts.length > 1 ? 1 - coefficientOfVariation(weeklyPostCounts) : 0;
      const regularidadeScore = clamp(mapRange(Math.max(0, cvInverse), 0, 1, 0, 5), 0, 5);

      const avgViews = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.views_count ?? 0)) : 0;
      const viewsReach = latestFollowers > 0 ? avgViews / latestFollowers : 0;
      // Recalibrado: 30% reach = max (era 150%). Para grandes contas, 10-25% é excelente.
      const alcanceScore = clamp(mapRange(viewsReach, 0, 0.3, 0, 4), 0, 4);

      const seoScore = calculateSeoPresenceScore(seo);

      const presenca_score = round2(crescimentoScore + volumeScore + regularidadeScore + alcanceScore + seoScore);

      // ── ENGAJAMENTO (0-25) ──
      const avgLikes = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.likes_count ?? 0)) : 0;
      const avgComments = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.comments_count ?? 0)) : 0;
      const avgSaves = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.saves_count ?? 0)) : 0;

      // Benchmarks 2025: mediana global ~0.50%, excelente >1%, elite >2%
      // Rival IQ: mediana 0.43%, top 25% >1%
      // Recalibrado: 0.36% = média setorial → ~5pts, 1% = excelente → ~8pts, 1.5%+ = max
      const engRate = latestFollowers > 0 ? ((avgLikes + avgComments) / latestFollowers) * 100 : 0;
      const taxaEngScore = clamp(mapRange(engRate, 0, 1.5, 0, 10), 0, 10);

      // Comment rate recalibrado: 0.03% = média, 0.1% = excelente para grandes contas
      const commRate = latestFollowers > 0 ? (avgComments / latestFollowers) * 100 : 0;
      const taxaCommScore = clamp(mapRange(commRate, 0, 0.1, 0, 5), 0, 5);

      // Saves: if data not available, give baseline score instead of penalizing
      const hasSavesData = posts90d.some((p: any) => (p.saves_count ?? 0) > 0);
      let taxaSavesScore: number;
      if (!hasSavesData) {
        // No saves data available — give neutral score (don't penalize)
        taxaSavesScore = 2.5;
      } else {
        const savesRate = latestFollowers > 0 ? (avgSaves / latestFollowers) * 100 : 0;
        taxaSavesScore = clamp(mapRange(savesRate, 0, 0.15, 0, 5), 0, 5);
      }

      const analyzedComments = comments.filter((c: any) => c.sentiment_category);
      const positive = analyzedComments.filter((c: any) => c.sentiment_category === "positive").length;
      const neutral = analyzedComments.filter((c: any) => c.sentiment_category === "neutral").length;
      const sentimentRaw = analyzedComments.length > 0 ? (positive * 10 + neutral * 5) / analyzedComments.length : 5;
      // If no sentiment data, give neutral baseline
      const sentimentScore = analyzedComments.length > 0
        ? clamp(mapRange(sentimentRaw, 0, 10, 0, 2), 0, 2)
        : 1;

      const eng30d = posts30d.length > 0 ? avg(posts30d.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
      const eng30to60 = posts30to60.length > 0 ? avg(posts30to60.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
      const trend = eng30to60 > 0 ? (eng30d - eng30to60) / eng30to60 : 0;
      // If no comparison data, give neutral
      const hasTrendData = posts30d.length > 0 && posts30to60.length > 0;
      const tendenciaScore = hasTrendData
        ? clamp(mapRange(trend, -0.3, 0.3, 0, 2.5), 0, 2.5)
        : 1.25;

      const engajamento_score = round2(taxaEngScore + taxaCommScore + taxaSavesScore + sentimentScore + tendenciaScore);

      // ── CONTEÚDO (0-25) ──
      const formatPerf = calculateFormatPerformance(posts90d);
      const pillarAdherence = calculatePillarAdherence(posts90d, planningItems);
      const consistency = calculateConsistency(posts90d);
      const hashtagEfficacy = calculateHashtagEfficacy(posts90d);
      const planningAdherence = calculatePlanningAdherence(planningItems);

      const conteudo_score = round2(formatPerf + pillarAdherence + consistency + hashtagEfficacy + planningAdherence);

      // ── COMPETITIVIDADE (0-25) ──
      let competitividade_score: number;
      if (competitorIds.length === 0 || role === "competitor") {
        competitividade_score = 13;
      } else {
        competitividade_score = round2(calculateCompetitiveness(
          entityId, posts90d, latestFollowers, posts,
          competitorIds, postsByEntity, profilesByEntity, seoByEntity, seo
        ));
      }

      const total_score = round2(presenca_score + engajamento_score + conteudo_score + competitividade_score);

      const metricsSnapshot = {
        followers: latestFollowers,
        followers_90d: followers90d,
        posts_90d: posts90d.length,
        posts_30d: posts30d.length,
        avg_likes: round2(avgLikes),
        avg_comments: round2(avgComments),
        avg_saves: round2(avgSaves),
        avg_views: round2(avgViews),
        eng_rate: round2(engRate),
        sentiment_positive: positive,
        sentiment_neutral: neutral,
        sentiment_analyzed: analyzedComments.length,
        competitor_count: competitorIds.length,
      };

      scores.push({
        project_id,
        entity_id: entityId,
        score_date: today,
        total_score,
        presenca_score,
        engajamento_score,
        conteudo_score,
        competitividade_score,
        metrics_snapshot: metricsSnapshot,
      });
    }

    // 4. Upsert scores
    const { error: upsertErr } = await supabase
      .from("fibbo_scores")
      .upsert(scores, { onConflict: "project_id,entity_id,score_date" });
    if (upsertErr) throw upsertErr;

    console.log(`FibboScore calculated for ${scores.length} entities in project ${project_id}`);

    return new Response(
      JSON.stringify({ success: true, scores }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("FibboScore error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Helper: fetch all rows with pagination ──
async function fetchAll(
  supabase: any,
  table: string,
  filterCol: string,
  filterValues: string[] | null,
  selectCols: string,
  orderCol?: string,
  ascending?: boolean,
  entityIdsForComments?: string[]
): Promise<any[]> {
  const PAGE = 1000;
  let all: any[] = [];
  let offset = 0;

  // For comments, we need to join through posts
  if (table === "instagram_comments" && entityIdsForComments) {
    // First get all post IDs for these entities
    const postIds: string[] = [];
    let pOffset = 0;
    while (true) {
      const { data } = await supabase
        .from("instagram_posts")
        .select("id")
        .in("entity_id", entityIdsForComments)
        .range(pOffset, pOffset + PAGE - 1);
      if (!data || data.length === 0) break;
      postIds.push(...data.map((p: any) => p.id));
      if (data.length < PAGE) break;
      pOffset += PAGE;
    }
    if (postIds.length === 0) return [];

    // Fetch comments in chunks of post IDs
    const CHUNK = 200;
    for (let i = 0; i < postIds.length; i += CHUNK) {
      const chunk = postIds.slice(i, i + CHUNK);
      let cOffset = 0;
      while (true) {
        const { data } = await supabase
          .from("instagram_comments")
          .select(selectCols)
          .in("post_id", chunk)
          .range(cOffset, cOffset + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        cOffset += PAGE;
      }
    }
    return all;
  }

  while (true) {
    let q = supabase.from(table).select(selectCols);
    if (filterValues) q = q.in(filterCol, filterValues);
    if (orderCol) q = q.order(orderCol, { ascending: ascending ?? false });
    q = q.range(offset, offset + PAGE - 1);
    const { data } = await q;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ── Math helpers ──
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function coefficientOfVariation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  if (mean === 0) return 1;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance) / mean;
}

function groupBy<T>(arr: T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = (item as any)[key];
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

function getWeeklyDistribution(posts: any[]): number[] {
  if (posts.length === 0) return [];
  const weeks = new Map<string, number>();
  for (const p of posts) {
    if (!p.posted_at) continue;
    const d = new Date(p.posted_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return Array.from(weeks.values());
}

// ── Score sub-calculations ──

function calculateSeoPresenceScore(seo: any[]): number {
  if (seo.length === 0) return 0;
  let weightedSum = 0;
  let totalVolume = 0;
  for (const s of seo) {
    const vol = s.search_volume ?? 1;
    const pos = s.position ?? 100;
    // Higher score for lower position (pos 1 = best)
    const posScore = Math.max(0, 10 - pos / 10);
    weightedSum += posScore * vol;
    totalVolume += vol;
  }
  const avgScore = totalVolume > 0 ? weightedSum / totalVolume : 0;
  return clamp(mapRange(avgScore, 0, 8, 0, 3), 0, 3);
}

function calculateFormatPerformance(posts: any[]): number {
  if (posts.length === 0) return 3;
  const formatStats = new Map<string, { count: number; totalEng: number }>();
  for (const p of posts) {
    const fmt = p.post_type ?? "unknown";
    if (!formatStats.has(fmt)) formatStats.set(fmt, { count: 0, totalEng: 0 });
    const s = formatStats.get(fmt)!;
    s.count++;
    s.totalEng += (p.likes_count ?? 0) + (p.comments_count ?? 0);
  }

  let mostUsed = "";
  let mostUsedCount = 0;
  let bestEngFormat = "";
  let bestEngRate = 0;

  for (const [fmt, stats] of formatStats) {
    if (stats.count > mostUsedCount) { mostUsed = fmt; mostUsedCount = stats.count; }
    const rate = stats.totalEng / stats.count;
    if (rate > bestEngRate) { bestEngFormat = fmt; bestEngRate = rate; }
  }

  if (mostUsed === bestEngFormat) return 6;
  // Partial score based on how close the most used is to the best
  const mostUsedRate = (formatStats.get(mostUsed)?.totalEng ?? 0) / mostUsedCount;
  const ratio = bestEngRate > 0 ? mostUsedRate / bestEngRate : 0.5;
  return clamp(mapRange(ratio, 0.3, 1, 2, 6), 2, 6);
}

function calculatePillarAdherence(_posts: any[], planningItems: any[]): number {
  if (planningItems.length === 0) return 3;
  // Check if themes are defined in planning
  const themes = planningItems.filter((i: any) => i.theme).map((i: any) => i.theme);
  if (themes.length === 0) return 3;
  const uniqueThemes = new Set(themes);
  // More diverse themes = better adherence
  const diversity = Math.min(uniqueThemes.size / Math.max(themes.length * 0.3, 1), 1);
  return clamp(mapRange(diversity, 0, 1, 1, 6), 1, 6);
}

function calculateConsistency(posts: any[]): number {
  if (posts.length < 10) return 2.5;
  const engagements = posts.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0));
  engagements.sort((a: number, b: number) => b - a);
  const top10pct = engagements.slice(0, Math.max(1, Math.floor(engagements.length * 0.1)));
  const top10Avg = avg(top10pct);
  const overallAvg = avg(engagements);
  if (overallAvg === 0) return 2.5;
  const ratio = top10Avg / overallAvg;
  // Lower ratio = more consistent (less spiky)
  return clamp(mapRange(ratio, 1, 5, 5, 0), 0, 5);
}

function calculateHashtagEfficacy(posts: any[]): number {
  if (posts.length < 5) return 2;
  const withHashtags = posts.filter((p: any) => p.hashtags && p.hashtags.length > 0);
  const withoutHashtags = posts.filter((p: any) => !p.hashtags || p.hashtags.length === 0);
  if (withHashtags.length === 0 || withoutHashtags.length === 0) return 2;
  const engWith = avg(withHashtags.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0)));
  const engWithout = avg(withoutHashtags.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0)));
  if (engWithout === 0) return 2;
  const ratio = engWith / engWithout;
  return clamp(mapRange(ratio, 0.8, 1.5, 0, 4), 0, 4);
}

function calculatePlanningAdherence(planningItems: any[]): number {
  if (planningItems.length === 0) return 2;
  const published = planningItems.filter((i: any) => i.status === "published").length;
  const ratio = published / planningItems.length;
  return clamp(mapRange(ratio, 0, 0.8, 0, 4), 0, 4);
}

function calculateCompetitiveness(
  brandEntityId: string,
  brandPosts90d: any[],
  brandFollowers: number,
  _allBrandPosts: any[],
  competitorIds: string[],
  postsByEntity: Map<string, any[]>,
  profilesByEntity: Map<string, any[]>,
  seoByEntity: Map<string, any[]>,
  brandSeo: any[]
): number {
  const d90 = new Date(Date.now() - 90 * 86400000).toISOString();

  // Competitor metrics
  const compMetrics = competitorIds.map((cid) => {
    const cPosts = (postsByEntity.get(cid) ?? []).filter((p: any) => p.posted_at && p.posted_at >= d90);
    const cProfiles = profilesByEntity.get(cid) ?? [];
    const cFollowers = cProfiles.length > 0 ? (cProfiles[0].followers_count ?? 0) : 0;
    const cAvgEng = cPosts.length > 0 ? avg(cPosts.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
    const cEngRate = cFollowers > 0 ? (cAvgEng / cFollowers) * 100 : 0;
    const cTotalEng = cPosts.reduce((s: number, p: any) => s + ((p.likes_count ?? 0) + (p.comments_count ?? 0)), 0);
    const cSeo = seoByEntity.get(cid) ?? [];
    const cAvgSeoPos = cSeo.length > 0 ? avg(cSeo.map((s: any) => s.position ?? 100)) : 100;
    return { followers: cFollowers, engRate: cEngRate, volume: cPosts.length, totalEng: cTotalEng, avgSeoPos: cAvgSeoPos };
  }).filter((m) => m.followers > 0 || m.volume > 0);

  if (compMetrics.length === 0) return 13;

  const avgCompEngRate = avg(compMetrics.map((m) => m.engRate));
  const avgCompVolume = avg(compMetrics.map((m) => m.volume));
  const avgCompPosts = avg(compMetrics.map((m) => m.volume));
  const allTotalEng = compMetrics.reduce((s, m) => s + m.totalEng, 0);

  const brandAvgEng = brandPosts90d.length > 0 ? avg(brandPosts90d.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
  const brandEngRate = brandFollowers > 0 ? (brandAvgEng / brandFollowers) * 100 : 0;
  const brandTotalEng = brandPosts90d.reduce((s: number, p: any) => s + ((p.likes_count ?? 0) + (p.comments_count ?? 0)), 0);

      // Engajamento relativo (0-8) — recalibrado: ratio 0.8-1.5 (era 0.5-2)
      const engRatio = avgCompEngRate > 0 ? brandEngRate / avgCompEngRate : 1;
      const engRelScore = clamp(mapRange(engRatio, 0.3, 1.5, 0, 8), 0, 8);

      // Crescimento relativo (0-6) — recalibrado
      const volRatio = avgCompVolume > 0 ? brandPosts90d.length / avgCompVolume : 1;
      const growthRelScore = clamp(mapRange(volRatio, 0.3, 1.5, 0, 6), 0, 6);

      // Volume relativo (0-4) — recalibrado
      const postRatio = avgCompPosts > 0 ? brandPosts90d.length / avgCompPosts : 1;
      const volumeRelScore = clamp(mapRange(postRatio, 0.3, 1.5, 0, 4), 0, 4);

      // Share of engagement (0-4)
      const totalEngAll = allTotalEng + brandTotalEng;
      const shareOfEng = totalEngAll > 0 ? brandTotalEng / totalEngAll : 0.5;
      const expectedShare = 1 / (compMetrics.length + 1); // fair share
      const shareRatio = expectedShare > 0 ? shareOfEng / expectedShare : 1;
      const shareScore = clamp(mapRange(shareRatio, 0.3, 2, 0, 4), 0, 4);

      // SEO relativo (0-3)
      const brandAvgSeoPos = brandSeo.length > 0 ? avg(brandSeo.map((s: any) => s.position ?? 100)) : 100;
      const avgCompSeoPos = avg(compMetrics.map((m) => m.avgSeoPos));
      const seoRatio = avgCompSeoPos > 0 ? avgCompSeoPos / Math.max(brandAvgSeoPos, 1) : 1;
      const seoRelScore = clamp(mapRange(seoRatio, 0.5, 2, 0, 3), 0, 3);

  return engRelScore + growthRelScore + volumeRelScore + shareScore + seoRelScore;
}

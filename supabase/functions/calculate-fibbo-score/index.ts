import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Channel Thresholds (synced with src/lib/fibboScoreConfig.ts) ──
interface ChannelThresholds {
  presenca: { followerGrowthMaxPct: number; postsPerWeekMax: number; reachRateMaxPct: number; seoPositionCutoff: number; seoTopPosition: number; };
  engajamento: { engagementRateMaxPct: number; commentRateMaxPct: number; saveRateMaxPct: number; sentimentScoreMax: number; trendThresholdPct: number; };
  conteudo: { pillarDeviationMultiplier: number; consistencyRatioThresholds: [number, number, number]; hashtagLiftThresholdPct: number; };
  competitividade: { engRatioMin: number; engRatioMax: number; seoAdvantageMax: number; neutralScore: number; };
}

const CHANNEL_DEFAULTS: Record<string, ChannelThresholds> = {
  instagram: {
    presenca: { followerGrowthMaxPct: 5, postsPerWeekMax: 4, reachRateMaxPct: 8, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 3, commentRateMaxPct: 0.1, saveRateMaxPct: 0.3, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2.5, 4, 7], hashtagLiftThresholdPct: 10 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  tiktok: {
    presenca: { followerGrowthMaxPct: 10, postsPerWeekMax: 5, reachRateMaxPct: 15, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 6, commentRateMaxPct: 0.15, saveRateMaxPct: 0.2, sentimentScoreMax: 8, trendThresholdPct: 8 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [3, 5, 8], hashtagLiftThresholdPct: 15 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  youtube: {
    presenca: { followerGrowthMaxPct: 4, postsPerWeekMax: 2, reachRateMaxPct: 5, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 4, commentRateMaxPct: 0.08, saveRateMaxPct: 0.1, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2, 3.5, 6], hashtagLiftThresholdPct: 8 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  linkedin: {
    presenca: { followerGrowthMaxPct: 4, postsPerWeekMax: 3, reachRateMaxPct: 6, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 2, commentRateMaxPct: 0.05, saveRateMaxPct: 0.1, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2, 3, 5], hashtagLiftThresholdPct: 8 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  twitter: {
    presenca: { followerGrowthMaxPct: 3, postsPerWeekMax: 7, reachRateMaxPct: 4, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 1.5, commentRateMaxPct: 0.03, saveRateMaxPct: 0.05, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [3, 5, 8], hashtagLiftThresholdPct: 5 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  facebook: {
    presenca: { followerGrowthMaxPct: 2, postsPerWeekMax: 4, reachRateMaxPct: 4, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 1, commentRateMaxPct: 0.03, saveRateMaxPct: 0.05, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2, 3, 5], hashtagLiftThresholdPct: 5 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
};

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key in override) {
    if (override[key] !== undefined && override[key] !== null) {
      if (typeof override[key] === "object" && !Array.isArray(override[key]) && typeof base[key] === "object" && !Array.isArray(base[key])) {
        (result as any)[key] = deepMerge(base[key] as any, override[key] as any);
      } else {
        (result as any)[key] = override[key];
      }
    }
  }
  return result;
}

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

    // Load project briefing for custom config
    const { data: projectData } = await supabase
      .from("projects")
      .select("briefing")
      .eq("id", project_id)
      .single();

    const rawConfig = (projectData?.briefing as any)?.fibbo_config;
    const config = rawConfig ? deepMerge({ channels: CHANNEL_DEFAULTS, weights: {} }, rawConfig) : { channels: CHANNEL_DEFAULTS, weights: {} };

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

    const [postsRes, profilesRes, commentsRes] = await Promise.all([
      fetchAll(supabase, "instagram_posts", "entity_id", entityIds,
        "id, entity_id, posted_at, likes_count, comments_count, views_count, saves_count, shares_count, engagement_total, post_type, hashtags, caption"),
      supabase.from("instagram_profiles").select("entity_id, snapshot_date, followers_count").in("entity_id", entityIds).order("snapshot_date", { ascending: false }),
      fetchAll(supabase, "instagram_comments", "post_id", null,
        "id, post_id, sentiment_category", undefined, undefined, entityIds),
    ]);

    const allPosts = postsRes ?? [];
    const allProfiles = profilesRes.data ?? [];
    const allComments = commentsRes ?? [];

    const postEntityMap = new Map<string, string>();
    for (const p of allPosts) postEntityMap.set(p.id, p.entity_id);

    const postsByEntity = groupBy(allPosts, "entity_id");
    const profilesByEntity = groupBy(allProfiles, "entity_id");

    const commentsByEntity = new Map<string, any[]>();
    for (const c of allComments) {
      const eid = postEntityMap.get(c.post_id);
      if (!eid) continue;
      if (!commentsByEntity.has(eid)) commentsByEntity.set(eid, []);
      commentsByEntity.get(eid)!.push(c);
    }

    const brandIds = entityIds.filter((id: string) => entityRoles.get(id) === "brand");
    const competitorIds = entityIds.filter((id: string) => entityRoles.get(id) === "competitor");

    // Currently only instagram has data — channel is always 'instagram'
    const channel = "instagram";
    const th: ChannelThresholds = config.channels[channel] ?? CHANNEL_DEFAULTS.instagram;

    // 3. Calculate score for each entity
    const scores: any[] = [];

    for (const entityId of entityIds) {
      const posts = postsByEntity.get(entityId) ?? [];
      const profiles = profilesByEntity.get(entityId) ?? [];
      const comments = commentsByEntity.get(entityId) ?? [];
      const role = entityRoles.get(entityId);

      const latestFollowers = profiles.length > 0 ? (profiles[0].followers_count ?? 0) : 0;
      const oldestIn90d = profiles.filter((p: any) => p.snapshot_date >= d90.split("T")[0]);
      const followers90d = oldestIn90d.length > 0 ? (oldestIn90d[oldestIn90d.length - 1].followers_count ?? latestFollowers) : latestFollowers;

      const posts90d = posts.filter((p: any) => p.posted_at && p.posted_at >= d90);
      const posts30d = posts.filter((p: any) => p.posted_at && p.posted_at >= d30);
      const posts30to60 = posts.filter((p: any) => p.posted_at && p.posted_at >= d60 && p.posted_at < d30);

      // ── PRESENÇA (0-25) ── using channel thresholds
      const followerGrowth = followers90d > 0 ? ((latestFollowers - followers90d) / followers90d) * 100 : 0;
      const crescimentoScore = clamp(mapRange(followerGrowth, -0.5, th.presenca.followerGrowthMaxPct, 0, 8), 0, 8);

      const weeks90d = 90 / 7;
      const postsPerWeek = posts90d.length / weeks90d;
      const volumeScore = clamp(mapRange(postsPerWeek, 0, th.presenca.postsPerWeekMax, 0, 6), 0, 6);

      const weeklyPostCounts = getWeeklyDistribution(posts90d);
      const cvInverse = weeklyPostCounts.length > 1 ? 1 - coefficientOfVariation(weeklyPostCounts) : 0;
      const regularidadeScore = clamp(mapRange(Math.max(0, cvInverse), 0, 1, 0, 5), 0, 5);

      const postsWithViews = posts90d.filter((p: any) => (p.views_count ?? 0) > 0);
      const avgViews = postsWithViews.length > 0 ? avg(postsWithViews.map((p: any) => p.views_count)) : 0;
      const viewsReach = latestFollowers > 0 ? (avgViews / latestFollowers) * 100 : 0;
      const alcanceScore = clamp(mapRange(viewsReach, 0, th.presenca.reachRateMaxPct, 0, 6), 0, 6);

      const presenca_score = round2(crescimentoScore + volumeScore + regularidadeScore + alcanceScore);

      // ── ENGAJAMENTO (0-25) ── using channel thresholds
      const avgLikes = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.likes_count ?? 0)) : 0;
      const avgComments = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.comments_count ?? 0)) : 0;
      const avgSaves = posts90d.length > 0 ? avg(posts90d.map((p: any) => p.saves_count ?? 0)) : 0;

      const engRate = latestFollowers > 0 ? ((avgLikes + avgComments) / latestFollowers) * 100 : 0;
      const taxaEngScore = clamp(mapRange(engRate, 0, th.engajamento.engagementRateMaxPct, 0, 10), 0, 10);

      const commRate = latestFollowers > 0 ? (avgComments / latestFollowers) * 100 : 0;
      const taxaCommScore = clamp(mapRange(commRate, 0, th.engajamento.commentRateMaxPct, 0, 5), 0, 5);

      const hasSavesData = posts90d.some((p: any) => (p.saves_count ?? 0) > 0);
      let taxaSavesScore: number;
      if (!hasSavesData) {
        taxaSavesScore = 2.5;
      } else {
        const savesRate = latestFollowers > 0 ? (avgSaves / latestFollowers) * 100 : 0;
        taxaSavesScore = clamp(mapRange(savesRate, 0, th.engajamento.saveRateMaxPct, 0, 5), 0, 5);
      }

      const analyzedComments = comments.filter((c: any) => c.sentiment_category);
      const positive = analyzedComments.filter((c: any) => c.sentiment_category === "positive").length;
      const neutral = analyzedComments.filter((c: any) => c.sentiment_category === "neutral").length;
      const sentimentRaw = analyzedComments.length > 0 ? (positive * 10 + neutral * 5) / analyzedComments.length : 5;
      const sentimentScore = analyzedComments.length > 0
        ? clamp(mapRange(sentimentRaw, 0, th.engajamento.sentimentScoreMax, 0, 2.5), 0, 2.5)
        : 1.25;

      const eng30d = posts30d.length > 0 ? avg(posts30d.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
      const eng30to60 = posts30to60.length > 0 ? avg(posts30to60.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
      const trend = eng30to60 > 0 ? (eng30d - eng30to60) / eng30to60 : 0;
      const hasTrendData = posts30d.length > 0 && posts30to60.length > 0;
      const tendenciaScore = hasTrendData
        ? clamp(mapRange(trend, -0.3, 0.3, 0, 2.5), 0, 2.5)
        : 1.25;

      const engajamento_score = round2(taxaEngScore + taxaCommScore + taxaSavesScore + sentimentScore + tendenciaScore);

      // ── CONTEÚDO (0-25) ──
      const formatPerf = calculateFormatPerformance(posts90d);
      const pillarAdherence = calculatePillarAdherence(posts90d);
      const consistency = calculateConsistency(posts90d, th);
      const hashtagEfficacy = calculateHashtagEfficacy(posts90d, th);

      const conteudo_score = round2(formatPerf + pillarAdherence + consistency + hashtagEfficacy);

      // ── COMPETITIVIDADE (0-25) ──
      let competitividade_score: number;
      if (competitorIds.length === 0 || role === "competitor") {
        competitividade_score = th.competitividade.neutralScore;
      } else {
        competitividade_score = round2(calculateCompetitiveness(
          entityId, posts90d, latestFollowers, followers90d,
          competitorIds, postsByEntity, profilesByEntity, d90, th
        ));
      }

      const total_score = round2(presenca_score + engajamento_score + conteudo_score + competitividade_score);

      const metricsSnapshot = {
        channel,
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
        breakdown: {
          presenca: { crescimento: round2(crescimentoScore), volume: round2(volumeScore), regularidade: round2(regularidadeScore), alcance: round2(alcanceScore) },
          engajamento: { taxa_eng: round2(taxaEngScore), taxa_comm: round2(taxaCommScore), taxa_saves: round2(taxaSavesScore), sentimento: round2(sentimentScore), tendencia: round2(tendenciaScore) },
          conteudo: { formato: round2(formatPerf), pilares: round2(pillarAdherence), consistencia: round2(consistency), hashtags: round2(hashtagEfficacy) },
          competitividade: { score: round2(competitividade_score) },
        },
      };

      scores.push({
        project_id,
        entity_id: entityId,
        score_date: today,
        channel,
        total_score,
        presenca_score,
        engajamento_score,
        conteudo_score,
        competitividade_score,
        metrics_snapshot: metricsSnapshot,
      });
    }

    // Generate 'general' score per entity (weighted average of channels — currently just instagram)
    const brandEntities = entityIds.filter((id: string) => entityRoles.get(id) === "brand");
    for (const entityId of brandEntities) {
      const entityChannelScores = scores.filter((s: any) => s.entity_id === entityId && s.channel !== "general");
      if (entityChannelScores.length === 0) continue;

      let totalWeight = 0;
      let weightedTotal = 0;
      let weightedPresenca = 0;
      let weightedEngajamento = 0;
      let weightedConteudo = 0;
      let weightedCompetitividade = 0;

      for (const s of entityChannelScores) {
        const w = config.weights?.[s.channel as string] ?? 1;
        weightedTotal += s.total_score * w;
        weightedPresenca += s.presenca_score * w;
        weightedEngajamento += s.engajamento_score * w;
        weightedConteudo += s.conteudo_score * w;
        weightedCompetitividade += s.competitividade_score * w;
        totalWeight += w;
      }

      if (totalWeight > 0) {
        scores.push({
          project_id,
          entity_id: entityId,
          score_date: today,
          channel: "general",
          total_score: round2(weightedTotal / totalWeight),
          presenca_score: round2(weightedPresenca / totalWeight),
          engajamento_score: round2(weightedEngajamento / totalWeight),
          conteudo_score: round2(weightedConteudo / totalWeight),
          competitividade_score: round2(weightedCompetitividade / totalWeight),
          metrics_snapshot: {
            channel: "general",
            active_channels: entityChannelScores.map((s: any) => s.channel),
            weights_used: Object.fromEntries(entityChannelScores.map((s: any) => [s.channel, config.weights?.[s.channel] ?? 1])),
          },
        });
      }
    }

    // 4. Upsert scores
    const { error: upsertErr } = await supabase
      .from("fibbo_scores")
      .upsert(scores, { onConflict: "project_id,entity_id,score_date,channel" });
    if (upsertErr) throw upsertErr;

    console.log(`FibboScore calculated for ${scores.length} records in project ${project_id}`);

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
  supabase: any, table: string, filterCol: string, filterValues: string[] | null,
  selectCols: string, orderCol?: string, ascending?: boolean, entityIdsForComments?: string[]
): Promise<any[]> {
  const PAGE = 1000;
  let all: any[] = [];
  let offset = 0;

  if (table === "instagram_comments" && entityIdsForComments) {
    const postIds: string[] = [];
    let pOffset = 0;
    while (true) {
      const { data } = await supabase.from("instagram_posts").select("id").in("entity_id", entityIdsForComments).range(pOffset, pOffset + PAGE - 1);
      if (!data || data.length === 0) break;
      postIds.push(...data.map((p: any) => p.id));
      if (data.length < PAGE) break;
      pOffset += PAGE;
    }
    if (postIds.length === 0) return [];
    const CHUNK = 200;
    for (let i = 0; i < postIds.length; i += CHUNK) {
      const chunk = postIds.slice(i, i + CHUNK);
      let cOffset = 0;
      while (true) {
        const { data } = await supabase.from("instagram_comments").select(selectCols).in("post_id", chunk).range(cOffset, cOffset + PAGE - 1);
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
function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
function avg(arr: number[]): number { return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
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
function calculateFormatPerformance(posts: any[]): number {
  if (posts.length === 0) return 4;
  const formatStats = new Map<string, { count: number; totalEng: number }>();
  for (const p of posts) {
    const fmt = p.post_type ?? "unknown";
    if (!formatStats.has(fmt)) formatStats.set(fmt, { count: 0, totalEng: 0 });
    const s = formatStats.get(fmt)!;
    s.count++;
    s.totalEng += (p.likes_count ?? 0) + (p.comments_count ?? 0);
  }
  let mostUsed = "", mostUsedCount = 0, bestEngFormat = "", bestEngRate = 0;
  for (const [fmt, stats] of formatStats) {
    if (stats.count > mostUsedCount) { mostUsed = fmt; mostUsedCount = stats.count; }
    const rate = stats.totalEng / stats.count;
    if (rate > bestEngRate) { bestEngFormat = fmt; bestEngRate = rate; }
  }
  if (mostUsed === bestEngFormat) return 8;
  const mostUsedRate = (formatStats.get(mostUsed)?.totalEng ?? 0) / mostUsedCount;
  const ratio = bestEngRate > 0 ? mostUsedRate / bestEngRate : 0.5;
  return clamp(mapRange(ratio, 0.3, 1, 3, 8), 3, 8);
}

function calculatePillarAdherence(posts: any[]): number {
  if (posts.length === 0) return 3;
  const allHashtags = posts.flatMap((p: any) => p.hashtags ?? []);
  if (allHashtags.length === 0) return 3;
  const uniqueHashtags = new Set(allHashtags);
  const diversity = Math.min(uniqueHashtags.size / Math.max(allHashtags.length * 0.3, 1), 1);
  return clamp(mapRange(diversity, 0, 1, 1, 6), 1, 6);
}

function calculateConsistency(posts: any[], th: ChannelThresholds): number {
  if (posts.length < 10) return 3.5;
  const engagements = posts.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0));
  engagements.sort((a: number, b: number) => b - a);
  const top10pct = engagements.slice(0, Math.max(1, Math.floor(engagements.length * 0.1)));
  const top10Avg = avg(top10pct);
  const overallAvg = avg(engagements);
  if (overallAvg === 0) return 3.5;
  const ratio = top10Avg / overallAvg;
  const [low, , high] = th.conteudo.consistencyRatioThresholds;
  return clamp(mapRange(ratio, low, high, 7, 0), 0, 7);
}

function calculateHashtagEfficacy(posts: any[], th: ChannelThresholds): number {
  if (posts.length < 5) return 2;
  const withHashtags = posts.filter((p: any) => p.hashtags && p.hashtags.length > 0);
  const withoutHashtags = posts.filter((p: any) => !p.hashtags || p.hashtags.length === 0);
  if (withHashtags.length === 0 || withoutHashtags.length === 0) return 2;
  const engWith = avg(withHashtags.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0)));
  const engWithout = avg(withoutHashtags.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0)));
  if (engWithout === 0) return 2;
  const ratio = engWith / engWithout;
  const liftThreshold = 1 + (th.conteudo.hashtagLiftThresholdPct / 100);
  return clamp(mapRange(ratio, 0.8, liftThreshold, 0, 4), 0, 4);
}

function calculateCompetitiveness(
  _brandEntityId: string, brandPosts90d: any[], brandFollowers: number, brandFollowers90d: number,
  competitorIds: string[], postsByEntity: Map<string, any[]>, profilesByEntity: Map<string, any[]>,
  d90: string, th: ChannelThresholds,
): number {
  // Brand metrics
  const brandGrowthRate = brandFollowers90d > 0 ? ((brandFollowers - brandFollowers90d) / brandFollowers90d) * 100 : 0;
  const brandAvgEng = brandPosts90d.length > 0 ? avg(brandPosts90d.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
  const brandEngRate = brandFollowers > 0 ? (brandAvgEng / brandFollowers) * 100 : 0;
  const brandTotalEng = brandPosts90d.reduce((s: number, p: any) => s + ((p.likes_count ?? 0) + (p.comments_count ?? 0)), 0);

  const compMetrics = competitorIds.map((cid) => {
    const cPosts = (postsByEntity.get(cid) ?? []).filter((p: any) => p.posted_at && p.posted_at >= d90);
    const cProfiles = profilesByEntity.get(cid) ?? [];
    const cFollowers = cProfiles.length > 0 ? (cProfiles[0].followers_count ?? 0) : 0;
    const cOldest90d = cProfiles.filter((p: any) => p.snapshot_date >= d90.split("T")[0]);
    const cFollowers90d = cOldest90d.length > 0 ? (cOldest90d[cOldest90d.length - 1].followers_count ?? cFollowers) : cFollowers;
    const cGrowthRate = cFollowers90d > 0 ? ((cFollowers - cFollowers90d) / cFollowers90d) * 100 : 0;
    const cAvgEng = cPosts.length > 0 ? avg(cPosts.map((p: any) => (p.likes_count ?? 0) + (p.comments_count ?? 0))) : 0;
    const cEngRate = cFollowers > 0 ? (cAvgEng / cFollowers) * 100 : 0;
    const cTotalEng = cPosts.reduce((s: number, p: any) => s + ((p.likes_count ?? 0) + (p.comments_count ?? 0)), 0);
    return { followers: cFollowers, engRate: cEngRate, volume: cPosts.length, totalEng: cTotalEng, growthRate: cGrowthRate };
  }).filter((m) => m.followers > 0 || m.volume > 0);

  if (compMetrics.length === 0) return th.competitividade.neutralScore;

  const avgCompEngRate = avg(compMetrics.map((m) => m.engRate));
  const avgCompVolume = avg(compMetrics.map((m) => m.volume));
  const avgCompGrowthRate = avg(compMetrics.map((m) => m.growthRate));
  const allTotalEng = compMetrics.reduce((s, m) => s + m.totalEng, 0);

  // Engajamento relativo (0-9) — using thresholds
  const engRatio = avgCompEngRate > 0 ? brandEngRate / avgCompEngRate : 1;
  const engRelScore = clamp(mapRange(engRatio, th.competitividade.engRatioMin, th.competitividade.engRatioMax, 0, 9), 0, 9);

  // Crescimento relativo (0-6) — compares follower growth rate (BUG FIX)
  const growthRatio = avgCompGrowthRate !== 0 ? brandGrowthRate / Math.abs(avgCompGrowthRate) : 1;
  const growthRelScore = clamp(mapRange(growthRatio, th.competitividade.engRatioMin, th.competitividade.engRatioMax, 0, 6), 0, 6);

  // Volume relativo (0-4)
  const postRatio = avgCompVolume > 0 ? brandPosts90d.length / avgCompVolume : 1;
  const volumeRelScore = clamp(mapRange(postRatio, th.competitividade.engRatioMin, th.competitividade.engRatioMax, 0, 4), 0, 4);

  // Share of engagement (0-6)
  const totalEngAll = allTotalEng + brandTotalEng;
  const shareOfEng = totalEngAll > 0 ? brandTotalEng / totalEngAll : 0.5;
  const expectedShare = 1 / (compMetrics.length + 1);
  const shareRatio = expectedShare > 0 ? shareOfEng / expectedShare : 1;
  const shareScore = clamp(mapRange(shareRatio, 0.3, 2, 0, 6), 0, 6);

  return engRelScore + growthRelScore + volumeRelScore + shareScore;
}

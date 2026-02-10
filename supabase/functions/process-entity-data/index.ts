import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Post {
  id: string;
  caption: string | null;
  likes_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  engagement_total: number | null;
  post_type: string | null;
  posted_at: string | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  shortcode: string | null;
  post_url: string | null;
  is_pinned: boolean | null;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function computeMetrics(posts: Post[], profile: any) {
  const totalPosts = posts.length;
  const likes = posts.map((p) => p.likes_count ?? 0);
  const comments = posts.map((p) => p.comments_count ?? 0);
  const views = posts.map((p) => p.views_count ?? 0);
  const engagements = posts.map((p) => p.engagement_total ?? 0);

  const totalLikes = likes.reduce((a, b) => a + b, 0);
  const totalComments = comments.reduce((a, b) => a + b, 0);
  const totalViews = views.reduce((a, b) => a + b, 0);
  const totalEngagement = engagements.reduce((a, b) => a + b, 0);
  const avgLikes = totalPosts ? totalLikes / totalPosts : 0;
  const medianLikes = median(likes);
  const avgComments = totalPosts ? totalComments / totalPosts : 0;
  const avgEngagement = totalPosts ? totalEngagement / totalPosts : 0;
  const followers = profile?.followers_count ?? 0;
  const engagementRate = followers > 0 ? (avgEngagement / followers) * 100 : 0;

  // Top/bottom posts
  const byLikes = [...posts].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0));
  const byComments = [...posts].sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0));
  const topPostsLikes = byLikes.slice(0, 10);
  const topPostsComments = byComments.slice(0, 10);
  const bottomPostsLikes = byLikes.slice(-10).reverse();

  // Monthly distribution
  const monthlyMap: Record<string, { posts: number; likes: number; comments: number }> = {};
  const yearlyMap: Record<string, { posts: number; likes: number; comments: number }> = {};

  for (const p of posts) {
    if (!p.posted_at) continue;
    const d = new Date(p.posted_at);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = `${d.getFullYear()}`;

    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { posts: 0, likes: 0, comments: 0 };
    monthlyMap[monthKey].posts++;
    monthlyMap[monthKey].likes += p.likes_count ?? 0;
    monthlyMap[monthKey].comments += p.comments_count ?? 0;

    if (!yearlyMap[yearKey]) yearlyMap[yearKey] = { posts: 0, likes: 0, comments: 0 };
    yearlyMap[yearKey].posts++;
    yearlyMap[yearKey].likes += p.likes_count ?? 0;
    yearlyMap[yearKey].comments += p.comments_count ?? 0;
  }

  const monthlyDistribution = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      ...v,
      avgLikes: v.posts ? Math.round(v.likes / v.posts) : 0,
    }));

  const yearlyDistribution = Object.entries(yearlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({
      year,
      ...v,
      avgLikes: v.posts ? Math.round(v.likes / v.posts) : 0,
    }));

  // Post type distribution
  const typeMap: Record<string, { count: number; likes: number; comments: number }> = {};
  for (const p of posts) {
    const t = p.post_type || "Unknown";
    if (!typeMap[t]) typeMap[t] = { count: 0, likes: 0, comments: 0 };
    typeMap[t].count++;
    typeMap[t].likes += p.likes_count ?? 0;
    typeMap[t].comments += p.comments_count ?? 0;
  }
  const typeDistribution = Object.entries(typeMap).map(([type, v]) => ({
    type,
    ...v,
    avgLikes: v.count ? Math.round(v.likes / v.count) : 0,
    avgComments: v.count ? Math.round(v.comments / v.count) : 0,
  }));

  // Top hashtags
  const hashtagCount: Record<string, number> = {};
  for (const p of posts) {
    for (const h of p.hashtags ?? []) {
      const tag = h.toLowerCase().replace(/^#/, "");
      if (tag) hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
    }
  }
  const topHashtags = Object.entries(hashtagCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  // Day of week distribution
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const dayMap: Record<string, { posts: number; likes: number }> = {};
  for (const name of dayNames) dayMap[name] = { posts: 0, likes: 0 };
  for (const p of posts) {
    if (!p.posted_at) continue;
    const day = dayNames[new Date(p.posted_at).getDay()];
    dayMap[day].posts++;
    dayMap[day].likes += p.likes_count ?? 0;
  }
  const dayOfWeekDistribution = dayNames.map((name) => ({
    day: name,
    ...dayMap[name],
    avgLikes: dayMap[name].posts ? Math.round(dayMap[name].likes / dayMap[name].posts) : 0,
  }));

  // Hour distribution
  const hourMap: Record<number, { posts: number; likes: number }> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = { posts: 0, likes: 0 };
  for (const p of posts) {
    if (!p.posted_at) continue;
    const hour = new Date(p.posted_at).getHours();
    hourMap[hour].posts++;
    hourMap[hour].likes += p.likes_count ?? 0;
  }
  const hourDistribution = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    ...hourMap[h],
    avgLikes: hourMap[h].posts ? Math.round(hourMap[h].likes / hourMap[h].posts) : 0,
  }));

  // Viral posts (engagement > 2x average)
  const viralThreshold = avgEngagement * 2;
  const viralPosts = posts.filter((p) => (p.engagement_total ?? 0) > viralThreshold);

  // Growth trend
  const sortedMonths = monthlyDistribution;
  let growthTrend = null;
  if (sortedMonths.length >= 6) {
    const half = Math.floor(sortedMonths.length / 2);
    const firstHalf = sortedMonths.slice(0, half);
    const secondHalf = sortedMonths.slice(half);
    const avgFirst = firstHalf.reduce((s, m) => s + m.avgLikes, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + m.avgLikes, 0) / secondHalf.length;
    growthTrend = {
      firstPeriodAvg: Math.round(avgFirst),
      secondPeriodAvg: Math.round(avgSecond),
      growthPercent: avgFirst > 0 ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100) : 0,
    };
  }

  return {
    bigNumbers: {
      totalPosts,
      totalLikes,
      totalComments,
      totalViews,
      totalEngagement,
      avgLikes: Math.round(avgLikes * 10) / 10,
      medianLikes,
      avgComments: Math.round(avgComments * 10) / 10,
      avgEngagement: Math.round(avgEngagement),
      followers,
      engagementRate: Math.round(engagementRate * 100) / 100,
      viralHits: viralPosts.length,
      viralRate: totalPosts ? Math.round((viralPosts.length / totalPosts) * 1000) / 10 : 0,
    },
    topPostsLikes: topPostsLikes.map(formatPost),
    topPostsComments: topPostsComments.map(formatPost),
    bottomPostsLikes: bottomPostsLikes.map(formatPost),
    monthlyDistribution,
    yearlyDistribution,
    typeDistribution,
    topHashtags,
    dayOfWeekDistribution,
    hourDistribution,
    growthTrend,
    profileInfo: profile
      ? {
          handle: profile.handle,
          bio: profile.bio,
          followers: profile.followers_count,
          following: profile.following_count,
          postsCount: profile.posts_count,
          isVerified: profile.is_verified,
          profilePicUrl: profile.profile_pic_url,
        }
      : null,
  };
}

function formatPost(p: Post) {
  return {
    id: p.id,
    caption: p.caption?.slice(0, 200) ?? null,
    likes: p.likes_count ?? 0,
    comments: p.comments_count ?? 0,
    views: p.views_count ?? 0,
    engagement: p.engagement_total ?? 0,
    type: p.post_type,
    postedAt: p.posted_at,
    shortcode: p.shortcode,
    url: p.post_url,
  };
}

async function fetchAllPosts(supabase: any, entityId: string): Promise<Post[]> {
  const allPosts: Post[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("instagram_posts")
      .select("id, caption, likes_count, comments_count, views_count, engagement_total, post_type, posted_at, hashtags, mentions, shortcode, post_url, is_pinned")
      .eq("entity_id", entityId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to fetch posts: ${error.message}`);
    if (!data || data.length === 0) break;
    allPosts.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allPosts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entity_id, project_id, use_ai = true } = await req.json();
    if (!entity_id || !project_id) {
      return new Response(JSON.stringify({ error: "entity_id and project_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all posts (paginated)
    console.log(`Fetching all posts for entity ${entity_id}...`);
    const posts = await fetchAllPosts(supabase, entity_id);
    console.log(`Fetched ${posts.length} posts`);

    if (!posts.length) {
      return new Response(JSON.stringify({ error: "No posts found for this entity" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest profile
    const { data: profile } = await supabase
      .from("instagram_profiles")
      .select("*")
      .eq("entity_id", entity_id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    // Compute metrics
    console.log("Computing metrics...");
    const computed = computeMetrics(posts, profile);

    let aiAnalysis: string | null = null;
    let modelUsed = "none";

    if (use_ai) {
      const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!anthropicKey) {
        console.warn("ANTHROPIC_API_KEY not set, skipping AI analysis");
      } else {
        console.log("Generating AI analysis...");
        modelUsed = "claude-opus-4-6";

        const prompt = `Você é um analista de marketing digital especializado em Instagram. Analise os dados abaixo de uma conta do Instagram e gere um relatório completo em português brasileiro.

## Dados da Conta
${computed.profileInfo ? `- Handle: @${computed.profileInfo.handle}\n- Seguidores: ${computed.profileInfo.followers?.toLocaleString()}\n- Bio: ${computed.profileInfo.bio || "N/A"}` : "Perfil não disponível"}

## Big Numbers
- Total de posts: ${computed.bigNumbers.totalPosts}
- Total de likes: ${computed.bigNumbers.totalLikes.toLocaleString()}
- Total de comentários: ${computed.bigNumbers.totalComments.toLocaleString()}
- Total de views: ${computed.bigNumbers.totalViews.toLocaleString()}
- Média de likes/post: ${computed.bigNumbers.avgLikes}
- Mediana de likes/post: ${computed.bigNumbers.medianLikes}
- Média de comentários/post: ${computed.bigNumbers.avgComments}
- Taxa de engajamento: ${computed.bigNumbers.engagementRate}%
- Posts virais (>2x média): ${computed.bigNumbers.viralHits} (${computed.bigNumbers.viralRate}%)

## Distribuição por Tipo
${computed.typeDistribution.map((t) => `- ${t.type}: ${t.count} posts, avg ${t.avgLikes} likes`).join("\n")}

## Top 20 Hashtags
${computed.topHashtags.map((h) => `- #${h.tag}: ${h.count}x`).join("\n")}

## Tendência de Crescimento
${computed.growthTrend ? `Primeira metade: avg ${computed.growthTrend.firstPeriodAvg} likes/post\nSegunda metade: avg ${computed.growthTrend.secondPeriodAvg} likes/post\nCrescimento: ${computed.growthTrend.growthPercent}%` : "Dados insuficientes"}

## Top 10 Posts (por likes)
${computed.topPostsLikes.map((p, i) => `${i + 1}. ${p.likes} likes, ${p.comments} comments - "${p.caption?.slice(0, 100)}..."`).join("\n")}

## Bottom 10 Posts (por likes)
${computed.bottomPostsLikes.map((p, i) => `${i + 1}. ${p.likes} likes, ${p.comments} comments - "${p.caption?.slice(0, 100)}..."`).join("\n")}

## Distribuição Mensal (últimos 12 meses)
${computed.monthlyDistribution.slice(-12).map((m) => `- ${m.month}: ${m.posts} posts, ${m.likes} likes, avg ${m.avgLikes}`).join("\n")}

## Melhor Dia da Semana
${computed.dayOfWeekDistribution.map((d) => `- ${d.day}: ${d.posts} posts, avg ${d.avgLikes} likes`).join("\n")}

---

Gere um relatório com as seguintes seções em markdown:

1. **Resumo Executivo** (2-3 parágrafos narrativos)
2. **Insights de Performance** (bullets com dados e interpretação)
3. **Análise de Conteúdo** (padrões nos top posts, tipos que funcionam, hashtags)
4. **Análise Temporal** (sazonalidade, tendências, melhores dias/horários)
5. **Recomendações Estratégicas** (5-7 recomendações priorizadas e acionáveis)

Seja específico, use dados numéricos, e foque em insights acionáveis.`;

        try {
          const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "content-type": "application/json",
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-opus-4-6",
              max_tokens: 4096,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error("Anthropic API error:", aiResponse.status, errText);
            // Fallback to sonnet
            console.log("Trying fallback to claude-sonnet-4-20250514...");
            modelUsed = "claude-sonnet-4-20250514";
            const fallbackResponse = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": anthropicKey,
                "content-type": "application/json",
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }],
              }),
            });
            if (fallbackResponse.ok) {
              const fbData = await fallbackResponse.json();
              aiAnalysis = fbData.content?.[0]?.text ?? null;
            } else {
              console.error("Fallback also failed");
              modelUsed = "none";
            }
          } else {
            const aiData = await aiResponse.json();
            aiAnalysis = aiData.content?.[0]?.text ?? null;
          }
        } catch (aiErr) {
          console.error("AI call failed:", aiErr);
          modelUsed = "none";
        }
      }
    }

    // Save report
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const { data: report, error: insertError } = await supabase
      .from("entity_reports")
      .insert({
        entity_id,
        project_id,
        computed_metrics: computed,
        ai_analysis: aiAnalysis,
        model_used: modelUsed,
        posts_analyzed: posts.length,
        created_by: userId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save report", details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        report_id: report.id,
        posts_analyzed: posts.length,
        model_used: modelUsed,
        has_ai_analysis: !!aiAnalysis,
        computed_metrics: computed,
        ai_analysis: aiAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

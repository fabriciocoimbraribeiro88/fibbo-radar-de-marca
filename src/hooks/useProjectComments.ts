import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommentWithPost {
  id: string;
  text: string | null;
  username: string | null;
  sentiment: string | null;
  sentiment_category: string | null;
  likes_count: number | null;
  commented_at: string | null;
  post_id: string | null;
  post_url?: string | null;
  shortcode?: string | null;
}

export interface SentimentMetrics {
  total: number;
  analyzed: number;
  positive: number;
  neutral: number;
  negative: number;
  percentPositive: number;
  percentNeutral: number;
  percentNegative: number;
  score: number; // 0-10
  categories: Record<string, number>;
  topNegative: CommentWithPost[];
}

export function useEntityComments(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-comments", entityId],
    enabled: !!entityId,
    queryFn: async () => {
      if (!entityId) return [];

      // Get post IDs for this entity
      const { data: posts } = await supabase
        .from("instagram_posts")
        .select("id, post_url, shortcode")
        .eq("entity_id", entityId);

      if (!posts || posts.length === 0) return [];

      const postMap = new Map(posts.map((p) => [p.id, p]));
      const postIds = posts.map((p) => p.id);

      // Fetch comments in pages
      const PAGE = 1000;
      let all: CommentWithPost[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("instagram_comments")
          .select("id, text, username, sentiment, sentiment_category, likes_count, commented_at, post_id")
          .in("post_id", postIds)
          .range(offset, offset + PAGE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const c of data) {
          const post = c.post_id ? postMap.get(c.post_id) : null;
          all.push({
            ...c,
            post_url: post?.post_url ?? null,
            shortcode: post?.shortcode ?? null,
          });
        }

        if (data.length < PAGE) break;
        offset += PAGE;
      }

      return all;
    },
  });
}

export function computeSentimentMetrics(comments: CommentWithPost[]): SentimentMetrics {
  const analyzed = comments.filter((c) => c.sentiment);
  const positive = analyzed.filter((c) => c.sentiment === "positive").length;
  const neutral = analyzed.filter((c) => c.sentiment === "neutral").length;
  const negative = analyzed.filter((c) => c.sentiment === "negative").length;
  const total = comments.length;
  const analyzedCount = analyzed.length;

  const pctPos = analyzedCount > 0 ? (positive / analyzedCount) * 100 : 0;
  const pctNeu = analyzedCount > 0 ? (neutral / analyzedCount) * 100 : 0;
  const pctNeg = analyzedCount > 0 ? (negative / analyzedCount) * 100 : 0;

  // Score 0-10: weighted formula
  const score = analyzedCount > 0
    ? Math.round(((positive * 10 + neutral * 5 + negative * 0) / analyzedCount) * 10) / 10
    : 0;

  // Category counts
  const categories: Record<string, number> = {};
  for (const c of analyzed) {
    if (c.sentiment_category) {
      categories[c.sentiment_category] = (categories[c.sentiment_category] || 0) + 1;
    }
  }

  // Top negative comments sorted by likes
  const topNegative = comments
    .filter((c) => c.sentiment === "negative")
    .sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))
    .slice(0, 5);

  return {
    total,
    analyzed: analyzedCount,
    positive,
    neutral,
    negative,
    percentPositive: Math.round(pctPos * 10) / 10,
    percentNeutral: Math.round(pctNeu * 10) / 10,
    percentNegative: Math.round(pctNeg * 10) / 10,
    score,
    categories,
    topNegative,
  };
}

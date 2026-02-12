import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntityDataSummaryItem {
  entityId: string;
  totalPosts: number;
  oldestPostDate: string | null;
  newestPostDate: string | null;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;
  postTypes: string[];
  postsWithHashtags: number;
  realCommentsCount: number;
  commentsWithSentiment: number;
  followers: number | null;
}

export function useEntityDataSummary(entityIds: string[]) {
  return useQuery({
    queryKey: ["entity-data-summary", entityIds],
    queryFn: async () => {
      if (!entityIds.length) return new Map<string, EntityDataSummaryItem>();

      const result = new Map<string, EntityDataSummaryItem>();

      // Run queries for all entities in parallel
      const [postsResults, commentsResults, profilesResults] = await Promise.all([
        // Posts per entity
        Promise.all(
          entityIds.map(async (eid) => {
            const { data } = await supabase
              .from("instagram_posts")
              .select("posted_at, likes_count, comments_count, views_count, saves_count, shares_count, post_type, hashtags")
              .eq("entity_id", eid);
            return { entityId: eid, posts: data ?? [] };
          })
        ),
        // Comments per entity (via post_ids)
        Promise.all(
          entityIds.map(async (eid) => {
            // Get post ids for this entity
            const { data: postRows } = await supabase
              .from("instagram_posts")
              .select("id")
              .eq("entity_id", eid);
            const postIds = postRows?.map((p) => p.id) ?? [];
            if (!postIds.length) return { entityId: eid, total: 0, withSentiment: 0 };

            // Count comments in batches (supabase .in() has limits)
            let total = 0;
            let withSentiment = 0;
            const PAGE = 1000;
            for (let i = 0; i < postIds.length; i += PAGE) {
              const batch = postIds.slice(i, i + PAGE);
              const { count: totalCount } = await supabase
                .from("instagram_comments")
                .select("id", { count: "exact", head: true })
                .in("post_id", batch);
              total += totalCount ?? 0;

              const { count: sentCount } = await supabase
                .from("instagram_comments")
                .select("id", { count: "exact", head: true })
                .in("post_id", batch)
                .not("sentiment", "is", null);
              withSentiment += sentCount ?? 0;
            }
            return { entityId: eid, total, withSentiment };
          })
        ),
        // Latest profile per entity
        Promise.all(
          entityIds.map(async (eid) => {
            const { data } = await supabase
              .from("instagram_profiles")
              .select("followers_count")
              .eq("entity_id", eid)
              .order("snapshot_date", { ascending: false })
              .limit(1);
            return { entityId: eid, followers: data?.[0]?.followers_count ?? null };
          })
        ),
      ]);

      // Assemble results
      for (const { entityId, posts } of postsResults) {
        const dates = posts
          .map((p) => p.posted_at)
          .filter(Boolean)
          .sort() as string[];

        const typesSet = new Set<string>();
        let postsWithHashtags = 0;
        let totalLikes = 0, totalComments = 0, totalViews = 0, totalSaves = 0, totalShares = 0;

        for (const p of posts) {
          totalLikes += p.likes_count ?? 0;
          totalComments += p.comments_count ?? 0;
          totalViews += p.views_count ?? 0;
          totalSaves += p.saves_count ?? 0;
          totalShares += p.shares_count ?? 0;
          if (p.post_type) typesSet.add(p.post_type);
          if (p.hashtags && (p.hashtags as string[]).length > 0) postsWithHashtags++;
        }

        const commentData = commentsResults.find((c) => c.entityId === entityId);
        const profileData = profilesResults.find((p) => p.entityId === entityId);

        result.set(entityId, {
          entityId,
          totalPosts: posts.length,
          oldestPostDate: dates[0] ?? null,
          newestPostDate: dates[dates.length - 1] ?? null,
          totalLikes,
          totalComments,
          totalViews,
          totalSaves,
          totalShares,
          postTypes: Array.from(typesSet),
          postsWithHashtags,
          realCommentsCount: commentData?.total ?? 0,
          commentsWithSentiment: commentData?.withSentiment ?? 0,
          followers: profileData?.followers ?? null,
        });
      }

      return result;
    },
    enabled: entityIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

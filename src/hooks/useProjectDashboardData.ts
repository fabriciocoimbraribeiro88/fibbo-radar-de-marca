import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EntityInfo {
  id: string;
  name: string;
  handle: string | null;
  type: string;
  role: string;
  color: string;
}

export interface PostData {
  entity_id: string;
  post_type: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  engagement_total: number;
  hashtags: string[] | null;
  posted_at: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  post_url: string | null;
}

export interface ProfileSnapshot {
  entity_id: string;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  snapshot_date: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

const ENTITY_COLORS: Record<string, string> = {
  brand: "hsl(18, 79%, 50%)",
  competitor_0: "#ef4444",
  competitor_1: "#3b82f6",
  competitor_2: "#10b981",
  competitor_3: "#f59e0b",
  competitor_4: "#06b6d4",
  influencer: "#8b5cf6",
  inspiration: "#ec4899",
};

function assignColor(type: string, role: string, index: number): string {
  if (role === "brand" || type === "brand") return ENTITY_COLORS.brand;
  if (type === "influencer") return ENTITY_COLORS.influencer;
  if (type === "inspiration") return ENTITY_COLORS.inspiration;
  const key = `competitor_${index % 5}`;
  return ENTITY_COLORS[key] ?? ENTITY_COLORS.competitor_0;
}

export function useProjectDashboardData(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-dashboard-full", projectId],
    queryFn: async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("instagram_handle, brand_name, name")
        .eq("id", projectId!)
        .single();

      const { data: projectEntities } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role, monitored_entities(id, name, instagram_handle, type)")
        .eq("project_id", projectId!);

      if (!projectEntities?.length)
        return { entities: [] as EntityInfo[], posts: [] as PostData[], profiles: [] as ProfileSnapshot[], brandEntityId: null, projectName: project?.name ?? "" };

      const brandHandle = project?.instagram_handle?.replace("@", "").toLowerCase() ?? null;
      const entityIds = projectEntities.map((pe) => pe.entity_id);

      let brandEntityId: string | null = null;
      let competitorIdx = 0;
      const entities: EntityInfo[] = [];

      for (const pe of projectEntities) {
        const entity = pe.monitored_entities as unknown as {
          id: string; name: string; instagram_handle: string | null; type: string;
        };
        if (!entity) continue;
        const handleNorm = entity.instagram_handle?.replace("@", "").toLowerCase() ?? "";
        const isBrand = (pe.entity_role === "brand") || (brandHandle && handleNorm === brandHandle);
        if (isBrand) brandEntityId = pe.entity_id;

        const color = isBrand
          ? ENTITY_COLORS.brand
          : assignColor(entity.type, pe.entity_role, competitorIdx);
        if (!isBrand && entity.type === "competitor") competitorIdx++;

        entities.push({
          id: pe.entity_id,
          name: entity.name,
          handle: entity.instagram_handle,
          type: entity.type,
          role: isBrand ? "brand" : pe.entity_role,
          color,
        });
      }

      entities.sort((a, b) => (a.role === "brand" ? -1 : b.role === "brand" ? 1 : 0));

      const [{ data: posts }, { data: profiles }] = await Promise.all([
        supabase.from("instagram_posts")
          .select("entity_id, likes_count, comments_count, views_count, engagement_total, post_type, hashtags, posted_at, caption, thumbnail_url, post_url")
          .in("entity_id", entityIds)
          .order("posted_at", { ascending: true }),
        supabase.from("instagram_profiles")
          .select("entity_id, followers_count, following_count, posts_count, snapshot_date")
          .in("entity_id", entityIds)
          .order("snapshot_date", { ascending: true }),
      ]);

      const enrichedPosts: PostData[] = (posts ?? []).map((p) => ({
        entity_id: p.entity_id ?? "",
        post_type: p.post_type,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        views_count: p.views_count ?? 0,
        engagement_total: p.engagement_total ?? 0,
        hashtags: p.hashtags,
        posted_at: p.posted_at,
        caption: p.caption,
        thumbnail_url: p.thumbnail_url ?? null,
        post_url: p.post_url ?? null,
      }));

      const enrichedProfiles: ProfileSnapshot[] = (profiles ?? []).map((p) => ({
        entity_id: p.entity_id ?? "",
        followers_count: p.followers_count,
        following_count: p.following_count,
        posts_count: p.posts_count,
        snapshot_date: p.snapshot_date,
      }));

      return { entities, posts: enrichedPosts, profiles: enrichedProfiles, brandEntityId, projectName: project?.name ?? "" };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/* ── Derived metrics ── */

export type PostLimit = number | "all";

export function useLimitedPosts(posts: PostData[], limit: PostLimit) {
  return useMemo(() => {
    if (!posts?.length) return [];
    const sorted = [...posts].sort((a, b) => {
      const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return db - da;
    });
    return limit === "all" ? sorted : sorted.slice(0, limit);
  }, [posts, limit]);
}

export interface EntityMetrics {
  entityId: string;
  name: string;
  handle: string | null;
  color: string;
  type: string;
  role: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  avgLikes: number;
  avgComments: number;
  avgEngagement: number;
  followers: number;
  engagementRate: number;
  postTypes: Record<string, number>;
  hashtags: Record<string, number>;
  viralHits: number;
  viralRate: number;
}

export function useEntityMetrics(
  filteredPosts: PostData[],
  profiles: ProfileSnapshot[],
  entities: EntityInfo[]
) {
  return useMemo(() => {
    const metricsMap: Record<string, EntityMetrics> = {};

    for (const e of entities) {
      metricsMap[e.id] = {
        entityId: e.id,
        name: e.name,
        handle: e.handle,
        color: e.color,
        type: e.type,
        role: e.role,
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        avgLikes: 0,
        avgComments: 0,
        avgEngagement: 0,
        followers: 0,
        engagementRate: 0,
        postTypes: {},
        hashtags: {},
        viralHits: 0,
        viralRate: 0,
      };
    }

    for (const p of profiles) {
      if (p.entity_id && metricsMap[p.entity_id]) {
        metricsMap[p.entity_id].followers = p.followers_count ?? 0;
      }
    }

    // Group posts by entity for viral calculation
    const postsByEntity: Record<string, PostData[]> = {};
    for (const p of filteredPosts) {
      const m = metricsMap[p.entity_id];
      if (!m) continue;
      m.totalPosts++;
      m.totalLikes += p.likes_count;
      m.totalComments += p.comments_count;
      m.totalViews += p.views_count;

      const pt = p.post_type ?? "Unknown";
      m.postTypes[pt] = (m.postTypes[pt] ?? 0) + 1;

      if (p.hashtags) {
        for (const h of p.hashtags) {
          const tag = h.toLowerCase().replace(/^#/, "");
          if (tag) m.hashtags[tag] = (m.hashtags[tag] ?? 0) + 1;
        }
      }

      if (!postsByEntity[p.entity_id]) postsByEntity[p.entity_id] = [];
      postsByEntity[p.entity_id].push(p);
    }

    const result: EntityMetrics[] = [];
    for (const e of entities) {
      const m = metricsMap[e.id];
      if (m.totalPosts > 0) {
        m.avgLikes = Math.round(m.totalLikes / m.totalPosts);
        m.avgComments = Math.round(m.totalComments / m.totalPosts);
        m.avgEngagement = Math.round((m.totalLikes + m.totalComments) / m.totalPosts);

        // Viral hits: posts with engagement > 2x avg
        const entityPosts = postsByEntity[e.id] ?? [];
        m.viralHits = entityPosts.filter((p) => p.engagement_total > m.avgEngagement * 2).length;
        m.viralRate = (m.viralHits / m.totalPosts) * 100;
      }
      if (m.followers > 0) {
        m.engagementRate = ((m.totalLikes + m.totalComments) / m.totalPosts / m.followers) * 100 || 0;
      }
      result.push(m);
    }

    return result;
  }, [filteredPosts, profiles, entities]);
}

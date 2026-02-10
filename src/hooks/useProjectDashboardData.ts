import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */

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

export type PostLimit = number | "all";

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
  following: number;
  engagementRate: number;
  postTypes: Record<string, number>;
  hashtags: Record<string, number>;
  viralHits: number;
  viralRate: number;
}

/* ── Color palette ── */

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

/* ── Paginated fetch helper (server caps at 1000 rows) ── */

async function fetchAllPostsForEntity(entityId: string) {
  const PAGE = 1000;
  const columns =
    "entity_id, likes_count, comments_count, views_count, engagement_total, post_type, hashtags, posted_at, caption, thumbnail_url, post_url";
  let all: any[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from("instagram_posts")
      .select(columns)
      .eq("entity_id", entityId)
      .order("posted_at", { ascending: true })
      .range(from, from + PAGE - 1);

    const rows = data ?? [];
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
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

      if (!projectEntities?.length) {
        return {
          entities: [] as EntityInfo[],
          posts: [] as PostData[],
          profiles: [] as ProfileSnapshot[],
          brandEntityId: null as string | null,
          projectName: project?.name ?? "",
        };
      }

      const brandHandle = project?.instagram_handle?.replace("@", "").toLowerCase() ?? null;
      const entityIds = projectEntities.map((pe) => pe.entity_id);

      let brandEntityId: string | null = null;
      let competitorIdx = 0;
      const entities: EntityInfo[] = [];

      for (const pe of projectEntities) {
        const entity = pe.monitored_entities as unknown as {
          id: string;
          name: string;
          instagram_handle: string | null;
          type: string;
        };
        if (!entity) continue;

        const handleNorm = entity.instagram_handle?.replace("@", "").toLowerCase() ?? "";
        const isBrand =
          pe.entity_role === "brand" || (brandHandle && handleNorm === brandHandle);
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

      // Fetch ALL posts per entity (paginated) + profiles in parallel
      const [postArrays, { data: profiles }] = await Promise.all([
        Promise.all(entityIds.map(fetchAllPostsForEntity)),
        supabase
          .from("instagram_profiles")
          .select("entity_id, followers_count, following_count, posts_count, snapshot_date")
          .in("entity_id", entityIds)
          .order("snapshot_date", { ascending: true }),
      ]);

      const posts = postArrays.flat();
      const enrichedPosts: PostData[] = posts.map((p) => ({
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

      return {
        entities,
        posts: enrichedPosts,
        profiles: enrichedProfiles,
        brandEntityId,
        projectName: project?.name ?? "",
      };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/* ── Filter posts by date range and limit ── */

export function useFilteredAndLimitedPosts(
  posts: PostData[],
  dateRange: DateRange,
  limit: PostLimit
) {
  return useMemo(() => {
    if (!posts?.length) return [];

    const filtered = posts.filter((p) => {
      if (!p.posted_at) return false;
      const d = new Date(p.posted_at);
      return d >= dateRange.from && d <= dateRange.to;
    });

    if (limit === "all") {
      return [...filtered].sort((a, b) => {
        const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return db - da;
      });
    }

    // Apply limit PER ENTITY so every entity gets fair representation
    const byEntity = new Map<string, PostData[]>();
    for (const p of filtered) {
      const arr = byEntity.get(p.entity_id) ?? [];
      arr.push(p);
      byEntity.set(p.entity_id, arr);
    }

    const result: PostData[] = [];
    for (const [, entityPosts] of byEntity) {
      entityPosts.sort((a, b) => {
        const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return db - da;
      });
      result.push(...entityPosts.slice(0, limit));
    }

    return result.sort((a, b) => {
      const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return db - da;
    });
  }, [posts, dateRange, limit]);
}

/* ── Compute per-entity metrics from filtered posts ── */

export function useEntityMetrics(
  entities: EntityInfo[],
  filteredPosts: PostData[],
  profiles: ProfileSnapshot[]
): EntityMetrics[] {
  return useMemo(() => {
    if (!entities?.length) return [];

    return entities.map((entity) => {
      const entityPosts = filteredPosts.filter((p) => p.entity_id === entity.id);
      const total = entityPosts.length;

      const totalLikes = entityPosts.reduce((s, p) => s + p.likes_count, 0);
      const totalComments = entityPosts.reduce((s, p) => s + p.comments_count, 0);
      const totalViews = entityPosts.reduce((s, p) => s + p.views_count, 0);

      const avgLikes = total > 0 ? Math.round(totalLikes / total) : 0;
      const avgComments = total > 0 ? Math.round(totalComments / total) : 0;
      const avgEngagement = total > 0 ? Math.round((totalLikes + totalComments) / total) : 0;

      // Latest profile snapshot
      const entityProfiles = profiles
        .filter((p) => p.entity_id === entity.id)
        .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
      const latestProfile = entityProfiles[0];
      const followers = latestProfile?.followers_count ?? 0;
      const following = latestProfile?.following_count ?? 0;

      // Engagement rate
      const engagementRate =
        followers > 0 && total > 0
          ? ((totalLikes + totalComments) / total / followers) * 100
          : 0;

      // Post type distribution
      const postTypes: Record<string, number> = {};
      entityPosts.forEach((p) => {
        const t = p.post_type ?? "Unknown";
        postTypes[t] = (postTypes[t] ?? 0) + 1;
      });

      // Hashtag frequency
      const hashtags: Record<string, number> = {};
      entityPosts.forEach((p) => {
        (p.hashtags ?? []).forEach((h) => {
          const tag = h.replace(/^#/, "").toLowerCase();
          if (tag) hashtags[tag] = (hashtags[tag] ?? 0) + 1;
        });
      });

      // Viral hits: posts with engagement > 2x the entity average
      const viralHits = total > 0
        ? entityPosts.filter((p) => (p.likes_count + p.comments_count) > avgEngagement * 2).length
        : 0;
      const viralRate = total > 0 ? (viralHits / total) * 100 : 0;

      return {
        entityId: entity.id,
        name: entity.name,
        handle: entity.handle,
        color: entity.color,
        type: entity.type,
        role: entity.role,
        totalPosts: total,
        totalLikes,
        totalComments,
        totalViews,
        avgLikes,
        avgComments,
        avgEngagement,
        followers,
        following,
        engagementRate,
        postTypes,
        hashtags,
        viralHits,
        viralRate,
      };
    });
  }, [entities, filteredPosts, profiles]);
}

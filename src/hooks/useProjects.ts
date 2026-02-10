import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProjects() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_members(count), project_entities(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export interface DashboardStats {
  projects_count: number;
  entities_count: number;
  analyses_count: number;
  approved_analyses: number;
  posts_count: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_engagement: number;
  avg_engagement: number;
  profiles_count: number;
  total_followers: number;
  ads_count: number;
  recent_posts: Array<{
    id: string;
    caption: string | null;
    likes_count: number | null;
    comments_count: number | null;
    views_count: number | null;
    engagement_total: number | null;
    post_type: string | null;
    posted_at: string | null;
    shortcode: string | null;
    entity_name: string;
    instagram_handle: string | null;
  }>;
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as DashboardStats;
    },
    enabled: !!user,
  });
}

// Keep old hook for backward compat
export function useProjectStats() {
  const { data, ...rest } = useDashboardStats();
  return {
    ...rest,
    data: data
      ? {
          projects: data.projects_count,
          entities: data.entities_count,
          analyses: data.analyses_count,
          posts: data.posts_count,
        }
      : undefined,
  };
}

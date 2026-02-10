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

export function useProjectStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project-stats", user?.id],
    queryFn: async () => {
      const [projectsRes, entitiesRes, analysesRes, postsRes] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("monitored_entities").select("id", { count: "exact", head: true }),
        supabase.from("analyses").select("id", { count: "exact", head: true }),
        supabase.from("instagram_posts").select("id", { count: "exact", head: true }),
      ]);

      return {
        projects: projectsRes.count ?? 0,
        entities: entitiesRes.count ?? 0,
        analyses: analysesRes.count ?? 0,
        posts: postsRes.count ?? 0,
      };
    },
    enabled: !!user,
  });
}

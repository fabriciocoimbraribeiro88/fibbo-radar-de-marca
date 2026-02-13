import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SocialChannel } from "@/lib/fibboScoreConfig";

export interface FibboScore {
  id: string;
  project_id: string;
  entity_id: string | null;
  score_date: string;
  total_score: number;
  presenca_score: number;
  engajamento_score: number;
  conteudo_score: number;
  competitividade_score: number;
  metrics_snapshot: any;
  created_at: string | null;
  channel: string | null;
}

export interface FibboScoreWithEntity extends FibboScore {
  entity_name: string;
  entity_handle: string | null;
  entity_role: string;
}

export function useFibboScores(projectId: string | undefined) {
  return useQuery({
    queryKey: ["fibbo-scores", projectId],
    queryFn: async (): Promise<FibboScoreWithEntity[]> => {
      const { data: scores, error } = await supabase
        .from("fibbo_scores")
        .select("*")
        .eq("project_id", projectId!)
        .order("score_date", { ascending: false });
      if (error) throw error;
      if (!scores || scores.length === 0) return [];

      const entityIds = [...new Set(scores.map((s) => s.entity_id).filter(Boolean))] as string[];
      const [entitiesRes, peRes] = await Promise.all([
        supabase.from("monitored_entities").select("id, name, instagram_handle").in("id", entityIds),
        supabase.from("project_entities").select("entity_id, entity_role").eq("project_id", projectId!),
      ]);

      const entityMap = new Map((entitiesRes.data ?? []).map((e) => [e.id, e]));
      const roleMap = new Map((peRes.data ?? []).map((pe) => [pe.entity_id, pe.entity_role]));

      return scores.map((s) => {
        const entity = entityMap.get(s.entity_id ?? "");
        return {
          ...s,
          channel: (s as any).channel ?? "instagram",
          entity_name: entity?.name ?? "Desconhecido",
          entity_handle: entity?.instagram_handle ?? null,
          entity_role: roleMap.get(s.entity_id ?? "") ?? "brand",
        };
      });
    },
    enabled: !!projectId,
  });
}

export function useLatestFibboScores(projectId: string | undefined) {
  const { data, ...rest } = useFibboScores(projectId);

  // Get only the most recent score per entity+channel combo
  const latestScores = (() => {
    if (!data) return [];
    const seen = new Set<string>();
    return data.filter((s) => {
      const key = `${s.entity_id ?? "null"}_${s.channel ?? "instagram"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  return { data: latestScores, ...rest };
}

/** Returns latest channel-specific scores (excluding 'general') grouped by channel */
export function useLatestChannelScores(projectId: string | undefined) {
  const { data: latestScores, ...rest } = useLatestFibboScores(projectId);

  const channelScores = (latestScores ?? []).filter(
    (s) => s.channel && s.channel !== "general"
  );

  const generalScores = (latestScores ?? []).filter(
    (s) => s.channel === "general"
  );

  const activeChannels = [...new Set(channelScores.map((s) => s.channel as SocialChannel))];

  return {
    channelScores,
    generalScores,
    activeChannels,
    allLatest: latestScores,
    ...rest,
  };
}

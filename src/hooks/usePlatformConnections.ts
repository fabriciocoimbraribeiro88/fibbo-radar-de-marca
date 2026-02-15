import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PlatformType = "meta_ads" | "google_ads" | "tiktok_ads" | "ga4" | "search_console" | "semrush";
export type ConnectionStatus = "disconnected" | "connected" | "error";

export interface PlatformConnection {
  id: string;
  project_id: string;
  platform: PlatformType;
  status: ConnectionStatus;
  credentials_ref: string | null;
  account_id: string | null;
  account_name: string | null;
  last_sync_at: string | null;
  sync_frequency: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function usePlatformConnections(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["platform-connections", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as unknown as PlatformConnection[];
    },
    enabled: !!projectId,
  });

  const getConnection = (platform: PlatformType): PlatformConnection | undefined =>
    connections?.find((c) => c.platform === platform);

  const upsertConnection = useMutation({
    mutationFn: async ({ platform, status }: { platform: PlatformType; status: ConnectionStatus }) => {
      const existing = getConnection(platform);
      if (existing) {
        const { error } = await supabase
          .from("platform_connections")
          .update({ status })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_connections")
          .insert({ project_id: projectId!, platform, status } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-connections", projectId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const syncPlatform = useMutation({
    mutationFn: async (platform: PlatformType) => {
      const fnMap: Record<PlatformType, string> = {
        meta_ads: "sync-meta-ads",
        google_ads: "sync-google-ads",
        tiktok_ads: "sync-tiktok-ads",
        ga4: "sync-ga4",
        search_console: "sync-search-console",
        semrush: "sync-semrush",
      };
      const { data, error } = await supabase.functions.invoke(fnMap[platform], {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Sync failed");
      return data;
    },
    onSuccess: (_data, platform) => {
      queryClient.invalidateQueries({ queryKey: ["platform-connections", projectId] });
      toast({ title: "Sincronização concluída", description: `${platform} sincronizado com sucesso.` });
    },
    onError: (err: any) => {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    },
  });

  return {
    connections: connections ?? [],
    isLoading,
    getConnection,
    upsertConnection,
    syncPlatform,
  };
}

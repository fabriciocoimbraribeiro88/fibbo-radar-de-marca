import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram,
  Globe,
  Megaphone,
  Search,
  Database,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
} from "lucide-react";

const SOURCE_ICONS: Record<string, typeof Instagram> = {
  instagram_profile: Instagram,
  instagram_posts: Instagram,
  ads_library: Megaphone,
  seo: Search,
  website: Globe,
};

const SOURCE_LABELS: Record<string, string> = {
  instagram_profile: "Perfil Instagram",
  instagram_posts: "Posts Instagram",
  ads_library: "Biblioteca de Anúncios",
  seo: "SEO / Keywords",
  website: "Website",
};

const SCHEDULE_LABELS: Record<string, string> = {
  manual: "Manual",
  weekly: "Semanal",
  monthly: "Mensal",
};

export default function ProjectDataSources() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Fetch entities for this project
  const { data: entities } = useQuery({
    queryKey: ["project-entities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_entities")
        .select("*, monitored_entities(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch data fetch configs for all entities in the project
  const entityIds = entities?.map((e) => e.entity_id) ?? [];
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ["data-fetch-configs", projectId, entityIds],
    queryFn: async () => {
      if (!entityIds.length) return [];
      const { data, error } = await supabase
        .from("data_fetch_configs")
        .select("*, monitored_entities(name, instagram_handle)")
        .in("entity_id", entityIds);
      if (error) throw error;
      return data;
    },
    enabled: entityIds.length > 0,
  });

  // Fetch logs
  const configIds = configs?.map((c) => c.id) ?? [];
  const { data: logs } = useQuery({
    queryKey: ["data-fetch-logs", configIds],
    queryFn: async () => {
      if (!configIds.length) return [];
      const { data, error } = await supabase
        .from("data_fetch_logs")
        .select("*")
        .in("config_id", configIds)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: configIds.length > 0,
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ configId, schedule }: { configId: string; schedule: string }) => {
      const { error } = await supabase
        .from("data_fetch_configs")
        .update({ schedule })
        .eq("id", configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
      toast({ title: "Schedule atualizado!" });
    },
  });

  const executeNow = async (entityId: string, handle: string) => {
    setExecutingId(entityId);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instagram", {
        body: { entity_id: entityId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Coleta concluída!",
          description: `${data.records} registros coletados para @${handle.replace("@", "")}`,
        });
        queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
        queryClient.invalidateQueries({ queryKey: ["data-fetch-logs"] });
      } else {
        toast({ title: "Erro na coleta", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setExecutingId(null);
    }
  };

  const getLogsForConfig = (configId: string) =>
    logs?.filter((l) => l.config_id === configId).slice(0, 3) ?? [];

  if (configsLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  // Build a flat list of entity + source combos  
  const sourceRows = entities?.flatMap((pe) => {
    const e = pe.monitored_entities;
    if (!e) return [];
    const entityConfigs = configs?.filter((c) => c.entity_id === e.id) ?? [];

    if (entityConfigs.length === 0) {
      // If no configs, show a row for Instagram if handle exists
      if (e.instagram_handle) {
        return [{
          entityId: e.id,
          entityName: e.name,
          handle: e.instagram_handle,
          sourceType: "instagram_posts" as string,
          config: null,
        }];
      }
      return [];
    }

    return entityConfigs.map((c) => ({
      entityId: e.id,
      entityName: e.name,
      handle: e.instagram_handle,
      sourceType: c.source_type ?? "instagram_posts",
      config: c,
    }));
  }) ?? [];

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Fontes de Dados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure e gerencie a coleta de dados de cada entidade.
        </p>
      </div>

      {sourceRows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <Database className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhuma fonte configurada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione entidades com handles do Instagram para começar a coletar dados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sourceRows.map((row, idx) => {
            const Icon = SOURCE_ICONS[row.sourceType] ?? Database;
            const recentLogs = row.config ? getLogsForConfig(row.config.id) : [];
            const lastLog = recentLogs[0];

            return (
              <Card key={`${row.entityId}-${row.sourceType}-${idx}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{row.entityName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                          </span>
                          {row.handle && (
                            <span className="text-xs text-muted-foreground">• {row.handle}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Schedule selector */}
                      {row.config && (
                        <Select
                          value={row.config.schedule ?? "manual"}
                          onValueChange={(v) =>
                            updateSchedule.mutate({ configId: row.config!.id, schedule: v })
                          }
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Last execution status */}
                      {lastLog && (
                        <Badge
                          variant="secondary"
                          className={`gap-1 text-[10px] ${
                            lastLog.status === "completed"
                              ? "text-green-600"
                              : lastLog.status === "failed"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {lastLog.status === "completed" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : lastLog.status === "failed" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {lastLog.records_fetched ?? 0} registros
                        </Badge>
                      )}

                      {/* Execute button */}
                      {row.handle && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={executingId === row.entityId}
                          onClick={() => executeNow(row.entityId, row.handle!)}
                        >
                          {executingId === row.entityId ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Executar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Recent logs */}
                  {recentLogs.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Últimas execuções
                      </p>
                      <div className="space-y-1">
                        {recentLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {log.started_at
                                ? new Date(log.started_at).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              {log.status === "completed" ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : log.status === "failed" ? (
                                <XCircle className="h-3 w-3 text-destructive" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {log.records_fetched ?? 0} registros
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

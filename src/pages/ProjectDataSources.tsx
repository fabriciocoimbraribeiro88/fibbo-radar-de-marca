import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Instagram,
  Globe,
  Megaphone,
  Search,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Crown,
  Trash2,
  Settings2,
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

const PROGRESS_STEPS = [
  { label: "Conectando ao Apify...", target: 15 },
  { label: "Baixando perfil...", target: 35 },
  { label: "Baixando posts...", target: 60 },
  { label: "Processando dados...", target: 80 },
  { label: "Salvando no banco...", target: 92 },
];

function FetchProgressBar({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!active) {
      if (progress > 0) {
        setProgress(100);
        const t = setTimeout(() => { setProgress(0); setStep(0); }, 1200);
        return () => clearTimeout(t);
      }
      return;
    }
    setStep(0);
    setProgress(5);

    intervalRef.current = setInterval(() => {
      setStep((prev) => {
        const next = Math.min(prev + 1, PROGRESS_STEPS.length - 1);
        setProgress(PROGRESS_STEPS[next].target);
        return next;
      });
    }, 3500);

    return () => clearInterval(intervalRef.current);
  }, [active]);

  if (progress === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {progress >= 100 ? "Concluído!" : PROGRESS_STEPS[step]?.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

interface CollectOptions {
  mode: "count" | "date";
  postsCount: number;
  dateFrom: string;
  dateTo: string;
  collectAds: boolean;
  adsLibraryUrl: string;
  collectSeo: boolean;
}

const defaultCollectOptions: CollectOptions = {
  mode: "count",
  postsCount: 30,
  dateFrom: "",
  dateTo: "",
  collectAds: false,
  adsLibraryUrl: "",
  collectSeo: false,
};

export default function ProjectDataSources() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ peId: string; name: string } | null>(null);

  // Collection options dialog
  const [collectDialog, setCollectDialog] = useState<{
    entityId: string;
    handle: string;
    isBrand?: boolean;
  } | null>(null);
  const [collectOpts, setCollectOpts] = useState<CollectOptions>(defaultCollectOptions);

  // Fetch project for brand info
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

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

  // Fetch data fetch configs
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

  const removeEntity = useMutation({
    mutationFn: async (peId: string) => {
      const { error } = await supabase
        .from("project_entities")
        .delete()
        .eq("id", peId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-entities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
      toast({ title: "Fonte removida!" });
      setRemoveTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const openCollectDialog = (entityId: string, handle: string, isBrand?: boolean) => {
    setCollectOpts({ ...defaultCollectOptions });
    setCollectDialog({ entityId, handle, isBrand });
  };

  const executeWithOptions = async () => {
    if (!collectDialog) return;
    const { entityId, handle, isBrand } = collectDialog;
    setCollectDialog(null);

    if (isBrand) {
      await executeBrand(handle, collectOpts);
    } else {
      await executeNow(entityId, handle, collectOpts);
    }
  };

  const executeNow = async (entityId: string, handle: string, opts: CollectOptions) => {
    setExecutingId(entityId);
    try {
      const body: Record<string, unknown> = { entity_id: entityId };
      if (opts.mode === "count") {
        body.results_limit = opts.postsCount;
      } else {
        body.date_from = opts.dateFrom;
        body.date_to = opts.dateTo;
      }
      body.collect_ads = opts.collectAds;
      body.ads_library_url = opts.adsLibraryUrl || undefined;
      body.collect_seo = opts.collectSeo;

      const { data, error } = await supabase.functions.invoke("fetch-instagram", { body });
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

  const executeBrand = async (handle: string, opts: CollectOptions) => {
    if (!projectId) return;
    const cleanHandle = handle.replace("@", "");
    setExecutingId("brand");
    try {
      const brandEntity = entities?.find(
        (pe) => pe.monitored_entities?.instagram_handle?.replace("@", "") === cleanHandle
      );

      let entityId: string;
      if (brandEntity) {
        entityId = brandEntity.entity_id;
      } else {
        const { data: newEntity, error: entErr } = await supabase
          .from("monitored_entities")
          .insert({
            name: project?.brand_name ?? "Marca",
            instagram_handle: cleanHandle,
            type: "competitor" as const,
          })
          .select("id")
          .single();
        if (entErr) throw entErr;
        entityId = newEntity.id;

        const { error: linkErr } = await supabase
          .from("project_entities")
          .insert({
            project_id: projectId,
            entity_id: entityId,
            entity_role: "competitor" as const,
          });
        if (linkErr) throw linkErr;
      }

      await executeNow(entityId, cleanHandle, opts);
      queryClient.invalidateQueries({ queryKey: ["project-entities"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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

  // Build entity source rows
  const sourceRows = entities?.flatMap((pe) => {
    const e = pe.monitored_entities;
    if (!e) return [];
    const entityConfigs = configs?.filter((c) => c.entity_id === e.id) ?? [];

    if (entityConfigs.length === 0 && e.instagram_handle) {
      return [{
        peId: pe.id,
        entityId: e.id,
        entityName: e.name,
        handle: e.instagram_handle,
        sourceType: "instagram_posts" as string,
        config: null,
      }];
    }

    return entityConfigs.map((c) => ({
      peId: pe.id,
      entityId: e.id,
      entityName: e.name,
      handle: e.instagram_handle,
      sourceType: c.source_type ?? "instagram_posts",
      config: c,
    }));
  }) ?? [];

  const brandHandle = project?.instagram_handle?.replace("@", "");
  const brandAlreadyInList = brandHandle && sourceRows.some(
    (r) => r.handle?.replace("@", "") === brandHandle
  );

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Fontes de Dados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure e gerencie a coleta de dados de cada entidade.
        </p>
      </div>

      <div className="space-y-3">
        {/* Brand row */}
        {brandHandle && !brandAlreadyInList && (
          <Card className="ring-1 ring-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Crown className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{project?.brand_name}</p>
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                        Marca
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Instagram • @{brandHandle}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={executingId === "brand"}
                  onClick={() => openCollectDialog("brand", brandHandle, true)}
                >
                  {executingId === "brand" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Coletar
                </Button>
              </div>
              <FetchProgressBar active={executingId === "brand"} />
            </CardContent>
          </Card>
        )}

        {/* Entity rows */}
        {sourceRows.length === 0 && !brandHandle ? (
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
          sourceRows.map((row, idx) => {
            const Icon = SOURCE_ICONS[row.sourceType] ?? Database;
            const recentLogs = row.config ? getLogsForConfig(row.config.id) : [];
            const lastLog = recentLogs[0];
            const isExecuting = executingId === row.entityId;

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

                    <div className="flex items-center gap-2">
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

                      {row.handle && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isExecuting}
                          onClick={() => openCollectDialog(row.entityId, row.handle!, false)}
                        >
                          {isExecuting ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Coletar
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setRemoveTarget({ peId: row.peId, name: row.entityName })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <FetchProgressBar active={isExecuting} />

                  {!isExecuting && recentLogs.length > 0 && (
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
          })
        )}
      </div>

      {/* Collection options dialog */}
      <Dialog open={!!collectDialog} onOpenChange={(open) => !open && setCollectDialog(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Opções de Coleta
              {collectDialog && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  @{collectDialog.handle.replace("@", "")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Posts mode */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Posts do Instagram
              </Label>
              <RadioGroup
                value={collectOpts.mode}
                onValueChange={(v) => setCollectOpts((o) => ({ ...o, mode: v as "count" | "date" }))}
                className="space-y-2"
              >
                <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="count" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Por quantidade</p>
                    <p className="text-xs text-muted-foreground">Coletar os N posts mais recentes</p>
                  </div>
                  {collectOpts.mode === "count" && (
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={collectOpts.postsCount}
                      onChange={(e) => setCollectOpts((o) => ({ ...o, postsCount: Number(e.target.value) || 30 }))}
                      className="w-20 h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="date" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Por período</p>
                    <p className="text-xs text-muted-foreground">Coletar posts dentro de um intervalo de datas</p>
                  </div>
                </label>
              </RadioGroup>

              {collectOpts.mode === "date" && (
                <div className="grid grid-cols-2 gap-3 pl-8">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <Input
                      type="date"
                      value={collectOpts.dateFrom}
                      onChange={(e) => setCollectOpts((o) => ({ ...o, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Input
                      type="date"
                      value={collectOpts.dateTo}
                      onChange={(e) => setCollectOpts((o) => ({ ...o, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Additional sources */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fontes adicionais
              </Label>
              <div className="space-y-2">
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Biblioteca de Anúncios</p>
                        <p className="text-xs text-muted-foreground">Meta Ads, Google Ads, TikTok Ads</p>
                      </div>
                    </div>
                    <Switch
                      checked={collectOpts.collectAds}
                      onCheckedChange={(v) => setCollectOpts((o) => ({ ...o, collectAds: v }))}
                    />
                  </div>
                  {collectOpts.collectAds && (
                    <div className="space-y-1 pl-6">
                      <Label className="text-xs text-muted-foreground">Link da Biblioteca de Anúncios</Label>
                      <Input
                        type="url"
                        placeholder="https://www.facebook.com/ads/library/?active_status=all&ad_type=all&q=..."
                        value={collectOpts.adsLibraryUrl}
                        onChange={(e) => setCollectOpts((o) => ({ ...o, adsLibraryUrl: e.target.value }))}
                        className="text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Cole o link de busca da Meta Ads Library, Google Ads Transparency ou TikTok Ad Library.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">SEO / Keywords</p>
                      <p className="text-xs text-muted-foreground">Posicionamento orgânico</p>
                    </div>
                  </div>
                  <Switch
                    checked={collectOpts.collectSeo}
                    onCheckedChange={(v) => setCollectOpts((o) => ({ ...o, collectSeo: v }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={executeWithOptions}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Iniciar Coleta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fonte de dados</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong> do projeto?
              Os dados já coletados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeEntity.mutate(removeTarget.peId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

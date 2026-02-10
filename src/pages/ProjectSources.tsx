import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
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
  Plus,
  Users,
  Sparkles,
  Eye,
  Instagram,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Crown,
  Trash2,
  Settings2,
  Megaphone,
  // Search removed - not needed
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type EntityType = Database["public"]["Enums"]["entity_type"];

const TYPE_CONFIG: { value: EntityType | "brand"; label: string; singular: string; icon: typeof Users; color: string }[] = [
  { value: "brand", label: "Marca", singular: "Marca", icon: Crown, color: "bg-primary/10 text-primary" },
  { value: "competitor", label: "Concorrentes", singular: "Concorrente", icon: Users, color: "bg-primary/10 text-primary" },
  { value: "inspiration", label: "Inspirações", singular: "Inspiração", icon: Eye, color: "bg-accent text-accent-foreground" },
  { value: "influencer", label: "Influencers", singular: "Influencer", icon: Sparkles, color: "bg-accent text-accent-foreground" },
];

const AD_PLATFORMS = [
  { value: "meta_ads", label: "Meta Ads", placeholder: "https://www.facebook.com/ads/library/..." },
  { value: "google_ads", label: "Google Ads", placeholder: "https://adstransparency.google.com/..." },
  { value: "linkedin_ads", label: "LinkedIn Ads", placeholder: "https://www.linkedin.com/ad-library/..." },
  { value: "tiktok_ads", label: "TikTok Ads", placeholder: "https://library.tiktok.com/..." },
];

const PROGRESS_STEPS = [
  { label: "Conectando...", target: 15 },
  { label: "Baixando perfil...", target: 35 },
  { label: "Baixando posts...", target: 60 },
  { label: "Processando...", target: 80 },
  { label: "Salvando...", target: 92 },
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
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {progress >= 100 ? "Concluído!" : PROGRESS_STEPS[step]?.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}

interface CollectOptions {
  mode: "count" | "date";
  postsCount: number;
  dateFrom: string;
  dateTo: string;
  collectAds: boolean;
  adPlatformUrls: Record<string, string>;
}

const defaultCollectOptions: CollectOptions = {
  mode: "count",
  postsCount: 30,
  dateFrom: "",
  dateTo: "",
  collectAds: false,
  adPlatformUrls: {},
};

export default function ProjectSources() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<EntityType>("competitor");
  const [newHandle, setNewHandle] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newAdPlatforms, setNewAdPlatforms] = useState<string[]>([]);
  const [adUrls, setAdUrls] = useState<Record<string, string>>({});

  // Collect dialog state
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ peId: string; name: string } | null>(null);
  const [collectDialog, setCollectDialog] = useState<{
    entityId: string;
    handle: string;
    isBrand?: boolean;
    adPlatforms?: string[];
    adLibraryUrls?: Record<string, string>;
  } | null>(null);
  const [collectOpts, setCollectOpts] = useState<CollectOptions>(defaultCollectOptions);

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: entities, isLoading } = useQuery({
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

  const entityIds = entities?.map((e) => e.entity_id) ?? [];

  const { data: configs } = useQuery({
    queryKey: ["data-fetch-configs", projectId, entityIds],
    queryFn: async () => {
      if (!entityIds.length) return [];
      const { data, error } = await supabase
        .from("data_fetch_configs")
        .select("*")
        .in("entity_id", entityIds);
      if (error) throw error;
      return data;
    },
    enabled: entityIds.length > 0,
  });

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

  const addEntity = useMutation({
    mutationFn: async () => {
      const metadata = newAdPlatforms.length > 0
        ? {
            ad_platforms: newAdPlatforms,
            ad_library_urls: Object.fromEntries(
              newAdPlatforms.filter((p) => adUrls[p]?.trim()).map((p) => [p, adUrls[p].trim()])
            ),
          }
        : null;

      const { data: entity, error: entityError } = await supabase
        .from("monitored_entities")
        .insert({
          name: newName,
          type: newType,
          instagram_handle: newHandle || null,
          website_url: newWebsite || null,
          metadata: metadata as any,
        })
        .select()
        .single();
      if (entityError) throw entityError;

      const { error: linkError } = await supabase
        .from("project_entities")
        .insert({ project_id: projectId!, entity_id: entity.id, entity_role: newType });
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-entities", projectId] });
      resetAddForm();
      toast({ title: "Fonte adicionada com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeEntity = useMutation({
    mutationFn: async (peId: string) => {
      const { error } = await supabase.from("project_entities").delete().eq("id", peId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-entities", projectId] });
      toast({ title: "Fonte removida" });
      setRemoveTarget(null);
    },
  });

  const resetAddForm = () => {
    setAddOpen(false);
    setNewName("");
    setNewType("competitor");
    setNewHandle("");
    setNewWebsite("");
    setNewAdPlatforms([]);
    setAdUrls({});
  };

  const openCollectDialog = (entityId: string, handle: string, isBrand?: boolean, adPlatforms?: string[], adLibraryUrls?: Record<string, string>) => {
    // Pre-fill ad URLs from entity metadata
    const prefilled: Record<string, string> = {};
    if (adLibraryUrls) {
      for (const [k, v] of Object.entries(adLibraryUrls)) prefilled[k] = v;
    }
    setCollectOpts({ ...defaultCollectOptions, adPlatformUrls: prefilled });
    setCollectDialog({ entityId, handle, isBrand, adPlatforms, adLibraryUrls });
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
      if (opts.mode === "count") body.results_limit = opts.postsCount;
      else { body.date_from = opts.dateFrom; body.date_to = opts.dateTo; }
      body.collect_ads = opts.collectAds;
      body.ad_platform_urls = opts.adPlatformUrls;

      const { data, error } = await supabase.functions.invoke("fetch-instagram", { body });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Coleta concluída!", description: `${data.records} registros coletados` });
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
          .insert({ name: project?.brand_name ?? "Marca", instagram_handle: cleanHandle, type: "competitor" as const })
          .select("id")
          .single();
        if (entErr) throw entErr;
        entityId = newEntity.id;
        const { error: linkErr } = await supabase
          .from("project_entities")
          .insert({ project_id: projectId, entity_id: entityId, entity_role: "competitor" as const });
        if (linkErr) throw linkErr;
      }
      await executeNow(entityId, cleanHandle, opts);
      queryClient.invalidateQueries({ queryKey: ["project-entities"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setExecutingId(null);
    }
  };

  const getEntityLogs = (entityId: string) => {
    const entityConfigs = configs?.filter((c) => c.entity_id === entityId) ?? [];
    const configIdSet = new Set(entityConfigs.map((c) => c.id));
    return logs?.filter((l) => l.config_id && configIdSet.has(l.config_id)).slice(0, 3) ?? [];
  };

  const getEntityLastLog = (entityId: string) => getEntityLogs(entityId)[0];

  const brandHandle = project?.instagram_handle?.replace("@", "");
  const brandEntityPe = brandHandle ? entities?.find(
    (pe) => pe.monitored_entities?.instagram_handle?.replace("@", "") === brandHandle
  ) : undefined;

  const getTypeConfig = (type: EntityType) => TYPE_CONFIG.find((t) => t.value === type) ?? TYPE_CONFIG[1];

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Separate brand from other entities
  const brandEntityId = brandEntityPe?.entity_id;
  const nonBrandEntities = entities?.filter((e) => e.entity_id !== brandEntityId) ?? [];

  const groupedEntities = [
    // Brand section
    {
      ...TYPE_CONFIG[0], // brand config
      items: brandEntityPe ? [brandEntityPe] : [],
    },
    // Other sections (exclude brand entity)
    ...TYPE_CONFIG.slice(1).map((type) => ({
      ...type,
      items: nonBrandEntities.filter((e) => e.entity_role === type.value),
    })),
  ];

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Fontes de Dados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie sua marca, concorrentes, inspirações e influencers que alimentam suas análises.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full px-4">
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Fonte de Dados</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              {/* Type selector — pill style */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Classificação</Label>
                <div className="flex gap-2">
                  {TYPE_CONFIG.filter(t => t.value !== "brand").map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setNewType(t.value as EntityType)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                        newType === t.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.singular}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome da marca ou perfil"
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Instagram</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={newHandle}
                        onChange={(e) => setNewHandle(e.target.value)}
                        placeholder="@handle"
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={newWebsite}
                        onChange={(e) => setNewWebsite(e.target.value)}
                        placeholder="https://"
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Ad platforms */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Bibliotecas de Anúncios</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AD_PLATFORMS.map((p) => {
                    const selected = newAdPlatforms.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        onClick={() =>
                          setNewAdPlatforms((prev) =>
                            selected ? prev.filter((v) => v !== p.value) : [...prev, p.value]
                          )
                        }
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all border ${
                          selected
                            ? "border-primary/30 bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                        }`}
                      >
                        <Megaphone className="h-3.5 w-3.5 shrink-0" />
                        {p.label}
                        {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {newAdPlatforms.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {newAdPlatforms.map((p) => {
                      const platform = AD_PLATFORMS.find((a) => a.value === p);
                      return (
                        <div key={p} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{platform?.label} — URL da biblioteca</Label>
                          <Input
                            value={adUrls[p] ?? ""}
                            onChange={(e) => setAdUrls((prev) => ({ ...prev, [p]: e.target.value }))}
                            placeholder={platform?.placeholder}
                            className="text-xs h-9"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                className="w-full h-11 rounded-xl"
                onClick={() => addEntity.mutate()}
                disabled={!newName.trim() || addEntity.isPending}
              >
                {addEntity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar Fonte
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grouped entities (including brand section) */}
      <div className="space-y-8">
        {groupedEntities.map((group) => {
          // For brand section: show "add brand" card if no brand entity yet
          if (group.value === "brand" && group.items.length === 0) {
            if (!brandHandle) return null;
            return (
              <div key="brand">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marca</h2>
                </div>
                <Card className="border-primary/15 bg-primary/[0.02]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Crown className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <p className="text-sm font-semibold text-foreground">{project?.brand_name}</p>
                            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 rounded-full">
                              Sua Marca
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">@{brandHandle}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={executingId === "brand"}
                        onClick={() => openCollectDialog("brand", brandHandle, true)}
                      >
                        {executingId === "brand" ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Coletar
                      </Button>
                    </div>
                    <FetchProgressBar active={executingId === "brand"} />
                  </CardContent>
                </Card>
              </div>
            );
          }
          if (group.items.length === 0) return null;
          return (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-3">
                <group.icon className={`h-4 w-4 ${group.value === "brand" ? "text-primary" : "text-muted-foreground"}`} />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h2>
                <Badge variant="secondary" className="text-[10px] h-5 rounded-full">
                  {group.items.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {group.items.map((pe) => {
                  const e = pe.monitored_entities;
                  if (!e) return null;
                  const isExpanded = expandedId === pe.id;
                  const isExecuting = executingId === e.id;
                  const lastLog = getEntityLastLog(e.id);
                  const recentLogs = getEntityLogs(e.id);
                  const adPlatforms = (e.metadata as any)?.ad_platforms as string[] | undefined;
                  const adLibraryUrls = (e.metadata as any)?.ad_library_urls as Record<string, string> | undefined;

                  return (
                    <Card
                      key={pe.id}
                      className={`transition-all duration-200 ${isExpanded ? "ring-1 ring-border shadow-sm" : "hover:shadow-sm"}`}
                    >
                      <CardContent className="p-0">
                        {/* Main row */}
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : pe.id)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground shrink-0">
                              {e.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                {e.instagram_handle && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Instagram className="h-3 w-3" />
                                    {e.instagram_handle}
                                  </span>
                                )}
                                {e.website_url && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{e.website_url.replace(/https?:\/\//, "")}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {adPlatforms && adPlatforms.length > 0 && (
                              <div className="hidden sm:flex items-center gap-1">
                                {adPlatforms.map((p) => (
                                  <Badge key={p} variant="secondary" className="text-[9px] rounded-full px-2 py-0.5">
                                    {p === "meta_ads" ? "Meta" : p === "google_ads" ? "Google" : p === "linkedin_ads" ? "LinkedIn" : "TikTok"}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {lastLog && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] gap-1 rounded-full ${
                                  lastLog.status === "completed" ? "text-primary" : lastLog.status === "failed" ? "text-destructive" : ""
                                }`}
                              >
                                {lastLog.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : lastLog.status === "failed" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {lastLog.records_fetched ?? 0}
                              </Badge>
                            )}

                            {e.instagram_handle && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full h-8 w-8 p-0"
                                disabled={isExecuting}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  openCollectDialog(e.id, e.instagram_handle!, false, adPlatforms, adLibraryUrls);
                                }}
                              >
                                {isExecuting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setRemoveTarget({ peId: pe.id, name: e.name });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Progress */}
                        {isExecuting && (
                          <div className="px-5 pb-4">
                            <FetchProgressBar active />
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && !isExecuting && (
                          <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/30">
                            {/* Ad library links */}
                            {adLibraryUrls && Object.keys(adLibraryUrls).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Bibliotecas de Anúncios
                                </p>
                                <div className="grid gap-1.5">
                                  {Object.entries(adLibraryUrls).map(([platform, url]) => (
                                    <a
                                      key={platform}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                                    >
                                      <Megaphone className="h-3 w-3 shrink-0" />
                                      <span className="font-medium">
                                        {AD_PLATFORMS.find((p) => p.value === platform)?.label ?? platform}
                                      </span>
                                      <span className="truncate opacity-60">{url.replace(/https?:\/\//, "").slice(0, 40)}...</span>
                                      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recent logs */}
                            {recentLogs.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Últimas Coletas
                                </p>
                                <div className="space-y-1">
                                  {recentLogs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>
                                        {log.started_at
                                          ? new Date(log.started_at).toLocaleString("pt-BR", {
                                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                            })
                                          : "—"}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        {log.status === "completed" ? (
                                          <CheckCircle2 className="h-3 w-3 text-primary" />
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

                            {/* No details */}
                            {(!adLibraryUrls || Object.keys(adLibraryUrls).length === 0) && recentLogs.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                Nenhum detalhe adicional disponível.
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {!entities?.length && !brandHandle && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma fonte adicionada</p>
              <p className="mt-1 text-xs text-muted-foreground text-center max-w-xs">
                Adicione concorrentes, inspirações e influencers para começar a monitorar e coletar dados.
              </p>
              <Button size="sm" className="mt-4 rounded-full" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar Fonte
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Collect dialog */}
      <Dialog open={!!collectDialog} onOpenChange={(open) => !open && setCollectDialog(null)}>
        <DialogContent className="sm:max-w-md">
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
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Posts do Instagram
              </Label>
              <RadioGroup
                value={collectOpts.mode}
                onValueChange={(v) => setCollectOpts((o) => ({ ...o, mode: v as "count" | "date" }))}
                className="space-y-2"
              >
                <label className="flex items-center gap-3 rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="count" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Por quantidade</p>
                    <p className="text-xs text-muted-foreground">N posts mais recentes</p>
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
                <label className="flex items-center gap-3 rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="date" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Por período</p>
                    <p className="text-xs text-muted-foreground">Intervalo de datas</p>
                  </div>
                </label>
              </RadioGroup>
              {collectOpts.mode === "date" && (
                <div className="grid grid-cols-2 gap-3 pl-8">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <Input type="date" value={collectOpts.dateFrom} onChange={(e) => setCollectOpts((o) => ({ ...o, dateFrom: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Input type="date" value={collectOpts.dateTo} onChange={(e) => setCollectOpts((o) => ({ ...o, dateTo: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fontes adicionais
              </Label>
              <div className="space-y-2">
                <div className="rounded-xl border border-border p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Bibliotecas de Anúncios</p>
                    </div>
                    <Switch checked={collectOpts.collectAds} onCheckedChange={(v) => setCollectOpts((o) => ({ ...o, collectAds: v }))} />
                  </div>
                  {collectOpts.collectAds && (
                    <div className="space-y-2 pl-6">
                      {AD_PLATFORMS.map((p) => (
                        <div key={p.value} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{p.label}</Label>
                          <Input
                            type="url"
                            placeholder={p.placeholder}
                            value={collectOpts.adPlatformUrls[p.value] ?? ""}
                            onChange={(e) =>
                              setCollectOpts((o) => ({
                                ...o,
                                adPlatformUrls: { ...o.adPlatformUrls, [p.value]: e.target.value },
                              }))
                            }
                            className="text-xs h-8"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialog(null)} className="rounded-full">Cancelar</Button>
            <Button onClick={executeWithOptions} className="rounded-full">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Iniciar Coleta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fonte</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong>? Os dados já coletados serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
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

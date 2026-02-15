import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  MoreHorizontal,
  ExternalLink,
  Upload,
  FileJson,
  RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FetchProgressBar } from "@/components/FetchProgressBar";
import type { Database } from "@/integrations/supabase/types";
import { useEntityDataSummary } from "@/hooks/useEntityDataSummary";
import { EntityDataSummary } from "@/components/sources/EntityDataSummary";
import BrandContextSources from "@/components/brand-context/BrandContextSources";
import ContextStrengthBar from "@/components/brand-context/ContextStrengthBar";
import PlatformIntegrations from "@/components/sources/PlatformIntegrations";

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

interface CollectOptions {
  mode: "all" | "count" | "json";
  postsCount: number;
}

const defaultCollectOptions: CollectOptions = {
  mode: "all",
  postsCount: 30,
};

const IMPORT_BATCH_SIZE = 500;

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
  } | null>(null);
  const [collectOpts, setCollectOpts] = useState<CollectOptions>(defaultCollectOptions);
  const [jsonFile, setJsonFile] = useState<{ name: string; posts: any[] } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
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
  const { data: dataSummary } = useEntityDataSummary(entityIds);

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

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    entityId: string;
    peId: string;
    name: string;
    handle: string;
    website: string;
    type: EntityType;
    adPlatforms: string[];
    adUrls: Record<string, string>;
  } | null>(null);

  const editEntity = useMutation({
    mutationFn: async (data: {
      entityId: string;
      peId: string;
      name: string;
      handle: string;
      website: string;
      type: EntityType;
      adPlatforms: string[];
      adUrls: Record<string, string>;
    }) => {
      const metadata = data.adPlatforms.length > 0
        ? {
            ad_platforms: data.adPlatforms,
            ad_library_urls: Object.fromEntries(
              data.adPlatforms.filter((p) => data.adUrls[p]?.trim()).map((p) => [p, data.adUrls[p].trim()])
            ),
          }
        : null;

      const { error } = await supabase
        .from("monitored_entities")
        .update({
          name: data.name,
          instagram_handle: data.handle || null,
          website_url: data.website || null,
          type: data.type,
          metadata: metadata as any,
        })
        .eq("id", data.entityId);
      if (error) throw error;

      // Update the entity role in project_entities if type changed
      const { error: peError } = await supabase
        .from("project_entities")
        .update({ entity_role: data.type })
        .eq("id", data.peId);
      if (peError) throw peError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-entities", projectId] });
      setEditDialog(null);
      toast({ title: "Fonte atualizada com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const openCollectDialog = (entityId: string, handle: string, isBrand?: boolean) => {
    setCollectOpts({ ...defaultCollectOptions });
    setJsonFile(null);
    setImportProgress(null);
    setCollectDialog({ entityId, handle, isBrand });
  };

  const executeWithOptions = async () => {
    if (!collectDialog) return;
    const { entityId, handle, isBrand } = collectDialog;

    if (collectOpts.mode === "json") {
      await executeJsonImport(entityId, isBrand);
      return;
    }

    setCollectDialog(null);
    if (isBrand) {
      await executeBrand(handle, collectOpts);
    } else {
      await executeNow(entityId, handle, collectOpts);
    }
  };

  const handleJsonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const posts = Array.isArray(parsed) ? parsed : [parsed];
        setJsonFile({ name: file.name, posts });
      } catch {
        toast({ title: "Erro ao ler JSON", description: "O arquivo não é um JSON válido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const executeJsonImport = async (entityId: string, isBrand?: boolean) => {
    if (!jsonFile || !collectDialog) return;
    
    // For brand, ensure entity exists first
    let targetEntityId = entityId;
    if (isBrand) {
      const cleanHandle = collectDialog.handle.replace("@", "");
      const brandEntity = entities?.find(
        (pe) => pe.monitored_entities?.instagram_handle?.replace("@", "") === cleanHandle
      );
      if (brandEntity) {
        targetEntityId = brandEntity.entity_id;
      } else if (projectId) {
        const { data: newEntity, error: entErr } = await supabase
          .from("monitored_entities")
          .insert({ name: project?.brand_name ?? "Marca", instagram_handle: cleanHandle, type: "brand" as any })
          .select("id")
          .single();
        if (entErr) { toast({ title: "Erro", description: entErr.message, variant: "destructive" }); return; }
        targetEntityId = newEntity.id;
        await supabase.from("project_entities").insert({ project_id: projectId, entity_id: targetEntityId, entity_role: "brand" as any });
      }
    }

    const totalBatches = Math.ceil(jsonFile.posts.length / IMPORT_BATCH_SIZE);
    setImportProgress({ current: 0, total: totalBatches });
    let totalImported = 0;
    let hasError = false;

    for (let i = 0; i < jsonFile.posts.length; i += IMPORT_BATCH_SIZE) {
      const batch = jsonFile.posts.slice(i, i + IMPORT_BATCH_SIZE);
      setImportProgress({ current: Math.floor(i / IMPORT_BATCH_SIZE) + 1, total: totalBatches });

      const { data, error } = await supabase.functions.invoke("import-instagram-json", {
        body: { entity_id: targetEntityId, posts: batch },
      });

      if (error) {
        toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
        hasError = true;
        break;
      }
      totalImported += data?.total_imported ?? 0;
    }

    setImportProgress(null);
    setCollectDialog(null);
    setJsonFile(null);

    if (!hasError) {
      toast({ title: "Importação concluída!", description: `${totalImported} posts importados. Comentários analisados automaticamente.` });
      queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
      queryClient.invalidateQueries({ queryKey: ["data-fetch-logs"] });
      queryClient.invalidateQueries({ queryKey: ["project-entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
    }
  };

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [collectStatus, setCollectStatus] = useState<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const executeNow = async (entityId: string, handle: string, opts: CollectOptions) => {
    setExecutingId(entityId);
    setCollectStatus("Iniciando coleta...");
    try {
      const body: Record<string, unknown> = { entity_id: entityId, action: "start" };
      if (opts.mode === "count") body.results_limit = opts.postsCount;
      else body.results_limit = 0;

      const { data, error } = await supabase.functions.invoke("fetch-instagram", { body });
      if (error) throw error;

      if (!data?.success) {
        toast({ title: "Erro na coleta", description: data?.error, variant: "destructive" });
        setExecutingId(null);
        setCollectStatus(null);
        return;
      }

      if (data.status === "running" && data.run_id) {
        // Profile saved, posts are being scraped async — start polling
        setCollectStatus("Perfil salvo. Aguardando coleta de posts...");
        toast({ title: "Perfil salvo!", description: "Coleta de posts em andamento..." });

        const pollCheck = async () => {
          try {
            const { data: checkData, error: checkErr } = await supabase.functions.invoke("fetch-instagram", {
              body: {
                action: "check",
                run_id: data.run_id,
                dataset_id: data.dataset_id,
                entity_id: entityId,
                log_id: data.log_id,
              },
            });

            if (checkErr) throw checkErr;

            if (checkData?.status === "completed") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              toast({ title: "Coleta concluída!", description: checkData.message });
              setExecutingId(null);
              setCollectStatus(null);
              queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
              queryClient.invalidateQueries({ queryKey: ["data-fetch-logs"] });
              queryClient.invalidateQueries({ queryKey: ["project-dashboard-full"] });
            } else if (checkData?.status === "failed") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              toast({ title: "Erro na coleta", description: checkData.error, variant: "destructive" });
              setExecutingId(null);
              setCollectStatus(null);
            } else {
              setCollectStatus("Coletando posts... aguarde");
            }
          } catch (pollErr: any) {
            console.error("Poll error:", pollErr);
          }
        };

        // Poll every 15 seconds
        pollIntervalRef.current = setInterval(pollCheck, 15000);
      } else {
        // Completed synchronously (shouldn't happen with new flow, but handle it)
        toast({ title: "Coleta concluída!", description: `${data.records} registros coletados` });
        queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
        queryClient.invalidateQueries({ queryKey: ["data-fetch-logs"] });
        setExecutingId(null);
        setCollectStatus(null);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setExecutingId(null);
      setCollectStatus(null);
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
          .insert({ name: project?.brand_name ?? "Marca", instagram_handle: cleanHandle, type: "brand" as any })
          .select("id")
          .single();
        if (entErr) throw entErr;
        entityId = newEntity.id;
        const { error: linkErr } = await supabase
          .from("project_entities")
          .insert({ project_id: projectId, entity_id: entityId, entity_role: "brand" as any });
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
  // ─── Contracted services state (must be before early return) ───
  const [services, setServicesState] = useState<{ channels: string[] }>({ channels: [] });
  const [svcSaveTimer, setSvcSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project?.contracted_services && typeof project.contracted_services === "object") {
      const cs = project.contracted_services as any;
      setServicesState({
        channels: cs.channels ?? [],
      });
    }
  }, [project]);

  const saveSvc = useCallback((updated: typeof services) => {
    if (svcSaveTimer) clearTimeout(svcSaveTimer);
    const timer = setTimeout(async () => {
      await supabase.from("projects").update({ contracted_services: updated as any }).eq("id", projectId!);
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["contracted-services", projectId] });
    }, 2000);
    setSvcSaveTimer(timer);
  }, [projectId, svcSaveTimer, queryClient]);

  useEffect(() => { return () => { if (svcSaveTimer) clearTimeout(svcSaveTimer); }; }, [svcSaveTimer]);

  const toggleSvcChannel = (ch: string) => {
    const updated = { ...services };
    updated.channels = updated.channels.includes(ch)
      ? updated.channels.filter((c) => c !== ch)
      : [...updated.channels, ch];
    setServicesState(updated);
    saveSvc(updated);
  };

  const updateSvcField = (field: string, value: any) => {
    const updated = { ...services, [field]: value };
    setServicesState(updated);
    saveSvc(updated);
  };

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
      {/* Contracted Services */}
      <Card className="p-5 mb-8">
        <h3 className="text-sm font-semibold mb-1">Serviços Contratados</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Selecione os serviços incluídos no contrato. Isso controla quais canais aparecem em análises, planejamento e dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { ch: "social", icon: Instagram, title: "Social", desc: "Redes sociais, conteúdo orgânico" },
            { ch: "ads", icon: Megaphone, title: "Ads", desc: "Tráfego pago, campanhas" },
            { ch: "seo", icon: Globe, title: "SEO", desc: "Otimização orgânica, keywords" },
          ].map(({ ch, icon: Icon, title, desc }) => (
            <Card
              key={ch}
              className={`p-4 cursor-pointer transition-all ${services.channels.includes(ch) ? "border-primary/50 bg-primary/5" : "opacity-60"}`}
              onClick={() => toggleSvcChannel(ch)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{title}</span>
                </div>
                <Switch checked={services.channels.includes(ch)} onCheckedChange={() => toggleSvcChannel(ch)} onClick={(e) => e.stopPropagation()} />
              </div>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </Card>

      {/* Platform Integrations */}
      {projectId && <PlatformIntegrations projectId={projectId} activeChannels={services.channels} />}

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
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SUA MARCA</h2>
                </div>
                <Card className="border-l-4 border-l-primary bg-primary/[0.03]">
                  <CardContent className="p-5 space-y-4">
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
                    {executingId === "brand" && collectStatus && (
                      <p className="text-xs text-muted-foreground mt-1">{collectStatus}</p>
                    )}
                    {/* Brand context sources inline */}
                    <Separator className="my-2" />
                    <BrandContextSources projectId={projectId!} />
                    {/* Context strength mini bar */}
                    <ContextStrengthBar projectId={projectId!} compact />
                  </CardContent>
                </Card>
              </div>
            );
          }
          if (group.items.length === 0) return null;
          const isBrandGroup = group.value === "brand";
          return (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-3">
                <group.icon className={`h-4 w-4 ${isBrandGroup ? "text-primary" : "text-muted-foreground"}`} />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isBrandGroup ? "SUA MARCA" : group.label}
                </h2>
                {!isBrandGroup && (
                  <Badge variant="secondary" className="text-[10px] h-5 rounded-full">
                    {group.items.length}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {group.items.map((pe) => {
                  const raw = pe.monitored_entities;
                  const e = Array.isArray(raw) ? raw[0] : raw;
                  if (!e) return null;
                  const isExpanded = expandedId === pe.id;
                  const isExecuting = executingId === e.id;
                  const lastLog = getEntityLastLog(e.id);
                  const recentLogs = getEntityLogs(e.id);
                  const adLibraryUrls = (e.metadata as any)?.ad_library_urls as Record<string, string> | undefined;

                  return (
                    <Card
                      key={pe.id}
                      className={`transition-all duration-200 ${isBrandGroup ? "border-l-4 border-l-primary bg-primary/[0.03]" : ""} ${isExpanded ? "ring-1 ring-border shadow-sm" : "hover:shadow-sm"}`}
                    >
                      <CardContent className="p-0">
                        {/* Main row */}
                        <div
                          className="flex items-center justify-between px-5 py-4 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : pe.id)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground shrink-0">
                              {(e.name ?? "??").slice(0, 2).toUpperCase()}
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
                                  openCollectDialog(e.id, e.instagram_handle!, false);
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
                              className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Atualizar dados"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                queryClient.invalidateQueries({ queryKey: ["entity-data-summary"] });
                                queryClient.invalidateQueries({ queryKey: ["data-fetch-configs"] });
                                queryClient.invalidateQueries({ queryKey: ["data-fetch-logs"] });
                                queryClient.invalidateQueries({ queryKey: ["project-entities", projectId] });
                                queryClient.invalidateQueries({ queryKey: ["project-dashboard-full"] });
                                toast({ title: "Dados atualizados", description: "Todas as informações foram recarregadas." });
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const meta = e.metadata as any;
                                setEditDialog({
                                  entityId: e.id,
                                  peId: pe.id,
                                  name: e.name,
                                  handle: e.instagram_handle ?? "",
                                  website: e.website_url ?? "",
                                  type: pe.entity_role as EntityType,
                                  adPlatforms: meta?.ad_platforms ?? [],
                                  adUrls: meta?.ad_library_urls ?? {},
                                });
                              }}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>

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
                            {collectStatus && (
                              <p className="text-xs text-muted-foreground mt-1">{collectStatus}</p>
                            )}
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && !isExecuting && (
                          <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/30">
                            {/* Data summary */}
                            <EntityDataSummary data={dataSummary?.get(e.id) ?? {
                              entityId: e.id, totalPosts: 0, postTypes: [], totalLikes: 0, totalComments: 0,
                              totalSaves: 0, totalShares: 0, totalViews: 0, postsWithHashtags: 0,
                              realCommentsCount: 0, commentsWithSentiment: 0,
                              oldestPostDate: null, newestPostDate: null, followers: null,
                            }} />

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
                                      <span className="truncate opacity-60">{(typeof url === "string" ? url : "").replace(/https?:\/\//, "").slice(0, 40)}...</span>
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
                            {(!adLibraryUrls || Object.keys(adLibraryUrls).length === 0) && recentLogs.length === 0 && !dataSummary?.get(e.id) && (
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
              {/* Brand-specific: context sources + strength bar */}
              {isBrandGroup && (
                <div className="mt-4 space-y-3 pl-1">
                  <BrandContextSources projectId={projectId!} />
                  <ContextStrengthBar projectId={projectId!} compact />
                </div>
              )}
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
                onValueChange={(v) => {
                  setCollectOpts((o) => ({ ...o, mode: v as "all" | "count" | "json" }));
                  if (v !== "json") setJsonFile(null);
                }}
                className="space-y-2"
              >
                <label className="flex items-center gap-3 rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="all" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Todos os Posts</p>
                    <p className="text-xs text-muted-foreground">Coletar todos os posts disponíveis via API</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="count" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Por quantidade</p>
                    <p className="text-xs text-muted-foreground">N posts mais recentes via API</p>
                  </div>
                  {collectOpts.mode === "count" && (
                    <Input
                      type="number"
                      min={1}
                      value={collectOpts.postsCount}
                      onChange={(e) => setCollectOpts((o) => ({ ...o, postsCount: Number(e.target.value) || 30 }))}
                      className="w-20 h-8 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-border p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="json" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <FileJson className="h-3.5 w-3.5" />
                      Importar arquivo JSON
                    </p>
                    <p className="text-xs text-muted-foreground">Upload de arquivo exportado do Apify</p>
                  </div>
                </label>
              </RadioGroup>

              {collectOpts.mode === "json" && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleJsonFileSelect}
                      className="text-xs h-9"
                    />
                  </div>
                  {jsonFile && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                      <FileJson className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{jsonFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{jsonFile.posts.length.toLocaleString()} posts encontrados</p>
                      </div>
                    </div>
                  )}
                  {importProgress && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Importando batch {importProgress.current}/{importProgress.total}...
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {Math.round((importProgress.current / importProgress.total) * 100)}%
                        </span>
                      </div>
                      <Progress value={(importProgress.current / importProgress.total) * 100} className="h-1" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCollectDialog(null); setJsonFile(null); setImportProgress(null); }} className="rounded-full" disabled={!!importProgress}>Cancelar</Button>
            <Button
              onClick={executeWithOptions}
              className="rounded-full"
              disabled={collectOpts.mode === "json" && (!jsonFile || !!importProgress)}
            >
              {importProgress ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : collectOpts.mode === "json" ? (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              {collectOpts.mode === "json" ? "Importar" : "Iniciar Coleta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Fonte</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-6 pt-2">
              {/* Type selector — only for non-brand */}
              {editDialog.type !== "brand" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Classificação</Label>
                  <div className="flex gap-2">
                    {TYPE_CONFIG.filter(t => t.value !== "brand").map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setEditDialog((d) => d ? { ...d, type: t.value as EntityType } : null)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                          editDialog.type === t.value
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
              )}

              {/* Basic info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={editDialog.name}
                    onChange={(e) => setEditDialog((d) => d ? { ...d, name: e.target.value } : null)}
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Instagram</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={editDialog.handle}
                        onChange={(e) => setEditDialog((d) => d ? { ...d, handle: e.target.value } : null)}
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
                        value={editDialog.website}
                        onChange={(e) => setEditDialog((d) => d ? { ...d, website: e.target.value } : null)}
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
                    const selected = editDialog.adPlatforms.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        onClick={() =>
                          setEditDialog((d) => {
                            if (!d) return null;
                            const newPlatforms = selected
                              ? d.adPlatforms.filter((v) => v !== p.value)
                              : [...d.adPlatforms, p.value];
                            return { ...d, adPlatforms: newPlatforms };
                          })
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

                {editDialog.adPlatforms.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {editDialog.adPlatforms.map((p) => {
                      const platform = AD_PLATFORMS.find((a) => a.value === p);
                      return (
                        <div key={p} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{platform?.label} — URL da biblioteca</Label>
                          <Input
                            value={editDialog.adUrls[p] ?? ""}
                            onChange={(e) =>
                              setEditDialog((d) => d ? { ...d, adUrls: { ...d.adUrls, [p]: e.target.value } } : null)
                            }
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
                onClick={() => editDialog && editEntity.mutate(editDialog)}
                disabled={!editDialog.name.trim() || editEntity.isPending}
              >
                {editEntity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          )}
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

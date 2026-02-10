import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, BarChart3, Megaphone, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useCallback } from "react";
import DashboardFilters, {
  type PeriodRange, type SourceMode, type EntityOption, getPresetRange,
} from "@/components/dashboard/DashboardFilters";
import SocialTab, { type PostData } from "@/components/dashboard/SocialTab";

/* ── initial period ── */
const initialPeriod: PeriodRange = {
  ...getPresetRange("this_year"),
  preset: "this_year",
};

/* ── data hook ── */
function useDashboardData(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-dashboard-v2", projectId],
    queryFn: async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("instagram_handle, brand_name")
        .eq("id", projectId!)
        .single();

      const { data: projectEntities } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role, monitored_entities(id, name, instagram_handle, type)")
        .eq("project_id", projectId!);

      if (!projectEntities?.length) return { entities: [], posts: [], profiles: [], brandEntityId: null };

      const brandHandle = project?.instagram_handle?.replace("@", "").toLowerCase() ?? null;
      const entityIds = projectEntities.map((pe) => pe.entity_id);

      // Find brand entity
      let brandEntityId: string | null = null;
      const entityMap: EntityOption[] = [];
      for (const pe of projectEntities) {
        const entity = pe.monitored_entities as unknown as {
          id: string; name: string; instagram_handle: string | null; type: string;
        };
        if (!entity) continue;
        const handleNorm = entity.instagram_handle?.replace("@", "").toLowerCase() ?? "";
        if (brandHandle && handleNorm === brandHandle) brandEntityId = pe.entity_id;
        entityMap.push({
          id: pe.entity_id,
          name: entity.name,
          handle: entity.instagram_handle,
          role: pe.entity_role,
        });
      }

      const [{ data: posts }, { data: profiles }] = await Promise.all([
        supabase.from("instagram_posts")
          .select("entity_id, likes_count, comments_count, views_count, engagement_total, post_type, hashtags, posted_at")
          .in("entity_id", entityIds)
          .order("posted_at", { ascending: true }),
        supabase.from("instagram_profiles")
          .select("entity_id, followers_count, snapshot_date")
          .in("entity_id", entityIds)
          .order("snapshot_date", { ascending: false }),
      ]);

      // Build entity name map & latest followers
      const nameMap: Record<string, string> = {};
      const followersMap: Record<string, number> = {};
      for (const eo of entityMap) {
        nameMap[eo.id] = eo.name;
      }
      for (const p of profiles ?? []) {
        if (p.entity_id && !followersMap[p.entity_id]) {
          followersMap[p.entity_id] = p.followers_count ?? 0;
        }
      }

      // Enrich posts with entity name
      const enrichedPosts: PostData[] = (posts ?? []).map((p) => ({
        entity_id: p.entity_id ?? "",
        entity_name: nameMap[p.entity_id ?? ""] ?? "?",
        post_type: p.post_type,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        views_count: p.views_count ?? 0,
        engagement_total: p.engagement_total ?? 0,
        hashtags: p.hashtags,
        posted_at: p.posted_at,
        followers: followersMap[p.entity_id ?? ""] ?? null,
      }));

      return { entities: entityMap, posts: enrichedPosts, brandEntityId };
    },
    enabled: !!projectId,
  });
}

/* ── main component ── */
export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useDashboardData(id);

  const [period, setPeriod] = useState<PeriodRange>(initialPeriod);
  const [sourceMode, setSourceMode] = useState<SourceMode>("brand_only");
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("social");

  const onToggleEntity = useCallback((entityId: string) => {
    setSelectedEntityIds((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId); else next.add(entityId);
      return next;
    });
  }, []);

  const allPosts = data?.posts ?? [];
  const brandEntityId = data?.brandEntityId ?? null;

  // Filter posts by period
  const periodPosts = useMemo(() => {
    return allPosts.filter((p) => {
      if (!p.posted_at) return true; // include posts without date
      const d = new Date(p.posted_at);
      return d >= period.from && d <= period.to;
    });
  }, [allPosts, period]);

  // Filter posts by source mode
  const filteredPosts = useMemo(() => {
    if (sourceMode === "brand_only") {
      return periodPosts.filter((p) => p.entity_id === brandEntityId);
    }
    if (sourceMode === "brand_vs_all") {
      return periodPosts;
    }
    // brand_vs_selected
    return periodPosts.filter(
      (p) => p.entity_id === brandEntityId || selectedEntityIds.has(p.entity_id)
    );
  }, [periodPosts, sourceMode, brandEntityId, selectedEntityIds]);

  const isComparative = sourceMode !== "brand_only";

  const activeEntityCount = useMemo(() => {
    const ids = new Set(filteredPosts.map((p) => p.entity_id));
    return ids.size;
  }, [filteredPosts]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.entities.length) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground mb-2">Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma entidade com dados coletados neste projeto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Dados quantitativos do projeto.</p>
      </div>

      {/* Filters: Period + Sources */}
      <DashboardFilters
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
        selectedEntityIds={selectedEntityIds}
        onToggleEntity={onToggleEntity}
        entities={data.entities}
        brandEntityId={brandEntityId}
      />

      {/* Tabs: Social | Ads | SEO */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="social" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Redes Sociais
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5 text-xs">
            <Megaphone className="h-3.5 w-3.5" />
            Ads
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            SEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="mt-6">
          <SocialTab
            posts={filteredPosts}
            brandEntityId={brandEntityId}
            isComparative={isComparative}
          />
        </TabsContent>

        <TabsContent value="ads" className="mt-6">
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Análise de Ads</p>
              <p className="text-xs text-muted-foreground mt-1">Em breve — dados de bibliotecas de anúncios.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Análise de SEO</p>
              <p className="text-xs text-muted-foreground mt-1">Em breve — dados de keywords e posicionamento.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, Heart, MessageCircle, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

import {
  useProjectDashboardData,
  useFilteredAndLimitedPosts,
  useEntityMetrics,
  type PostLimit,
  type EntityInfo,
} from "@/hooks/useProjectDashboardData";

import DashboardFilters, {
  getPresetRange,
  type PeriodRange,
  type SourceMode,
} from "@/components/dashboard/DashboardFilters";

import EngagementRateChart from "@/components/dashboard/EngagementRateChart";
import AvgLikesChart from "@/components/dashboard/AvgLikesChart";
import AvgCommentsChart from "@/components/dashboard/AvgCommentsChart";
import ContentMixChart from "@/components/dashboard/ContentMixChart";
import RadarComparisonChart from "@/components/dashboard/RadarComparisonChart";
import VolumeEngagementScatter from "@/components/dashboard/VolumeEngagementScatter";

import ContentTypePieChart from "@/components/dashboard/ContentTypePieChart";
import PerformanceByTypeChart from "@/components/dashboard/PerformanceByTypeChart";
import PostsVolumeChart from "@/components/dashboard/PostsVolumeChart";
import TopHashtagsChart from "@/components/dashboard/TopHashtagsChart";
import LikesTimelineChart from "@/components/dashboard/LikesTimelineChart";
import ThemeDistributionChart from "@/components/dashboard/ThemeDistributionChart";
import TopPostsTable from "@/components/dashboard/TopPostsTable";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function resolveEntitiesByMode(
  entities: EntityInfo[],
  mode: SourceMode
): EntityInfo[] {
  switch (mode) {
    case "brand_only":
      return entities.filter((e) => e.role === "brand");
    case "brand_vs_all":
      return entities;
    case "brand_vs_competitors":
      return entities.filter((e) => e.role === "brand" || e.type === "competitor");
    case "brand_vs_influencers":
      return entities.filter((e) => e.role === "brand" || e.type === "influencer");
    case "brand_vs_inspiration":
      return entities.filter((e) => e.role === "brand" || e.type === "inspiration");
    default:
      return entities;
  }
}

export default function ProjectDashboard() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error } = useProjectDashboardData(projectId);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project-dashboard-full", projectId] });
  };

  // Filter state — defaults: all time, all posts, brand vs all
  const defaultRange = getPresetRange("all");
  const [period, setPeriod] = useState<PeriodRange>({ ...defaultRange, preset: "all" });
  const [postLimit, setPostLimit] = useState<PostLimit>("all");
  const [sourceMode, setSourceMode] = useState<SourceMode>("brand_vs_all");
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());

  const allEntities = data?.entities ?? [];
  const allPosts = data?.posts ?? [];
  const allProfiles = data?.profiles ?? [];
  const brandEntityId = data?.brandEntityId ?? null;

  // Resolve which entities to show based on source mode + manual selection
  const resolvedEntities = useMemo(() => {
    const byMode = resolveEntitiesByMode(allEntities, sourceMode);
    if (selectedEntityIds.size > 0) {
      return byMode.filter((e) => selectedEntityIds.has(e.id));
    }
    return byMode;
  }, [allEntities, sourceMode, selectedEntityIds]);

  const resolvedEntityIds = useMemo(
    () => new Set(resolvedEntities.map((e) => e.id)),
    [resolvedEntities]
  );

  // Filter posts to resolved entities, then by date + limit
  const entityFilteredPosts = useMemo(
    () => allPosts.filter((p) => resolvedEntityIds.has(p.entity_id)),
    [allPosts, resolvedEntityIds]
  );

  const dateRange = useMemo(() => ({ from: period.from, to: period.to }), [period]);
  const filteredPosts = useFilteredAndLimitedPosts(entityFilteredPosts, dateRange, postLimit);
  const entityMetrics = useEntityMetrics(resolvedEntities, filteredPosts, allProfiles);

  // Entity toggle handler
  const handleToggleEntity = (id: string) => {
    setSelectedEntityIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filterEntities = useMemo(
    () => allEntities.map((e) => ({ id: e.id, name: e.name, handle: e.handle, role: e.role })),
    [allEntities]
  );

  // Big numbers
  const bigNumbers = useMemo(() => {
    const totalPosts = filteredPosts.length;
    const totalFollowers = entityMetrics.reduce((s, m) => s + m.followers, 0);
    const avgLikes = totalPosts > 0
      ? Math.round(filteredPosts.reduce((s, p) => s + p.likes_count, 0) / totalPosts)
      : 0;
    const avgComments = totalPosts > 0
      ? Math.round(filteredPosts.reduce((s, p) => s + p.comments_count, 0) / totalPosts)
      : 0;
    const brandMetrics = entityMetrics.find((m) => m.role === "brand");
    const engRate = brandMetrics ? brandMetrics.engagementRate : 0;
    return { totalPosts, totalFollowers, avgLikes, avgComments, engRate };
  }, [filteredPosts, entityMetrics]);

  const isComparative = resolvedEntities.length > 1;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">Erro ao carregar dados: {(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Empty ── */
  if (!allEntities.length) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground mb-2">Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma entidade cadastrada</p>
            <p className="text-xs text-muted-foreground">
              Adicione fontes de dados ao projeto para visualizar o dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.projectName} — {filteredPosts.length} posts de {resolvedEntities.length} entidade(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters
        period={period}
        onPeriodChange={(p) => {
          setPeriod(p);
          if (p.preset !== "all") setPostLimit("all");
        }}
        postLimit={postLimit}
        onPostLimitChange={setPostLimit}
        sourceMode={sourceMode}
        onSourceModeChange={(m) => {
          setSourceMode(m);
          setSelectedEntityIds(new Set());
        }}
        selectedEntityIds={selectedEntityIds}
        onToggleEntity={handleToggleEntity}
        entities={filterEntities}
        brandEntityId={brandEntityId}
      />

      {/* Big Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Posts", value: fmt(bigNumbers.totalPosts), icon: BarChart3 },
          { label: "Seguidores", value: fmt(bigNumbers.totalFollowers), icon: Users },
          { label: "Média Likes", value: fmt(bigNumbers.avgLikes), icon: Heart },
          { label: "Média Comentários", value: fmt(bigNumbers.avgComments), icon: MessageCircle },
          { label: "Taxa Engajamento", value: `${bigNumbers.engRate.toFixed(2)}%`, icon: TrendingUp },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ COMPARATIVE SECTION ═══ */}
      {isComparative && entityMetrics.length > 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Análise Comparativa</h2>
            <p className="text-xs text-muted-foreground">Comparando {entityMetrics.length} entidades</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EngagementRateChart metrics={entityMetrics} />
            <AvgLikesChart metrics={entityMetrics} />
            <AvgCommentsChart metrics={entityMetrics} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ContentMixChart metrics={entityMetrics} />
            <RadarComparisonChart metrics={entityMetrics} />
            <VolumeEngagementScatter metrics={entityMetrics} />
          </div>
        </div>
      )}

      {/* ═══ PER-ENTITY SECTIONS ═══ */}
      {entityMetrics.map((em) => (
        <div key={em.entityId} className="space-y-4 pt-4 border-t border-border">
          {/* Entity header */}
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: em.color }} />
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-foreground">{em.name}</h3>
              {em.handle && (
                <span className="text-xs text-muted-foreground">@{em.handle.replace("@", "")}</span>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] ml-auto">{em.totalPosts} posts</Badge>
          </div>

          {/* Entity big numbers */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Seguidores", value: fmt(em.followers) },
              { label: "Posts", value: fmt(em.totalPosts) },
              { label: "Média Likes", value: fmt(em.avgLikes) },
              { label: "Média Coment.", value: fmt(em.avgComments) },
              { label: "Taxa Eng.", value: `${em.engagementRate.toFixed(2)}%` },
              { label: "Views", value: fmt(em.totalViews) },
            ].map((item) => (
              <Card key={item.label} className="border border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold font-mono text-foreground">{item.value}</p>
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ContentTypePieChart metrics={em} handle={em.handle} />
            <PerformanceByTypeChart posts={filteredPosts} entityId={em.entityId} />
            <PostsVolumeChart posts={filteredPosts} entityId={em.entityId} color={em.color} />
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TopHashtagsChart metrics={em} color={em.color} />
            <LikesTimelineChart posts={filteredPosts} entityId={em.entityId} />
            <ThemeDistributionChart metrics={em} color={em.color} />
          </div>

          {/* Top/Bottom posts */}
          <div className="space-y-4">
            <TopPostsTable posts={filteredPosts} entityId={em.entityId} mode="best" />
            <TopPostsTable posts={filteredPosts} entityId={em.entityId} mode="worst" />
          </div>
        </div>
      ))}

      {/* Empty filtered state */}
      {filteredPosts.length === 0 && allPosts.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum post encontrado para o período e filtros selecionados. Tente ajustar os filtros acima.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

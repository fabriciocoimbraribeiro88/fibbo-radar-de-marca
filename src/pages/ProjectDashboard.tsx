import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, Eye, Zap, Heart, MessageCircle, Instagram, TrendingUp, Flame, Percent } from "lucide-react";

import {
  useProjectDashboardData,
  useFilteredPosts,
  useEntityMetrics,
  type EntityMetrics,
  type PostData,
} from "@/hooks/useProjectDashboardData";

import DashboardFilters, {
  getPresetRange,
  type PeriodRange,
  type SourceMode,
} from "@/components/dashboard/DashboardFilters";
import type { CategoryKey } from "@/components/dashboard/FilterBar";

import FollowersChart from "@/components/dashboard/FollowersChart";
import EngagementChart from "@/components/dashboard/EngagementChart";
import EntityCard from "@/components/dashboard/EntityCard";

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

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  brand: "Marca",
  competitor: "Concorrentes",
  influencer: "Influencers",
  inspiration: "Inspirações",
};

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProjectDashboardData(id);

  const defaultRange = getPresetRange("this_year");
  const [period, setPeriod] = useState<PeriodRange>({ ...defaultRange, preset: "this_year" });
  const [sourceMode, setSourceMode] = useState<SourceMode>("brand_vs_all");
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const filteredPosts = useFilteredPosts(data?.posts ?? [], period);
  const allMetrics = useEntityMetrics(filteredPosts, data?.profiles ?? [], data?.entities ?? []);

  const visibleMetrics = useMemo(() => {
    if (!allMetrics.length) return [];
    if (sourceMode === "brand_only") return allMetrics.filter((m) => m.role === "brand");
    if (sourceMode === "brand_vs_all") return allMetrics;
    if (sourceMode === "brand_vs_competitors") return allMetrics.filter((m) => m.role === "brand" || m.role === "competitor");
    if (sourceMode === "brand_vs_influencers") return allMetrics.filter((m) => m.role === "brand" || m.role === "influencer");
    if (sourceMode === "brand_vs_inspiration") return allMetrics.filter((m) => m.role === "brand" || m.role === "inspiration");
    // brand_vs_selected
    const brand = allMetrics.filter((m) => m.role === "brand");
    const selected = allMetrics.filter((m) => selectedEntityIds.has(m.entityId));
    return [...brand, ...selected];
  }, [allMetrics, sourceMode, selectedEntityIds]);

  const entityOptions = useMemo(
    () => (data?.entities ?? []).map((e) => ({ id: e.id, name: e.name, handle: e.handle, role: e.role })),
    [data?.entities]
  );

  const bigNumbers = useMemo(() => {
    const m = visibleMetrics;
    return {
      totalPosts: m.reduce((s, e) => s + e.totalPosts, 0),
      totalLikes: m.reduce((s, e) => s + e.totalLikes, 0),
      totalComments: m.reduce((s, e) => s + e.totalComments, 0),
      totalViews: m.reduce((s, e) => s + e.totalViews, 0),
      avgEngagement: m.length
        ? Math.round(m.reduce((s, e) => s + e.avgEngagement, 0) / m.length)
        : 0,
      totalFollowers: m.reduce((s, e) => s + e.followers, 0),
      totalViralHits: m.reduce((s, e) => s + e.viralHits, 0),
      avgViralRate: m.length
        ? parseFloat((m.reduce((s, e) => s + e.viralRate, 0) / m.length).toFixed(1))
        : 0,
    };
  }, [visibleMetrics]);

  const followersTimeline = useMemo(() => {
    if (!data?.profiles || !data?.entities) return [];
    const nameMap = new Map(data.entities.map((e) => [e.id, e.name]));
    return data.profiles.map((p) => ({
      snapshot_date: p.snapshot_date,
      followers: p.followers_count ?? 0,
      entity_name: nameMap.get(p.entity_id) ?? "?",
    }));
  }, [data]);

  const engagementTimeline = useMemo(() => {
    const weekMap: Record<string, { total: number; count: number }> = {};
    for (const p of filteredPosts) {
      if (!p.posted_at) continue;
      const d = new Date(p.posted_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weekMap[key]) weekMap[key] = { total: 0, count: 0 };
      weekMap[key].total += p.engagement_total;
      weekMap[key].count++;
    }
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({
        period,
        avg_engagement: Math.round(v.total / v.count),
        posts_count: v.count,
      }));
  }, [filteredPosts]);

  const selectedEntity = useMemo(() => {
    if (selectedEntityId) return visibleMetrics.find((m) => m.entityId === selectedEntityId);
    return visibleMetrics.find((m) => m.role === "brand") ?? visibleMetrics[0];
  }, [selectedEntityId, visibleMetrics]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {visibleMetrics.length} entidades
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <BarChart3 className="h-3 w-3" />
            {bigNumbers.totalPosts} posts
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters
        period={period}
        onPeriodChange={setPeriod}
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
        selectedEntityIds={selectedEntityIds}
        onToggleEntity={(entityId) =>
          setSelectedEntityIds((prev) => {
            const next = new Set(prev);
            next.has(entityId) ? next.delete(entityId) : next.add(entityId);
            return next;
          })
        }
        entities={entityOptions}
        brandEntityId={data.brandEntityId}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="comparative" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Comparativa
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-1.5 text-xs">
            <Instagram className="h-3.5 w-3.5" />
            Individual
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: VISÃO GERAL ═══ */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Big Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
            {[
              { icon: Instagram, label: "Posts", value: formatNum(bigNumbers.totalPosts) },
              { icon: Heart, label: "Curtidas", value: formatNum(bigNumbers.totalLikes) },
              { icon: MessageCircle, label: "Comentários", value: formatNum(bigNumbers.totalComments) },
              { icon: Eye, label: "Views", value: formatNum(bigNumbers.totalViews) },
              { icon: Zap, label: "Eng. Médio", value: formatNum(bigNumbers.avgEngagement) },
              { icon: Users, label: "Seguidores", value: formatNum(bigNumbers.totalFollowers) },
              { icon: Flame, label: "Hits Virais", value: formatNum(bigNumbers.totalViralHits) },
              { icon: Percent, label: "Taxa Viral", value: `${bigNumbers.avgViralRate}%` },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="border border-border">
                <CardContent className="flex flex-col items-center p-4">
                  <div className="rounded-lg bg-accent p-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Evolution Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <FollowersChart data={followersTimeline} />
            <EngagementChart data={engagementTimeline} />
          </div>

          {/* Entity Cards grouped by type */}
          {(["brand", "competitor", "influencer", "inspiration"] as CategoryKey[]).map((cat) => {
            const catMetrics = visibleMetrics.filter((m) => m.role === cat);
            if (!catMetrics.length) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {catMetrics.map((m) => (
                    <EntityCard
                      key={m.entityId}
                      category={cat}
                      entity={{
                        entity_id: m.entityId,
                        entity_name: m.name,
                        instagram_handle: m.handle,
                        entity_type: m.type,
                        posts_count: m.totalPosts,
                        total_likes: m.totalLikes,
                        total_comments: m.totalComments,
                        total_views: m.totalViews,
                        total_engagement: m.totalLikes + m.totalComments,
                        avg_engagement: m.avgEngagement,
                        followers: m.followers,
                        following: null,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ═══ TAB 2: ANÁLISE COMPARATIVA ═══ */}
        <TabsContent value="comparative" className="mt-6">
          {visibleMetrics.length < 2 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Selecione pelo menos 2 entidades nos filtros para ver a comparação.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <EngagementRateChart metrics={visibleMetrics} />
                <AvgLikesChart metrics={visibleMetrics} />
                <AvgCommentsChart metrics={visibleMetrics} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ContentMixChart metrics={visibleMetrics} />
                <RadarComparisonChart metrics={visibleMetrics} />
                <VolumeEngagementScatter metrics={visibleMetrics} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB 3: ANÁLISE INDIVIDUAL ═══ */}
        <TabsContent value="individual" className="mt-6 space-y-6">
          {/* Entity selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entidade:</span>
            <Select
              value={selectedEntity?.entityId ?? ""}
              onValueChange={setSelectedEntityId}
            >
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleMetrics.map((m) => (
                  <SelectItem key={m.entityId} value={m.entityId}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEntity && (
            <>
              {/* Big numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Seguidores", value: formatNum(selectedEntity.followers) },
                  { label: "Posts", value: formatNum(selectedEntity.totalPosts) },
                  { label: "Eng. Médio", value: formatNum(selectedEntity.avgEngagement) },
                  { label: "Taxa Eng.", value: `${selectedEntity.engagementRate.toFixed(2)}%` },
                  { label: "Hits Virais", value: formatNum(selectedEntity.viralHits) },
                  { label: "Taxa Viral", value: `${selectedEntity.viralRate.toFixed(1)}%` },
                ].map((item) => (
                  <Card key={item.label} className="border border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-xl font-bold font-mono text-foreground">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ContentTypePieChart metrics={selectedEntity} handle={selectedEntity.handle} />
                <PerformanceByTypeChart posts={filteredPosts} entityId={selectedEntity.entityId} />
                <PostsVolumeChart posts={filteredPosts} entityId={selectedEntity.entityId} color={selectedEntity.color} />
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TopHashtagsChart metrics={selectedEntity} color={selectedEntity.color} />
                <LikesTimelineChart posts={filteredPosts} entityId={selectedEntity.entityId} />
                <ThemeDistributionChart metrics={selectedEntity} color={selectedEntity.color} />
              </div>

              {/* Row 3: Top Posts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TopPostsTable posts={filteredPosts} entityId={selectedEntity.entityId} mode="best" />
                <TopPostsTable posts={filteredPosts} entityId={selectedEntity.entityId} mode="worst" />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { Loader2, Users, Heart, MessageCircle, Eye, BarChart3, Instagram, TrendingUp, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatNum } from "@/lib/formatNumber";
import {
  useProjectDashboardData,
  useFilteredPosts,
  useEntityMetrics,
  type DateRange,
  type EntityInfo,
  type EntityMetrics as EntityMetricsType,
} from "@/hooks/useProjectDashboardData";

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

/* ── Period Presets ── */
const PERIOD_PRESETS = [
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 90 dias", value: "90d" },
  { label: "Último semestre", value: "6m" },
  { label: "Este ano", value: "ytd" },
  { label: "Todo o período", value: "all" },
];

function getPresetRange(preset: string): DateRange {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  switch (preset) {
    case "30d": return { from: new Date(now.getTime() - 30 * 86400000), to };
    case "90d": return { from: new Date(now.getTime() - 90 * 86400000), to };
    case "6m": return { from: new Date(now.getTime() - 180 * 86400000), to };
    case "ytd": return { from: new Date(now.getFullYear(), 0, 1), to };
    default: return { from: new Date(2020, 0, 1), to };
  }
}

/* ── Big Number Card ── */
function BigNumberCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="border border-border">
      <CardContent className="flex flex-col items-center p-4">
        <div className="rounded-lg bg-accent p-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xl font-bold font-mono text-foreground">{formatNum(value)}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ── Followers Timeline Chart (inline) ── */
function FollowersTimelineChart({ profiles, entities }: { profiles: any[]; entities: EntityInfo[] }) {
  const data = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const p of profiles) {
      const entity = entities.find((e) => e.id === p.entity_id);
      if (!entity || !p.snapshot_date) continue;
      if (!dateMap[p.snapshot_date]) dateMap[p.snapshot_date] = {};
      dateMap[p.snapshot_date][entity.name] = p.followers_count ?? 0;
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [profiles, entities]);

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Evolução de Seguidores</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNum(v)} />
            <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {entities.map((e) => (
              <Line key={e.id} dataKey={e.name} stroke={e.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ── Weekly Engagement Chart (inline) ── */
function WeeklyEngagementChart({ posts, entities }: { posts: any[]; entities: EntityInfo[] }) {
  const data = useMemo(() => {
    const weekMap: Record<string, Record<string, { total: number; count: number }>> = {};
    for (const p of posts) {
      if (!p.posted_at) continue;
      const d = new Date(p.posted_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      const entity = entities.find((e) => e.id === p.entity_id);
      if (!entity) continue;
      if (!weekMap[key]) weekMap[key] = {};
      if (!weekMap[key][entity.name]) weekMap[key][entity.name] = { total: 0, count: 0 };
      weekMap[key][entity.name].total += (p.likes_count + p.comments_count);
      weekMap[key][entity.name].count++;
    }
    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, vals]) => {
        const row: Record<string, any> = { week };
        for (const [name, { total, count }] of Object.entries(vals)) {
          row[name] = Math.round(total / count);
        }
        return row;
      });
  }, [posts, entities]);

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Engajamento Médio Semanal</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="week" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNum(v)} />
            <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {entities.map((e) => (
              <Line key={e.id} dataKey={e.name} stroke={e.color} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ── Entity Card ── */
function EntitySummaryCard({ m }: { m: EntityMetricsType }) {
  const roleBadge: Record<string, string> = {
    brand: "bg-primary/15 text-primary",
    competitor: "bg-destructive/15 text-destructive",
    influencer: "bg-violet-500/15 text-violet-600",
    inspiration: "bg-pink-500/15 text-pink-600",
  };
  const roleLabel: Record<string, string> = {
    brand: "Marca",
    competitor: "Concorrente",
    influencer: "Influencer",
    inspiration: "Inspiração",
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shrink-0" style={{ backgroundColor: m.color }}>
            {(m.name ?? "??").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
            {m.handle && <p className="text-[10px] text-muted-foreground">@{m.handle.replace("@", "")}</p>}
          </div>
          <Badge className={`ml-auto text-[9px] ${roleBadge[m.role] ?? roleBadge.competitor}`}>
            {roleLabel[m.role] ?? m.role}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold font-mono text-foreground">{formatNum(m.followers)}</p>
            <p className="text-[9px] text-muted-foreground">Seguidores</p>
          </div>
          <div>
            <p className="text-sm font-bold font-mono text-foreground">{formatNum(m.totalPosts)}</p>
            <p className="text-[9px] text-muted-foreground">Posts</p>
          </div>
          <div>
            <p className="text-sm font-bold font-mono text-foreground">{formatNum(m.avgEngagement)}</p>
            <p className="text-[9px] text-muted-foreground">Eng. Médio</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── MAIN PAGE ── */
export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProjectDashboardData(id);

  const [periodPreset, setPeriodPreset] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const dateRange = useMemo(() => getPresetRange(periodPreset), [periodPreset]);

  const filteredPosts = useFilteredPosts(data?.posts ?? [], dateRange);
  const entityMetrics = useEntityMetrics(filteredPosts, data?.profiles ?? [], data?.entities ?? []);

  // Totals
  const totals = useMemo(() => {
    return entityMetrics.reduce(
      (acc, m) => ({
        posts: acc.posts + m.totalPosts,
        likes: acc.likes + m.totalLikes,
        comments: acc.comments + m.totalComments,
        views: acc.views + m.totalViews,
        engagement: acc.engagement + m.totalLikes + m.totalComments,
        followers: acc.followers + m.followers,
      }),
      { posts: 0, likes: 0, comments: 0, views: 0, engagement: 0, followers: 0 }
    );
  }, [entityMetrics]);

  const avgEngPerPost = totals.posts > 0 ? Math.round(totals.engagement / totals.posts) : 0;

  // Selected entity for individual tab
  const selectedEntity = useMemo(() => {
    const eid = selectedEntityId ?? data?.entities?.[0]?.id ?? null;
    return entityMetrics.find((m) => m.entityId === eid) ?? entityMetrics[0] ?? null;
  }, [selectedEntityId, entityMetrics, data?.entities]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard do Projeto</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.projectName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs gap-1">
            <BarChart3 className="h-3 w-3" />
            {totals.posts} posts
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {data.entities.length} entidades
          </Badge>
          <Select value={periodPreset} onValueChange={setPeriodPreset}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="comparative" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Análise Comparativa
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-1.5 text-xs">
            <Instagram className="h-3.5 w-3.5" />
            Análise Individual
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO GERAL */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Big Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <BigNumberCard icon={BarChart3} label="Total de Posts" value={totals.posts} />
            <BigNumberCard icon={Heart} label="Total de Curtidas" value={totals.likes} />
            <BigNumberCard icon={MessageCircle} label="Total de Comentários" value={totals.comments} />
            <BigNumberCard icon={Eye} label="Total de Visualizações" value={totals.views} />
            <BigNumberCard icon={TrendingUp} label="Eng. Médio / Post" value={avgEngPerPost} />
            <BigNumberCard icon={Users} label="Total de Seguidores" value={totals.followers} />
          </div>

          {/* Timeline charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <FollowersTimelineChart profiles={data.profiles} entities={data.entities} />
            <WeeklyEngagementChart posts={filteredPosts} entities={data.entities} />
          </div>

          {/* Entity cards */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Entidades Monitoradas</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {entityMetrics.map((m) => <EntitySummaryCard key={m.entityId} m={m} />)}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: ANÁLISE COMPARATIVA */}
        <TabsContent value="comparative" className="mt-6">
          {entityMetrics.length < 2 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Adicione pelo menos 2 entidades para a análise comparativa.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <EngagementRateChart metrics={entityMetrics} />
              <AvgLikesChart metrics={entityMetrics} />
              <AvgCommentsChart metrics={entityMetrics} />
              <ContentMixChart metrics={entityMetrics} />
              <RadarComparisonChart metrics={entityMetrics} />
              <VolumeEngagementScatter metrics={entityMetrics} />
            </div>
          )}
        </TabsContent>

        {/* TAB 3: ANÁLISE INDIVIDUAL */}
        <TabsContent value="individual" className="mt-6 space-y-6">
          {/* Entity selector */}
          <div className="flex flex-wrap gap-2">
            {data.entities.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEntityId(e.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  (selectedEntity?.entityId === e.id)
                    ? "text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                style={(selectedEntity?.entityId === e.id) ? { backgroundColor: e.color } : undefined}
              >
                {e.name}
              </button>
            ))}
          </div>

          {selectedEntity && (
            <>
              {/* Big numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <BigNumberCard icon={Users} label="Seguidores" value={selectedEntity.followers} />
                <BigNumberCard icon={BarChart3} label="Posts no Período" value={selectedEntity.totalPosts} />
                <BigNumberCard icon={TrendingUp} label="Eng. Médio" value={selectedEntity.avgEngagement} />
                <BigNumberCard icon={Hash} label="Taxa de Engajamento" value={Number(selectedEntity.engagementRate.toFixed(2))} />
              </div>

              {/* Row 1: 3 charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ContentTypePieChart metrics={selectedEntity} handle={selectedEntity.handle} />
                <PerformanceByTypeChart posts={filteredPosts} entityId={selectedEntity.entityId} />
                <PostsVolumeChart posts={filteredPosts} entityId={selectedEntity.entityId} color={selectedEntity.color} />
              </div>

              {/* Row 2: 3 charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TopHashtagsChart metrics={selectedEntity} color={selectedEntity.color} />
                <LikesTimelineChart posts={filteredPosts} entityId={selectedEntity.entityId} />
                <ThemeDistributionChart metrics={selectedEntity} color={selectedEntity.color} />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

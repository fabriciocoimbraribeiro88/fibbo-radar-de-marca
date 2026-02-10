import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Heart, MessageCircle, Eye, Zap, TrendingUp, Instagram } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useMemo } from "react";

function fmt(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

interface EntityMetrics {
  entity_id: string;
  entity_name: string;
  instagram_handle: string | null;
  entity_type: string;
  posts_count: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_engagement: number;
  avg_engagement: number;
  followers: number | null;
  following: number | null;
}

function useProjectDashboard(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      // Get entities for this project
      const { data: projectEntities, error: peErr } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role, monitored_entities(id, name, instagram_handle, type)")
        .eq("project_id", projectId!);

      if (peErr) throw peErr;
      if (!projectEntities?.length) return { entities: [], followersTimeline: [] };

      const entityIds = projectEntities.map((pe) => pe.entity_id);

      // Fetch posts aggregated per entity
      const { data: posts } = await supabase
        .from("instagram_posts")
        .select("entity_id, likes_count, comments_count, views_count, engagement_total")
        .in("entity_id", entityIds);

      // Fetch latest profile per entity
      const { data: profiles } = await supabase
        .from("instagram_profiles")
        .select("entity_id, followers_count, following_count, snapshot_date")
        .in("entity_id", entityIds)
        .order("snapshot_date", { ascending: false });

      // Fetch followers timeline
      const { data: allProfiles } = await supabase
        .from("instagram_profiles")
        .select("entity_id, followers_count, snapshot_date")
        .in("entity_id", entityIds)
        .order("snapshot_date", { ascending: true });

      // Build per-entity metrics
      const metricsMap = new Map<string, EntityMetrics>();

      for (const pe of projectEntities) {
        const entity = pe.monitored_entities as unknown as {
          id: string;
          name: string;
          instagram_handle: string | null;
          type: string;
        };
        if (!entity) continue;

        const entityPosts = (posts ?? []).filter((p) => p.entity_id === pe.entity_id);
        const latestProfile = (profiles ?? []).find((p) => p.entity_id === pe.entity_id);

        const totalLikes = entityPosts.reduce((s, p) => s + (p.likes_count ?? 0), 0);
        const totalComments = entityPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0);
        const totalViews = entityPosts.reduce((s, p) => s + (p.views_count ?? 0), 0);
        const totalEng = entityPosts.reduce((s, p) => s + (p.engagement_total ?? 0), 0);
        const postsWithEng = entityPosts.filter((p) => p.engagement_total != null);

        metricsMap.set(pe.entity_id, {
          entity_id: pe.entity_id,
          entity_name: entity.name,
          instagram_handle: entity.instagram_handle,
          entity_type: pe.entity_role,
          posts_count: entityPosts.length,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_views: totalViews,
          total_engagement: totalEng,
          avg_engagement: postsWithEng.length > 0 ? Math.round(totalEng / postsWithEng.length) : 0,
          followers: latestProfile?.followers_count ?? null,
          following: latestProfile?.following_count ?? null,
        });
      }

      // Build followers timeline (pivoted)
      const entityNameMap = new Map<string, string>();
      for (const [, m] of metricsMap) entityNameMap.set(m.entity_id, m.entity_name);

      const timelineMap = new Map<string, Record<string, number | string>>();
      for (const p of allProfiles ?? []) {
        const name = entityNameMap.get(p.entity_id ?? "") ?? "?";
        if (!timelineMap.has(p.snapshot_date)) {
          timelineMap.set(p.snapshot_date, { date: p.snapshot_date });
        }
        timelineMap.get(p.snapshot_date)![name] = p.followers_count ?? 0;
      }

      const followersTimeline = Array.from(timelineMap.values()).sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
      );

      return {
        entities: Array.from(metricsMap.values()).sort((a, b) => b.total_engagement - a.total_engagement),
        followersTimeline,
      };
    },
    enabled: !!projectId,
  });
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

const roleLabel: Record<string, string> = {
  competitor: "Concorrente",
  influencer: "Influenciador",
  inspiration: "Inspiração",
};

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProjectDashboard(id);

  const comparisonData = useMemo(() => {
    if (!data?.entities) return [];
    return data.entities.map((e) => ({
      name: e.entity_name.length > 12 ? e.entity_name.slice(0, 12) + "…" : e.entity_name,
      Curtidas: e.total_likes,
      Comentários: e.total_comments,
      Visualizações: e.total_views,
    }));
  }, [data]);

  const entityNames = useMemo(() => {
    if (!data?.entities) return [];
    return data.entities.map((e) => e.entity_name);
  }, [data]);

  const formattedTimeline = useMemo(() => {
    if (!data?.followersTimeline) return [];
    return data.followersTimeline.map((d) => ({
      ...d,
      date: new Date(d.date as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    }));
  }, [data]);

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
        <h1 className="text-xl font-semibold text-foreground mb-2">Dashboard do Projeto</h1>
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
    <div className="mx-auto max-w-5xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard do Projeto</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Métricas detalhadas por entidade monitorada.</p>
      </div>

      {/* Entity cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.entities.map((e) => (
          <Card key={e.entity_id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.entity_name}</p>
                  {e.instagram_handle && (
                    <p className="text-xs text-muted-foreground">@{e.instagram_handle.replace("@", "")}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-[9px] shrink-0">
                  {roleLabel[e.entity_type] ?? e.entity_type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricCell icon={<Users className="h-3 w-3" />} label="Seguidores" value={fmt(e.followers)} />
                <MetricCell icon={<Instagram className="h-3 w-3" />} label="Posts" value={fmt(e.posts_count)} />
                <MetricCell icon={<Heart className="h-3 w-3" />} label="Curtidas" value={fmt(e.total_likes)} />
                <MetricCell icon={<MessageCircle className="h-3 w-3" />} label="Comentários" value={fmt(e.total_comments)} />
                <MetricCell icon={<Eye className="h-3 w-3" />} label="Visualizações" value={fmt(e.total_views)} />
                <MetricCell icon={<Zap className="h-3 w-3" />} label="Eng. Total" value={fmt(e.total_engagement)} />
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-accent p-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold font-mono text-foreground">{fmt(e.avg_engagement)}</p>
                  <p className="text-[9px] text-muted-foreground">Eng. Médio / Post</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison bar chart */}
      {comparisonData.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Comparativo de Engajamento</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => fmt(v)} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Curtidas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comentários" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Visualizações" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Followers timeline */}
      {formattedTimeline.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Evolução de Seguidores</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={formattedTimeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => fmt(v)} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {entityNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs font-bold font-mono text-foreground">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

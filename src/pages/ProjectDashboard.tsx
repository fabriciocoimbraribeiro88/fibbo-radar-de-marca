import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import { useMemo, useState, useCallback } from "react";
import FilterBar, { type CategoryKey } from "@/components/dashboard/FilterBar";
import EntityCard, { type EntityMetrics } from "@/components/dashboard/EntityCard";
import SectionHeader from "@/components/dashboard/SectionHeader";

/* ── helpers ── */
function fmt(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  brand: "hsl(18 79% 50%)",
  competitor: "hsl(239 84% 67%)",
  influencer: "hsl(330 81% 60%)",
  inspiration: "hsl(160 84% 39%)",
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  brand: "Marca",
  competitor: "Concorrentes",
  influencer: "Influencers",
  inspiration: "Inspirações",
};

const SECTION_ORDER: CategoryKey[] = ["brand", "competitor", "influencer", "inspiration"];

/* ── data hook ── */
function useProjectDashboard(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("instagram_handle")
        .eq("id", projectId!)
        .single();

      const { data: projectEntities, error: peErr } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role, monitored_entities(id, name, instagram_handle, type)")
        .eq("project_id", projectId!);

      if (peErr) throw peErr;
      if (!projectEntities?.length) return { entities: [], followersTimeline: [], brandHandle: null };

      const entityIds = projectEntities.map((pe) => pe.entity_id);

      const [{ data: posts }, { data: profiles }, { data: allProfiles }] = await Promise.all([
        supabase.from("instagram_posts")
          .select("entity_id, likes_count, comments_count, views_count, engagement_total")
          .in("entity_id", entityIds),
        supabase.from("instagram_profiles")
          .select("entity_id, followers_count, following_count, snapshot_date")
          .in("entity_id", entityIds)
          .order("snapshot_date", { ascending: false }),
        supabase.from("instagram_profiles")
          .select("entity_id, followers_count, snapshot_date")
          .in("entity_id", entityIds)
          .order("snapshot_date", { ascending: true }),
      ]);

      const brandHandle = project?.instagram_handle?.replace("@", "").toLowerCase() ?? null;
      const metricsMap = new Map<string, EntityMetrics>();

      for (const pe of projectEntities) {
        const entity = pe.monitored_entities as unknown as {
          id: string; name: string; instagram_handle: string | null; type: string;
        };
        if (!entity) continue;

        const entityPosts = (posts ?? []).filter((p) => p.entity_id === pe.entity_id);
        const latestProfile = (profiles ?? []).find((p) => p.entity_id === pe.entity_id);
        const totalLikes = entityPosts.reduce((s, p) => s + (p.likes_count ?? 0), 0);
        const totalComments = entityPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0);
        const totalViews = entityPosts.reduce((s, p) => s + (p.views_count ?? 0), 0);
        const totalEng = entityPosts.reduce((s, p) => s + (p.engagement_total ?? 0), 0);
        const postsWithEng = entityPosts.filter((p) => p.engagement_total != null);

        // Determine if this entity is the brand
        const handleNorm = entity.instagram_handle?.replace("@", "").toLowerCase() ?? "";
        const isBrand = brandHandle && handleNorm === brandHandle;

        metricsMap.set(pe.entity_id, {
          entity_id: pe.entity_id,
          entity_name: entity.name,
          instagram_handle: entity.instagram_handle,
          entity_type: isBrand ? "brand" : pe.entity_role,
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

      // Build followers timeline
      const entityNameMap = new Map<string, string>();
      for (const [, m] of metricsMap) entityNameMap.set(m.entity_id, m.entity_name);

      const timelineMap = new Map<string, Record<string, number | string>>();
      for (const p of allProfiles ?? []) {
        const name = entityNameMap.get(p.entity_id ?? "") ?? "?";
        if (!timelineMap.has(p.snapshot_date)) timelineMap.set(p.snapshot_date, { date: p.snapshot_date });
        timelineMap.get(p.snapshot_date)![name] = p.followers_count ?? 0;
      }

      return {
        entities: Array.from(metricsMap.values()).sort((a, b) => b.total_engagement - a.total_engagement),
        followersTimeline: Array.from(timelineMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))),
        brandHandle,
      };
    },
    enabled: !!projectId,
  });
}

/* ── main component ── */
export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useProjectDashboard(id);

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());

  const isAllSelected = selectedCategories.size === 0 && selectedEntities.size === 0;

  const onSelectAll = useCallback(() => {
    setSelectedCategories(new Set());
    setSelectedEntities(new Set());
  }, []);

  const onToggleCategory = useCallback((key: CategoryKey) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const onToggleEntity = useCallback((id: string) => {
    setSelectedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* Derived data */
  const allEntities = data?.entities ?? [];

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEntities) {
      counts[e.entity_type] = (counts[e.entity_type] || 0) + 1;
    }
    return SECTION_ORDER
      .filter((k) => (counts[k] ?? 0) > 0)
      .map((k) => ({ key: k, label: CATEGORY_LABELS[k], count: counts[k] ?? 0 }));
  }, [allEntities]);

  const entityPills = useMemo(
    () => allEntities.map((e) => ({ id: e.entity_id, name: e.entity_name, category: e.entity_type as CategoryKey })),
    [allEntities]
  );

  const filteredEntities = useMemo(() => {
    if (isAllSelected) return allEntities;
    return allEntities.filter((e) => {
      if (selectedEntities.has(e.entity_id)) return true;
      if (selectedCategories.has(e.entity_type)) return true;
      return false;
    });
  }, [allEntities, selectedCategories, selectedEntities, isAllSelected]);

  const groupedEntities = useMemo(() => {
    const groups: Partial<Record<CategoryKey, EntityMetrics[]>> = {};
    for (const e of filteredEntities) {
      const cat = e.entity_type as CategoryKey;
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(e);
    }
    return groups;
  }, [filteredEntities]);

  const comparisonData = useMemo(
    () => filteredEntities.map((e) => ({
      name: e.entity_name.length > 14 ? e.entity_name.slice(0, 14) + "…" : e.entity_name,
      Curtidas: e.total_likes,
      Comentários: e.total_comments,
      Views: e.total_views,
      category: e.entity_type as CategoryKey,
    })),
    [filteredEntities]
  );

  const filteredEntityNames = useMemo(() => new Set(filteredEntities.map((e) => e.entity_name)), [filteredEntities]);

  const formattedTimeline = useMemo(() => {
    if (!data?.followersTimeline) return [];
    return data.followersTimeline.map((d) => ({
      ...d,
      date: new Date(d.date as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    }));
  }, [data]);

  const timelineEntityNames = useMemo(() => {
    if (!formattedTimeline.length) return [];
    const keys = new Set<string>();
    for (const row of formattedTimeline) {
      for (const k of Object.keys(row)) {
        if (k !== "date" && filteredEntityNames.has(k)) keys.add(k);
      }
    }
    return Array.from(keys);
  }, [formattedTimeline, filteredEntityNames]);

  const entityColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of allEntities) {
      map[e.entity_name] = CATEGORY_COLORS[e.entity_type as CategoryKey] ?? "hsl(var(--primary))";
    }
    return map;
  }, [allEntities]);

  /* ── render ── */
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allEntities.length) {
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
    <div className="mx-auto max-w-6xl animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão comparativa de todas as entidades monitoradas.</p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        categories={categories}
        entities={entityPills}
        selectedCategories={selectedCategories}
        selectedEntities={selectedEntities}
        onToggleCategory={onToggleCategory}
        onToggleEntity={onToggleEntity}
        onSelectAll={onSelectAll}
        isAllSelected={isAllSelected}
      />

      {/* Sections */}
      {SECTION_ORDER.map((cat) => {
        const entities = groupedEntities[cat];
        if (!entities?.length) return null;
        return (
          <section key={cat} className="space-y-4">
            <SectionHeader category={cat} count={entities.length} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entities.map((e) => (
                <EntityCard key={e.entity_id} entity={e} category={cat} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Comparison bar chart */}
      {comparisonData.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Comparativo de Engajamento</h2>
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => fmt(v)} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Curtidas" fill="hsl(18 79% 50%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Comentários" fill="hsl(239 84% 67%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Views" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Followers timeline */}
      {formattedTimeline.length > 0 && timelineEntityNames.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Evolução de Seguidores</h2>
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={formattedTimeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => fmt(v)} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {timelineEntityNames.map((name) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={entityColorMap[name] ?? "hsl(var(--primary))"}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

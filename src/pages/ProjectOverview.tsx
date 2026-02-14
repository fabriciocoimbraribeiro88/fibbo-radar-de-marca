import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Instagram,
  BarChart3,
  ArrowRight,
  CalendarDays,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Database,
} from "lucide-react";

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ["project-overview-stats", id],
    queryFn: async () => {
      const { data: peData } = await supabase
        .from("project_entities")
        .select("id, entity_id")
        .eq("project_id", id!);
      const entityIds = peData?.map((e) => e.entity_id) ?? [];

      const [analysesRes, postsRes, calendarsRes, sourcesRes] = await Promise.all([
        supabase.from("analyses").select("id", { count: "exact", head: true }).eq("project_id", id!),
        supabase.from("instagram_posts").select("id", { count: "exact", head: true }).in("entity_id", entityIds.length ? entityIds : ["__none__"]),
        supabase.from("planning_calendars").select("id", { count: "exact", head: true }).eq("project_id", id!).eq("status", "draft"),
        supabase.from("brand_context_sources").select("id, status").eq("project_id", id!),
      ]);
      return {
        entities: peData?.length ?? 0,
        analyses: analysesRes.count ?? 0,
        posts: postsRes.count ?? 0,
        calendars: calendarsRes.count ?? 0,
        sources: sourcesRes.data ?? [],
      };
    },
    enabled: !!id,
  });

  // Context strength calculation
  const contextStrength = (() => {
    if (!stats || !project) return { score: 0, label: "Não configurado", items: [] as { label: string; done: boolean }[] };
    const items = [
      { label: "Fontes de dados adicionadas", done: stats.entities > 0 },
      { label: "Posts coletados", done: stats.posts > 0 },
      { label: "Fontes de contexto (briefings/docs)", done: stats.sources.length > 0 },
      { label: "Fontes processadas", done: stats.sources.filter((s) => s.status === "processed").length > 0 },
      { label: "Briefing preenchido", done: !!project.briefing },
    ];
    const done = items.filter((i) => i.done).length;
    const score = Math.round((done / items.length) * 100);
    const label = score === 100 ? "Completo" : score >= 60 ? "Bom" : score >= 20 ? "Parcial" : "Não configurado";
    return { score, label, items };
  })();

  const statCards = [
    { label: "Marcas / Fontes", value: stats?.entities ?? 0, icon: Users, path: "sources", color: "text-blue-500 bg-blue-500/10" },
    { label: "Posts Coletados", value: stats?.posts ?? 0, icon: Instagram, path: "dashboard", color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Análises", value: stats?.analyses ?? 0, icon: BarChart3, path: "analyses", color: "text-amber-500 bg-amber-500/10" },
    { label: "Planejamentos", value: stats?.calendars ?? 0, icon: CalendarDays, path: "planning", color: "text-violet-500 bg-violet-500/10" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">{project?.name}</h1>
        <p className="page-subtitle">
          {project?.segment && <Badge variant="secondary" className="mr-2 bg-accent/60 border-0 rounded-full">{project.segment}</Badge>}
          {project?.brand_description || "Visão geral do projeto."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="card-interactive group p-4"
            onClick={() => navigate(`/projects/${id}/${s.path}`)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-xl p-2 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className="kpi-label">{s.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="kpi-value">{s.value}</p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Context Strength Bar */}
      <div className="card-flat p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-label flex items-center gap-2">
            <Database className="h-3.5 w-3.5" />
            FORÇA DO CONTEXTO
          </h3>
          <Badge
            variant="secondary"
            className={`text-xs border-0 rounded-full ${
              contextStrength.score >= 80
                ? "bg-emerald-500/10 text-emerald-600"
                : contextStrength.score >= 40
                ? "bg-amber-500/10 text-amber-600"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {contextStrength.label} — {contextStrength.score}%
          </Badge>
        </div>
        <Progress value={contextStrength.score} className="h-2 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {contextStrength.items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Brand summary */}
      {project && (
        <div className="card-flat p-6">
          <h3 className="section-label mb-3">BRIEFING DA MARCA</h3>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Marca</span>
              <p className="text-foreground">{project.brand_name}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instagram</span>
              <p className="text-foreground">{project.instagram_handle || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Público-Alvo</span>
              <p className="text-foreground">{project.target_audience || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tom de Voz</span>
              <p className="text-foreground">{project.tone_of_voice || "—"}</p>
            </div>
            {project.keywords && project.keywords.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Keywords</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {project.keywords.map((k) => (
                    <Badge key={k} variant="secondary" className="text-xs bg-primary/10 text-primary border-0">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

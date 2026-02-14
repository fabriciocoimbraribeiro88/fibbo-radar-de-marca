import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Instagram,
  BarChart3,
  ArrowRight,
  CalendarDays,
  Database,
  Palette,
  Lightbulb,
} from "lucide-react";
import ContextStrengthBar from "@/components/brand-context/ContextStrengthBar";

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
        supabase.from("brand_context_sources").select("id").eq("project_id", id!),
      ]);
      return {
        entities: peData?.length ?? 0,
        analyses: analysesRes.count ?? 0,
        posts: postsRes.count ?? 0,
        calendars: calendarsRes.count ?? 0,
        hasSources: (sourcesRes.data?.length ?? 0) > 0,
      };
    },
    enabled: !!id,
  });

  const statCards = [
    { label: "Marcas / Fontes", value: stats?.entities ?? 0, icon: Users, path: "sources", color: "text-blue-500 bg-blue-500/10" },
    { label: "Posts Coletados", value: stats?.posts ?? 0, icon: Instagram, path: "dashboard", color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Análises", value: stats?.analyses ?? 0, icon: BarChart3, path: "analyses", color: "text-amber-500 bg-amber-500/10" },
    { label: "Planejamentos", value: stats?.calendars ?? 0, icon: CalendarDays, path: "planning", color: "text-violet-500 bg-violet-500/10" },
  ];

  // Next steps logic
  const nextSteps = (() => {
    if (!stats) return [];
    const steps: { label: string; action: string; icon: typeof Database; path: string }[] = [];
    if (stats.entities === 0) {
      steps.push({ label: "Adicione fontes de dados para começar", icon: Database, action: "Ir para Fontes", path: "sources" });
    }
    if (stats.entities > 0 && !stats.hasSources) {
      steps.push({ label: "Envie briefings e documentos para enriquecer o contexto", icon: Database, action: "Ir para Fontes", path: "sources" });
    }
    if (stats.hasSources && stats.analyses === 0) {
      steps.push({ label: "Gere o contexto de marca e crie sua primeira análise", icon: Palette, action: "Contexto de Marca", path: "brand" });
    }
    return steps;
  })();

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
      <div className="mb-6">
        <ContextStrengthBar projectId={id!} />
      </div>

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="card-flat p-5 mb-6">
          <h3 className="section-label flex items-center gap-2 mb-3">
            <Lightbulb className="h-3.5 w-3.5" />
            PRÓXIMOS PASSOS
          </h3>
          <div className="space-y-2">
            {nextSteps.map((step) => (
              <div key={step.path} className="flex items-center justify-between bg-accent/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <step.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{step.label}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate(`/projects/${id}/${step.path}`)}
                >
                  {step.action}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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

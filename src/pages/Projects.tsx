import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  Plus,
  BarChart3,
  Search,
  Database,
  ArrowRight,
  Clock,
  CalendarDays,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", projects?.map(p => p.id).sort()],
    queryFn: async () => {
      const projectIds = (projects ?? []).map((p) => p.id);
      if (!projectIds.length) return { entities: 0, posts: 0, analyses: 0, lastPostAt: null as string | null, activePlannings: 0 };

      const [entitiesRes, postsRes, analysesRes, lastPostRes, planningsRes] = await Promise.all([
        supabase
          .from("project_entities")
          .select("entity_id", { count: "exact", head: true })
          .in("project_id", projectIds),
        supabase
          .from("instagram_posts")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("entity_reports")
          .select("id", { count: "exact", head: true })
          .in("project_id", projectIds),
        supabase
          .from("instagram_posts")
          .select("fetched_at")
          .order("fetched_at", { ascending: false })
          .limit(1),
        supabase
          .from("planning_calendars")
          .select("id", { count: "exact", head: true })
          .in("project_id", projectIds)
          .eq("status", "draft"),
      ]);

      return {
        entities: entitiesRes.count ?? 0,
        posts: postsRes.count ?? 0,
        analyses: analysesRes.count ?? 0,
        lastPostAt: lastPostRes.data?.[0]?.fetched_at ?? null,
        activePlannings: planningsRes.count ?? 0,
      };
    },
    enabled: !!projects?.length,
  });

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? "usuário";

  const lastCollectedLabel = stats?.lastPostAt
    ? formatDistanceToNow(new Date(stats.lastPostAt), { addSuffix: true, locale: ptBR })
    : "—";

  const statItems: { label: string; value: string | number; icon: typeof Database; color: string }[] = [
    { label: "Marcas Monitoradas", value: stats?.entities ?? 0, icon: Database, color: "text-blue-500 bg-blue-500/10" },
    { label: "Posts Coletados", value: stats?.posts ?? 0, icon: BarChart3, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Última Coleta", value: lastCollectedLabel, icon: Clock, color: "text-amber-500 bg-amber-500/10" },
    { label: "Planejamentos Ativos", value: stats?.activePlannings ?? 0, icon: CalendarDays, color: "text-violet-500 bg-violet-500/10" },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-10">
      {/* Header */}
      <div>
        <h1 className="page-title">Olá, {firstName} 👋</h1>
        <p className="page-subtitle">
          Aqui está o panorama geral dos seus projetos.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statItems.map((stat) => (
          <div key={stat.label} className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className={typeof stat.value === "number" ? "kpi-value" : "text-sm font-semibold text-foreground"}>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    typeof stat.value === "number" ? stat.value.toLocaleString("pt-BR") : stat.value
                  )}
                </p>
                <p className="kpi-label">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Seus Projetos
          </h2>
          <Button size="sm" className="gradient-coral text-white rounded-lg shadow-sm" onClick={() => navigate("/projects/new")}>
            <Plus className="mr-1 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="gradient-card p-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-base font-medium text-foreground mb-1">
              Nenhum projeto ainda
            </h3>
            <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm mx-auto">
              Crie seu primeiro projeto para começar a monitorar.
            </p>
            <Button className="gradient-coral text-white rounded-lg shadow-sm" onClick={() => navigate("/projects/new")}>
              <Plus className="mr-1 h-4 w-4" />
              Criar Projeto
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="card-interactive group p-5"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-base font-semibold text-foreground truncate">
                      {project.name}
                    </p>
                    {project.brand_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {project.brand_name}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.instagram_handle && (
                    <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                      @{project.instagram_handle.replace("@", "")}
                    </span>
                  )}
                  {project.segment && (
                    <Badge variant="secondary" className="bg-accent/60 text-foreground/80 border-0 rounded-full text-[10px]">
                      {project.segment}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

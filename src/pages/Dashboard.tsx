import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen,
  Plus,
  BarChart3,
  Search,
  Database,
  ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", projects?.length],
    queryFn: async () => {
      const projectIds = (projects ?? []).map((p) => p.id);
      if (!projectIds.length) return { entities: 0, posts: 0, analyses: 0 };

      const [entitiesRes, postsRes, analysesRes] = await Promise.all([
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
      ]);

      return {
        entities: entitiesRes.count ?? 0,
        posts: postsRes.count ?? 0,
        analyses: analysesRes.count ?? 0,
      };
    },
    enabled: !!projects?.length,
  });

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? "usuário";

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Olá, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o panorama geral dos seus projetos.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Projetos", value: projects?.length ?? 0, icon: FolderOpen },
          { label: "Entidades", value: stats?.entities ?? 0, icon: Database },
          { label: "Posts Coletados", value: stats?.posts ?? 0, icon: BarChart3 },
          { label: "Análises", value: stats?.analyses ?? 0, icon: Search },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-accent p-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold font-mono text-foreground">
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    stat.value.toLocaleString("pt-BR")
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Seus Projetos
          </h2>
          <Button size="sm" onClick={() => navigate("/projects/new")}>
            <Plus className="mr-1 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !projects?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-medium text-foreground mb-1">
                Nenhum projeto ainda
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro projeto para começar a monitorar.
              </p>
              <Button onClick={() => navigate("/projects/new")}>
                <Plus className="mr-1 h-4 w-4" />
                Criar Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {project.name}
                      </p>
                      {project.brand_name && (
                        <span className="text-xs text-muted-foreground">
                          {project.brand_name}
                        </span>
                      )}
                      {project.instagram_handle && (
                        <span className="text-xs text-muted-foreground">
                          @{project.instagram_handle.replace("@", "")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </CardContent>
                <p className="px-4 pb-3 text-[10px] text-muted-foreground">
                  Criado em{" "}
                  {new Date(project.created_at).toLocaleDateString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

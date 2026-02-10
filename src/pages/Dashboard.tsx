import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FolderOpen,
  Plus,
  BarChart3,
  Users,
  TrendingUp,
  Bell,
  Activity,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects, useProjectStats } from "@/hooks/useProjects";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: stats, isLoading: loadingStats } = useProjectStats();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "usuário";
  const hasProjects = projects && projects.length > 0;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Olá, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral dos seus projetos e atividades recentes.
        </p>
      </div>

      {loadingProjects ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasProjects ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-accent p-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-foreground">
              Nenhum projeto ainda
            </h2>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              Crie seu primeiro projeto para começar a monitorar concorrentes e gerar análises com IA.
            </p>
            <Button onClick={() => navigate("/projects/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Project cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/projects/${p.id}/entities`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.brand_name} — {p.segment}</p>
                    </div>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">
                      {p.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card
              className="cursor-pointer border-dashed transition-shadow hover:shadow-md"
              onClick={() => navigate("/projects/new")}
            >
              <CardContent className="flex items-center justify-center p-4 gap-2 text-muted-foreground">
                <Plus className="h-4 w-4" />
                <span className="text-sm">Novo Projeto</span>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: FolderOpen, label: "Projetos ativos", value: stats?.projects ?? 0 },
          { icon: Users, label: "Entidades monitoradas", value: stats?.entities ?? 0 },
          { icon: BarChart3, label: "Análises realizadas", value: stats?.analyses ?? 0 },
          { icon: TrendingUp, label: "Posts coletados", value: stats?.posts ?? 0 },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-accent p-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-mono text-foreground">
                  {loadingStats ? "–" : value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Atividade recente</h3>
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Notificações</h3>
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

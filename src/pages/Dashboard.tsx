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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "usuário";

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

      {/* Empty state */}
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

      {/* Quick stats placeholder */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: FolderOpen, label: "Projetos ativos", value: "0" },
          { icon: Users, label: "Entidades monitoradas", value: "0" },
          { icon: BarChart3, label: "Análises realizadas", value: "0" },
          { icon: TrendingUp, label: "Posts coletados", value: "0" },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-accent p-2.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-mono text-foreground">{value}</p>
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

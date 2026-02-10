import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNum } from "@/lib/formatNumber";
import {
  FolderOpen,
  Plus,
  BarChart3,
  Users,
  TrendingUp,
  Bell,
  Activity,
  Loader2,
  Heart,
  MessageCircle,
  Eye,
  Instagram,
  Megaphone,
  Zap,
} from "lucide-react";
import FollowersChart from "@/components/dashboard/FollowersChart";
import EngagementChart from "@/components/dashboard/EngagementChart";
import { useNavigate } from "react-router-dom";
import { useProjects, useDashboardStats } from "@/hooks/useProjects";


export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "usuário";
  const hasProjects = projects && projects.length > 0;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Olá, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral dos seus projetos e dados coletados.
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

      {/* Big Numbers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: FolderOpen, label: "Projetos", value: stats?.projects_count },
          { icon: Users, label: "Entidades", value: stats?.entities_count },
          { icon: Instagram, label: "Posts", value: stats?.posts_count },
          { icon: Heart, label: "Curtidas", value: stats?.total_likes },
          { icon: MessageCircle, label: "Comentários", value: stats?.total_comments },
          { icon: Eye, label: "Visualizações", value: stats?.total_views },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex flex-col items-center p-4">
              <div className="rounded-lg bg-accent p-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {loadingStats ? "–" : formatNum(value)}
              </p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Zap, label: "Engajamento Total", value: stats?.total_engagement },
          { icon: TrendingUp, label: "Eng. Médio / Post", value: stats?.avg_engagement },
          { icon: Users, label: "Seguidores (total)", value: stats?.total_followers },
          { icon: Megaphone, label: "Anúncios Coletados", value: stats?.ads_count },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-accent p-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-foreground">
                  {loadingStats ? "–" : formatNum(value)}
                </p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {!loadingStats && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FollowersChart data={stats?.followers_timeline ?? []} />
          <EngagementChart data={stats?.engagement_timeline ?? []} />
        </div>
      )}

      {/* Analyses summary */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-accent p-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold font-mono text-foreground">
                {loadingStats ? "–" : stats?.analyses_count ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Análises Realizadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-accent p-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold font-mono text-foreground">
                {loadingStats ? "–" : stats?.approved_analyses ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Análises Aprovadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent posts */}
      {stats?.recent_posts && stats.recent_posts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Posts Recentes Coletados</h3>
          </div>
          <div className="space-y-2">
            {stats.recent_posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-foreground">
                      {post.entity_name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-foreground">{post.entity_name}</p>
                        {post.instagram_handle && (
                          <span className="text-[10px] text-muted-foreground">@{post.instagram_handle.replace("@", "")}</span>
                        )}
                        {post.post_type && (
                          <Badge variant="secondary" className="text-[9px]">{post.post_type}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate max-w-md">
                        {post.caption?.slice(0, 80) || "Sem legenda"}
                        {(post.caption?.length ?? 0) > 80 && "..."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {post.likes_count != null && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        {formatNum(post.likes_count)}
                      </span>
                    )}
                    {post.comments_count != null && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        {formatNum(post.comments_count)}
                      </span>
                    )}
                    {post.views_count != null && post.views_count > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {formatNum(post.views_count)}
                      </span>
                    )}
                    {post.posted_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(post.posted_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty recent activity if no posts */}
      {(!stats?.recent_posts || stats.recent_posts.length === 0) && !loadingStats && (
        <div className="mt-8">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Posts Recentes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhum post coletado ainda. Vá em Fontes de Dados de um projeto e inicie uma coleta.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

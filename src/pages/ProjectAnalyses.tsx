import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Loader2, BarChart3, Search, Calendar } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  collecting_data: { label: "Coletando", className: "bg-yellow-500/20 text-yellow-600" },
  analyzing: { label: "Analisando", className: "bg-blue-500/20 text-blue-600" },
  agents_running: { label: "Agentes IA", className: "bg-purple-500/20 text-purple-600" },
  synthesizing: { label: "Sintetizando", className: "bg-indigo-500/20 text-indigo-600" },
  review: { label: "Em Revisão", className: "bg-orange-500/20 text-orange-600" },
  approved: { label: "Aprovada", className: "bg-green-500/20 text-green-600" },
  published: { label: "Publicada", className: "bg-primary/20 text-primary" },
};

const TYPE_MAP: Record<string, string> = {
  brand_diagnosis: "Diagnóstico da Marca",
  competitor_analysis: "Análise de Concorrentes",
  cross_analysis: "Análise Cruzada",
  influencer_analysis: "Análise de Influencers",
  inspiration_analysis: "Análise de Inspirações",
  full_report: "Relatório Completo",
};

export default function ProjectAnalyses() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: analyses, isLoading } = useQuery({
    queryKey: ["project-analyses", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}/entities`)} className="mb-3">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {project?.name ?? "Projeto"}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Análises</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Análises de inteligência competitiva do projeto.
            </p>
          </div>
          <Button onClick={() => navigate(`/projects/${projectId}/analyses/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Análise
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !analyses?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhuma análise criada</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie sua primeira análise para gerar insights estratégicos.
            </p>
            <Button className="mt-4" onClick={() => navigate(`/projects/${projectId}/analyses/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Análise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => {
            const status = STATUS_MAP[a.status ?? "draft"] ?? STATUS_MAP.draft;
            return (
              <Card
                key={a.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => navigate(`/projects/${projectId}/analyses/${a.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {TYPE_MAP[a.type ?? ""] ?? a.type}
                        </span>
                        {a.period_start && a.period_end && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(a.period_start).toLocaleDateString("pt-BR")} –{" "}
                            {new Date(a.period_end).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={status.className}>{status.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

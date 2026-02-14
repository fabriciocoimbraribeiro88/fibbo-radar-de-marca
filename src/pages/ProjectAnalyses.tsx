import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2, Search, Calendar } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground border-0" },
  collecting_data: { label: "Coletando", className: "bg-amber-500/10 text-amber-500 border-0" },
  analyzing: { label: "Analisando", className: "bg-info/10 text-info border-0" },
  agents_running: { label: "Agentes IA", className: "bg-info/10 text-info border-0" },
  synthesizing: { label: "Sintetizando", className: "bg-info/10 text-info border-0" },
  review: { label: "Em Revisão", className: "bg-amber-500/10 text-amber-500 border-0" },
  approved: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-500 border-0" },
  rejected: { label: "Reprovada", className: "bg-destructive/10 text-destructive border-0" },
  published: { label: "Publicada", className: "bg-emerald-500/10 text-emerald-500 border-0" },
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
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Relatório</h1>
            <p className="page-subtitle">
              Relatórios de inteligência competitiva do projeto.
            </p>
          </div>
          <Button className="gradient-coral text-white rounded-lg shadow-sm" onClick={() => navigate(`/projects/${projectId}/analyses/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Relatório
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !analyses?.length ? (
        <div className="gradient-card p-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-base font-medium text-foreground mb-1">Nenhum relatório criado</p>
          <p className="text-sm text-muted-foreground/70 mb-6 max-w-sm mx-auto">
            Crie seu primeiro relatório para gerar insights estratégicos.
          </p>
          <Button className="gradient-coral text-white rounded-lg shadow-sm" onClick={() => navigate(`/projects/${projectId}/analyses/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Relatório
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => {
            const status = STATUS_MAP[a.status ?? "draft"] ?? STATUS_MAP.draft;
            return (
              <div
                key={a.id}
                className="card-interactive"
                onClick={() => navigate(`/projects/${projectId}/analyses/${a.id}`)}
              >
                <div className="flex items-center justify-between p-4">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

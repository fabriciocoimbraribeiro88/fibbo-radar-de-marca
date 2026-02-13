import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SECTION_STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const SECTION_STATUS_LABEL: Record<string, string> = {
  pending: "Na fila",
  running: "Analisando",
  completed: "Concluído",
  failed: "Falhou",
};

const SECTION_TYPE_LABEL: Record<string, string> = {
  brand: "Marca",
  competitor: "Concorrente",
  influencer: "Influencer",
  inspiration: "Inspiração",
  cross_analysis: "Análise Cruzada",
  synthesis: "Síntese Final",
};

export default function AnalysisView() {
  const { id: projectId, analysisId } = useParams<{ id: string; analysisId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: analysis } = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!analysisId,
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["analysis-sections", analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_sections")
        .select("*, monitored_entities(name, instagram_handle)")
        .eq("analysis_id", analysisId!);
      if (error) throw error;
      return data;
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const status = analysis?.status;
      // Poll every 3s during execution
      if (status === "analyzing" || status === "agents_running" || status === "synthesizing") {
        return 3000;
      }
      return false;
    },
  });

  const isRunning = ["analyzing", "agents_running", "synthesizing", "collecting_data"].includes(
    analysis?.status ?? ""
  );
  const isReview = analysis?.status === "review" || analysis?.status === "approved" || analysis?.status === "rejected";

  const completedCount = sections?.filter((s) => s.status === "completed").length ?? 0;
  const totalCount = sections?.length ?? 1;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    const { error } = await supabase
      .from("analyses")
      .update({ status: newStatus })
      .eq("id", analysisId!);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["analysis", analysisId] });
      await queryClient.invalidateQueries({ queryKey: ["project-analyses", projectId] });
      toast({ title: newStatus === "approved" ? "Análise aprovada!" : "Análise reprovada!" });
      navigate(`/projects/${projectId}/analyses`);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete sections first
      await supabase.from("analysis_sections").delete().eq("analysis_id", analysisId!);
      const { error } = await supabase.from("analyses").delete().eq("id", analysisId!);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["project-analyses", projectId] });
      toast({ title: "Pesquisa excluída com sucesso." });
      navigate(`/projects/${projectId}/analyses`);
    } catch (e) {
      toast({ title: "Erro ao excluir", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
    <div className="max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {analysis?.title ?? "Pesquisa"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {analysis?.period_start &&
                `${new Date(analysis.period_start).toLocaleDateString("pt-BR")}${analysis.period_end ? ` – ${new Date(analysis.period_end).toLocaleDateString("pt-BR")}` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isReview && analysis?.status !== "approved" && analysis?.status !== "rejected" && (
              <>
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleStatusUpdate("rejected")}>
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reprovar
                </Button>
                <Button onClick={() => handleStatusUpdate("approved")}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline status */}
      {isRunning && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Progresso da análise</span>
              <span className="text-xs text-muted-foreground font-mono">
                {completedCount}/{totalCount} agentes
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Agent cards */}
      {sectionsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isRunning || (sections && sections.length > 0 && !isReview) ? (
        <div className="space-y-3">
          {sections?.map((s) => {
            const StatusIcon = SECTION_STATUS_ICON[s.status ?? "pending"] ?? Clock;
            const isActive = s.status === "running";
            return (
              <Card key={s.id} className={isActive ? "ring-1 ring-primary/30" : ""}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {SECTION_TYPE_LABEL[s.section_type ?? ""] ?? s.section_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(s as any).monitored_entities?.name ?? "Síntese"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        s.status === "completed"
                          ? "bg-green-500/20 text-green-600"
                          : s.status === "running"
                            ? "bg-blue-500/20 text-blue-600"
                            : s.status === "failed"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-muted text-muted-foreground"
                      }
                    >
                      <StatusIcon className={`mr-1 h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                      {SECTION_STATUS_LABEL[s.status ?? "pending"]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Review mode: Cover + TOC + Sections */}
      {isReview && sections && sections.length > 0 && (() => {
        const SECTION_ORDER: Record<string, number> = {
          brand: 0,
          competitor: 1,
          influencer: 2,
          inspiration: 3,
          cross_analysis: 4,
          synthesis: 5,
        };
        const completedSections = sections
          .filter((s) => s.status === "completed" && s.content_markdown)
          .sort((a, b) => (SECTION_ORDER[a.section_type ?? ""] ?? 99) - (SECTION_ORDER[b.section_type ?? ""] ?? 99));

        return (
          <div className="space-y-6">
            {/* Cover Page */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-12 text-center">
                  <p className="text-xs font-medium tracking-widest uppercase text-primary mb-3">
                    Relatório de Inteligência Competitiva
                  </p>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {analysis?.title ?? "Pesquisa"}
                  </h2>
                  {analysis?.period_start && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(analysis.period_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      {analysis.period_end && (
                        <>
                          {" — "}
                          {new Date(analysis.period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        </>
                      )}
                    </p>
                  )}
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
                    <span className="text-xs font-semibold text-primary">Fibbo Radar</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table of Contents */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Sumário</h3>
                <ol className="space-y-2">
                  {completedSections.map((s, idx) => {
                    const label = SECTION_TYPE_LABEL[s.section_type ?? ""] ?? s.section_type;
                    const entityName = (s as any).monitored_entities?.name;
                    return (
                      <li key={s.id} className="flex items-center gap-3 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="text-foreground">
                          {label}{entityName ? ` — ${entityName}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            {/* Section Cards — brand first */}
            {completedSections.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {SECTION_TYPE_LABEL[s.section_type ?? ""] ?? s.section_type}
                      {(s as any).monitored_entities?.name && ` — ${(s as any).monitored_entities.name}`}
                    </h3>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">
                    {s.content_markdown}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

      {/* Fibbo Branding Footer */}
      {(isReview || analysis?.status === "published") && (
        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Relatório gerado por <span className="font-semibold text-foreground">Fibbo Radar</span> — Inteligência Competitiva com IA
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Data de geração: {analysis?.updated_at
              ? new Date(analysis.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—"}
          </p>
        </div>
      )}
    </div>

    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir pesquisa</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir "{analysis?.title}"? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

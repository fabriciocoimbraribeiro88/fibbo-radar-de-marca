import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  ThumbsUp,
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
  const isReview = analysis?.status === "review" || analysis?.status === "approved";

  const completedCount = sections?.filter((s) => s.status === "completed").length ?? 0;
  const totalCount = sections?.length ?? 1;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const handleApprove = async () => {
    const { error } = await supabase
      .from("analyses")
      .update({ status: "approved" })
      .eq("id", analysisId!);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Análise aprovada!" });
    }
  };

  return (
    <div className="max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {analysis?.title ?? "Análise"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {analysis?.period_start &&
                `${new Date(analysis.period_start).toLocaleDateString("pt-BR")} – ${new Date(analysis.period_end!).toLocaleDateString("pt-BR")}`}
            </p>
          </div>
          {isReview && analysis?.status !== "approved" && (
            <Button onClick={handleApprove}>
              <ThumbsUp className="mr-2 h-4 w-4" />
              Aprovar
            </Button>
          )}
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

      {/* Review mode: show markdown */}
      {isReview && sections && sections.length > 0 && (
        <div className="space-y-4">
          {sections
            .filter((s) => s.status === "completed" && s.content_markdown)
            .map((s) => (
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
      )}
    </div>
  );
}

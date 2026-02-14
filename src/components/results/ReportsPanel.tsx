import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatNum } from "@/lib/formatNumber";

const TYPE_LABELS: Record<string, string> = {
  weekly_checkin: "Check-in Semanal",
  weekly_report: "Report Semanal",
  monthly_report: "Relatório Mensal",
  quarterly_report: "Relatório Trimestral",
  annual_report: "Relatório Anual",
};

const TYPE_COLORS: Record<string, string> = {
  weekly_checkin: "bg-blue-100 text-blue-700",
  weekly_report: "bg-indigo-100 text-indigo-700",
  monthly_report: "bg-violet-100 text-violet-700",
  quarterly_report: "bg-amber-100 text-amber-700",
  annual_report: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<string, string> = {
  generating: "Gerando...",
  draft: "Rascunho",
  review: "Em Revisão",
  approved: "Aprovado",
  sent: "Enviado",
};

interface ReportsPanelProps {
  projectId: string;
  contractedChannels: string[];
}

export function ReportsPanel({ projectId, contractedChannels }: ReportsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["automated-reports", projectId, filterType],
    queryFn: async () => {
      let query = supabase
        .from("automated_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filterType !== "all") {
        query = query.eq("report_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async (reportType: string) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-automated-report", {
        body: { project_id: projectId, report_type: reportType },
      });
      if (error) throw error;
      toast({ title: "Relatório gerado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["automated-reports", projectId] });
      queryClient.invalidateQueries({ queryKey: ["results-timeline", projectId] });
    } catch (err) {
      toast({ title: "Erro ao gerar relatório", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Texto copiado!" });
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="weekly_checkin">Check-in Semanal</SelectItem>
            <SelectItem value="weekly_report">Report Semanal</SelectItem>
            <SelectItem value="monthly_report">Mensal</SelectItem>
            <SelectItem value="quarterly_report">Trimestral</SelectItem>
            <SelectItem value="annual_report">Anual</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={handleGenerate} disabled={generating}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder={generating ? "Gerando..." : "Gerar Relatório"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly_checkin">Check-in Semanal</SelectItem>
            <SelectItem value="weekly_report">Report Semanal</SelectItem>
            <SelectItem value="monthly_report">Mensal</SelectItem>
            <SelectItem value="quarterly_report">Trimestral</SelectItem>
            <SelectItem value="annual_report">Anual</SelectItem>
          </SelectContent>
        </Select>

        {generating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Empty state */}
      {(!reports || reports.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nenhum relatório gerado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gere seu primeiro relatório ou configure agendamentos automáticos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reports grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {reports?.map(report => (
          <Card
            key={report.id}
            className="cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setSelectedReport(report)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className={`text-[10px] ${TYPE_COLORS[report.report_type] ?? ""}`}>
                  {TYPE_LABELS[report.report_type] ?? report.report_type}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABELS[report.status] ?? report.status}
                </Badge>
              </div>
              <h4 className="text-sm font-medium">{report.title}</h4>
              {report.summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.summary}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span>
                  {report.period_start && report.period_end
                    ? `${format(new Date(report.period_start), "dd/MM/yy")} — ${format(new Date(report.period_end), "dd/MM/yy")}`
                    : "—"}
                </span>
                {report.status_color && (
                  <span className={`h-2 w-2 rounded-full ${
                    report.status_color === "green" ? "bg-emerald-500" :
                    report.status_color === "yellow" ? "bg-amber-500" : "bg-red-500"
                  }`} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Viewer Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => { if (!o) setSelectedReport(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedReport?.title}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ReportViewer report={selectedReport} contractedChannels={contractedChannels} onCopy={copyToClipboard} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportViewer({ report, contractedChannels, onCopy }: { report: any; contractedChannels: string[]; onCopy: (t: string) => void }) {
  const sections = (report.sections ?? {}) as Record<string, any>;
  const bigNumbers = (report.big_numbers ?? {}) as Record<string, any>;

  // Weekly checkin — simple text view
  if (report.report_type === "weekly_checkin") {
    const text = sections.formatted_text ?? report.ai_analysis ?? report.summary ?? "Sem conteúdo.";
    return (
      <div className="space-y-4">
        <Card className="p-5 bg-muted/30 font-mono text-sm whitespace-pre-line">{text}</Card>
        <Button variant="outline" size="sm" onClick={() => onCopy(text)}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copiar para WhatsApp
        </Button>
      </div>
    );
  }

  // Other reports — tabbed view
  return (
    <Tabs defaultValue="summary" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="summary" className="text-xs">Resumo</TabsTrigger>
        {contractedChannels.includes("social") && <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>}
        {contractedChannels.includes("ads") && <TabsTrigger value="ads" className="text-xs">Ads</TabsTrigger>}
        {contractedChannels.includes("seo") && <TabsTrigger value="seo" className="text-xs">SEO</TabsTrigger>}
        {report.ai_analysis && <TabsTrigger value="ai" className="text-xs">Análise IA</TabsTrigger>}
      </TabsList>

      <TabsContent value="summary" className="space-y-4">
        {/* Big Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(bigNumbers).map(([key, value]) => (
            <Card key={key} className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">{key.replace(/_/g, " ")}</p>
              <p className="text-lg font-bold font-mono">{typeof value === "number" ? formatNum(value as number) : String(value ?? "—")}</p>
            </Card>
          ))}
        </div>
        {report.summary && <p className="text-sm text-muted-foreground">{report.summary}</p>}
      </TabsContent>

      <TabsContent value="social">
        <SectionContent data={sections.social_performance ?? sections.content_analysis} />
      </TabsContent>

      <TabsContent value="ads">
        <SectionContent data={sections.ads_performance ?? sections.campaign_analysis} />
      </TabsContent>

      <TabsContent value="seo">
        <SectionContent data={sections.seo_performance ?? sections.keywords_analysis} />
      </TabsContent>

      <TabsContent value="ai">
        <Card className="p-5">
          <p className="text-sm whitespace-pre-line">{report.ai_analysis}</p>
          {report.ai_recommendations && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2">RECOMENDAÇÕES</p>
              <p className="text-sm whitespace-pre-line">{report.ai_recommendations}</p>
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function SectionContent({ data }: { data: any }) {
  if (!data) return <p className="text-sm text-muted-foreground">Dados não disponíveis para este serviço.</p>;
  if (typeof data === "string") return <Card className="p-5"><p className="text-sm whitespace-pre-line">{data}</p></Card>;
  return (
    <Card className="p-5">
      <pre className="text-xs whitespace-pre-wrap overflow-auto">{JSON.stringify(data, null, 2)}</pre>
    </Card>
  );
}

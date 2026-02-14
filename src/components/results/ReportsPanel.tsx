import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FileText, Copy, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

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

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return `R$${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPercent(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;
}

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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
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

// ── Report Viewer ──────────────────────────────────────────

function ReportViewer({ report, contractedChannels, onCopy }: { report: any; contractedChannels: string[]; onCopy: (t: string) => void }) {
  const sections = (report.sections ?? {}) as Record<string, any>;

  // Weekly check-in → WhatsApp text
  if (report.report_type === "weekly_checkin") {
    const text = sections.formatted_text ?? report.ai_analysis ?? report.summary ?? "Sem conteúdo.";
    return (
      <div className="space-y-4">
        <Card className="p-5 bg-muted/30 font-mono text-sm whitespace-pre-line leading-relaxed">
          {text}
        </Card>
        <Button variant="outline" size="sm" onClick={() => onCopy(text)}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copiar para WhatsApp
        </Button>
      </div>
    );
  }

  // Monthly / Quarterly / Annual → structured tabbed view
  return (
    <Tabs defaultValue="resumo" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
        {sections.instagram && <TabsTrigger value="instagram" className="text-xs">Instagram</TabsTrigger>}
        {sections.meta_ads && <TabsTrigger value="meta_ads" className="text-xs">Meta Ads</TabsTrigger>}
        {sections.google_ads && <TabsTrigger value="google_ads" className="text-xs">Google Ads</TabsTrigger>}
        {sections.seo && <TabsTrigger value="seo" className="text-xs">SEO</TabsTrigger>}
        {report.ai_analysis && <TabsTrigger value="ai" className="text-xs">Análise IA</TabsTrigger>}
      </TabsList>

      {/* RESUMO */}
      <TabsContent value="resumo" className="space-y-4">
        <BigNumbersGrid bigNumbers={report.big_numbers} contractedChannels={contractedChannels} />
        {report.summary && <p className="text-sm text-muted-foreground">{report.summary}</p>}
      </TabsContent>

      {/* INSTAGRAM */}
      {sections.instagram && (
        <TabsContent value="instagram" className="space-y-4">
          <InstagramSection data={sections.instagram} />
        </TabsContent>
      )}

      {/* META ADS */}
      {sections.meta_ads && (
        <TabsContent value="meta_ads" className="space-y-4">
          <MetaAdsSection data={sections.meta_ads} />
        </TabsContent>
      )}

      {/* GOOGLE ADS */}
      {sections.google_ads && (
        <TabsContent value="google_ads" className="space-y-4">
          <Card className="p-5">
            <h4 className="text-sm font-semibold mb-3">Google Ads</h4>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Anúncios" value={fmtNum(sections.google_ads.total_ads)} />
              <MetricCard label="Investimento" value={fmtCurrency(sections.google_ads.total_investment)} />
            </div>
          </Card>
        </TabsContent>
      )}

      {/* SEO */}
      {sections.seo && (
        <TabsContent value="seo" className="space-y-4">
          <Card className="p-5">
            <h4 className="text-sm font-semibold mb-3">SEO</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Tráfego Orgânico" value={fmtNum(sections.seo.organic_traffic)} />
              <MetricCard label="Posição Média" value={String(sections.seo.avg_position ?? "—")} />
              <MetricCard label="Keywords Top 10" value={fmtNum(sections.seo.keywords_top10)} />
              <MetricCard label="Domain Authority" value={String(sections.seo.domain_authority ?? "—")} />
            </div>
          </Card>
        </TabsContent>
      )}

      {/* AI */}
      {report.ai_analysis && (
        <TabsContent value="ai">
          <Card className="p-5 prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{report.ai_analysis}</ReactMarkdown>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}

// ── Big Numbers Grid ──────────────────────────────────────

function BigNumbersGrid({ bigNumbers, contractedChannels }: { bigNumbers: any; contractedChannels: string[] }) {
  if (!bigNumbers) return null;
  const bn = bigNumbers as Record<string, any>;

  const items: { label: string; value: string; group: string }[] = [];

  // Social
  if (contractedChannels.includes("social")) {
    if (bn.followers != null) items.push({ label: "Seguidores", value: fmtNum(bn.followers), group: "social" });
    if (bn.followers_growth != null) items.push({ label: "Crescimento", value: `+${fmtNum(bn.followers_growth)}`, group: "social" });
    if (bn.total_posts != null) items.push({ label: "Posts", value: fmtNum(bn.total_posts), group: "social" });
    if (bn.engagement_rate != null) items.push({ label: "Engajamento", value: fmtPercent(bn.engagement_rate), group: "social" });
    if (bn.total_views != null) items.push({ label: "Alcance", value: fmtNum(bn.total_views), group: "social" });
    if (bn.total_likes != null) items.push({ label: "Curtidas", value: fmtNum(bn.total_likes), group: "social" });
  }

  // Ads
  if (contractedChannels.includes("ads")) {
    if (bn.meta_investment != null) items.push({ label: "Meta Investimento", value: fmtCurrency(bn.meta_investment), group: "ads" });
    if (bn.meta_reach != null) items.push({ label: "Meta Alcance", value: fmtNum(bn.meta_reach), group: "ads" });
    if (bn.meta_clicks != null) items.push({ label: "Meta Cliques", value: fmtNum(bn.meta_clicks), group: "ads" });
    if (bn.meta_cpc != null) items.push({ label: "Meta CPC", value: fmtCurrency(bn.meta_cpc), group: "ads" });
    if (bn.google_investment != null) items.push({ label: "Google Investimento", value: fmtCurrency(bn.google_investment), group: "ads" });
    if (bn.google_ctr != null) items.push({ label: "Google CTR", value: fmtPercent(bn.google_ctr), group: "ads" });
  }

  // SEO
  if (contractedChannels.includes("seo")) {
    if (bn.organic_traffic != null) items.push({ label: "Tráfego Orgânico", value: fmtNum(bn.organic_traffic), group: "seo" });
    if (bn.avg_position != null) items.push({ label: "Posição Média", value: String(bn.avg_position), group: "seo" });
    if (bn.keywords_top10 != null) items.push({ label: "KWs Top 10", value: fmtNum(bn.keywords_top10), group: "seo" });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(item => (
        <MetricCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

// ── Instagram Section ──────────────────────────────────────

function InstagramSection({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Seguidores" value={fmtNum(data.followers)} sub={data.followers_growth != null ? `+${fmtNum(data.followers_growth)}` : undefined} />
        <MetricCard label="Alcance Total" value={fmtNum(data.total_reach)} />
        <MetricCard label="Interações" value={fmtNum(data.total_interactions)} />
        <MetricCard label="Engajamento" value={fmtPercent(data.engagement_rate)} />
      </div>

      {/* Engagement breakdown */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold text-muted-foreground mb-3">ENGAJAMENTO DETALHADO</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{fmtNum(data.total_likes)}</p>
            <p className="text-[10px] text-muted-foreground">Curtidas</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{fmtNum(data.total_comments)}</p>
            <p className="text-[10px] text-muted-foreground">Comentários</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{fmtNum(data.total_saves)}</p>
            <p className="text-[10px] text-muted-foreground">Salvamentos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-mono">{fmtNum(data.total_shares)}</p>
            <p className="text-[10px] text-muted-foreground">Compartilhamentos</p>
          </div>
        </div>
      </Card>

      {/* Performance by type */}
      {data.performance_by_type?.length > 0 && (
        <Card className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">PERFORMANCE POR TIPO</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px] text-right">Qty</TableHead>
                <TableHead className="text-[10px] text-right">Avg Likes</TableHead>
                <TableHead className="text-[10px] text-right">Avg Comentários</TableHead>
                <TableHead className="text-[10px] text-right">Avg Salvamentos</TableHead>
                <TableHead className="text-[10px] text-right">Avg Engajamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.performance_by_type.map((t: any) => (
                <TableRow key={t.type}>
                  <TableCell className="text-xs font-medium capitalize">{t.type}</TableCell>
                  <TableCell className="text-xs text-right">{t.count}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(t.avg_likes)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(t.avg_comments)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(t.avg_saves)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(t.avg_engagement)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Top posts */}
      {data.top_posts?.length > 0 && (
        <Card className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">TOP POSTS POR ENGAJAMENTO</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Postagem</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px] text-right">Visualizações</TableHead>
                <TableHead className="text-[10px] text-right">Curtidas</TableHead>
                <TableHead className="text-[10px] text-right">Coment.</TableHead>
                <TableHead className="text-[10px] text-right">Salvos</TableHead>
                <TableHead className="text-[10px] text-right">Compart.</TableHead>
                <TableHead className="text-[10px] text-right">Taxa Eng.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top_posts.map((p: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-xs max-w-[200px] truncate">{p.caption || "—"}</TableCell>
                  <TableCell className="text-xs capitalize">{p.type ?? "—"}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(p.views)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(p.likes)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(p.comments)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(p.saves)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtNum(p.shares)}</TableCell>
                  <TableCell className="text-xs text-right">{fmtPercent(p.engagement_rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Comparison with previous */}
      {data.previous && (
        <Card className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">COMPARATIVO COM PERÍODO ANTERIOR</h4>
          <div className="grid grid-cols-3 gap-3">
            <ComparisonMetric label="Seguidores" current={data.followers} previous={data.previous.followers} />
            <ComparisonMetric label="Curtidas" current={data.total_likes} previous={data.previous.total_likes} />
            <ComparisonMetric label="Engajamento" current={data.engagement_rate} previous={data.previous.engagement_rate} suffix="%" />
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Meta Ads Section ──────────────────────────────────────

function MetaAdsSection({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Investimento" value={fmtCurrency(data.total_investment)} />
        <MetricCard label="Anúncios Totais" value={fmtNum(data.total_ads)} />
        <MetricCard label="Anúncios Ativos" value={fmtNum(data.active_ads)} />
      </div>

      {data.top_ads?.length > 0 && (
        <Card className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">ANÚNCIOS EM DESTAQUE</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Anúncio</TableHead>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px]">CTA</TableHead>
                <TableHead className="text-[10px] text-right">Investimento</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.top_ads.map((ad: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-xs max-w-[200px] truncate">{ad.title}</TableCell>
                  <TableCell className="text-xs capitalize">{ad.type ?? "—"}</TableCell>
                  <TableCell className="text-xs">{ad.cta ?? "—"}</TableCell>
                  <TableCell className="text-xs text-right">{fmtCurrency(ad.spend)}</TableCell>
                  <TableCell>
                    <Badge variant={ad.is_active ? "default" : "secondary"} className="text-[9px]">
                      {ad.is_active ? "Ativo" : "Encerrado"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Shared components ──────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      {sub && <p className="text-[10px] text-emerald-600 font-medium">{sub}</p>}
    </Card>
  );
}

function ComparisonMetric({ label, current, previous, suffix = "" }: { label: string; current: number; previous: number; suffix?: string }) {
  const diff = previous > 0 ? ((current - previous) / previous * 100) : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">{fmtNum(current)}{suffix}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        {isUp && <TrendingUp className="h-3 w-3 text-emerald-500" />}
        {isDown && <TrendingDown className="h-3 w-3 text-red-500" />}
        {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground" />}
        <span className={`text-[10px] font-medium ${isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-muted-foreground"}`}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
        </span>
      </div>
      <p className="text-[9px] text-muted-foreground">{fmtNum(previous)}{suffix} anterior</p>
    </div>
  );
}

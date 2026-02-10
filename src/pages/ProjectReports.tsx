import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Plus, Trash2, Loader2, BarChart3, Heart, MessageCircle, Eye,
  Users, Zap, Flame, Percent, TrendingUp, Clock, Hash, Calendar,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import ReactMarkdown from "react-markdown";
import {
  useEntityReports, useProjectEntities, useGenerateReport, useDeleteReport,
  type EntityReport,
} from "@/hooks/useEntityReports";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function ReportViewer({ report }: { report: EntityReport }) {
  const m = report.computed_metrics;
  if (!m) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  const bn = m.bigNumbers ?? {};

  return (
    <Tabs defaultValue="big_numbers" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="big_numbers">Big Numbers</TabsTrigger>
        <TabsTrigger value="rankings">Rankings</TabsTrigger>
        <TabsTrigger value="evolution">Evolução</TabsTrigger>
        <TabsTrigger value="distribution">Distribuição</TabsTrigger>
        {report.ai_analysis && <TabsTrigger value="ai">Análise AI</TabsTrigger>}
      </TabsList>

      {/* BIG NUMBERS */}
      <TabsContent value="big_numbers" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: "Posts", value: fmt(bn.totalPosts ?? 0) },
            { icon: Heart, label: "Likes", value: fmt(bn.totalLikes ?? 0) },
            { icon: MessageCircle, label: "Comentários", value: fmt(bn.totalComments ?? 0) },
            { icon: Eye, label: "Views", value: fmt(bn.totalViews ?? 0) },
            { icon: Zap, label: "Eng. Médio", value: fmt(bn.avgEngagement ?? 0) },
            { icon: Users, label: "Seguidores", value: fmt(bn.followers ?? 0) },
            { icon: Flame, label: "Hits Virais", value: fmt(bn.viralHits ?? 0) },
            { icon: Percent, label: "Taxa Eng.", value: `${bn.engagementRate ?? 0}%` },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="border border-border">
              <CardContent className="flex flex-col items-center p-4">
                <div className="rounded-lg bg-accent p-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold font-mono text-foreground">{fmt(bn.avgLikes ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Média Likes/Post</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold font-mono text-foreground">{fmt(bn.medianLikes ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Mediana Likes</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold font-mono text-foreground">{fmt(bn.avgComments ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Média Comments/Post</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold font-mono text-foreground">{bn.viralRate ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa Viral</p>
            </CardContent>
          </Card>
        </div>

        {m.growthTrend && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Tendência de Crescimento
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>1ª metade: avg <strong>{fmt(m.growthTrend.firstPeriodAvg)}</strong> likes/post</p>
              <p>2ª metade: avg <strong>{fmt(m.growthTrend.secondPeriodAvg)}</strong> likes/post</p>
              <p className={m.growthTrend.growthPercent > 0 ? "text-green-500" : "text-red-500"}>
                {m.growthTrend.growthPercent > 0 ? "↑" : "↓"} {Math.abs(m.growthTrend.growthPercent)}% de crescimento
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* RANKINGS */}
      <TabsContent value="rankings" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 Posts por Likes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(m.topPostsLikes ?? []).map((p: any, i: number) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{p.caption || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(p.likes)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(p.comments)}</TableCell>
                    <TableCell className="text-right text-xs">{p.type || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 10 Posts por Comentários</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Caption</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(m.topPostsComments ?? []).map((p: any, i: number) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{p.caption || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(p.comments)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(p.likes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 20 Hashtags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(m.topHashtags ?? []).map((h: any) => (
                <Badge key={h.tag} variant="secondary" className="text-xs gap-1">
                  <Hash className="h-3 w-3" />#{h.tag} ({h.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* EVOLUTION */}
      <TabsContent value="evolution" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Likes por Ano</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.yearlyDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Média Likes/Post por Ano</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.yearlyDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgLikes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução Mensal (últimos 24 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(m.monthlyDistribution ?? []).slice(-24)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="likes" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* DISTRIBUTION */}
      <TabsContent value="distribution" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição por Tipo</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={m.typeDistribution ?? []}
                    dataKey="count"
                    nameKey="type"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {(m.typeDistribution ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Performance por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                    <TableHead className="text-right">Avg Likes</TableHead>
                    <TableHead className="text-right">Avg Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(m.typeDistribution ?? []).map((t: any) => (
                    <TableRow key={t.type}>
                      <TableCell className="text-xs">{t.type}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{t.count}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(t.avgLikes)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(t.avgComments)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.dayOfWeekDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avgLikes" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Avg Likes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Por Hora do Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.hourDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avgLikes" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Avg Likes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      {/* AI ANALYSIS */}
      {report.ai_analysis && (
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" /> Análise AI
                {report.model_used && (
                  <Badge variant="outline" className="text-[10px] ml-2">{report.model_used}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{report.ai_analysis}</ReactMarkdown>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}

export default function ProjectReports() {
  const { id } = useParams<{ id: string }>();
  const { data: reports, isLoading } = useEntityReports(id);
  const { data: entities } = useProjectEntities(id);
  const { generate, isGenerating, progress } = useGenerateReport(id);
  const { deleteReport } = useDeleteReport();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  const activeReport = reports?.find((r) => r.id === activeReportId) ?? reports?.[0];

  const handleGenerate = async () => {
    if (!selectedEntityId) return;
    setShowNewDialog(false);
    const result = await generate(selectedEntityId, useAi);
    if (result?.report_id) setActiveReportId(result.report_id);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Processamento de dados em grande volume com IA
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowNewDialog(true); setSelectedEntityId(""); }}
          disabled={isGenerating}
          className="gap-1.5"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Novo Relatório
        </Button>
      </div>

      {/* Generating state */}
      {isGenerating && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Processando relatório...</p>
              <p className="text-xs text-muted-foreground">{progress || "Isso pode levar até 1 minuto com análise AI."}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports list + viewer */}
      {!reports?.length && !isGenerating ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum relatório gerado</p>
            <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
              Clique em "Novo Relatório" para processar todos os posts de uma entidade e gerar insights com IA.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          {/* Sidebar */}
          <div className="space-y-2">
            {reports?.map((r) => {
              const entity = entities?.find((e) => e.id === r.entity_id);
              const isActive = r.id === (activeReport?.id);
              return (
                <Card
                  key={r.id}
                  className={`cursor-pointer transition-colors ${isActive ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}
                  onClick={() => setActiveReportId(r.id)}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-foreground truncate">
                        {entity?.name || entity?.handle || "Entidade"}
                      </p>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); deleteReport(r.id, r.project_id); }}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{r.posts_analyzed} posts</span>
                      <span>•</span>
                      <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex gap-1">
                      {r.ai_analysis && <Badge variant="secondary" className="text-[9px] h-4">AI</Badge>}
                      {r.model_used && r.model_used !== "none" && (
                        <Badge variant="outline" className="text-[9px] h-4">{r.model_used}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Report viewer */}
          <div>
            {activeReport ? (
              <ReportViewer report={activeReport} />
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um relatório.</p>
            )}
          </div>
        </div>
      )}

      {/* New Report Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Relatório</DialogTitle>
            <DialogDescription>
              Selecione uma entidade para processar todos os seus posts e gerar um relatório completo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entidade</label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar entidade..." />
                </SelectTrigger>
                <SelectContent>
                  {entities?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.handle ? `(@${e.handle})` : ""} — {e.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-ai"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="use-ai" className="text-sm">
                Incluir análise com IA (Claude Opus)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={!selectedEntityId}>
              Gerar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

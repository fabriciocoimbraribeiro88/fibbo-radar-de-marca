import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, Users, MessageCircle, FileText, Swords } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useFibboScores, useLatestFibboScores, type FibboScoreWithEntity } from "@/hooks/useFibboScores";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const DIMENSION_COLORS = {
  presenca: "#3b82f6",
  engajamento: "#f59e0b",
  conteudo: "#10b981",
  competitividade: "#8b5cf6",
};

const ENTITY_COLORS = [
  "#E87040", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
];

function ScoreGauge({ score, max = 100, label }: { score: number; max?: number; label: string }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-red-500";
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold font-mono ${color}`}>{score.toFixed(1)}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      <div className="w-full h-1.5 bg-muted rounded-full mt-1.5">
        <div className="h-full rounded-full bg-current transition-all" style={{ width: `${pct}%`, color: pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
      </div>
    </div>
  );
}

function DimensionBar({ label, score, max, color, icon: Icon }: { label: string; score: number; max: number; color: string; icon: any }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-xs font-mono text-muted-foreground">{score.toFixed(1)}/{max}</span>
        </div>
        <div className="h-2 bg-muted rounded-full">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

export default function ProjectFibboScore() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: allScores, isLoading } = useFibboScores(projectId);
  const { data: latestScores } = useLatestFibboScores(projectId);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-fibbo-score", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      toast({ title: "FibboScore recalculado", description: `${data.scores?.length ?? 0} entidades atualizadas` });
      queryClient.invalidateQueries({ queryKey: ["fibbo-scores", projectId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao recalcular";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  const brandScore = latestScores?.find((s) => s.entity_role === "brand");

  // Radar data for latest scores
  const radarData = latestScores?.map((s, i) => ({
    name: s.entity_name,
    color: ENTITY_COLORS[i % ENTITY_COLORS.length],
    presenca: s.presenca_score,
    engajamento: s.engajamento_score,
    conteudo: s.conteudo_score,
    competitividade: s.competitividade_score,
  })) ?? [];

  // Bar chart comparing entities
  const barData = latestScores?.map((s, i) => ({
    name: s.entity_name.length > 12 ? s.entity_name.slice(0, 12) + "…" : s.entity_name,
    total: s.total_score,
    presenca: s.presenca_score,
    engajamento: s.engajamento_score,
    conteudo: s.conteudo_score,
    competitividade: s.competitividade_score,
    fill: ENTITY_COLORS[i % ENTITY_COLORS.length],
  })) ?? [];

  // Timeline data (group by date)
  const timelineData = (() => {
    if (!allScores) return [];
    const dateMap = new Map<string, Record<string, any>>();
    for (const s of allScores) {
      if (!dateMap.has(s.score_date)) dateMap.set(s.score_date, { date: s.score_date });
      dateMap.get(s.score_date)![s.entity_name] = s.total_score;
    }
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const entityNames = [...new Set(allScores?.map((s) => s.entity_name) ?? [])];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fibbo Score</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Score de maturidade digital — 0 a 100 pontos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
          Recalcular
        </Button>
      </div>

      {/* Empty state */}
      {(!latestScores || latestScores.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhum score calculado</p>
            <p className="text-xs text-muted-foreground mb-4">
              Clique em "Recalcular" para gerar o FibboScore com base nos dados coletados.
            </p>
            <Button size="sm" onClick={handleRecalculate} disabled={recalculating}>
              Calcular agora
            </Button>
          </CardContent>
        </Card>
      )}

      {latestScores && latestScores.length > 0 && (
        <>
          {/* Brand highlight */}
          {brandScore && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="default" className="text-xs">Marca</Badge>
                  <h2 className="text-sm font-semibold text-foreground">{brandScore.entity_name}</h2>
                  {brandScore.entity_handle && (
                    <span className="text-xs text-muted-foreground">@{brandScore.entity_handle.replace("@", "")}</span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-6">
                  <ScoreGauge score={brandScore.total_score} label="Score Total" />
                  <DimensionBar label="Presença" score={brandScore.presenca_score} max={25} color={DIMENSION_COLORS.presenca} icon={Users} />
                  <DimensionBar label="Engajamento" score={brandScore.engajamento_score} max={25} color={DIMENSION_COLORS.engajamento} icon={MessageCircle} />
                  <DimensionBar label="Conteúdo" score={brandScore.conteudo_score} max={25} color={DIMENSION_COLORS.conteudo} icon={FileText} />
                  <DimensionBar label="Competitividade" score={brandScore.competitividade_score} max={25} color={DIMENSION_COLORS.competitividade} icon={Swords} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparative bar chart */}
          {barData.length > 1 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Comparativo de Scores</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        formatter={(v: number, name: string) => [`${v.toFixed(1)}`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="presenca" stackId="a" fill={DIMENSION_COLORS.presenca} name="Presença" />
                      <Bar dataKey="engajamento" stackId="a" fill={DIMENSION_COLORS.engajamento} name="Engajamento" />
                      <Bar dataKey="conteudo" stackId="a" fill={DIMENSION_COLORS.conteudo} name="Conteúdo" />
                      <Bar dataKey="competitividade" stackId="a" fill={DIMENSION_COLORS.competitividade} name="Competitividade" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Radar comparison */}
          {radarData.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Radar de Dimensões</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { dimension: "Presença", ...Object.fromEntries(radarData.map((r) => [r.name, r.presenca])) },
                      { dimension: "Engajamento", ...Object.fromEntries(radarData.map((r) => [r.name, r.engajamento])) },
                      { dimension: "Conteúdo", ...Object.fromEntries(radarData.map((r) => [r.name, r.conteudo])) },
                      { dimension: "Competitividade", ...Object.fromEntries(radarData.map((r) => [r.name, r.competitividade])) },
                    ]}>
                      <PolarGrid className="opacity-30" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 25]} tick={{ fontSize: 9 }} />
                      {radarData.map((r, i) => (
                        <Radar key={r.name} name={r.name} dataKey={r.name} stroke={r.color} fill={r.color} fillOpacity={0.15} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline evolution */}
          {timelineData.length > 1 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Evolução do Score</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {entityNames.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={ENTITY_COLORS[i % ENTITY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-entity detail cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Detalhamento por Entidade</h3>
            {latestScores.map((s, i) => (
              <Card key={s.id} className="border border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ENTITY_COLORS[i % ENTITY_COLORS.length] }} />
                    <h4 className="text-sm font-semibold text-foreground">{s.entity_name}</h4>
                    {s.entity_handle && <span className="text-xs text-muted-foreground">@{s.entity_handle.replace("@", "")}</span>}
                    <Badge variant="secondary" className="text-[10px] ml-auto">{s.entity_role}</Badge>
                    <span className="text-lg font-bold font-mono text-foreground">{s.total_score.toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DimensionBar label="Presença" score={s.presenca_score} max={25} color={DIMENSION_COLORS.presenca} icon={Users} />
                    <DimensionBar label="Engajamento" score={s.engajamento_score} max={25} color={DIMENSION_COLORS.engajamento} icon={MessageCircle} />
                    <DimensionBar label="Conteúdo" score={s.conteudo_score} max={25} color={DIMENSION_COLORS.conteudo} icon={FileText} />
                    <DimensionBar label="Competitividade" score={s.competitividade_score} max={25} color={DIMENSION_COLORS.competitividade} icon={Swords} />
                  </div>
                  {s.metrics_snapshot && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border">
                      {[
                        { label: "Seguidores", value: s.metrics_snapshot.followers },
                        { label: "Posts 90d", value: s.metrics_snapshot.posts_90d },
                        { label: "Avg Likes", value: s.metrics_snapshot.avg_likes },
                        { label: "Avg Comments", value: s.metrics_snapshot.avg_comments },
                        { label: "Eng Rate", value: `${(s.metrics_snapshot.eng_rate ?? 0).toFixed(2)}%` },
                        { label: "Sentimento+", value: s.metrics_snapshot.sentiment_positive },
                      ].map((m) => (
                        <div key={m.label} className="text-center">
                          <p className="text-sm font-bold font-mono text-foreground">{typeof m.value === "number" ? m.value.toLocaleString("pt-BR") : m.value}</p>
                          <p className="text-[9px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

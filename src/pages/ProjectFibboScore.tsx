import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, Users, MessageCircle, FileText, Swords, Settings2 } from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useFibboScores, useLatestFibboScores, useLatestChannelScores, type FibboScoreWithEntity } from "@/hooks/useFibboScores";
import { useEntityDataSummary } from "@/hooks/useEntityDataSummary";
import { EntityDataSummary } from "@/components/sources/EntityDataSummary";
import { FibboScoreAdmin } from "@/components/fibbo-score/FibboScoreAdmin";
import {
  type SocialChannel, type FibboScoreConfig,
  FIBBO_CONFIG_DEFAULTS, classifyScore, getChannelLabel, getChannelIcon,
  deepMergeConfig,
} from "@/lib/fibboScoreConfig";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
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

function ScoreGauge({ score, max = 100, label, large }: { score: number; max?: number; label: string; large?: boolean }) {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-red-500";
  return (
    <div className="text-center">
      <p className={`${large ? "text-5xl" : "text-3xl"} font-bold font-mono ${color}`}>{score.toFixed(1)}</p>
      <p className={`${large ? "text-sm" : "text-[10px]"} text-muted-foreground mt-0.5`}>{label}</p>
      <div className={`w-full ${large ? "h-2" : "h-1.5"} bg-muted rounded-full mt-1.5`}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444" }} />
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: allScores, isLoading } = useFibboScores(projectId);
  const { channelScores, generalScores, activeChannels } = useLatestChannelScores(projectId);
  const [recalculating, setRecalculating] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Check if user is owner
  const { data: project } = useQuery({
    queryKey: ["project-owner", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("created_by, briefing").eq("id", projectId!).single();
      return data;
    },
    enabled: !!projectId,
  });

  const isOwner = user?.id === project?.created_by;

  const fibboConfig = useMemo((): FibboScoreConfig => {
    const raw = (project?.briefing as any)?.fibbo_config;
    if (!raw) return FIBBO_CONFIG_DEFAULTS;
    return deepMergeConfig(FIBBO_CONFIG_DEFAULTS, raw);
  }, [project?.briefing]);

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: FibboScoreConfig) => {
      const { data: currentProject } = await supabase
        .from("projects").select("briefing").eq("id", projectId!).single();
      const currentBriefing = (currentProject?.briefing as Record<string, any>) ?? {};
      const merged = { ...currentBriefing, fibbo_config: newConfig } as unknown as Record<string, any>;
      const { error } = await supabase
        .from("projects")
        .update({ briefing: merged })
        .eq("id", projectId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-owner", projectId] });
      toast({ title: "Configuração salva", description: "Os thresholds foram atualizados." });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao salvar", variant: "destructive" });
    },
  });

  // Get brand's general score
  const brandGeneralScore = generalScores?.find((s) => s.entity_role === "brand");
  const generalScore = brandGeneralScore?.total_score ?? 0;

  // Entity IDs for data summary
  const entityIds = channelScores?.map((s) => s.entity_id).filter(Boolean) as string[] ?? [];
  const uniqueEntityIds = [...new Set(entityIds)];
  const { data: dataSummary } = useEntityDataSummary(uniqueEntityIds);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-fibbo-score", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      toast({ title: "FibboScore recalculado", description: `${data.scores?.length ?? 0} registros atualizados` });
      queryClient.invalidateQueries({ queryKey: ["fibbo-scores", projectId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao recalcular";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  // Filter scores for current channel tab
  const getChannelEntities = (ch: SocialChannel) =>
    channelScores?.filter((s) => s.channel === ch) ?? [];

  // Radar data for a specific channel
  const getRadarData = (entities: FibboScoreWithEntity[]) =>
    entities.map((s, i) => ({
      name: s.entity_name,
      color: ENTITY_COLORS[i % ENTITY_COLORS.length],
      presenca: s.presenca_score,
      engajamento: s.engajamento_score,
      conteudo: s.conteudo_score,
      competitividade: s.competitividade_score,
    }));

  // Timeline for all scores (filter by channel)
  const getTimelineData = (ch: SocialChannel) => {
    if (!allScores) return [];
    const filtered = allScores.filter((s) => s.channel === ch);
    const dateMap = new Map<string, Record<string, any>>();
    for (const s of filtered) {
      if (!dateMap.has(s.score_date)) dateMap.set(s.score_date, { date: s.score_date });
      dateMap.get(s.score_date)![s.entity_name] = s.total_score;
    }
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasScores = channelScores && channelScores.length > 0;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fibbo Score</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Score de maturidade digital — por canal e geral
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => setAdminOpen(true)} className="gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Configurar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!hasScores && (
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

      {hasScores && (
        <>
          {/* General Score */}
          {brandGeneralScore && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <p className="text-xs text-muted-foreground mb-2">Score Geral</p>
                <ScoreGauge score={generalScore} label={classifyScore(generalScore)} large />
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="outline" className="text-[10px]">
                    {activeChannels.length} {activeChannels.length === 1 ? "canal ativo" : "canais ativos"}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4 max-w-lg mx-auto">
                  <DimensionBar label="Presença" score={brandGeneralScore.presenca_score} max={25} color={DIMENSION_COLORS.presenca} icon={Users} />
                  <DimensionBar label="Engajamento" score={brandGeneralScore.engajamento_score} max={25} color={DIMENSION_COLORS.engajamento} icon={MessageCircle} />
                  <DimensionBar label="Conteúdo" score={brandGeneralScore.conteudo_score} max={25} color={DIMENSION_COLORS.conteudo} icon={FileText} />
                  <DimensionBar label="Competitividade" score={brandGeneralScore.competitividade_score} max={25} color={DIMENSION_COLORS.competitividade} icon={Swords} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channel Tabs */}
          {activeChannels.length > 0 && (
            <Tabs defaultValue={activeChannels[0]}>
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                {activeChannels.map((ch) => {
                  const brandChScore = channelScores.find((s) => s.channel === ch && s.entity_role === "brand");
                  return (
                    <TabsTrigger key={ch} value={ch} className="text-xs gap-1.5 px-3 py-1.5">
                      <span>{getChannelIcon(ch)}</span>
                      <span>{getChannelLabel(ch)}</span>
                      {brandChScore && (
                        <Badge variant="secondary" className="text-[10px] ml-1 px-1.5">
                          {brandChScore.total_score.toFixed(0)}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {activeChannels.map((ch) => {
                const entities = getChannelEntities(ch);
                const radarData = getRadarData(entities);
                const timelineData = getTimelineData(ch);
                const entityNames = [...new Set(entities.map((s) => s.entity_name))];
                const barData = entities.map((s, i) => ({
                  name: s.entity_name.length > 12 ? s.entity_name.slice(0, 12) + "…" : s.entity_name,
                  total: s.total_score,
                  presenca: s.presenca_score,
                  engajamento: s.engajamento_score,
                  conteudo: s.conteudo_score,
                  competitividade: s.competitividade_score,
                  fill: ENTITY_COLORS[i % ENTITY_COLORS.length],
                }));

                return (
                  <TabsContent key={ch} value={ch} className="space-y-6 mt-4">
                    {/* Comparative bar chart */}
                    {barData.length > 1 && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-sm font-semibold text-foreground mb-4">
                            Comparativo — {getChannelLabel(ch)}
                          </h3>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} formatter={(v: number, name: string) => [`${v.toFixed(1)}`, name]} />
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

                    {/* Radar */}
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
                                {radarData.map((r) => (
                                  <Radar key={r.name} name={r.name} dataKey={r.name} stroke={r.color} fill={r.color} fillOpacity={0.15} />
                                ))}
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Timeline */}
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
                      {entities.map((s, i) => (
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
                            {s.entity_id && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <EntityDataSummary data={dataSummary?.get(s.entity_id) ?? {
                                  entityId: s.entity_id, totalPosts: 0, postTypes: [], totalLikes: 0, totalComments: 0,
                                  totalSaves: 0, totalShares: 0, totalViews: 0, postsWithHashtags: 0,
                                  realCommentsCount: 0, commentsWithSentiment: 0,
                                  oldestPostDate: null, newestPostDate: null, followers: null,
                                }} />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </>
      )}

      {/* Admin dialog */}
      <FibboScoreAdmin
        open={adminOpen}
        onOpenChange={setAdminOpen}
        config={fibboConfig}
        onSave={(cfg) => saveConfigMutation.mutate(cfg)}
        activeChannels={activeChannels}
      />
    </div>
  );
}

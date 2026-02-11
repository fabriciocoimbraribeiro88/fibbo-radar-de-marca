import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNum } from "@/lib/formatNumber";
import PreviewBigNumbers, { type BigNumberItem } from "./PreviewBigNumbers";
import PreviewTable, { type EntityRow } from "./PreviewTable";
import { ANALYSIS_TYPES, calculatePreviousPeriod } from "@/lib/analysisSections";

interface Step4Props {
  channel: "social" | "ads" | "seo";
  analysisType: string;
  periodMode: "date" | "count";
  periodStart: string;
  periodEnd: string;
  postsLimit: number;
  comparePrevious: boolean;
  selectedEntities: Set<string>;
  selectedSections: Set<string>;
  title: string;
  setTitle: (t: string) => void;
  projectId: string;
  brandEntityId: string | null;
  allEntities: Array<{
    id: string;
    name: string;
    instagram_handle?: string | null;
    entity_role: string;
  }>;
}

interface PreviewData {
  bigNumbers: BigNumberItem[];
  entityRows: EntityRow[];
  formatRows?: Array<{ name: string; reels: number; carousel: number; static_: number; video: number }>;
  warnings: Array<{ level: "success" | "warning" | "error"; message: string }>;
}

const CHANNEL_LABELS = { social: "📱 Social", ads: "📢 Ads", seo: "🔍 SEO" };

export default function AnalysisStep4(props: Step4Props) {
  const {
    channel, analysisType, periodMode, periodStart, periodEnd, postsLimit,
    comparePrevious, selectedEntities, selectedSections, title, setTitle,
    projectId, brandEntityId, allEntities,
  } = props;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreviewData | null>(null);

  const typeLabel = ANALYSIS_TYPES.find((t) => t.value === analysisType)?.label ?? analysisType;
  const allEntityIds = [brandEntityId, ...Array.from(selectedEntities)].filter(Boolean) as string[];
  const entityMap = new Map(allEntities.map((e) => [e.id, e]));

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      if (channel === "social") {
        await loadSocialPreview();
      } else if (channel === "ads") {
        await loadAdsPreview();
      } else {
        await loadSeoPreview();
      }
    } catch (err) {
      console.error("Preview load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSocialPreview = async () => {
    const warnings: PreviewData["warnings"] = [];
    const entityRows: EntityRow[] = [];
    let totalPosts = 0, totalLikes = 0, totalComments = 0, totalViews = 0, totalEng = 0;
    let prevTotalPosts = 0, prevTotalLikes = 0, prevTotalComments = 0, prevTotalViews = 0;

    const prevPeriod = comparePrevious && periodStart && periodEnd
      ? calculatePreviousPeriod(periodStart, periodEnd)
      : null;

    for (const entityId of allEntityIds) {
      const ent = entityMap.get(entityId);
      if (!ent) continue;

      let query = supabase.from("instagram_posts").select("likes_count,comments_count,views_count,engagement_total,post_type", { count: "exact" }).eq("entity_id", entityId);
      if (periodMode === "date" && periodStart && periodEnd) {
        query = query.gte("posted_at", periodStart).lte("posted_at", periodEnd);
      }
      query = query.order("posted_at", { ascending: false });
      if (periodMode === "count") {
        query = query.limit(postsLimit);
      }

      const { data: posts, count } = await query;
      const postCount = periodMode === "count" ? (posts?.length ?? 0) : (count ?? posts?.length ?? 0);

      const likes = posts?.reduce((s, p) => s + (p.likes_count ?? 0), 0) ?? 0;
      const comments = posts?.reduce((s, p) => s + (p.comments_count ?? 0), 0) ?? 0;
      const views = posts?.reduce((s, p) => s + (p.views_count ?? 0), 0) ?? 0;
      const eng = posts?.reduce((s, p) => s + (p.engagement_total ?? 0), 0) ?? 0;
      const avgEng = postCount > 0 ? Math.round(eng / postCount) : 0;

      // Get followers
      const { data: profile } = await supabase
        .from("instagram_profiles")
        .select("followers_count")
        .eq("entity_id", entityId)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const followers = profile?.followers_count ?? 0;
      const rate = followers > 0 ? (avgEng / followers) * 100 : 0;

      entityRows.push({
        name: ent.name,
        handle: ent.instagram_handle ? `@${ent.instagram_handle}` : undefined,
        isBrand: entityId === brandEntityId,
        posts: postCount,
        likes, comments, avgEngagement: avgEng, followers, engagementRate: rate,
      });

      totalPosts += postCount;
      totalLikes += likes;
      totalComments += comments;
      totalViews += views;
      totalEng += eng;

      if (postCount === 0) {
        warnings.push({ level: "error", message: `${ent.name} sem dados no período.` });
      } else if (postCount < 30) {
        warnings.push({ level: "warning", message: `${ent.name} tem apenas ${postCount} posts. Análises com <30 posts podem ser imprecisas.` });
      } else if (entityId === brandEntityId) {
        warnings.push({ level: "success", message: `Dados da marca completos e suficientes.` });
      }

      if (!profile) {
        warnings.push({ level: "warning", message: `Taxa de engajamento não disponível para ${ent.name}.` });
      }
    }

    // Previous period data
    if (prevPeriod) {
      for (const entityId of allEntityIds) {
        const { data: prevPosts } = await supabase
          .from("instagram_posts")
          .select("likes_count,comments_count,views_count")
          .eq("entity_id", entityId)
          .gte("posted_at", prevPeriod.start)
          .lte("posted_at", prevPeriod.end);

        prevTotalPosts += prevPosts?.length ?? 0;
        prevTotalLikes += prevPosts?.reduce((s, p) => s + (p.likes_count ?? 0), 0) ?? 0;
        prevTotalComments += prevPosts?.reduce((s, p) => s + (p.comments_count ?? 0), 0) ?? 0;
        prevTotalViews += prevPosts?.reduce((s, p) => s + (p.views_count ?? 0), 0) ?? 0;
      }

      if (prevTotalPosts === 0) {
        warnings.push({ level: "warning", message: "Dados do período anterior incompletos. Comparação pode ser imprecisa." });
      }
    }

    const avgEngAll = totalPosts > 0 ? Math.round(totalEng / totalPosts) : 0;
    const bigNumbers: BigNumberItem[] = [
      { label: "Posts", value: totalPosts, previousValue: comparePrevious ? prevTotalPosts : null },
      { label: "Curtidas", value: totalLikes, previousValue: comparePrevious ? prevTotalLikes : null },
      { label: "Comentários", value: totalComments, previousValue: comparePrevious ? prevTotalComments : null },
      { label: "Views", value: totalViews, previousValue: comparePrevious ? prevTotalViews : null },
      { label: "Eng. Médio", value: avgEngAll, previousValue: null },
    ];

    setData({ bigNumbers, entityRows, warnings });
  };

  const loadAdsPreview = async () => {
    const warnings: PreviewData["warnings"] = [];
    const entityRows: EntityRow[] = [];
    let totalAds = 0, totalActive = 0, totalSpend = 0;

    for (const entityId of allEntityIds) {
      const ent = entityMap.get(entityId);
      if (!ent) continue;

      const { data: ads } = await supabase
        .from("ads_library")
        .select("is_active,estimated_spend_max,platform,ad_type")
        .eq("entity_id", entityId);

      const adsCount = ads?.length ?? 0;
      const active = ads?.filter((a) => a.is_active).length ?? 0;
      const spend = ads?.reduce((s, a) => s + (a.estimated_spend_max ?? 0), 0) ?? 0;
      const platforms = [...new Set(ads?.map((a) => a.platform).filter(Boolean))].join(", ");
      const types = ads?.reduce((acc, a) => { acc[a.ad_type ?? "outro"] = (acc[a.ad_type ?? "outro"] ?? 0) + 1; return acc; }, {} as Record<string, number>);
      const mainType = types ? Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—" : "—";

      entityRows.push({
        name: ent.name,
        isBrand: entityId === brandEntityId,
        adsTotal: adsCount,
        adsActive: active,
        estimatedSpend: spend,
        platforms: platforms || "—",
        mainType,
      });

      totalAds += adsCount;
      totalActive += active;
      totalSpend += spend;

      if (adsCount === 0) {
        warnings.push({ level: "error", message: `${ent.name} sem dados de Ads.` });
      }
    }

    const bigNumbers: BigNumberItem[] = [
      { label: "Anúncios Total", value: totalAds },
      { label: "Ativos", value: totalActive },
      { label: "Invest. Estimado", value: totalSpend },
    ];

    setData({ bigNumbers, entityRows, warnings });
  };

  const loadSeoPreview = async () => {
    const warnings: PreviewData["warnings"] = [];
    const entityRows: EntityRow[] = [];

    for (const entityId of allEntityIds) {
      const ent = entityMap.get(entityId);
      if (!ent) continue;

      const { data: seoData } = await supabase
        .from("seo_data")
        .select("keyword,position,domain_authority,backlinks_count,organic_traffic_estimate")
        .eq("entity_id", entityId);

      const kws = seoData?.length ?? 0;
      const avgPos = seoData?.length ? seoData.reduce((s, d) => s + (d.position ?? 0), 0) / seoData.length : 0;
      const da = seoData?.[0]?.domain_authority ?? null;
      const backlinks = seoData?.reduce((s, d) => s + (d.backlinks_count ?? 0), 0) ?? 0;
      const traffic = seoData?.reduce((s, d) => s + (d.organic_traffic_estimate ?? 0), 0) ?? 0;

      entityRows.push({
        name: ent.name,
        isBrand: entityId === brandEntityId,
        keywords: kws,
        avgPosition: avgPos,
        domainAuthority: da ?? undefined,
        backlinks,
        trafficEstimate: traffic,
      });

      if (kws === 0) {
        warnings.push({ level: "error", message: `${ent.name} sem dados de SEO.` });
      }
    }

    const totalKws = entityRows.reduce((s, r) => s + (r.keywords ?? 0), 0);
    const avgPosAll = entityRows.length ? entityRows.reduce((s, r) => s + (r.avgPosition ?? 0), 0) / entityRows.length : 0;

    const bigNumbers: BigNumberItem[] = [
      { label: "Keywords", value: totalKws },
      { label: "Posição Média", value: Math.round(avgPosAll * 10) / 10 },
    ];

    setData({ bigNumbers, entityRows, warnings });
  };

  const daysInPeriod = periodStart && periodEnd
    ? Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000)
    : null;

  const prevPeriod = comparePrevious && periodStart && periodEnd
    ? calculatePreviousPeriod(periodStart, periodEnd)
    : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Carregando prévia dos dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Prévia dos Dados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revise os dados antes de iniciar a análise.
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Título da Análise</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Canal</span>
              <span className="font-medium text-foreground">{CHANNEL_LABELS[channel]}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium text-foreground">{typeLabel}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Período</span>
              <span className="font-medium text-foreground">
                {periodMode === "date"
                  ? `${new Date(periodStart).toLocaleDateString("pt-BR")} — ${new Date(periodEnd).toLocaleDateString("pt-BR")}${daysInPeriod ? ` (${daysInPeriod} dias)` : ""}`
                  : `Últimos ${postsLimit} registros`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Comparação</span>
              <span className="font-medium text-foreground">
                {comparePrevious && prevPeriod
                  ? `✅ vs ${new Date(prevPeriod.start).toLocaleDateString("pt-BR")} — ${new Date(prevPeriod.end).toLocaleDateString("pt-BR")}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Entidades</span>
              <span className="font-medium text-foreground">{allEntityIds.length}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Seções</span>
              <span className="font-medium text-foreground">{selectedSections.size} + Resumo Executivo</span>
            </div>
            <div className="flex justify-between py-1 col-span-2">
              <span className="text-muted-foreground">Estimativa</span>
              <span className="font-medium text-foreground">~5 minutos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Big Numbers */}
      {data?.bigNumbers && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Big Numbers</p>
          <PreviewBigNumbers items={data.bigNumbers} comparePrevious={comparePrevious} />
        </div>
      )}

      {/* Entity Table */}
      {data?.entityRows && data.entityRows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Entidades</p>
          <PreviewTable rows={data.entityRows} channel={channel} />
        </div>
      )}

      {/* Warnings */}
      {data?.warnings && data.warnings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Avisos de Qualidade</p>
          <div className="space-y-2">
            {data.warnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                  w.level === "success"
                    ? "bg-green-500/10 text-green-700 border border-green-500/20"
                    : w.level === "warning"
                      ? "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {w.level === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : w.level === "warning" ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        <p>A análise levará aproximadamente 5 minutos.</p>
        <p>Os agentes de IA processarão cada seção selecionada.</p>
        <p className="mt-1 text-[10px]">O relatório incluirá assinatura Fibbo Radar.</p>
      </div>
    </div>
  );
}

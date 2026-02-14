import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  Users,
  Zap,
  DollarSign,
  TrendingUp,
  Globe,
  Search,
  FileText,
  BarChart3,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatNum } from "@/lib/formatNumber";
import { ResultsTimeline } from "./ResultsTimeline";
import { UpcomingActions } from "./UpcomingActions";

interface ResultsOverviewProps {
  projectId: string;
  contractedChannels: string[];
}

interface StatCardProps {
  label: string;
  value: string;
  trend?: number | null;
  icon: React.ElementType;
}

function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
        </div>
        {trend != null && trend !== 0 && (
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trend > 0 ? "text-emerald-600" : "text-destructive"}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums mt-1">{value}</p>
    </Card>
  );
}

export function ResultsOverview({ projectId, contractedChannels }: ResultsOverviewProps) {
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const currentYear = new Date().getFullYear();

  // Fetch OKRs summary
  const { data: okrData } = useQuery({
    queryKey: ["results-okrs-summary", projectId, currentYear, currentQuarter],
    queryFn: async () => {
      const { data } = await supabase
        .from("okr_objectives")
        .select("id, status, okr_key_results(id, current_value, target_value, baseline_value, metric_direction)")
        .eq("project_id", projectId)
        .eq("year", currentYear)
        .eq("quarter", currentQuarter);
      return data ?? [];
    },
  });

  // Fetch latest social metrics
  const { data: socialMetrics } = useQuery({
    queryKey: ["results-social-metrics", projectId],
    queryFn: async () => {
      const { data: entities } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role")
        .eq("project_id", projectId)
        .eq("entity_role", "brand");
      const brandEntityId = entities?.[0]?.entity_id;
      if (!brandEntityId) return null;

      const { data: profiles } = await supabase
        .from("instagram_profiles")
        .select("followers_count, snapshot_date")
        .eq("entity_id", brandEntityId)
        .order("snapshot_date", { ascending: false })
        .limit(2);

      const { data: posts } = await supabase
        .from("instagram_posts")
        .select("likes_count, comments_count, saves_count, shares_count, engagement_total, views_count")
        .eq("entity_id", brandEntityId)
        .order("posted_at", { ascending: false })
        .limit(50);

      const followers = profiles?.[0]?.followers_count ?? 0;
      const prevFollowers = profiles?.[1]?.followers_count ?? followers;
      const followersTrend = prevFollowers > 0 ? ((followers - prevFollowers) / prevFollowers) * 100 : 0;

      const avgEng = posts?.length
        ? posts.reduce((s, p) => s + (p.engagement_total ?? 0), 0) / posts.length
        : 0;
      const engRate = followers > 0 ? (avgEng / followers) * 100 : 0;

      return { followers, followersTrend, engRate, totalPosts: posts?.length ?? 0 };
    },
    enabled: contractedChannels.includes("social"),
  });

  // Fetch NPS
  const { data: lastNps } = useQuery({
    queryKey: ["results-last-nps", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("nps_surveys")
        .select("score, classification")
        .eq("project_id", projectId)
        .not("score", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const totalOKRs = okrData?.length ?? 0;
  const onTrackOKRs = okrData?.filter(o => o.status === "on_track" || o.status === "achieved").length ?? 0;

  const emptyChannels = contractedChannels.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Resultados — {currentQuarter} {currentYear}</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de OKRs, relatórios e saúde do cliente.</p>
        </div>
        <div className="flex items-center gap-2">
          {contractedChannels.map(ch => (
            <Badge key={ch} variant="secondary" className="text-[10px]">
              {ch === "social" ? "Social" : ch === "ads" ? "Ads" : "SEO"}
            </Badge>
          ))}
          {lastNps && (
            <Badge variant="outline" className="text-[10px]">NPS: {lastNps.score}</Badge>
          )}
        </div>
      </div>

      {/* Empty state */}
      {emptyChannels && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <BarChart3 className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Configure os serviços contratados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vá na aba Configuração para selecionar os serviços do contrato deste cliente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Big Numbers */}
      {!emptyChannels && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="OKRs On Track" value={`${onTrackOKRs}/${totalOKRs}`} icon={Target} />

          {contractedChannels.includes("social") && socialMetrics && (
            <>
              <StatCard label="Seguidores" value={formatNum(socialMetrics.followers)} trend={socialMetrics.followersTrend} icon={Users} />
              <StatCard label="Engajamento" value={`${socialMetrics.engRate.toFixed(2)}%`} icon={Zap} />
            </>
          )}

          {contractedChannels.includes("ads") && (
            <StatCard label="Investimento" value="—" icon={DollarSign} />
          )}

          {contractedChannels.includes("seo") && (
            <StatCard label="Tráfego Orgânico" value="—" icon={Globe} />
          )}
        </div>
      )}

      {/* Timeline + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ResultsTimeline projectId={projectId} />
        </div>
        <div>
          <UpcomingActions projectId={projectId} />
        </div>
      </div>
    </div>
  );
}

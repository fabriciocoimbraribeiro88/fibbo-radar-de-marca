import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  useEntityComments,
  computeSentimentMetrics,
  type SentimentMetrics,
  type CommentWithPost,
} from "@/hooks/useProjectComments";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Props {
  entityId: string;
  entityName: string;
  color: string;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#a3a3a3",
  negative: "#ef4444",
};

function CommentCard({ comment, index }: { comment: CommentWithPost; index: number }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border">
      <span className="text-sm font-bold font-mono text-muted-foreground shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">@{comment.username || "anon"}</span>
          {comment.sentiment_category && (
            <Badge variant="outline" className="text-[9px] capitalize">{comment.sentiment_category}</Badge>
          )}
          {comment.likes_count != null && comment.likes_count > 0 && (
            <span className="text-[10px] text-muted-foreground">{comment.likes_count} likes</span>
          )}
        </div>
        <p className="text-xs text-foreground/80 line-clamp-2">{comment.text}</p>
        {comment.shortcode && (
          <a
            href={`https://www.instagram.com/p/${comment.shortcode}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver post
          </a>
        )}
      </div>
    </div>
  );
}

export default function SentimentAnalysisSection({ entityId, entityName, color }: Props) {
  const { data: comments, isLoading } = useEntityComments(entityId);

  const metrics: SentimentMetrics | null = comments && comments.length > 0
    ? computeSentimentMetrics(comments)
    : null;

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  // No comments at all
  if (!comments || comments.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <h4 className="text-sm font-semibold text-foreground mb-2">Análise de Sentimento</h4>
          <p className="text-xs text-muted-foreground">
            Os comentários serão analisados automaticamente na próxima importação de dados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No sentiment data yet
  if (!metrics || metrics.analyzed === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <h4 className="text-sm font-semibold text-foreground mb-2">Análise de Sentimento</h4>
          <p className="text-xs text-muted-foreground">
            {metrics?.total ?? 0} comentários encontrados. A análise de sentimento será executada automaticamente na próxima importação.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: "Positivo", value: metrics.positive, color: SENTIMENT_COLORS.positive },
    { name: "Neutro", value: metrics.neutral, color: SENTIMENT_COLORS.neutral },
    { name: "Negativo", value: metrics.negative, color: SENTIMENT_COLORS.negative },
  ];

  // Category groups
  const positiveCategories = Object.entries(metrics.categories)
    .filter(([cat]) => {
      const posComments = comments.filter((c) => c.sentiment === "positive" && c.sentiment_category === cat);
      return posComments.length > 0;
    })
    .sort((a, b) => b[1] - a[1]);

  const negativeCategories = Object.entries(metrics.categories)
    .filter(([cat]) => {
      const negComments = comments.filter((c) => c.sentiment === "negative" && c.sentiment_category === cat);
      return negComments.length > 0;
    })
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Análise de Sentimento</h4>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold font-mono text-foreground">{metrics.total}</p>
            <p className="text-[9px] text-muted-foreground">Total Comentários</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold font-mono" style={{ color: SENTIMENT_COLORS.positive }}>
              {metrics.percentPositive}%
            </p>
            <p className="text-[9px] text-muted-foreground">Positivo</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold font-mono" style={{ color: SENTIMENT_COLORS.neutral }}>
              {metrics.percentNeutral}%
            </p>
            <p className="text-[9px] text-muted-foreground">Neutro</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold font-mono" style={{ color: SENTIMENT_COLORS.negative }}>
              {metrics.percentNegative}%
            </p>
            <p className="text-[9px] text-muted-foreground">Negativo</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold font-mono text-foreground">{metrics.score}/10</p>
            <p className="text-[9px] text-muted-foreground">Score Geral</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Distribuição de Sentimento</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Positive themes */}
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
              <p className="text-xs font-semibold text-foreground">Temas Positivos</p>
            </div>
            <div className="space-y-2">
              {positiveCategories.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum tema positivo identificado</p>
              )}
              {positiveCategories.slice(0, 8).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-xs text-foreground capitalize">{cat}</span>
                  <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Negative themes */}
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs font-semibold text-foreground">Pontos de Atenção</p>
            </div>
            <div className="space-y-2">
              {negativeCategories.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum ponto negativo identificado</p>
              )}
              {negativeCategories.slice(0, 8).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-xs text-foreground capitalize">{cat}</span>
                  <Badge variant="destructive" className="text-[10px]">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top comments: positive and negative side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top positive */}
        {metrics.topPositive.length > 0 && (
          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <p className="text-xs font-semibold text-foreground">
                  Top {metrics.topPositive.length} Comentários Positivos
                </p>
              </div>
              <div className="space-y-3">
                {metrics.topPositive.map((c, i) => (
                  <CommentCard key={c.id} comment={c} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top negative */}
        {metrics.topNegative.length > 0 && (
          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-semibold text-foreground">
                  Top {metrics.topNegative.length} Situações que Necessitam Atenção
                </p>
              </div>
              <div className="space-y-3">
                {metrics.topNegative.map((c, i) => (
                  <CommentCard key={c.id} comment={c} index={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

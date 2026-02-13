import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEntityComments,
  computeSentimentMetrics,
} from "@/hooks/useProjectComments";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

interface Props {
  metrics: EntityMetrics[];
}

interface SentimentDataPoint {
  name: string;
  color: string;
  score: number;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

function EntitySentimentLoader({ entityId, onData }: { entityId: string; onData: (data: any) => void }) {
  const { data: comments, isLoading } = useEntityComments(entityId);

  if (!isLoading && comments && comments.length > 0) {
    const metrics = computeSentimentMetrics(comments);
    // Use a ref-like pattern to avoid re-renders
    requestAnimationFrame(() => onData(metrics));
  } else if (!isLoading) {
    requestAnimationFrame(() => onData(null));
  }

  return null;
}

import { useState, useCallback } from "react";

export default function SentimentComparisonChart({ metrics }: Props) {
  const [sentimentData, setSentimentData] = useState<Record<string, any>>({});

  const handleData = useCallback((entityId: string) => (data: any) => {
    setSentimentData((prev) => {
      if (prev[entityId] === data) return prev;
      return { ...prev, [entityId]: data };
    });
  }, []);

  const chartData: SentimentDataPoint[] = metrics
    .map((em) => {
      const sd = sentimentData[em.entityId];
      if (!sd) return null;
      return {
        name: em.name.length > 12 ? em.name.slice(0, 12) + "…" : em.name,
        color: em.color,
        score: sd.score,
        positive: sd.percentPositive,
        neutral: sd.percentNeutral,
        negative: sd.percentNegative,
        total: sd.total,
      };
    })
    .filter(Boolean) as SentimentDataPoint[];

  const allLoaded = Object.keys(sentimentData).length >= metrics.length;
  const hasData = chartData.length > 0;

  return (
    <>
      {/* Hidden loaders */}
      {metrics.map((em) => (
        <EntitySentimentLoader
          key={em.entityId}
          entityId={em.entityId}
          onData={handleData(em.entityId)}
        />
      ))}

      {hasData && (
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-1">Sentimento Comparativo</p>
            <p className="text-[10px] text-muted-foreground mb-4">Score de sentimento (0-10) por entidade</p>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={32}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: "11px",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "score") return [`${value}/10`, "Score"];
                      return [value, name];
                    }}
                    labelStyle={{ fontWeight: 600, fontSize: "11px" }}
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  />
                  <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sentiment breakdown pills */}
            <div className="mt-3 space-y-1.5">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-foreground font-medium w-20 truncate">{d.name}</span>
                  <span className="text-green-600">{d.positive}%</span>
                  <span className="text-muted-foreground">{d.neutral}%</span>
                  <span className="text-red-500">{d.negative}%</span>
                  <span className="text-muted-foreground ml-auto">({d.total})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

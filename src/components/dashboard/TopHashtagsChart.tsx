import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props { metrics: EntityMetrics; color: string }

export default function TopHashtagsChart({ metrics, color }: Props) {
  const sorted = Object.entries(metrics.hashtags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag: `#${tag}`, count }));

  if (!sorted.length) return (
    <Card className="border border-border">
      <CardContent className="py-8 text-center text-xs text-muted-foreground">Sem hashtags</CardContent>
    </Card>
  );

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">
          Top 10 Hashtags Mais Usadas {metrics.handle ? `@${metrics.handle.replace("@", "")}` : ""}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="tag" type="category" tick={{ fontSize: 9 }} width={55} />
            <Tooltip />
            <Bar dataKey="count" name="Usos" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

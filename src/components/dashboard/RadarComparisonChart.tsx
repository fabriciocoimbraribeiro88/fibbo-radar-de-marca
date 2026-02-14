import { Card, CardContent } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props { metrics: EntityMetrics[] }

function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => Math.round((v / max) * 100));
}

/** Amplify small percentages so they're visible on the radar.
 *  Maps 0-100% → 0-100 using sqrt scaling: e.g. 1% → 10, 4% → 20, 25% → 50 */
function amplify(values: number[]): number[] {
  return values.map((v) => Math.round(Math.sqrt(v) * 10));
}

export default function RadarComparisonChart({ metrics }: Props) {
  if (metrics.length < 2) return null;

  const postVolNorm = normalize(metrics.map((m) => m.totalPosts));
  const avgLikesNorm = normalize(metrics.map((m) => m.avgLikes));
  const avgCommentsNorm = normalize(metrics.map((m) => m.avgComments));
  const videoPct = metrics.map((m) => {
    const total = m.totalPosts || 1;
    return Math.round(((m.postTypes["Video"] ?? 0) + (m.postTypes["Reel"] ?? 0)) / total * 100);
  });
  const sidecarPct = metrics.map((m) => {
    const total = m.totalPosts || 1;
    return Math.round((m.postTypes["Sidecar"] ?? 0) / total * 100);
  });
  // Use amplified scale for hit rate so it's visible even at low %
  const hitPct = amplify(metrics.map((m) => {
    const total = m.totalPosts || 1;
    return (m.hits / total) * 100;
  }));
  // Use amplified scale for viral rate so it's visible even at low %
  const viralPct = amplify(metrics.map((m) => {
    const total = m.totalPosts || 1;
    return (m.viralHits / total) * 100;
  }));

  const axes = ["Volume Posts", "Média Likes", "Média Comments", "% Vídeos", "% Carrosséis", "Hit Rate", "Viral Rate"];
  const data = axes.map((axis, i) => {
    const row: Record<string, any> = { axis };
    metrics.forEach((m, j) => {
      const vals = [postVolNorm, avgLikesNorm, avgCommentsNorm, videoPct, sidecarPct, hitPct, viralPct];
      row[m.name] = vals[i][j];
    });
    return row;
  });

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Radar Comparativo</p>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
            <Tooltip />
            {metrics.map((m) => (
              <Radar
                key={m.entityId}
                name={m.name}
                dataKey={m.name}
                stroke={m.color}
                fill={m.color}
                fillOpacity={0.1}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

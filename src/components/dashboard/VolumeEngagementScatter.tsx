import { Card, CardContent } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props { metrics: EntityMetrics[] }

export default function VolumeEngagementScatter({ metrics }: Props) {
  if (metrics.length < 2) return null;

  const data = metrics.map((m) => ({
    x: m.totalPosts,
    y: Number(m.engagementRate.toFixed(2)),
    z: Math.max(m.followers, 100),
    name: m.name,
    color: m.color,
  }));

  const avgPosts = data.reduce((s, d) => s + d.x, 0) / data.length;
  const avgRate = data.reduce((s, d) => s + d.y, 0) / data.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-md bg-popover border border-border p-2 text-xs shadow-md">
        <p className="font-medium text-foreground">{d.name}</p>
        <p className="text-muted-foreground">Posts: {d.x}</p>
        <p className="text-muted-foreground">Engajamento: {d.y}%</p>
        <p className="text-muted-foreground">Seguidores: {d.z.toLocaleString("pt-BR")}</p>
      </div>
    );
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Volume vs Engajamento (tamanho = seguidores)</p>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <XAxis dataKey="x" name="Posts" tick={{ fontSize: 10 }}>
              <Label value="Volume de Posts" position="insideBottom" offset={-5} style={{ fontSize: 10 }} />
            </XAxis>
            <YAxis dataKey="y" name="Engajamento %" tick={{ fontSize: 10 }}>
              <Label value="Engajamento %" angle={-90} position="insideLeft" style={{ fontSize: 10 }} />
            </YAxis>
            <ZAxis dataKey="z" range={[60, 400]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={avgPosts} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <ReferenceLine y={avgRate} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            {data.map((d) => (
              <Scatter key={d.name} name={d.name} data={[d]} fill={d.color} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

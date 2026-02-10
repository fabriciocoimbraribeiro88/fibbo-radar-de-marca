import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

const FORMAT_COLORS: Record<string, string> = {
  Image: "#ef4444",
  Video: "#1e3a5f",
  Reel: "#3b82f6",
  Sidecar: "#10b981",
  Unknown: "#9ca3af",
};

interface Props { metrics: EntityMetrics; handle: string | null }

export default function ContentTypePieChart({ metrics, handle }: Props) {
  const data = Object.entries(metrics.postTypes).map(([name, value]) => ({ name, value }));
  if (!data.length) return <Card className="border border-border"><CardContent className="py-8 text-center text-xs text-muted-foreground">Sem dados de tipo de conteúdo</CardContent></Card>;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">
          Distribuição por Tipo de Conteúdo {handle ? `@${handle.replace("@", "")}` : ""}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((d) => <Cell key={d.name} fill={FORMAT_COLORS[d.name] ?? "#9ca3af"} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [v, "Posts"]} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

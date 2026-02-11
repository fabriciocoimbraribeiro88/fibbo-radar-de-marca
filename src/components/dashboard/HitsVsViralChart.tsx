import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Legend } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props {
  metrics: EntityMetrics[];
}

export default function HitsVsViralChart({ metrics }: Props) {
  const data = metrics.map((m) => ({
    name: m.name,
    hits: m.hits,
    virais: m.viralHits,
    color: m.color,
  }));

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Hits vs Virais por Entidade</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number, name: string) => [
                v,
                name === "hits" ? "Hits (>2x média)" : "Virais (>10x média)",
              ]}
            />
            <Legend
              formatter={(value: string) =>
                value === "hits" ? "Hits (>2x)" : "Virais (>10x)"
              }
              wrapperStyle={{ fontSize: 10 }}
            />
            <Bar dataKey="hits" fill="hsl(var(--primary) / 0.45)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="hits" position="top" fontSize={10} />
            </Bar>
            <Bar dataKey="virais" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="virais" position="top" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

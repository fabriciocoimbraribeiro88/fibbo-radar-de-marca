import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props {
  metrics: EntityMetrics[];
}

export default function ViralHitsChart({ metrics }: Props) {
  const data = metrics.map((m) => ({
    name: m.name,
    hits: m.viralHits,
    rate: Number(m.viralRate.toFixed(1)),
    color: m.color,
  }));

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Hits Virais (engajamento &gt; 2× média)</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number, name: string) => {
                if (name === "hits") return [v, "Hits Virais"];
                return [`${v}%`, "% Viral"];
              }}
            />
            <Bar dataKey="hits" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              <LabelList dataKey="hits" position="top" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

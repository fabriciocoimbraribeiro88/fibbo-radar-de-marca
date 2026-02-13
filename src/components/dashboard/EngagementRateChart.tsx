import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props {
  metrics: EntityMetrics[];
}

export default function EngagementRateChart({ metrics }: Props) {
  const data = metrics.map((m) => ({
    name: m.name,
    rate: Number(m.engagementRate.toFixed(2)),
    color: m.color,
  }));

  if (!data.length) return null;

  return (
    <div className="card-flat">
      <div className="p-5">
        <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Taxa de Engajamento</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, "Engajamento"]} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              <LabelList dataKey="rate" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

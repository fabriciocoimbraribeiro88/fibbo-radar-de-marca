import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props { metrics: EntityMetrics[] }

export default function ViralStatsChart({ metrics }: Props) {
  const data = metrics.map((m) => ({
    name: m.name,
    total: m.viralHits,
    rate: parseFloat(m.viralRate.toFixed(1)),
    color: m.color,
  }));
  if (!data.length) return null;

  return (
    <div className="card-flat">
      <div className="p-5">
        <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Viral — Total & Rate (%)</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
            <Tooltip
              formatter={(v: number, name: string) => [
                name === "total" ? v.toLocaleString("pt-BR") : `${v}%`,
                name === "total" ? "Virais" : "Viral Rate",
              ]}
            />
            <Legend
              formatter={(value) => (value === "total" ? "Virais" : "Viral Rate %")}
              wrapperStyle={{ fontSize: 10 }}
            />
            <Bar yAxisId="left" dataKey="total" radius={[4, 4, 0, 0]} opacity={0.85}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              <LabelList dataKey="total" position="top" fontSize={10} />
            </Bar>
            <Bar yAxisId="right" dataKey="rate" radius={[4, 4, 0, 0]} opacity={0.5}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              <LabelList dataKey="rate" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

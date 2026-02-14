import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props { metrics: EntityMetrics[] }

export default function HitRateChart({ metrics }: Props) {
  const data = metrics.map((m) => {
    const hitRate = m.totalPosts > 0 ? ((m.hits / m.totalPosts) * 100) : 0;
    return { name: m.name, value: parseFloat(hitRate.toFixed(1)), color: m.color };
  });
  if (!data.length) return null;

  return (
    <div className="card-flat">
      <div className="p-5">
        <p className="text-xs font-medium text-muted-foreground mb-4 text-center">Hit Rate (%)</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit="%" />
            <Tooltip formatter={(v: number) => [`${v}%`, "Hit Rate"]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              <LabelList dataKey="value" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

const FORMAT_COLORS: Record<string, string> = {
  Image: "#ef4444",
  Video: "#1e3a5f",
  Reel: "#3b82f6",
  Sidecar: "#10b981",
  Other: "#9ca3af",
};

interface Props { metrics: EntityMetrics[] }

export default function ContentMixChart({ metrics }: Props) {
  // Collect all post types
  const allTypes = new Set<string>();
  metrics.forEach((m) => Object.keys(m.postTypes).forEach((t) => allTypes.add(t)));
  const types = Array.from(allTypes);

  const data = metrics.map((m) => {
    const total = m.totalPosts || 1;
    const row: Record<string, any> = { name: m.name };
    types.forEach((t) => {
      row[t] = Math.round(((m.postTypes[t] ?? 0) / total) * 100);
    });
    return row;
  });

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">Mix de Formatos de Conteúdo</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} stackOffset="expand" layout="horizontal">
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {types.map((t) => (
              <Bar key={t} dataKey={t} stackId="a" fill={FORMAT_COLORS[t] ?? "#9ca3af"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

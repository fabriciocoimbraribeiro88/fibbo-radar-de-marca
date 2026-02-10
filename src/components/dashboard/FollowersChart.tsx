import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useMemo } from "react";

interface Props {
  data: Array<{ snapshot_date: string; followers: number; entity_name: string }>;
}

export default function FollowersChart({ data }: Props) {
  // Pivot: one row per date, one key per entity
  const { chartData, entities } = useMemo(() => {
    const entitySet = new Set<string>();
    const byDate: Record<string, Record<string, number>> = {};

    for (const d of data) {
      entitySet.add(d.entity_name);
      if (!byDate[d.snapshot_date]) byDate[d.snapshot_date] = {};
      byDate[d.snapshot_date][d.entity_name] = d.followers;
    }

    const entities = Array.from(entitySet);
    const chartData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        ...vals,
      }));

    return { chartData, entities };
  }, [data]);

  const colors = ["hsl(var(--primary))", "hsl(var(--destructive))", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Evolução de Seguidores</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {entities.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

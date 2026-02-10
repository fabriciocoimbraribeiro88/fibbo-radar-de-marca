import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";

interface Props {
  data: Array<{ period: string; avg_engagement: number; posts_count: number }>;
}

export default function EngagementChart({ data }: Props) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: new Date(d.period).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      })),
    [data]
  );

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Engajamento Médio por Semana</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number, name: string) => {
                if (name === "avg_engagement") return [value.toLocaleString("pt-BR"), "Eng. Médio"];
                if (name === "posts_count") return [value, "Posts"];
                return [value, name];
              }}
            />
            <Area
              type="monotone"
              dataKey="avg_engagement"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#engGrad)"
              name="avg_engagement"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function fmtCurrency(n: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

interface Props {
  daily: any[];
  currency?: string;
}

export default function MetaAdsSpendChart({ daily, currency = "BRL" }: Props) {
  const data = daily.map((row: any) => ({
    date: new Date(row.date_start).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    spend: Number(row.spend) || 0,
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
  }));

  if (!data.length) return null;

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-foreground mb-3 text-center">
          Investimento Diário
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-md bg-popover border border-border p-2 text-xs shadow-md">
                    <p className="text-muted-foreground">{d.date}</p>
                    <p className="font-medium text-foreground">
                      {fmtCurrency(d.spend, currency)}
                    </p>
                    <p className="text-muted-foreground">
                      {d.clicks.toLocaleString("pt-BR")} cliques
                    </p>
                    <p className="text-muted-foreground">
                      {d.impressions.toLocaleString("pt-BR")} impressões
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { DollarSign, Eye, MousePointer, TrendingUp, Users } from "lucide-react";
import type { MetaInsightsTotals } from "@/hooks/useMetaAdInsights";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function fmtCurrency(n: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

interface Props {
  totals: MetaInsightsTotals;
}

export default function MetaAdsOverviewCard({ totals }: Props) {
  const metrics = [
    {
      label: "Investimento",
      value: fmtCurrency(totals.totalSpend, totals.currency),
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      label: "Impressões",
      value: fmt(totals.totalImpressions),
      icon: Eye,
      color: "text-blue-500",
    },
    {
      label: "Cliques",
      value: fmt(totals.totalClicks),
      icon: MousePointer,
      color: "text-orange-500",
    },
    {
      label: "Alcance",
      value: fmt(totals.totalReach),
      icon: Users,
      color: "text-purple-500",
    },
    {
      label: "CPC",
      value: fmtCurrency(totals.avgCpc, totals.currency),
      icon: DollarSign,
      color: "text-muted-foreground",
    },
    {
      label: "CTR",
      value: `${totals.avgCtr.toFixed(2)}%`,
      icon: TrendingUp,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-border bg-card p-3 text-center"
        >
          <m.icon className={`h-4 w-4 mx-auto mb-1 ${m.color}`} />
          <p className="text-lg font-semibold text-foreground">{m.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {m.label}
          </p>
        </div>
      ))}
    </div>
  );
}

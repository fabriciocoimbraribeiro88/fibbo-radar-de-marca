import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { EntityMetrics } from "@/hooks/useProjectDashboardData";

interface Props { metrics: EntityMetrics[] }

export default function HitViralChart({ metrics }: Props) {
  const data = metrics.map((m) => ({
    name: m.name,
    hitRate: m.totalPosts > 0 ? parseFloat(((m.hits / m.totalPosts) * 100).toFixed(1)) : 0,
    viralRate: parseFloat(m.viralRate.toFixed(1)),
    hits: m.hits,
    virals: m.viralHits,
    totalPosts: m.totalPosts,
    color: m.color,
  }));

  if (!data.length) return null;

  return (
    <div className="card-flat col-span-1 md:col-span-2">
      <div className="p-5">
        {/* Header with explanation */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-xs font-medium text-muted-foreground text-center">Hits & Virais</p>
          <TooltipProvider delayDuration={200}>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                <p className="font-semibold mb-1">🔥 Hit</p>
                <p className="mb-2">Post com engajamento &gt; 2× a média da entidade.</p>
                <p className="font-semibold mb-1">🚀 Viral</p>
                <p>Post com visualizações &gt; 10× a média da entidade.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>

        {/* Legend inline */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-foreground/70" />
            <span className="text-[10px] text-muted-foreground">🔥 Hit Rate (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-foreground/30" />
            <span className="text-[10px] text-muted-foreground">🚀 Viral Rate (%)</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 5 }} barGap={2}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit="%" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl space-y-1.5">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <div className="flex items-center gap-2">
                      <span>🔥</span>
                      <span className="text-muted-foreground">Hits:</span>
                      <span className="font-mono font-medium">{d.hits}/{d.totalPosts}</span>
                      <span className="font-mono font-medium text-foreground">({d.hitRate}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🚀</span>
                      <span className="text-muted-foreground">Virais:</span>
                      <span className="font-mono font-medium">{d.virals}/{d.totalPosts}</span>
                      <span className="font-mono font-medium text-foreground">({d.viralRate}%)</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="hitRate" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              <LabelList dataKey="hitRate" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="viralRate" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.4} />)}
              <LabelList dataKey="viralRate" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

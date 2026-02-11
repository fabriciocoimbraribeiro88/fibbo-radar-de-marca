import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OKRProgressBar } from "./OKRProgressBar";
import { calculateProgress, computeStatus, STATUS_CONFIG, getQuarterProgress } from "./okr-utils";
import { BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KeyResultRowProps {
  kr: any;
  index: number;
  objIndex: number;
  quarter: string;
  year: number;
  onHistory: (kr: any) => void;
}

export function KeyResultRow({ kr, index, objIndex, quarter, year, onHistory }: KeyResultRowProps) {
  const baseline = Number(kr.baseline_value ?? 0);
  const target = Number(kr.target_value);
  const current = Number(kr.current_value ?? 0);
  const progress = calculateProgress(baseline, target, current);
  const quarterElapsed = getQuarterProgress(quarter, year);
  const status = computeStatus(progress, quarterElapsed);
  const statusConfig = STATUS_CONFIG[status];

  const changeFromBaseline = baseline > 0
    ? `${target > baseline ? "+" : ""}${Math.round(((target - baseline) / baseline) * 100)}%`
    : null;

  // Find latest measurement
  const measurements = kr.okr_measurements ?? [];
  const lastMeasurement = measurements.length > 0
    ? measurements.sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0]
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            KR{objIndex}.{index}: {kr.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Baseline: {baseline.toLocaleString("pt-BR")}
            {kr.unit ? ` ${kr.unit}` : ""}
            {" · "}
            Meta: {target.toLocaleString("pt-BR")}
            {kr.unit ? ` ${kr.unit}` : ""}
            {changeFromBaseline && ` (${changeFromBaseline})`}
          </p>
        </div>
        <Badge className={`text-[10px] ${statusConfig.className}`}>
          {statusConfig.emoji} {statusConfig.label}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-mono font-medium text-foreground min-w-[60px]">
          {current.toLocaleString("pt-BR")}{kr.unit === "%" ? "%" : ""}
        </span>
        <OKRProgressBar value={progress} className="flex-1" />
        <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {kr.responsible && <span>Responsável: {kr.responsible}</span>}
        </div>
        <div className="flex items-center gap-2">
          {lastMeasurement && (
            <span>
              Última medição: {formatDistanceToNow(new Date(lastMeasurement.measured_at), { addSuffix: true, locale: ptBR })}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onHistory(kr)}>
            <BarChart3 className="h-3 w-3 mr-1" />
            Histórico
          </Button>
        </div>
      </div>
    </div>
  );
}

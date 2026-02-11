import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { calculateProgress, computeStatus, getQuarterProgress, STATUS_CONFIG } from "./okr-utils";

interface OKRTableProps {
  objectives: any[];
  keyResultsByObj: Record<string, any[]>;
  quarter: string;
  year: number;
}

export function OKRTable({ objectives, keyResultsByObj, quarter, year }: OKRTableProps) {
  const quarterElapsed = getQuarterProgress(quarter, year);

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Objetivo</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Key Result</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Baseline</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Meta</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Atual</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Progresso</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider">Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objectives.map((obj, objIdx) => {
            const krs = keyResultsByObj[obj.id] ?? [];
            return (
              <>
                <TableRow key={obj.id} className="bg-muted/30">
                  <TableCell colSpan={7} className="font-semibold text-sm text-foreground py-3">
                    OBJ {objIdx + 1}: {obj.title}
                  </TableCell>
                </TableRow>
                {krs.map((kr, krIdx) => {
                  const baseline = Number(kr.baseline_value ?? 0);
                  const target = Number(kr.target_value);
                  const current = Number(kr.current_value ?? 0);
                  const progress = calculateProgress(baseline, target, current);
                  const status = computeStatus(progress, quarterElapsed);
                  const statusConfig = STATUS_CONFIG[status];
                  const unit = kr.unit || "";
                  const changeFromBaseline = baseline > 0
                    ? ` (${target > baseline ? "+" : ""}${Math.round(((target - baseline) / baseline) * 100)}%)`
                    : "";

                  return (
                    <TableRow key={kr.id}>
                      <TableCell />
                      <TableCell className="text-sm">
                        KR{objIdx + 1}.{krIdx + 1}: {kr.title}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {baseline.toLocaleString("pt-BR")}{unit === "%" ? "%" : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {target.toLocaleString("pt-BR")}{unit === "%" ? "%" : ""}{changeFromBaseline}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {current.toLocaleString("pt-BR")}{unit === "%" ? "%" : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] ${statusConfig.className}`}>
                          {progress}% {statusConfig.emoji}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {kr.responsible || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {objIdx < objectives.length - 1 && (
                  <TableRow key={`sep-${obj.id}`}>
                    <TableCell colSpan={7} className="py-1 bg-background" />
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

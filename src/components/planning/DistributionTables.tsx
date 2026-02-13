import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFrameLabel, getObjectiveLabel, getMethodLabel } from "@/lib/formulaConstants";

interface Props {
  items: any[];
}

export default function DistributionTables({ items }: Props) {
  const distributions = useMemo(() => {
    const byFormat: Record<string, number> = {};
    const byFrame: Record<string, number> = {};
    const byObjective: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    let hasFormulaData = false;

    for (const item of items) {
      const format = item.format ?? "Outros";
      const formula = (item.metadata as any)?.formula;

      byFormat[format] = (byFormat[format] ?? 0) + 1;

      if (formula) {
        hasFormulaData = true;
        if (formula.frame) {
          const frameLabel = getFrameLabel(formula.frame);
          byFrame[frameLabel] = (byFrame[frameLabel] ?? 0) + 1;
        }
        if (formula.objective) {
          const objLabel = getObjectiveLabel(formula.objective);
          byObjective[objLabel] = (byObjective[objLabel] ?? 0) + 1;
        }
        if (formula.method) {
          const methodLabel = getMethodLabel(formula.method);
          byMethod[methodLabel] = (byMethod[methodLabel] ?? 0) + 1;
        }
      }
    }

    const total = items.length || 1;
    const toArr = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => ({ key, count, pct: Math.round((count / total) * 100) }));

    return {
      format: toArr(byFormat),
      frame: toArr(byFrame),
      objective: toArr(byObjective),
      method: toArr(byMethod),
      hasFormulaData,
      total,
    };
  }, [items]);

  const renderTable = (title: string, data: { key: string; count: number; pct: number }[]) => (
    <Card className="flex-1">
      <CardContent className="p-3">
        <h4 className="text-xs font-semibold text-foreground mb-2">{title}</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="p-1 text-left text-muted-foreground font-medium">{title.split(" ").pop()}</th>
              <th className="p-1 text-right text-muted-foreground font-medium">Qtd</th>
              <th className="p-1 text-right text-muted-foreground font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-b last:border-0">
                <td className="p-1"><Badge variant="secondary" className="text-[9px]">{d.key}</Badge></td>
                <td className="p-1 text-right font-mono">{d.count}</td>
                <td className="p-1 text-right font-mono text-muted-foreground">{d.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {renderTable("Distribuição por Formato", distributions.format)}
      </div>
      {distributions.hasFormulaData && (
        <div className="grid grid-cols-3 gap-3">
          {renderTable("Distribuição por Frame", distributions.frame)}
          {renderTable("Distribuição por Objetivo", distributions.objective)}
          {renderTable("Distribuição por Método", distributions.method)}
        </div>
      )}
    </div>
  );
}

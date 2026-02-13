import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFrameLabel, getObjectiveLabel, getMethodLabel } from "@/lib/formulaConstants";

interface Props {
  items: any[];
}

export default function DistributionTables({ items }: Props) {
  const distributions = useMemo(() => {
    const byPillar: Record<string, number> = {};
    const byFormat: Record<string, number> = {};
    const byResp: Record<string, number> = {};
    const byTerritory: Record<string, number> = {};
    const byLens: Record<string, number> = {};
    const byFrame: Record<string, number> = {};
    const byObjective: Record<string, number> = {};
    const byMethod: Record<string, number> = {};

    let hasThesesData = false;
    let hasFormulaData = false;

    for (const item of items) {
      const pillar = item.content_type ?? "Outros";
      const format = item.format ?? "Outros";
      const resp = (item.metadata as any)?.responsible_code ?? "—";
      const territory = (item.metadata as any)?.territory;
      const lens = (item.metadata as any)?.lens;
      const formula = (item.metadata as any)?.formula;

      byPillar[pillar] = (byPillar[pillar] ?? 0) + 1;
      byFormat[format] = (byFormat[format] ?? 0) + 1;
      byResp[resp] = (byResp[resp] ?? 0) + 1;

      if (territory) {
        byTerritory[territory] = (byTerritory[territory] ?? 0) + 1;
        hasThesesData = true;
      }
      if (lens) {
        byLens[lens] = (byLens[lens] ?? 0) + 1;
        hasThesesData = true;
      }
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
      pillar: toArr(byPillar),
      format: toArr(byFormat),
      responsible: toArr(byResp),
      territory: toArr(byTerritory),
      lens: toArr(byLens),
      frame: toArr(byFrame),
      objective: toArr(byObjective),
      method: toArr(byMethod),
      hasThesesData,
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
      <div className="grid grid-cols-3 gap-3">
        {renderTable("Distribuição por Pilar", distributions.pillar)}
        {renderTable("Distribuição por Formato", distributions.format)}
        {renderTable("Distribuição por Responsável", distributions.responsible)}
      </div>
      {distributions.hasThesesData && (
        <div className="grid grid-cols-2 gap-3">
          {renderTable("Distribuição por Território", distributions.territory)}
          {renderTable("Distribuição por Lente", distributions.lens)}
        </div>
      )}
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

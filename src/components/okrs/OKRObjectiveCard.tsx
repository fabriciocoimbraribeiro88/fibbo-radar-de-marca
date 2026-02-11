import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OKRProgressBar } from "./OKRProgressBar";
import { KeyResultRow } from "./KeyResultRow";
import { calculateProgress, computeStatus, getQuarterProgress, STATUS_CONFIG } from "./okr-utils";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";

interface OKRObjectiveCardProps {
  objective: any;
  keyResults: any[];
  index: number;
  quarter: string;
  year: number;
  onEdit: (obj: any) => void;
  onDelete: (obj: any) => void;
  onAddKR: (objId: string) => void;
  onHistoryKR: (kr: any) => void;
}

export function OKRObjectiveCard({
  objective: obj,
  keyResults: krs,
  index,
  quarter,
  year,
  onEdit,
  onDelete,
  onAddKR,
  onHistoryKR,
}: OKRObjectiveCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const quarterElapsed = getQuarterProgress(quarter, year);

  const objProgress = krs.length > 0
    ? Math.round(krs.reduce((sum, kr) => {
        return sum + calculateProgress(
          Number(kr.baseline_value ?? 0),
          Number(kr.target_value),
          Number(kr.current_value ?? 0)
        );
      }, 0) / krs.length)
    : 0;

  const status = computeStatus(objProgress, quarterElapsed);
  const statusConfig = STATUS_CONFIG[status];

  const onTrackCount = krs.filter(kr => {
    const p = calculateProgress(Number(kr.baseline_value ?? 0), Number(kr.target_value), Number(kr.current_value ?? 0));
    return computeStatus(p, quarterElapsed) === "on_track" || computeStatus(p, quarterElapsed) === "achieved";
  }).length;
  const atRiskCount = krs.length - onTrackCount;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-5 group">
              <div className="text-left flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">OBJ {index}</span>
                  <Badge className={`text-[10px] ${statusConfig.className}`}>
                    {statusConfig.emoji} {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-foreground">{obj.title}</p>
                {!isOpen && krs.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {krs.length} Key Results · {onTrackCount} on track{atRiskCount > 0 ? ` · ${atRiskCount} em risco` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-[160px]">
                  <OKRProgressBar value={objProgress} className="w-24" />
                  <span className="text-sm font-mono font-medium text-foreground w-10 text-right">{objProgress}%</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t border-border px-5 pb-5 pt-4 space-y-3">
              <div className="flex items-center justify-end gap-1 -mt-1 mb-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(obj); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(obj); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {krs.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  Nenhum key result definido.
                </p>
              )}

              {krs.map((kr, krIdx) => (
                <KeyResultRow
                  key={kr.id}
                  kr={kr}
                  index={krIdx + 1}
                  objIndex={index}
                  quarter={quarter}
                  year={year}
                  onHistory={onHistoryKR}
                />
              ))}

              <Button variant="outline" size="sm" className="w-full" onClick={() => onAddKR(obj.id)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar Key Result
              </Button>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

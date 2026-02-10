import { useState, useMemo } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ── Period types ── */
export type PeriodPreset = "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year" | "custom";

export interface PeriodRange {
  from: Date;
  to: Date;
  label: string;
  preset: PeriodPreset;
}

function getPresetRange(preset: PeriodPreset): { from: Date; to: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (preset) {
    case "this_month":
      return { from: new Date(y, m, 1), to: now, label: "Este mês" };
    case "last_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0), label: "Mês passado" };
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return { from: new Date(y, q * 3, 1), to: now, label: `Q${q + 1} ${y}` };
    }
    case "last_quarter": {
      const q = Math.floor(m / 3) - 1;
      const qy = q < 0 ? y - 1 : y;
      const qn = q < 0 ? 3 : q;
      return { from: new Date(qy, qn * 3, 1), to: new Date(qy, (qn + 1) * 3, 0), label: `Q${qn + 1} ${qy}` };
    }
    case "this_year":
      return { from: new Date(y, 0, 1), to: now, label: `${y}` };
    case "last_year":
      return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31), label: `${y - 1}` };
    default:
      return { from: new Date(y, 0, 1), to: now, label: "Personalizado" };
  }
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "this_quarter", label: "Este trimestre" },
  { value: "last_quarter", label: "Trimestre passado" },
  { value: "this_year", label: "Este ano" },
  { value: "last_year", label: "Ano passado" },
  { value: "custom", label: "Personalizado" },
];

/* ── Source selection types ── */
export type SourceMode = "brand_only" | "brand_vs_all" | "brand_vs_selected";

export interface EntityOption {
  id: string;
  name: string;
  handle: string | null;
  role: string;
}

interface Props {
  period: PeriodRange;
  onPeriodChange: (p: PeriodRange) => void;
  sourceMode: SourceMode;
  onSourceModeChange: (m: SourceMode) => void;
  selectedEntityIds: Set<string>;
  onToggleEntity: (id: string) => void;
  entities: EntityOption[];
  brandEntityId: string | null;
}

export default function DashboardFilters({
  period, onPeriodChange,
  sourceMode, onSourceModeChange,
  selectedEntityIds, onToggleEntity,
  entities, brandEntityId,
}: Props) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const nonBrandEntities = useMemo(
    () => entities.filter((e) => e.id !== brandEntityId),
    [entities, brandEntityId]
  );

  const handlePreset = (preset: PeriodPreset) => {
    if (preset === "custom") return;
    const r = getPresetRange(preset);
    onPeriodChange({ ...r, preset });
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onPeriodChange({
      from: new Date(customFrom),
      to: new Date(customTo),
      label: `${customFrom} → ${customTo}`,
      preset: "custom",
    });
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Period */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Período</span>
        {PRESETS.filter((p) => p.value !== "custom").map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              period.preset === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                period.preset === "custom"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              Personalizado
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <Button size="sm" className="w-full h-8 text-xs" onClick={applyCustom} disabled={!customFrom || !customTo}>
              Aplicar
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2: Sources */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Fontes</span>
        <button
          onClick={() => onSourceModeChange("brand_only")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
            sourceMode === "brand_only"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Apenas Marca
        </button>
        <button
          onClick={() => onSourceModeChange("brand_vs_all")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
            sourceMode === "brand_vs_all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Marca vs Todos
        </button>

        {/* Individual entity pills */}
        {nonBrandEntities.map((e) => {
          const selected = sourceMode === "brand_vs_selected" && selectedEntityIds.has(e.id);
          return (
            <button
              key={e.id}
              onClick={() => {
                onSourceModeChange("brand_vs_selected");
                onToggleEntity(e.id);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {e.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { getPresetRange };

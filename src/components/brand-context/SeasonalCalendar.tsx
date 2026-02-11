import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, X, Loader2, CheckCircle2, Sparkles, ChevronDown, ChevronRight, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface SeasonalDate {
  id: string;
  name: string;
  date_start: string;
  date_end?: string;
  recurrence: string;
  relevance: string;
  type: string;
  notes?: string;
}

interface Props {
  projectId: string;
  briefing: any;
  segment?: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  tradicional: { label: "Tradicional", emoji: "🎄", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  mercado: { label: "Mercado", emoji: "📈", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  setorial: { label: "Setorial", emoji: "🏢", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  eventos: { label: "Eventos", emoji: "🎤", className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  marca: { label: "Marca", emoji: "⭐", className: "bg-primary/10 text-primary" },
  ideias: { label: "Ideia", emoji: "💡", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-dashed" },
};

const RELEVANCE_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: "🔴 Alta", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "🟡 Média", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  low: { label: "🟢 Baixa", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function newDate(): SeasonalDate {
  return { id: crypto.randomUUID(), name: "", date_start: "", recurrence: "annual", relevance: "medium", type: "tradicional" };
}

function getMonth(dateStr: string): number {
  if (!dateStr) return -1;
  const parts = dateStr.split("-");
  return parseInt(parts[1], 10) - 1;
}

export default function SeasonalCalendar({ projectId, briefing, segment }: Props) {
  const queryClient = useQueryClient();
  const [dates, setDates] = useState<SeasonalDate[]>(briefing?.seasonal_calendar ?? []);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [openMonths, setOpenMonths] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDates(briefing?.seasonal_calendar ?? []);
  }, [briefing]);

  useEffect(() => {
    const monthsWithDates = new Set(dates.map(d => getMonth(d.date_start)).filter(m => m >= 0));
    setOpenMonths(monthsWithDates);
  }, []);

  const save = useCallback(async (d: SeasonalDate[]) => {
    setSaving(true);
    const merged = { ...(briefing ?? {}), seasonal_calendar: d };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const schedSave = useCallback((d: SeasonalDate[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(d), 2000);
  }, [save]);

  const updateDate = (id: string, field: keyof SeasonalDate, value: string) => {
    setDates((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, [field]: value } : d));
      schedSave(next);
      return next;
    });
  };

  const addDateToMonth = (monthIndex: number) => {
    const year = new Date().getFullYear();
    const monthStr = String(monthIndex + 1).padStart(2, "0");
    const d: SeasonalDate = {
      ...newDate(),
      date_start: `${year}-${monthStr}-01`,
    };
    setDates(prev => {
      const next = [...prev, d];
      schedSave(next);
      return next;
    });
    setOpenMonths(prev => new Set([...prev, monthIndex]));
  };

  const removeDate = (id: string) => {
    setDates(prev => {
      const next = prev.filter((d) => d.id !== id);
      schedSave(next);
      return next;
    });
  };

  const toggleMonth = (month: number) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-seasonal-calendar", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const existingNames = new Set(dates.map((d) => d.name.toLowerCase()));
      const incoming = (data.dates ?? []).map((d: any) => ({
        ...d,
        selected: !existingNames.has(d.name.toLowerCase()),
      }));
      setSuggestions(incoming);
      setDialogOpen(true);
    } catch (e) {
      toast.error("Erro ao gerar datas: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestions = () => {
    const existingNames = new Set(dates.map((d) => d.name.toLowerCase()));
    const toAdd = suggestions
      .filter((s) => s.selected && !existingNames.has(s.name.toLowerCase()))
      .map((s) => ({
        id: crypto.randomUUID(),
        name: s.name,
        date_start: s.date_start,
        date_end: s.date_end || undefined,
        recurrence: s.recurrence,
        relevance: s.relevance,
        type: s.type,
        notes: s.justification || undefined,
      }));
    const next = [...dates, ...toAdd].sort((a, b) => a.date_start.localeCompare(b.date_start));
    setDates(next);
    save(next);
    setDialogOpen(false);
    const newMonths = new Set(toAdd.map(d => getMonth(d.date_start)).filter(m => m >= 0));
    setOpenMonths(prev => new Set([...prev, ...newMonths]));
    toast.success(`${toAdd.length} datas adicionadas!`);
  };

  // Group dates by month (no type filter)
  const datesByMonth: Record<number, SeasonalDate[]> = {};
  for (const d of dates) {
    const m = getMonth(d.date_start);
    if (m < 0) continue;
    if (!datesByMonth[m]) datesByMonth[m] = [];
    datesByMonth[m].push(d);
  }
  for (const m of Object.keys(datesByMonth)) {
    datesByMonth[Number(m)].sort((a, b) => a.date_start.localeCompare(b.date_start));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">15. Calendário Sazonal</CardTitle>
              <CardDescription>Datas e períodos importantes para a marca, organizados por mês.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {!saving && dates.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              <Button size="sm" onClick={handleGenerateAI} disabled={generating}>
                {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Sugerir com IA
              </Button>
            </div>
          </div>
          {dates.length > 0 && (
            <span className="text-[10px] text-muted-foreground mt-1">{dates.length} datas no calendário</span>
          )}
        </CardHeader>

        <CardContent className="space-y-1">
          {MONTHS.map((monthName, monthIndex) => {
            const monthDates = datesByMonth[monthIndex] ?? [];
            const isOpen = openMonths.has(monthIndex);
            const hasContent = monthDates.length > 0;

            return (
              <Collapsible key={monthIndex} open={isOpen} onOpenChange={() => toggleMonth(monthIndex)}>
                <div className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${hasContent ? "bg-accent/50" : "hover:bg-accent/30"}`}>
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className="text-sm font-medium">{monthName}</span>
                    {hasContent && <span className="text-[10px] text-muted-foreground">{monthDates.length}</span>}
                  </CollapsibleTrigger>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); addDateToMonth(monthIndex); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <CollapsibleContent className="pl-6 pr-1 space-y-0.5 pb-2">
                  {monthDates.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 py-1 group">
                      {!d.name ? (
                        <>
                          <Input
                            type="date"
                            value={d.date_start}
                            onChange={(e) => updateDate(d.id, "date_start", e.target.value)}
                            className="h-6 text-xs w-32 shrink-0"
                          />
                          <Input
                            autoFocus
                            placeholder="Nome do evento..."
                            className="h-6 text-sm flex-1"
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                removeDate(d.id);
                              } else {
                                updateDate(d.id, "name", e.target.value.trim());
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              else if (e.key === "Escape") removeDate(d.id);
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-sm flex-1 truncate">{d.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{d.date_start?.slice(8)}/{d.date_start?.slice(5, 7)}</span>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeDate(d.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {dates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma data adicionada. Use "Sugerir com IA" para gerar datas específicas do seu setor.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datas Sugeridas pela IA</DialogTitle>
            <DialogDescription>
              Datas específicas para o seu setor e posicionamento. Revise e selecione as relevantes.
            </DialogDescription>
          </DialogHeader>

          {Object.entries(TYPE_CONFIG).map(([typeKey, typeCfg]) => {
            const typeSuggestions = suggestions.filter(s => s.type === typeKey);
            if (typeSuggestions.length === 0) return null;
            return (
              <div key={typeKey} className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 pt-2">
                  <span>{typeCfg.emoji}</span> {typeCfg.label}
                  <span className="text-[10px] rounded px-1.5 py-0.5 border">{typeSuggestions.length}</span>
                </h4>
                {typeSuggestions.map((s) => {
                  const globalIdx = suggestions.indexOf(s);
                  return (
                    <label key={globalIdx} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors ${s.type === "ideias" ? "border-dashed" : ""}`}>
                      <Checkbox
                        checked={s.selected}
                        onCheckedChange={(checked) => {
                          setSuggestions(prev => prev.map((x, j) => j === globalIdx ? { ...x, selected: !!checked } : x));
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground">{s.date_start}</span>
                          {s.date_end && <span className="text-xs text-muted-foreground">→ {s.date_end}</span>}
                          <span className={`text-[10px] rounded px-1.5 py-0.5 border ${RELEVANCE_BADGE[s.relevance]?.className ?? ""}`}>
                            {RELEVANCE_BADGE[s.relevance]?.label}
                          </span>
                        </div>
                        {s.justification && (
                          <p className="text-xs text-primary/80 mt-1 italic flex items-start gap-1">
                            <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" /> {s.justification}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            );
          })}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={applySuggestions}>
              Adicionar Selecionadas ({suggestions.filter((s) => s.selected).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus, X, Loader2, CheckCircle2, Sparkles, ChevronDown, ChevronRight, CalendarRange, LayoutGrid, List,
} from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_EXAMPLES: Record<number, { theme: string; focus: string; date: string }> = {
  0: { theme: "Ex: Ano novo, obra nova!", focus: "Ex: Planejamento e metas do ano", date: "01/01 - Ano Novo" },
  1: { theme: "Ex: Carnaval e volta às aulas", focus: "Ex: Engajamento e brand awareness", date: "14/02 - Valentine's Day" },
  2: { theme: "Ex: Dia da Mulher", focus: "Ex: Campanhas institucionais", date: "08/03 - Dia da Mulher" },
  3: { theme: "Ex: Páscoa e outono", focus: "Ex: Lançamento de produtos sazonais", date: "21/04 - Tiradentes" },
  4: { theme: "Ex: Dia das Mães", focus: "Ex: Campanha emocional e vendas", date: "11/05 - Dia das Mães" },
  5: { theme: "Ex: Dia dos Namorados", focus: "Ex: Promoções e kits especiais", date: "12/06 - Dia dos Namorados" },
  6: { theme: "Ex: Férias de inverno", focus: "Ex: Conteúdo educativo e autoridade", date: "20/07 - Dia do Amigo" },
  7: { theme: "Ex: Dia dos Pais", focus: "Ex: Campanha emocional e vendas", date: "10/08 - Dia dos Pais" },
  8: { theme: "Ex: Primavera e independência", focus: "Ex: Renovação e lançamentos", date: "07/09 - Independência" },
  9: { theme: "Ex: Dia das Crianças", focus: "Ex: Campanhas familiares", date: "12/10 - Dia das Crianças" },
  10: { theme: "Ex: Black Friday", focus: "Ex: Máxima conversão e vendas", date: "28/11 - Black Friday" },
  11: { theme: "Ex: Natal e retrospectiva", focus: "Ex: Fechamento e fidelização", date: "25/12 - Natal" },
};

const QUARTERS = [
  { label: "Q1", months: [0, 1, 2] },
  { label: "Q2", months: [3, 4, 5] },
  { label: "Q3", months: [6, 7, 8] },
  { label: "Q4", months: [9, 10, 11] },
];

const ACTION_TYPES = [
  { value: "conteudo digital", label: "Conteúdo Digital", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "acao em loja", label: "Ação em Loja", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "PDV", label: "PDV", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "relacionamento", label: "Relacionamento", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  { value: "endomarketing", label: "Endomarketing", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "acao social", label: "Ação Social", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "evento", label: "Evento", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "guerrilha", label: "Guerrilha", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
];

interface CalendarDate {
  id: string;
  name: string;
  date: string;
  action_types: string[];
  objective?: string;
  extra_budget?: boolean;
}

interface MonthPlan {
  month: number;
  theme: string;
  focus: string;
  notes: string;
  dates: CalendarDate[];
}

interface AnnualCalendar {
  year: number;
  months: MonthPlan[];
}

function emptyMonth(month: number): MonthPlan {
  return { month, theme: "", focus: "", notes: "", dates: [] };
}

function emptyCalendar(year: number): AnnualCalendar {
  return { year, months: Array.from({ length: 12 }, (_, i) => emptyMonth(i)) };
}

export default function ProjectAnnualCalendar() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [quarterFilter, setQuarterFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"full" | "list">("full");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const currentYear = new Date().getFullYear();
  const briefing = project?.briefing as any;
  const stored = briefing?.annual_calendar as AnnualCalendar | undefined;

  const [calendar, setCalendar] = useState<AnnualCalendar>(stored ?? emptyCalendar(currentYear));
  const [openMonths, setOpenMonths] = useState<Set<number>>(new Set([new Date().getMonth()]));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stored) setCalendar(stored);
  }, [stored]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const save = useCallback(async (cal: AnnualCalendar) => {
    if (!projectId) return;
    setSaving(true);
    const merged = { ...(briefing ?? {}), annual_calendar: cal };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const schedSave = useCallback((cal: AnnualCalendar) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(cal), 2000);
  }, [save]);

  const updateMonth = (monthIdx: number, field: keyof MonthPlan, value: any) => {
    setCalendar((prev) => {
      const next = { ...prev, months: prev.months.map((m) => m.month === monthIdx ? { ...m, [field]: value } : m) };
      schedSave(next);
      return next;
    });
  };

  const addDate = (monthIdx: number) => {
    const newD: CalendarDate = { id: crypto.randomUUID(), name: "", date: "", action_types: [], objective: "", extra_budget: false };
    setCalendar((prev) => {
      const next = {
        ...prev,
        months: prev.months.map((m) =>
          m.month === monthIdx ? { ...m, dates: [...m.dates, newD] } : m
        ),
      };
      schedSave(next);
      return next;
    });
    setOpenMonths((prev) => new Set([...prev, monthIdx]));
  };

  const updateDateField = (monthIdx: number, dateId: string, field: keyof CalendarDate, value: any) => {
    setCalendar((prev) => {
      const next = {
        ...prev,
        months: prev.months.map((m) =>
          m.month === monthIdx
            ? { ...m, dates: m.dates.map((d) => d.id === dateId ? { ...d, [field]: value } : d) }
            : m
        ),
      };
      schedSave(next);
      return next;
    });
  };

  const removeDate = (monthIdx: number, dateId: string) => {
    setCalendar((prev) => {
      const next = {
        ...prev,
        months: prev.months.map((m) =>
          m.month === monthIdx ? { ...m, dates: m.dates.filter((d) => d.id !== dateId) } : m
        ),
      };
      schedSave(next);
      return next;
    });
  };

  const toggleActionType = (monthIdx: number, dateId: string, actionType: string) => {
    setCalendar((prev) => {
      const next = {
        ...prev,
        months: prev.months.map((m) =>
          m.month === monthIdx
            ? {
                ...m,
                dates: m.dates.map((d) => {
                  if (d.id !== dateId) return d;
                  const types = d.action_types.includes(actionType)
                    ? d.action_types.filter((t) => t !== actionType)
                    : [...d.action_types, actionType];
                  return { ...d, action_types: types };
                }),
              }
            : m
        ),
      };
      schedSave(next);
      return next;
    });
  };

  const toggleMonth = (month: number) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  };

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-seasonal-calendar", {
        body: { project_id: projectId, mode: "full_calendar" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated = data.annual_calendar as AnnualCalendar;
      setCalendar(generated);
      await save(generated);
      setOpenMonths(new Set(Array.from({ length: 12 }, (_, i) => i)));
      toast.success("Calendário gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar: " + (e instanceof Error ? e.message : "Erro desconhecido"));
    } finally {
      setGenerating(false);
    }
  };

  const handleYearChange = (year: string) => {
    const y = parseInt(year, 10);
    if (!isNaN(y)) {
      setCalendar((prev) => {
        const next = { ...prev, year: y };
        schedSave(next);
        return next;
      });
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;

  const filledMonths = calendar.months.filter((m) => m.theme || m.dates.length > 0).length;
  const totalDates = calendar.months.reduce((sum, m) => sum + m.dates.length, 0);

  // Filter months by quarter
  const visibleMonths = quarterFilter === "all"
    ? calendar.months
    : calendar.months.filter((m) => {
        const q = QUARTERS.find((q) => q.label === quarterFilter);
        return q?.months.includes(m.month);
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CalendarRange className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Calendário</h1>
            <p className="text-sm text-muted-foreground">
              Planejamento estratégico com temas, focos e datas de ação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!saving && filledMonths > 0 && <CheckCircle2 className="h-4 w-4 text-primary" />}

          <Select value={String(calendar.year)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleGenerateAI} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Gerar com IA
          </Button>
        </div>
      </div>

      {/* Progress + Quarter Filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          {filledMonths}/12 meses preenchidos • {totalDates} datas cadastradas
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant={quarterFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setQuarterFilter("all")}
            >
              Ano todo
            </Button>
            {QUARTERS.map((q) => (
              <Button
                key={q.label}
                variant={quarterFilter === q.label ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setQuarterFilter(q.label)}
              >
                {q.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("full")}
              className={`p-1.5 transition-colors ${viewMode === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              title="Visão completa"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
              title="Visão lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Cards */}
      {viewMode === "full" ? (
        <div className="space-y-2">
          {visibleMonths.map((month) => {
            const isOpen = openMonths.has(month.month);
            const hasContent = !!(month.theme || month.dates.length);
            const examples = MONTH_EXAMPLES[month.month];

            return (
              <Collapsible key={month.month} open={isOpen} onOpenChange={() => toggleMonth(month.month)}>
                <Card className={hasContent ? "border-primary/20" : ""}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-sm">{MONTHS[month.month]}</span>
                        {month.theme && (
                          <span className="text-xs text-primary italic truncate max-w-[300px]">— {month.theme}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {month.dates.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{month.dates.length} datas</Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tema do Mês</label>
                          <Input
                            value={month.theme}
                            onChange={(e) => updateMonth(month.month, "theme", e.target.value)}
                            placeholder={examples.theme}
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Foco Estratégico</label>
                          <Input
                            value={month.focus}
                            onChange={(e) => updateMonth(month.month, "focus", e.target.value)}
                            placeholder={examples.focus}
                            className="h-8 text-sm mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</label>
                        <Textarea
                          value={month.notes}
                          onChange={(e) => updateMonth(month.month, "notes", e.target.value)}
                          placeholder="Observações, lembretes, ideias extras..."
                          className="text-sm mt-1 min-h-[60px]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Datas Relevantes</label>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addDate(month.month)}>
                            <Plus className="h-3 w-3 mr-1" /> Adicionar
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {month.dates.map((d) => (
                            <div key={d.id} className="border rounded-lg p-3 space-y-2 group relative">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={d.date}
                                  onChange={(e) => updateDateField(month.month, d.id, "date", e.target.value)}
                                  placeholder="dd/mm"
                                  className="h-7 text-xs w-20 shrink-0"
                                />
                                <Input
                                  value={d.name}
                                  onChange={(e) => updateDateField(month.month, d.id, "name", e.target.value)}
                                  placeholder={examples.date.split(" - ")[1] || "Nome do evento..."}
                                  className="h-7 text-sm flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                                  onClick={() => removeDate(month.month, d.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              <div>
                                <Input
                                  value={d.objective ?? ""}
                                  onChange={(e) => updateDateField(month.month, d.id, "objective", e.target.value)}
                                  placeholder="Objetivo da campanha..."
                                  className="h-7 text-xs"
                                />
                              </div>

                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex flex-wrap gap-1">
                                  {ACTION_TYPES.map((at) => {
                                    const active = d.action_types.includes(at.value);
                                    return (
                                      <button
                                        key={at.value}
                                        onClick={() => toggleActionType(month.month, d.id, at.value)}
                                        className={`text-[10px] rounded-full px-2 py-0.5 border transition-all ${
                                          active ? at.color + " border-transparent font-medium" : "bg-transparent text-muted-foreground border-border hover:bg-accent"
                                        }`}
                                      >
                                        {at.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                                  <Switch
                                    checked={d.extra_budget ?? false}
                                    onCheckedChange={(checked) => updateDateField(month.month, d.id, "extra_budget", checked)}
                                    className="scale-75"
                                  />
                                  Verba extra
                                </label>
                              </div>
                            </div>
                          ))}

                          {month.dates.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">
                              Nenhuma data neste mês. Clique em "Adicionar" ou use "Gerar com IA".
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        /* List view - compact */
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24">Mês</th>
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tema</th>
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Foco</th>
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center w-16">Datas</th>
                </tr>
              </thead>
              <tbody>
                {visibleMonths.map((month) => (
                  <tr
                    key={month.month}
                    className="border-b last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setViewMode("full");
                      setOpenMonths(new Set([month.month]));
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium">{MONTHS[month.month]}</td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">
                      {month.theme || <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">
                      {month.focus || <span className="italic text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {month.dates.length > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">{month.dates.length}</Badge>
                      ) : (
                        <span className="text-muted-foreground/50">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

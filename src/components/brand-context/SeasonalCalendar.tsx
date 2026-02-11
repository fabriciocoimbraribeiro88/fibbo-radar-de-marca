import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2, CheckCircle2, Sparkles } from "lucide-react";
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

const RELEVANCE_BADGE: Record<string, { label: string; className: string }> = {
  high: { label: "🔴 Alta", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "🟡 Média", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  low: { label: "🟢 Baixa", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

function newDate(): SeasonalDate {
  return { id: crypto.randomUUID(), name: "", date_start: "", recurrence: "annual", relevance: "medium", type: "commercial" };
}

export default function SeasonalCalendar({ projectId, briefing, segment }: Props) {
  const queryClient = useQueryClient();
  const [dates, setDates] = useState<SeasonalDate[]>(briefing?.seasonal_calendar ?? []);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDates(briefing?.seasonal_calendar ?? []);
  }, [briefing]);

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

  const addDate = () => {
    const d = newDate();
    const next = [...dates, d];
    setDates(next);
    schedSave(next);
  };

  const removeDate = (id: string) => {
    const next = dates.filter((d) => d.id !== id);
    setDates(next);
    schedSave(next);
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
    toast.success(`${toAdd.length} datas adicionadas!`);
  };

  const sorted = [...dates].sort((a, b) => a.date_start.localeCompare(b.date_start));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">15. Calendário Sazonal</CardTitle>
              <CardDescription>Datas e períodos importantes para a marca.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {!saving && dates.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              <Button variant="outline" size="sm" onClick={addDate}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Data
              </Button>
              <Button size="sm" onClick={handleGenerateAI} disabled={generating}>
                {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Sugerir com IA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border p-3 flex-wrap">
              <Input value={d.name} onChange={(e) => updateDate(d.id, "name", e.target.value)} placeholder="Nome" className="h-8 text-sm w-40 flex-shrink-0" />
              <Input type="date" value={d.date_start} onChange={(e) => updateDate(d.id, "date_start", e.target.value)} className="h-8 text-sm w-36 flex-shrink-0" />
              <Input type="date" value={d.date_end ?? ""} onChange={(e) => updateDate(d.id, "date_end", e.target.value)} placeholder="Fim" className="h-8 text-sm w-36 flex-shrink-0" />
              <Select value={d.recurrence} onValueChange={(v) => updateDate(d.id, "recurrence", v)}>
                <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="one_time">Pontual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={d.relevance} onValueChange={(v) => updateDate(d.id, "relevance", v)}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="high">🔴 Alta</SelectItem>
                  <SelectItem value="medium">🟡 Média</SelectItem>
                  <SelectItem value="low">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={d.type} onValueChange={(v) => updateDate(d.id, "type", v)}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="commercial">Comercial</SelectItem>
                  <SelectItem value="institutional">Institucional</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                </SelectContent>
              </Select>
              <Input value={d.notes ?? ""} onChange={(e) => updateDate(d.id, "notes", e.target.value)} placeholder="Notas..." className="h-8 text-sm flex-1 min-w-[100px]" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeDate(d.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {dates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma data adicionada. Use "Sugerir com IA" para começar.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datas Sugeridas pela IA</DialogTitle>
            <DialogDescription>
              Datas específicas para o setor e posicionamento da marca.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <label key={i} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <Checkbox
                  checked={s.selected}
                  onCheckedChange={(checked) => {
                    setSuggestions((prev) => prev.map((x, j) => j === i ? { ...x, selected: !!checked } : x));
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.date_start}</span>
                    {s.date_end && <span className="text-xs text-muted-foreground">→ {s.date_end}</span>}
                    <Badge variant="outline" className={`text-[10px] ${RELEVANCE_BADGE[s.relevance]?.className}`}>
                      {RELEVANCE_BADGE[s.relevance]?.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                  </div>
                  {s.justification && (
                    <p className="text-xs text-primary/80 mt-1 italic">💡 {s.justification}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
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

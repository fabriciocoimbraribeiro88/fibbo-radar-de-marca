import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Pillar {
  id: string;
  name: string;
  description: string;
  percentage: number;
  preferred_formats: string[];
  objective: string;
  color: string;
}

interface Props {
  projectId: string;
  briefing: any;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
const FORMATS = ["Reels", "Carrossel", "Estático", "Stories", "Vídeo"];
const OBJECTIVES = ["Awareness", "Engajamento", "Conversão", "Autoridade", "Comunidade"];

function newPillar(): Pillar {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    percentage: 0,
    preferred_formats: [],
    objective: "",
    color: COLORS[0],
  };
}

export default function ContentPillars({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [pillars, setPillars] = useState<Pillar[]>(briefing?.content_pillars ?? []);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Pillar[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [replaceMode, setReplaceMode] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPillars(briefing?.content_pillars ?? []);
  }, [briefing]);

  const save = useCallback(async (data: Pillar[]) => {
    setSaving(true);
    const merged = { ...(briefing ?? {}), content_pillars: data };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    setSaving(false);
  }, [projectId, briefing, queryClient]);

  const schedSave = useCallback((data: Pillar[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(data), 2000);
  }, [save]);

  const updatePillar = (id: string, field: keyof Pillar, value: any) => {
    setPillars((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, [field]: value } : p));
      schedSave(next);
      return next;
    });
  };

  const toggleFormat = (id: string, fmt: string) => {
    setPillars((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const fmts = p.preferred_formats.includes(fmt)
          ? p.preferred_formats.filter((f) => f !== fmt)
          : [...p.preferred_formats, fmt];
        return { ...p, preferred_formats: fmts };
      });
      schedSave(next);
      return next;
    });
  };

  const addPillar = () => {
    if (pillars.length >= 6) return;
    const usedColors = pillars.map((p) => p.color);
    const nextColor = COLORS.find((c) => !usedColors.includes(c)) ?? COLORS[0];
    const p = { ...newPillar(), color: nextColor };
    const next = [...pillars, p];
    setPillars(next);
    schedSave(next);
  };

  const removePillar = (id: string) => {
    const next = pillars.filter((p) => p.id !== id);
    setPillars(next);
    schedSave(next);
  };

  const totalPct = pillars.reduce((s, p) => s + (p.percentage || 0), 0);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content-pillars", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const incoming: Pillar[] = (data.pillars ?? []).map((p: any, i: number) => ({
        id: crypto.randomUUID(),
        name: p.name,
        description: p.description ?? "",
        percentage: p.percentage ?? 0,
        preferred_formats: p.preferred_formats ?? [],
        objective: p.objective ?? "",
        color: COLORS[i % COLORS.length],
      }));
      setSuggestions(incoming);
      setSelectedSuggestions(new Set(incoming.map((p) => p.id)));
      setDialogOpen(true);
    } catch (e) {
      toast.error("Erro ao gerar pilares: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestions = () => {
    const selected = suggestions.filter((s) => selectedSuggestions.has(s.id));
    const next = replaceMode ? selected : [...pillars, ...selected].slice(0, 6);
    setPillars(next);
    save(next);
    setDialogOpen(false);
    toast.success("Pilares aplicados!");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">13. Pilares de Conteúdo</CardTitle>
              <CardDescription>Defina os 3 a 6 temas centrais da comunicação da marca.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {!saving && pillars.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              <Button variant="outline" size="sm" onClick={addPillar} disabled={pillars.length >= 6}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Pilar
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Gerar com IA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Distribution bar */}
          {pillars.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {pillars.map((p) => (
                  <div
                    key={p.id}
                    style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                    className="h-full transition-all"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {totalPct !== 100 && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <AlertTriangle className="h-3 w-3" /> A soma deve ser 100%
                  </span>
                )}
                <span className="text-muted-foreground ml-auto">Total: {totalPct}%</span>
              </div>
            </div>
          )}

          {pillars.map((p) => (
            <div key={p.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input value={p.name} onChange={(e) => updatePillar(p.id, "name", e.target.value)} placeholder="Ex: Educação" />
                  </div>
                  <div className="space-y-1 flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">% do calendário</Label>
                      <div className="relative">
                        <Input
                          type="number" min={0} max={100}
                          value={p.percentage}
                          onChange={(e) => updatePillar(p.id, "percentage", Number(e.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => removePillar(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea value={p.description} onChange={(e) => updatePillar(p.id, "description", e.target.value)} rows={2} />
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Formatos</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS.map((f) => (
                      <button
                        key={f}
                        onClick={() => toggleFormat(p.id, f)}
                        className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                          p.preferred_formats.includes(f)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Objetivo</Label>
                  <Select value={p.objective} onValueChange={(v) => updatePillar(p.id, "objective", v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <div className="flex gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updatePillar(p.id, "color", c)}
                        className={`h-6 w-6 rounded-full border-2 transition-all ${p.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {pillars.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum pilar definido. Adicione manualmente ou gere com IA.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilares Sugeridos pela IA</DialogTitle>
            <DialogDescription>Selecione os pilares que deseja aplicar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <label key={s.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <Checkbox
                  checked={selectedSuggestions.has(s.id)}
                  onCheckedChange={(checked) => {
                    setSelectedSuggestions((prev) => {
                      const next = new Set(prev);
                      checked ? next.add(s.id) : next.delete(s.id);
                      return next;
                    });
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.name} ({s.percentage}%)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  {s.preferred_formats.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {s.preferred_formats.map((f) => (
                        <span key={f} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={replaceMode} onCheckedChange={(v) => setReplaceMode(!!v)} />
              Substituir pilares atuais
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={applySuggestions} disabled={selectedSuggestions.size === 0}>
              Aplicar Selecionados ({selectedSuggestions.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

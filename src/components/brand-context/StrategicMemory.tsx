import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Brain, Trash2, Star, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  briefing: any;
}

interface MemoryEntry {
  id: string;
  project_id: string;
  month: number;
  year: number;
  is_active: boolean;
  summary: string | null;
  pillar_performance: any;
  learnings: any;
  metrics: any;
  tags: string[] | null;
  confidence_level: number | null;
  created_at: string | null;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const YEARS = [2024, 2025, 2026];
const TAG_OPTIONS = ["orgânico", "ads", "influencer", "SEO", "lançamento", "crise", "sazonal"];

const PERF_OPTIONS = [
  { value: "strong", emoji: "🟢", label: "Forte", cls: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "medium", emoji: "🟡", label: "Médio", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "weak", emoji: "🔴", label: "Fraco", cls: "bg-destructive/10 text-destructive border-destructive/20" },
];

function emptyEntry(projectId: string): Partial<MemoryEntry> {
  const now = new Date();
  return {
    project_id: projectId,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    is_active: true,
    summary: "",
    pillar_performance: [],
    learnings: { key: "", changes: "", hypotheses: "" },
    metrics: {},
    tags: [],
    confidence_level: 3,
  };
}

export default function StrategicMemory({ projectId, briefing }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MemoryEntry> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pillars: Array<{ id: string; name: string; color: string }> = briefing?.content_pillars ?? [];
  const memoryEnabled = briefing?.memory_enabled ?? false;

  const { data: entries = [] } = useQuery({
    queryKey: ["brand_memory", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_memory_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data as MemoryEntry[];
    },
  });

  const toggleGlobal = async (val: boolean) => {
    const merged = { ...(briefing ?? {}), memory_enabled: val };
    await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  const activeEntries = entries.filter((e) => e.is_active);
  const lastEntry = entries[0];
  const daysSinceLast = lastEntry ? Math.floor((Date.now() - new Date(lastEntry.created_at!).getTime()) / 86400000) : null;

  const openNew = () => {
    const e = emptyEntry(projectId);
    // Init pillar_performance from pillars
    e.pillar_performance = pillars.map((p) => ({
      pillar_id: p.id, pillar_name: p.name, performance: "", what_worked: "", what_didnt_work: "",
    }));
    setEditing(e);
    setDialogOpen(true);
  };

  const openEdit = (entry: MemoryEntry) => {
    // Ensure pillar_performance has all current pillars
    const perf = Array.isArray(entry.pillar_performance) ? entry.pillar_performance : [];
    const merged = pillars.map((p) => {
      const existing = perf.find((pp: any) => pp.pillar_id === p.id);
      return existing ?? { pillar_id: p.id, pillar_name: p.name, performance: "", what_worked: "", what_didnt_work: "" };
    });
    setEditing({ ...entry, pillar_performance: merged, learnings: entry.learnings ?? { key: "", changes: "", hypotheses: "" }, metrics: entry.metrics ?? {} });
    setDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      project_id: projectId,
      month: editing.month!,
      year: editing.year!,
      is_active: editing.is_active ?? true,
      summary: editing.summary || null,
      pillar_performance: editing.pillar_performance,
      learnings: editing.learnings,
      metrics: editing.metrics,
      tags: editing.tags?.length ? editing.tags : null,
      confidence_level: editing.confidence_level ?? 3,
    };

    if (editing.id) {
      const { error } = await supabase.from("brand_memory_entries").update(payload as any).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("brand_memory_entries").insert(payload as any);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("Já existe uma entrada para esse mês/ano.");
        } else { toast.error(error.message); }
        setSaving(false); return;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["brand_memory", projectId] });
    setDialogOpen(false);
    setSaving(false);
    toast.success("Entrada salva!");
  };

  const deleteEntry = async () => {
    if (!deleteId) return;
    await supabase.from("brand_memory_entries").delete().eq("id", deleteId);
    queryClient.invalidateQueries({ queryKey: ["brand_memory", projectId] });
    setDeleteId(null);
    toast.success("Entrada removida.");
  };

  const updatePillarPerf = (pillarId: string, field: string, value: string) => {
    if (!editing) return;
    const perf = (editing.pillar_performance ?? []).map((p: any) =>
      p.pillar_id === pillarId ? { ...p, [field]: value } : p
    );
    setEditing({ ...editing, pillar_performance: perf });
  };

  const toggleTag = (tag: string) => {
    if (!editing) return;
    const tags = editing.tags ?? [];
    setEditing({ ...editing, tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Global toggle card */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">Memória Estratégica</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quando ativa, os aprendizados dos últimos 3 meses são incluídos no contexto dos agentes de análise.
                  </p>
                </div>
              </div>
              <Switch checked={memoryEnabled} onCheckedChange={toggleGlobal} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Status: {memoryEnabled ? "🟢 Ativa" : "⚫ Desativada"} — {activeEntries.length} entrada{activeEntries.length !== 1 ? "s" : ""} ativa{activeEntries.length !== 1 ? "s" : ""}
              </span>
              {daysSinceLast != null && daysSinceLast > 30 && (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Última atualização: há {daysSinceLast} dias
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stale warning */}
        {daysSinceLast != null && daysSinceLast > 30 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                A memória não é atualizada há {daysSinceLast} dias. Adicione uma nova entrada para manter as análises precisas.
              </div>
              <Button size="sm" variant="outline" onClick={openNew}><Plus className="mr-1 h-3.5 w-3.5" /> Nova Entrada</Button>
            </CardContent>
          </Card>
        )}

        {/* New entry button */}
        <div className="flex justify-end">
          <Button size="sm" onClick={openNew}><Plus className="mr-1 h-3.5 w-3.5" /> Nova Entrada</Button>
        </div>

        {/* Timeline */}
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry) => {
              const perf = Array.isArray(entry.pillar_performance) ? entry.pillar_performance : [];
              return (
                <Card key={entry.id} className="group cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(entry)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            📅 {MONTHS[entry.month - 1]} {entry.year}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${entry.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                            {entry.is_active ? "🟢 Ativo" : "⚫ Inativo"}
                          </Badge>
                        </div>
                        {entry.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{entry.summary}</p>
                        )}
                        {perf.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {perf.map((p: any) => {
                              const opt = PERF_OPTIONS.find((o) => o.value === p.performance);
                              return (
                                <span key={p.pillar_id} className="text-[10px]">
                                  {opt?.emoji ?? "⚪"} {p.pillar_name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3 w-3 ${s <= (entry.confidence_level ?? 0) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                          {entry.tags?.length ? (
                            <span className="text-[10px] text-muted-foreground">{entry.tags.join(", ")}</span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(entry.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Brain className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma entrada de memória</p>
              <p className="text-xs text-muted-foreground mt-1">
                Registre mensalmente o que funcionou e o que não funcionou. A IA usa esses aprendizados para gerar recomendações cada vez mais precisas.
              </p>
              <Button size="sm" className="mt-4" onClick={openNew}><Plus className="mr-1 h-3.5 w-3.5" /> Criar Primeira Entrada</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Entrada" : "Nova Entrada"}</DialogTitle>
            <DialogDescription>Registre os aprendizados do mês.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-6">
              {/* Month/Year + Active */}
              <div className="flex items-center gap-3">
                <Select value={String(editing.month)} onValueChange={(v) => setEditing({ ...editing, month: Number(v) })}>
                  <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card">
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(editing.year)} onValueChange={(v) => setEditing({ ...editing, year: Number(v) })}>
                  <SelectTrigger className="h-8 text-sm w-24"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card">
                    {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-xs text-muted-foreground">Incluir nas análises</Label>
                  <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-medium">Resumo do mês</Label>
                <Textarea
                  value={editing.summary ?? ""}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                  rows={2} placeholder="Mês forte em Reels. Carrosséis educativos bateram recorde."
                />
              </div>

              {/* Pillar Performance */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground font-medium">Performance por Pilar</Label>
                {pillars.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    Defina pilares de conteúdo na aba Identidade para avaliar performance por pilar.
                  </p>
                ) : (
                  (editing.pillar_performance ?? []).map((pp: any) => {
                    const pillar = pillars.find((p) => p.id === pp.pillar_id);
                    return (
                      <Card key={pp.pillar_id}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pillar?.color ?? "#6366f1" }} />
                            <span className="text-sm font-medium">{pp.pillar_name}</span>
                          </div>
                          <div className="flex gap-2">
                            {PERF_OPTIONS.map((o) => (
                              <button
                                key={o.value}
                                onClick={() => updatePillarPerf(pp.pillar_id, "performance", o.value)}
                                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                                  pp.performance === o.value ? o.cls + " border-current" : "border-border hover:bg-accent/50"
                                }`}
                              >
                                {o.emoji} {o.label}
                              </button>
                            ))}
                          </div>
                          <Textarea
                            value={pp.what_worked ?? ""}
                            onChange={(e) => updatePillarPerf(pp.pillar_id, "what_worked", e.target.value)}
                            rows={2} placeholder="O que funcionou"
                            className="text-xs"
                          />
                          <Textarea
                            value={pp.what_didnt_work ?? ""}
                            onChange={(e) => updatePillarPerf(pp.pillar_id, "what_didnt_work", e.target.value)}
                            rows={2} placeholder="O que não funcionou"
                            className="text-xs"
                          />
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Learnings */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground font-medium">Aprendizados & Decisões</Label>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Aprendizados-chave</Label>
                  <Textarea
                    value={editing.learnings?.key ?? ""}
                    onChange={(e) => setEditing({ ...editing, learnings: { ...editing.learnings, key: e.target.value } })}
                    rows={3} placeholder="Carrosséis educativos têm 3x mais saves que posts estáticos"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Mudanças estratégicas decididas</Label>
                  <Textarea
                    value={editing.learnings?.changes ?? ""}
                    onChange={(e) => setEditing({ ...editing, learnings: { ...editing.learnings, changes: e.target.value } })}
                    rows={2} placeholder="Reduzir posts estáticos de 40% para 20%"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Hipóteses para testar</Label>
                  <Textarea
                    value={editing.learnings?.hypotheses ?? ""}
                    onChange={(e) => setEditing({ ...editing, learnings: { ...editing.learnings, hypotheses: e.target.value } })}
                    rows={2} placeholder="Testar Reels mais longos (60s+)"
                  />
                </div>
              </div>

              {/* Metrics (collapsible) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronDown className="h-4 w-4" />
                    Números do Mês
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "followers_start", label: "Seguidores início" },
                      { key: "followers_end", label: "Seguidores fim" },
                      { key: "avg_engagement", label: "Engajamento médio" },
                      { key: "avg_reach", label: "Alcance médio/post" },
                      { key: "best_post", label: "Melhor post", type: "text" },
                      { key: "ads_spend", label: "Investimento ads (R$)" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                        <Input
                          type={f.type === "text" ? "text" : "number"}
                          className="h-8 text-xs"
                          value={editing.metrics?.[f.key] ?? ""}
                          onChange={(e) => setEditing({ ...editing, metrics: { ...editing.metrics, [f.key]: f.type === "text" ? e.target.value : (e.target.value ? Number(e.target.value) : undefined) } })}
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        (editing.tags ?? []).includes(tag)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Confiança</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setEditing({ ...editing, confidence_level: s })}>
                      <Star className={`h-5 w-5 transition-colors ${s <= (editing.confidence_level ?? 0) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30 hover:text-amber-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveEntry} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover entrada?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEntry}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

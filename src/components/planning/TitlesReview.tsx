import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Check, X, Pencil, Loader2, RefreshCw, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DistributionTables from "./DistributionTables";
import { getFrameLabel, getObjectiveLabel, getMethodLabel, getObjectiveAbbr } from "@/lib/formulaConstants";
import type { WizardData } from "@/pages/ProjectPlanning";

const OBJ_COLOR: Record<string, string> = {
  awareness: "text-blue-600",
  education: "text-blue-600",
  authority: "text-amber-600",
  social_proof: "text-amber-600",
  conversion: "text-green-600",
  product: "text-green-600",
  community: "text-violet-600",
};

interface PlanningItem {
  id: string;
  title: string;
  format: string | null;
  content_type: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string | null;
  metadata: any;
  [key: string]: any;
}

/** Group items into pairs (slot_index or sequential) */
function groupIntoPairs(items: PlanningItem[]): { slotIndex: number; options: PlanningItem[] }[] {
  // Separate formula items (with content_approach) from legacy items
  const formulaItems = items.filter((i) => (i.metadata as any)?.content_approach);
  const legacyItems = items.filter((i) => !(i.metadata as any)?.content_approach);

  const slots = new Map<number, PlanningItem[]>();

  // Group formula items by slot_index
  formulaItems.forEach((item) => {
    const slotIndex = (item.metadata as any)?.slot_index ?? 0;
    if (!slots.has(slotIndex)) slots.set(slotIndex, []);
    slots.get(slotIndex)!.push(item);
  });

  // Group legacy items sequentially in pairs
  for (let i = 0; i < legacyItems.length; i += 2) {
    const legacySlotIndex = 1000 + Math.floor(i / 2); // Use high slot index to avoid collisions
    slots.set(legacySlotIndex, legacyItems.slice(i, i + 2));
  }

  return Array.from(slots.entries())
    .sort(([a], [b]) => a - b)
    .map(([slotIndex, options]) => ({ slotIndex, options }));
}

interface Props {
  projectId: string;
  calendarId: string;
  wizardData: WizardData;
  onBriefingsGenerated: () => void;
  onBack: () => void;
}

export default function TitlesReview({ projectId, calendarId, wizardData, onBriefingsGenerated, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null);
  const [editForm, setEditForm] = useState({ title: "", format: "" });
  const [generatingBriefings, setGeneratingBriefings] = useState(false);
  const [regeneratingSlot, setRegeneratingSlot] = useState<number | null>(null);

  const { data: calendar } = useQuery({
    queryKey: ["planning-calendar", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase.from("planning_calendars").select("*").eq("id", calendarId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["planning-items", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("*")
        .eq("calendar_id", calendarId)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as PlanningItem[];
    },
  });

  const pairs = useMemo(() => groupIntoPairs(items ?? []), [items]);

  const totalSlots = pairs.length;
  const selectedCount = pairs.filter((p) =>
    p.options.some((o) => (o.metadata as any)?.title_status === "approved")
  ).length;
  const pendingCount = totalSlots - selectedCount;
  const canGenerateBriefings = selectedCount === totalSlots && totalSlots > 0;

  const selectOption = async (selectedItem: PlanningItem, pair: { slotIndex: number; options: PlanningItem[] }) => {
    for (const option of pair.options) {
      const status = option.id === selectedItem.id ? "approved" : "rejected";
      const metadata = { ...(option.metadata ?? {}), title_status: status };
      await supabase.from("planning_items").update({ metadata }).eq("id", option.id);
    }
    queryClient.invalidateQueries({ queryKey: ["planning-items", calendarId] });
  };

  const rejectBoth = async (pair: { slotIndex: number; options: PlanningItem[] }) => {
    setRegeneratingSlot(pair.slotIndex);
    try {
      // Mark both as rejected
      for (const option of pair.options) {
        const metadata = { ...(option.metadata ?? {}), title_status: "rejected" };
        await supabase.from("planning_items").update({ status: "cancelled", metadata }).eq("id", option.id);
      }

      // Request regeneration for this slot
      const { error } = await supabase.functions.invoke("generate-planning-titles", {
        body: {
          calendar_id: calendarId,
          project_id: projectId,
          analysis_id: wizardData.analysisId,
          channel: wizardData.channel,
          period_start: wizardData.periodStart,
          period_end: wizardData.periodEnd,
          regenerate_slot: pair.slotIndex,
          count: 2,
          parameters: {
            content_approach: "formula",
            posts_per_week: wizardData.postsPerWeek,
            format_mix: wizardData.formatMix,
            preferred_times: wizardData.usePreferredTimes ? wizardData.preferredTimes : null,
            special_instructions: wizardData.specialInstructions,
            colabs: wizardData.colabs,
            colab_percentage: wizardData.colabPercentage,
            formula_config: { enabled: true },
          },
        },
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["planning-items", calendarId] });
      toast({ title: "Novas opções geradas!", description: `2 novas alternativas para o slot ${pair.slotIndex + 1}.` });
    } catch (e: any) {
      toast({ title: "Erro ao regenerar", description: e.message, variant: "destructive" });
    } finally {
      setRegeneratingSlot(null);
    }
  };

  const openEdit = (item: PlanningItem) => {
    setEditingItem(item);
    setEditForm({ title: item.title, format: item.format ?? "" });
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    const metadata = { ...(editingItem.metadata ?? {}), title_status: "approved" };
    await supabase.from("planning_items").update({
      title: editForm.title,
      format: editForm.format || null,
      metadata,
    }).eq("id", editingItem.id);

    // Reject sibling
    const pair = pairs.find((p) => p.options.some((o) => o.id === editingItem.id));
    if (pair) {
      for (const option of pair.options) {
        if (option.id !== editingItem.id) {
          const md = { ...(option.metadata ?? {}), title_status: "rejected" };
          await supabase.from("planning_items").update({ metadata: md }).eq("id", option.id);
        }
      }
    }

    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ["planning-items", calendarId] });
  };

  const handleGenerateBriefings = async () => {
    setGeneratingBriefings(true);
    try {
      const approvedItems = (items ?? []).filter((i) => (i.metadata as any)?.title_status === "approved");
      const compactItems = approvedItems.map((i) => {
        const md = i.metadata ?? {};
        return {
          id: i.id,
          scheduled_date: i.scheduled_date,
          scheduled_time: i.scheduled_time,
          format: i.format,
          content_type: i.content_type,
          title: i.title,
          metadata: {
            content_approach: md.content_approach,
            formula: md.formula,
            is_colab: md.is_colab,
            colab_handle: md.colab_handle,
          },
        };
      });
      const { data, error } = await supabase.functions.invoke("generate-planning-briefings", {
        body: {
          calendar_id: calendarId,
          project_id: projectId,
          approved_items: compactItems,
        },
      });
      if (error) throw error;

      // Cancel rejected items
      const rejected = (items ?? []).filter((i) => (i.metadata as any)?.title_status === "rejected");
      for (const ri of rejected) {
        await supabase.from("planning_items").update({ status: "cancelled" }).eq("id", ri.id);
      }

      await supabase.from("planning_calendars").update({ status: "briefings_review" }).eq("id", calendarId);
      toast({ title: "Briefings gerados!", description: `${data?.count ?? 0} briefings criados.` });
      onBriefingsGenerated();
    } catch (e: any) {
      toast({ title: "Erro ao gerar briefings", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingBriefings(false);
    }
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          Seleção de Títulos — {calendar?.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalSlots} posts · Cada um com 2 opções — selecione a que preferir.
        </p>
      </div>

      {/* Progress */}
      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span>Selecionados: <strong className="text-green-600">{selectedCount}</strong> / {totalSlots}</span>
            <span>Pendentes: <strong className="text-muted-foreground">{pendingCount}</strong></span>
          </div>
          <Button
            size="sm"
            disabled={!canGenerateBriefings || generatingBriefings}
            onClick={handleGenerateBriefings}
          >
            {generatingBriefings ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
            Gerar Briefings
          </Button>
        </CardContent>
      </Card>

      {canGenerateBriefings && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700">
          ✅ Todos os posts foram selecionados! Você pode gerar os briefings.
        </div>
      )}

      {/* Pair cards */}
      <div className="space-y-4 mb-6">
        {pairs.map((pair) => {
          const selected = pair.options.find((o) => (o.metadata as any)?.title_status === "approved");
          const isRegenerating = regeneratingSlot === pair.slotIndex;
          const firstItem = pair.options[0];
          const isColab = (firstItem?.metadata as any)?.is_colab;

          return (
            <Card key={pair.slotIndex} className={`overflow-hidden transition-colors ${selected ? "border-green-500/40 bg-green-500/5" : ""}`}>
              <CardContent className="p-4">
                {/* Slot header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">Post {pair.slotIndex + 1}</span>
                    {firstItem?.format && (
                      <Badge variant="secondary" className="text-[10px]">{firstItem.format}</Badge>
                    )}
                    {isColab && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Users className="h-2.5 w-2.5" /> Colab
                      </Badge>
                    )}
                    {(firstItem?.metadata as any)?.formula?.objective && (
                      <span className={`text-[10px] font-bold font-mono ${OBJ_COLOR[(firstItem.metadata as any).formula.objective] ?? "text-muted-foreground"}`}>
                        {getObjectiveAbbr((firstItem.metadata as any).formula.objective)}
                      </span>
                    )}
                  </div>
                  {selected && (
                    <Badge variant="default" className="text-[10px] bg-green-600">✓ Selecionado</Badge>
                  )}
                </div>

                {isRegenerating ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando novas opções...
                  </div>
                ) : (
                  <>
                    {/* Options A & B */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pair.options.map((option, optIdx) => {
                        const metadata = (option.metadata as any) ?? {};
                        const titleStatus = metadata.title_status ?? "pending";
                        const isSelected = titleStatus === "approved";
                        const isRejected = titleStatus === "rejected";
                        const formulaData = metadata.formula;

                        return (
                          <div
                            key={option.id}
                            className={`relative rounded-lg border p-3 transition-all cursor-pointer ${
                              isSelected
                                ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/30"
                                : isRejected
                                ? "border-border opacity-40"
                                : "border-border hover:border-primary/40 hover:bg-accent/20"
                            }`}
                            onClick={() => !isSelected && selectOption(option, pair)}
                          >
                            {/* Option label */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                Opção {String.fromCharCode(65 + optIdx)}
                              </span>
                              <div className="flex items-center gap-1">
                                {isSelected && <Check className="h-3.5 w-3.5 text-green-600" />}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => { e.stopPropagation(); openEdit(option); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Title */}
                            <p className="text-sm font-medium text-foreground leading-snug">{option.title}</p>

                            {/* Formula badges */}
                            {formulaData && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/5">
                                  {getFrameLabel(formulaData.frame)}
                                </Badge>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/5">
                                  {getObjectiveLabel(formulaData.objective)}
                                </Badge>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-primary/5">
                                  {getMethodLabel(formulaData.method)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Reject both */}
                    {!selected && (
                      <div className="mt-3 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => rejectBoth(pair)}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Recusar ambas e gerar novas
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Distribution tables */}
      {items && items.length > 0 && (
        <DistributionTables items={items.filter((i) => (i.metadata as any)?.title_status !== "rejected")} />
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Planejamento gerado por <span className="font-semibold text-foreground">Fibbo Radar</span> — Inteligência Competitiva com IA
        </p>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Título</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Textarea
                rows={2}
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Formato</Label>
              <Input value={editForm.format} onChange={(e) => setEditForm((f) => ({ ...f, format: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar & Selecionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, X, Pencil, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DistributionTables from "./DistributionTables";
import type { WizardData } from "@/pages/ProjectPlanning";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const STATUS_EMOJI: Record<string, string> = { pending: "⏳", approved: "✅", rejected: "❌", edited: "✏️" };

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
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", scheduled_date: "", scheduled_time: "", content_type: "", format: "", responsible_code: "" });
  const [generatingBriefings, setGeneratingBriefings] = useState(false);

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
      return data;
    },
  });

  const approvedCount = items?.filter((i) => i.status === "idea" && (i.metadata as any)?.title_status === "approved").length ?? 0;
  const rejectedCount = items?.filter((i) => (i.metadata as any)?.title_status === "rejected").length ?? 0;
  const pendingCount = items?.filter((i) => !(i.metadata as any)?.title_status || (i.metadata as any)?.title_status === "pending").length ?? 0;
  const totalNeeded = Math.max(1, Math.round((items?.length ?? 0) / 1.25));
  const canGenerateBriefings = approvedCount >= totalNeeded;

  const updateTitleStatus = async (itemId: string, status: "approved" | "rejected") => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;
    const metadata = { ...(item.metadata as any ?? {}), title_status: status };
    await supabase.from("planning_items").update({ metadata }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["planning-items", calendarId] });
  };

  const approveAll = async () => {
    if (!items) return;
    for (const item of items) {
      const metadata = { ...(item.metadata as any ?? {}), title_status: "approved" };
      await supabase.from("planning_items").update({ metadata }).eq("id", item.id);
    }
    queryClient.invalidateQueries({ queryKey: ["planning-items", calendarId] });
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      scheduled_date: item.scheduled_date ?? "",
      scheduled_time: item.scheduled_time ?? "",
      content_type: item.content_type ?? "",
      format: item.format ?? "",
      responsible_code: (item.metadata as any)?.responsible_code ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    const metadata = { ...(editingItem.metadata as any ?? {}), title_status: "approved", responsible_code: editForm.responsible_code };
    await supabase.from("planning_items").update({
      title: editForm.title,
      scheduled_date: editForm.scheduled_date || null,
      scheduled_time: editForm.scheduled_time || null,
      content_type: editForm.content_type || null,
      format: editForm.format || null,
      metadata,
    }).eq("id", editingItem.id);
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ["planning-items", calendarId] });
  };

  const handleGenerateBriefings = async () => {
    setGeneratingBriefings(true);
    try {
      const approvedItems = items?.filter((i) => (i.metadata as any)?.title_status === "approved") ?? [];
      // Send compact items (strip large metadata fields)
      const compactItems = approvedItems.map((i) => {
        const md = i.metadata as any ?? {};
        return {
          id: i.id,
          scheduled_date: i.scheduled_date,
          scheduled_time: i.scheduled_time,
          format: i.format,
          content_type: i.content_type,
          title: i.title,
          metadata: {
            responsible_code: md.responsible_code,
            territory: md.territory,
            lens: md.lens,
            thesis: md.thesis,
            content_approach: md.content_approach,
            category: md.category,
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
      // Remove rejected items
      const rejectedItems = items?.filter((i) => (i.metadata as any)?.title_status === "rejected") ?? [];
      for (const ri of rejectedItems) {
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
          Calendário de Títulos — {calendar?.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items?.length ?? 0} títulos gerados ({totalNeeded} necessários + {(items?.length ?? 0) - totalNeeded} extras)
        </p>
      </div>

      {/* Counters */}
      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span>Aprovados: <strong className="text-green-600">{approvedCount}</strong></span>
            <span>Reprovados: <strong className="text-destructive">{rejectedCount}</strong></span>
            <span>Pendentes: <strong>{pendingCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={approveAll}>
              <Check className="mr-1 h-3 w-3" /> Aprovar Todos
            </Button>
            <Button
              size="sm"
              disabled={!canGenerateBriefings || generatingBriefings}
              onClick={handleGenerateBriefings}
            >
              {generatingBriefings ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
              Gerar Briefings
            </Button>
          </div>
        </CardContent>
      </Card>

      {canGenerateBriefings && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700">
          ✅ Mínimo atingido! Você pode gerar os briefings.
        </div>
      )}

      {/* Items table */}
      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-12">Status</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-20">Data</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-20">Dia</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-16">Horário</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-24">Pilar</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-24">Formato</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-16">Resp.</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground">Tema / Tese</th>
                <th className="p-2 text-right text-xs font-medium text-muted-foreground w-28">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => {
                const titleStatus = (item.metadata as any)?.title_status ?? "pending";
                const respCode = (item.metadata as any)?.responsible_code ?? "";
                const territory = (item.metadata as any)?.territory;
                const lens = (item.metadata as any)?.lens;
                const thesis = (item.metadata as any)?.thesis;
                const date = item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00") : null;
                const isApproved = titleStatus === "approved";
                const isRejected = titleStatus === "rejected";

                return (
                  <tr
                    key={item.id}
                    className={`border-b transition-colors group ${
                      isApproved ? "bg-green-500/5" : isRejected ? "bg-destructive/5 opacity-60" : "hover:bg-accent/30"
                    }`}
                  >
                    <td className="p-2 text-center">{STATUS_EMOJI[titleStatus]}</td>
                    <td className="p-2 text-xs">{date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"}</td>
                    <td className="p-2 text-xs">{date ? DAY_NAMES[date.getDay()] : "—"}</td>
                    <td className="p-2 text-xs font-mono">{item.scheduled_time ?? "—"}</td>
                    <td className="p-2"><Badge variant="secondary" className="text-[10px]">{item.content_type ?? "—"}</Badge></td>
                    <td className="p-2 text-xs">{item.format ?? "—"}</td>
                    <td className="p-2 text-xs font-mono">{respCode || "—"}</td>
                    <td className="p-2">
                      <p className={`text-xs font-medium text-foreground ${territory ? "uppercase" : ""}`}>{item.title}</p>
                      {thesis && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{thesis}</p>}
                      {(territory || lens) && (
                        <div className="flex gap-1 mt-0.5">
                          {territory && <Badge variant="outline" className="text-[8px] px-1 py-0">{territory}</Badge>}
                          {lens && <Badge variant="outline" className="text-[8px] px-1 py-0">{lens}</Badge>}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={() => updateTitleStatus(item.id, "approved")}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateTitleStatus(item.id, "rejected")}>
                          <X className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Distribution tables */}
      {items && items.length > 0 && (
        <DistributionTables items={items.filter((i) => (i.metadata as any)?.title_status !== "rejected")} />
      )}

      {/* Fibbo footer */}
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
              <Label className="text-xs text-muted-foreground">Tema/Título</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={editForm.scheduled_date} onChange={(e) => setEditForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Horário</Label>
                <Input type="time" value={editForm.scheduled_time} onChange={(e) => setEditForm((f) => ({ ...f, scheduled_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Pilar</Label>
                <Input value={editForm.content_type} onChange={(e) => setEditForm((f) => ({ ...f, content_type: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Formato</Label>
                <Input value={editForm.format} onChange={(e) => setEditForm((f) => ({ ...f, format: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Responsável</Label>
                <Input value={editForm.responsible_code} onChange={(e) => setEditForm((f) => ({ ...f, responsible_code: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar & Aprovar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

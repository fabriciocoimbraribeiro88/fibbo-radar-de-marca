import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Plus,
  Bot,
  BarChart3,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { OKRObjectiveCard } from "@/components/okrs/OKRObjectiveCard";
import { OKRTable } from "@/components/okrs/OKRTable";
import { CreateObjectiveDialog } from "@/components/okrs/CreateObjectiveDialog";
import { CollectDataDialog } from "@/components/okrs/CollectDataDialog";
import { HistoryDialog } from "@/components/okrs/HistoryDialog";
import { GenerateOKRsDialog } from "@/components/okrs/GenerateOKRsDialog";
import { ExportOKRs } from "@/components/okrs/ExportOKRs";
import { getQuarterProgress, computeStatus, calculateProgress } from "@/components/okrs/okr-utils";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

interface OKRsPanelProps {
  projectId: string;
}

export function OKRsPanel({ projectId }: OKRsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  const [objDialog, setObjDialog] = useState(false);
  const [editingObj, setEditingObj] = useState<any>(null);
  const [collectDialog, setCollectDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [historyKR, setHistoryKR] = useState<any>(null);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: entities } = useQuery({
    queryKey: ["project-entities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role, monitored_entities(id, instagram_handle)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  const brandEntityId = entities?.find(
    (e) => e.entity_role === "brand" || (e.monitored_entities as any)?.instagram_handle?.replace("@", "") === project?.instagram_handle?.replace("@", "")
  )?.entity_id;

  const { data: objectives, isLoading } = useQuery({
    queryKey: ["okr-objectives", projectId, selectedYear, selectedQuarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_objectives")
        .select(`*, okr_key_results (*, okr_measurements (id, value, measured_at, source, notes))`)
        .eq("project_id", projectId)
        .eq("year", selectedYear)
        .eq("quarter", selectedQuarter)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const keyResultsByObj: Record<string, any[]> = {};
  const allKeyResults: any[] = [];
  objectives?.forEach(obj => {
    const krs = (obj as any).okr_key_results ?? [];
    keyResultsByObj[obj.id] = krs;
    allKeyResults.push(...krs);
  });

  const quarterElapsed = getQuarterProgress(selectedQuarter, selectedYear);
  const totalObjectives = objectives?.length ?? 0;
  const onTrackObjectives = objectives?.filter(obj => {
    const krs = keyResultsByObj[obj.id] ?? [];
    if (!krs.length) return false;
    const progress = Math.round(krs.reduce((s, kr) => s + calculateProgress(Number(kr.baseline_value ?? 0), Number(kr.target_value), Number(kr.current_value ?? 0)), 0) / krs.length);
    return computeStatus(progress, quarterElapsed) === "on_track" || computeStatus(progress, quarterElapsed) === "achieved";
  }).length ?? 0;

  const lastMeasurement = allKeyResults
    .flatMap(kr => (kr.okr_measurements ?? []))
    .sort((a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
  const lastMeasurementDaysAgo = lastMeasurement
    ? Math.floor((Date.now() - new Date(lastMeasurement.measured_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });

  const handleSaveObjective = async (data: { objective: any; keyResults: any[] }) => {
    const { objective, keyResults: krForms } = data;
    if (objective.id) {
      const { error } = await supabase.from("okr_objectives").update({
        title: objective.title, description: objective.description, channel: objective.channel,
      }).eq("id", objective.id);
      if (error) throw error;
      for (const kr of krForms) {
        const payload = {
          objective_id: objective.id, title: kr.title, target_value: kr.target_value,
          baseline_value: kr.baseline_value, unit: kr.unit || null, data_source: kr.data_source || null,
          responsible: kr.responsible || null, metric_direction: kr.metric_direction || "increase",
        };
        if (kr.id) await supabase.from("okr_key_results").update(payload).eq("id", kr.id);
        else await supabase.from("okr_key_results").insert({ ...payload, current_value: kr.baseline_value });
      }
    } else {
      const { data: newObj, error } = await supabase.from("okr_objectives").insert({
        project_id: projectId, title: objective.title, description: objective.description,
        channel: objective.channel, year: objective.year, quarter: objective.quarter,
      }).select("id").single();
      if (error) throw error;
      const krsToInsert = krForms.filter(kr => kr.title.trim()).map(kr => ({
        objective_id: newObj.id, title: kr.title, target_value: kr.target_value,
        current_value: kr.baseline_value, baseline_value: kr.baseline_value,
        unit: kr.unit || null, data_source: kr.data_source || null,
        responsible: kr.responsible || null, metric_direction: kr.metric_direction || "increase",
        metric_type: kr.data_source || null,
      }));
      if (krsToInsert.length > 0) await supabase.from("okr_key_results").insert(krsToInsert);
    }
    toast({ title: objective.id ? "Objetivo atualizado!" : "Objetivo criado!" });
    invalidate();
  };

  const handleDeleteObjective = async (obj: any) => {
    const krs = keyResultsByObj[obj.id] ?? [];
    for (const kr of krs) {
      await supabase.from("okr_measurements").delete().eq("key_result_id", kr.id);
      await supabase.from("okr_key_results").delete().eq("id", kr.id);
    }
    await supabase.from("okr_objectives").delete().eq("id", obj.id);
    toast({ title: "Objetivo excluído" });
    invalidate();
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" />{[1, 2].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-semibold">OKRs — {selectedQuarter} {selectedYear}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Objetivos e Resultados-Chave para o período.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setGenerateDialog(true)}>
              <Bot className="h-3.5 w-3.5 mr-1.5" />Gerar com IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCollectDialog(true)} disabled={allKeyResults.length === 0}>
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Coletar Dados
            </Button>
            {objectives && objectives.length > 0 && (
              <ExportOKRs objectives={objectives} keyResultsByObj={keyResultsByObj} quarter={selectedQuarter} year={selectedYear} />
            )}
            <Button size="sm" onClick={() => { setEditingObj(null); setObjDialog(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Novo Objetivo
            </Button>
          </div>
        </div>
        {totalObjectives > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>{onTrackObjectives} de {totalObjectives} objetivos on track · {quarterElapsed}% do quarter decorrido</span>
            {lastMeasurementDaysAgo !== null && (
              <Badge variant="secondary" className={`text-[10px] ${lastMeasurementDaysAgo > 30 ? "bg-destructive/15 text-destructive" : lastMeasurementDaysAgo > 7 ? "bg-amber-500/15 text-amber-600" : ""}`}>
                {lastMeasurementDaysAgo > 30 ? "🔴" : lastMeasurementDaysAgo > 7 ? "⚠️" : ""} Última medição: {lastMeasurementDaysAgo}d atrás
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Quarter selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedQuarter === q ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        {totalObjectives > 0 && (
          <div className="flex items-center gap-1">
            <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("cards")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}>
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {totalObjectives === 0 && (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="flex flex-col items-center py-16">
            <Target className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum objetivo para {selectedQuarter} {selectedYear}</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie objetivos e key results para acompanhar seus resultados.</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => { setEditingObj(null); setObjDialog(true); }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Criar Primeiro Objetivo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setGenerateDialog(true)}>
                <Bot className="mr-1.5 h-3.5 w-3.5" />Gerar com IA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "cards" && totalObjectives > 0 && (
        <div className="space-y-4">
          {objectives?.map((obj, idx) => (
            <OKRObjectiveCard
              key={obj.id} objective={obj} keyResults={keyResultsByObj[obj.id] ?? []}
              index={idx + 1} quarter={selectedQuarter} year={selectedYear}
              onEdit={(o) => { setEditingObj(o); setObjDialog(true); }}
              onDelete={(o) => setDeleteConfirm(o)}
              onAddKR={(objId) => { const o = objectives?.find(x => x.id === objId); if (o) { setEditingObj(o); setObjDialog(true); } }}
              onHistoryKR={(kr) => { setHistoryKR(kr); setHistoryDialog(true); }}
            />
          ))}
        </div>
      )}

      {viewMode === "table" && totalObjectives > 0 && (
        <OKRTable objectives={objectives ?? []} keyResultsByObj={keyResultsByObj} quarter={selectedQuarter} year={selectedYear} />
      )}

      <CreateObjectiveDialog open={objDialog} onOpenChange={(o) => { setObjDialog(o); if (!o) setEditingObj(null); }}
        onSave={handleSaveObjective} editingObjective={editingObj}
        editingKeyResults={editingObj ? keyResultsByObj[editingObj.id] : undefined}
        quarter={selectedQuarter} year={selectedYear} />

      <CollectDataDialog open={collectDialog} onOpenChange={setCollectDialog}
        allKeyResults={allKeyResults} brandEntityId={brandEntityId}
        quarter={selectedQuarter} year={selectedYear} onSaved={invalidate} />

      <HistoryDialog open={historyDialog} onOpenChange={setHistoryDialog} kr={historyKR} />

      <GenerateOKRsDialog open={generateDialog} onOpenChange={setGenerateDialog}
        projectId={projectId} quarter={selectedQuarter} year={selectedYear} onSaved={invalidate} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá o objetivo "{deleteConfirm?.title}" e todos os seus key results e medições.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDeleteObjective(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

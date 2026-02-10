import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Plus,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  Loader2,
  Instagram,
  Megaphone,
  Search,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const CHANNELS_OKR = [
  { value: "social", label: "Redes Sociais", icon: Instagram },
  { value: "ads", label: "Campanhas / Ads", icon: Megaphone },
  { value: "seo", label: "SEO / Orgânico", icon: Search },
  { value: "general", label: "Geral", icon: Target },
];

const STATUS_COLORS: Record<string, string> = {
  on_track: "bg-green-500/15 text-green-600",
  at_risk: "bg-amber-500/15 text-amber-600",
  off_track: "bg-destructive/15 text-destructive",
  achieved: "bg-primary/15 text-primary",
};

const STATUS_LABELS: Record<string, string> = {
  on_track: "No Caminho",
  at_risk: "Em Risco",
  off_track: "Fora da Meta",
  achieved: "Alcançado",
};

interface ObjForm {
  title: string;
  description: string;
  channel: string;
}

interface KRForm {
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  metric_type: string;
}

export default function ProjectOKRs() {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  // Dialogs
  const [objDialog, setObjDialog] = useState(false);
  const [editObjId, setEditObjId] = useState<string | null>(null);
  const [objForm, setObjForm] = useState<ObjForm>({ title: "", description: "", channel: "general" });

  const [krDialog, setKrDialog] = useState(false);
  const [krObjId, setKrObjId] = useState<string | null>(null);
  const [editKrId, setEditKrId] = useState<string | null>(null);
  const [krForm, setKrForm] = useState<KRForm>({
    title: "", target_value: 100, current_value: 0, unit: "", metric_type: "",
  });

  // Fetch objectives
  const { data: objectives, isLoading } = useQuery({
    queryKey: ["okr-objectives", projectId, selectedYear, selectedQuarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("okr_objectives")
        .select("*")
        .eq("project_id", projectId!)
        .eq("year", selectedYear)
        .eq("quarter", selectedQuarter)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const objIds = objectives?.map((o) => o.id) ?? [];
  const { data: keyResults } = useQuery({
    queryKey: ["okr-key-results", objIds],
    queryFn: async () => {
      if (!objIds.length) return [];
      const { data, error } = await supabase
        .from("okr_key_results")
        .select("*")
        .in("objective_id", objIds)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: objIds.length > 0,
  });

  const getKRsForObj = (objId: string) =>
    keyResults?.filter((kr) => kr.objective_id === objId) ?? [];

  const getObjProgress = (objId: string) => {
    const krs = getKRsForObj(objId);
    if (!krs.length) return 0;
    const total = krs.reduce((sum, kr) => {
      const pct = kr.target_value > 0 ? Math.min(((kr.current_value ?? 0) / kr.target_value) * 100, 100) : 0;
      return sum + pct;
    }, 0);
    return Math.round(total / krs.length);
  };

  // Mutations
  const saveObj = useMutation({
    mutationFn: async () => {
      const payload = {
        project_id: projectId!,
        title: objForm.title,
        description: objForm.description || null,
        channel: objForm.channel,
        year: selectedYear,
        quarter: selectedQuarter,
      };
      if (editObjId) {
        const { error } = await supabase.from("okr_objectives").update(payload).eq("id", editObjId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("okr_objectives").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      setObjDialog(false);
      setEditObjId(null);
      setObjForm({ title: "", description: "", channel: "general" });
      toast({ title: editObjId ? "Objetivo atualizado!" : "Objetivo criado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const saveKR = useMutation({
    mutationFn: async () => {
      const payload = {
        objective_id: krObjId!,
        title: krForm.title,
        target_value: krForm.target_value,
        current_value: krForm.current_value,
        unit: krForm.unit || null,
        metric_type: krForm.metric_type || null,
      };
      if (editKrId) {
        const { error } = await supabase.from("okr_key_results").update(payload).eq("id", editKrId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("okr_key_results").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
      setKrDialog(false);
      setEditKrId(null);
      setKrForm({ title: "", target_value: 100, current_value: 0, unit: "", metric_type: "" });
      toast({ title: editKrId ? "Key Result atualizado!" : "Key Result criado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateKRValue = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase.from("okr_key_results").update({ current_value: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["okr-key-results"] }),
  });

  const updateObjStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("okr_objectives").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["okr-objectives"] }),
  });

  const openNewObj = () => {
    setObjForm({ title: "", description: "", channel: "general" });
    setEditObjId(null);
    setObjDialog(true);
  };

  const openEditObj = (obj: any) => {
    setObjForm({ title: obj.title, description: obj.description || "", channel: obj.channel || "general" });
    setEditObjId(obj.id);
    setObjDialog(true);
  };

  const openNewKR = (objId: string) => {
    setKrForm({ title: "", target_value: 100, current_value: 0, unit: "", metric_type: "" });
    setKrObjId(objId);
    setEditKrId(null);
    setKrDialog(true);
  };

  const openEditKR = (kr: any) => {
    setKrForm({
      title: kr.title,
      target_value: kr.target_value,
      current_value: kr.current_value ?? 0,
      unit: kr.unit || "",
      metric_type: kr.metric_type || "",
    });
    setKrObjId(kr.objective_id);
    setEditKrId(kr.id);
    setKrDialog(true);
  };

  // Overall progress
  const overallProgress = objectives?.length
    ? Math.round(objectives.reduce((s, o) => s + getObjProgress(o.id), 0) / objectives.length)
    : 0;

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">OKRs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Objetivos e resultados-chave por trimestre.
          </p>
        </div>
        <Button onClick={openNewObj}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Objetivo
        </Button>
      </div>

      {/* Quarter selector + summary */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {QUARTERS.map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedQuarter === q
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {objectives && objectives.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Progresso geral</span>
            <div className="w-24">
              <Progress value={overallProgress} className="h-2" />
            </div>
            <span className="text-sm font-mono font-medium text-foreground">{overallProgress}%</span>
          </div>
        )}
      </div>

      {/* Objectives */}
      {objectives && objectives.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <Target className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum objetivo para {selectedQuarter} {selectedYear}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie objetivos e key results para acompanhar seus resultados.
            </p>
            <Button className="mt-4" size="sm" onClick={openNewObj}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Criar Primeiro Objetivo
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {objectives?.map((obj) => {
          const krs = getKRsForObj(obj.id);
          const progress = getObjProgress(obj.id);
          const statusColor = STATUS_COLORS[obj.status ?? "on_track"];
          const statusLabel = STATUS_LABELS[obj.status ?? "on_track"];
          const channelInfo = CHANNELS_OKR.find((c) => c.value === obj.channel);
          const ChannelIcon = channelInfo?.icon ?? Target;

          const TrendIcon = progress >= 70 ? TrendingUp : progress >= 40 ? Minus : TrendingDown;
          const trendColor = progress >= 70 ? "text-green-600" : progress >= 40 ? "text-amber-600" : "text-destructive";

          return (
            <Collapsible key={obj.id} defaultOpen>
              <Card>
                <CardContent className="p-0">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <ChannelIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{obj.title}</p>
                            <Badge className={`text-[9px] ${statusColor}`}>{statusLabel}</Badge>
                          </div>
                          {obj.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{obj.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                        <div className="w-20">
                          <Progress value={progress} className="h-2" />
                        </div>
                        <span className="text-sm font-mono font-medium text-foreground w-10 text-right">{progress}%</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                      {/* Status changer */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status:</span>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <button
                            key={k}
                            onClick={() => updateObjStatus.mutate({ id: obj.id, status: k })}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              obj.status === k ? STATUS_COLORS[k] : "bg-muted/50 text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => openEditObj(obj)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Key Results */}
                      {krs.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">Nenhum key result definido.</p>
                      )}
                      {krs.map((kr) => {
                        const krPct = kr.target_value > 0 ? Math.min(Math.round(((kr.current_value ?? 0) / kr.target_value) * 100), 100) : 0;
                        const isLow = krPct < 50;
                        return (
                          <div key={kr.id} className="rounded-lg border border-border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{kr.title}</p>
                                {isLow && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditKR(kr)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={krPct} className="h-2 flex-1" />
                              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                {kr.current_value ?? 0} / {kr.target_value} {kr.unit}
                              </span>
                            </div>
                            {/* Quick update */}
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="h-7 w-24 text-xs"
                                placeholder="Novo valor"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = Number((e.target as HTMLInputElement).value);
                                    if (!isNaN(val)) {
                                      updateKRValue.mutate({ id: kr.id, value: val });
                                      (e.target as HTMLInputElement).value = "";
                                    }
                                  }
                                }}
                              />
                              <span className="text-[10px] text-muted-foreground">Enter para atualizar</span>
                            </div>
                          </div>
                        );
                      })}

                      <Button variant="outline" size="sm" className="w-full" onClick={() => openNewKR(obj.id)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Adicionar Key Result
                      </Button>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Objective dialog */}
      <Dialog open={objDialog} onOpenChange={(open) => { if (!open) { setObjDialog(false); setEditObjId(null); } }}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editObjId ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={objForm.title} onChange={(e) => setObjForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Aumentar engajamento no Instagram" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea value={objForm.description} onChange={(e) => setObjForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descreva o objetivo..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Canal</Label>
              <Select value={objForm.channel} onValueChange={(v) => setObjForm((f) => ({ ...f, channel: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS_OKR.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveObj.mutate()} disabled={!objForm.title.trim() || saveObj.isPending}>
              {saveObj.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editObjId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Result dialog */}
      <Dialog open={krDialog} onOpenChange={(open) => { if (!open) { setKrDialog(false); setEditKrId(null); } }}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editKrId ? "Editar Key Result" : "Novo Key Result"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={krForm.title} onChange={(e) => setKrForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Alcançar 10k seguidores" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Meta</Label>
                <Input type="number" value={krForm.target_value} onChange={(e) => setKrForm((f) => ({ ...f, target_value: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor Atual</Label>
                <Input type="number" value={krForm.current_value} onChange={(e) => setKrForm((f) => ({ ...f, current_value: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Unidade</Label>
                <Input value={krForm.unit} onChange={(e) => setKrForm((f) => ({ ...f, unit: e.target.value }))} placeholder="Ex: seguidores, %, R$" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de Métrica</Label>
                <Select value={krForm.metric_type} onValueChange={(v) => setKrForm((f) => ({ ...f, metric_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="followers">Seguidores</SelectItem>
                    <SelectItem value="engagement">Engajamento</SelectItem>
                    <SelectItem value="reach">Alcance</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="cpl">CPL</SelectItem>
                    <SelectItem value="cpa">CPA</SelectItem>
                    <SelectItem value="revenue">Receita</SelectItem>
                    <SelectItem value="keyword_position">Posição KW</SelectItem>
                    <SelectItem value="organic_traffic">Tráfego Orgânico</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKrDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveKR.mutate()} disabled={!krForm.title.trim() || saveKR.isPending}>
              {saveKR.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editKrId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNELS_OKR, METRIC_DIRECTIONS, DATA_SOURCES } from "./okr-utils";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface KRFormItem {
  id?: string;
  title: string;
  metric_direction: string;
  baseline_value: number;
  target_value: number;
  unit: string;
  data_source: string;
  responsible: string;
}

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { objective: any; keyResults: KRFormItem[] }) => Promise<void>;
  editingObjective?: any;
  editingKeyResults?: any[];
  quarter: string;
  year: number;
}

const emptyKR = (): KRFormItem => ({
  title: "",
  metric_direction: "increase",
  baseline_value: 0,
  target_value: 0,
  unit: "",
  data_source: "manual",
  responsible: "",
});

export function CreateObjectiveDialog({
  open,
  onOpenChange,
  onSave,
  editingObjective,
  editingKeyResults,
  quarter,
  year,
}: CreateObjectiveDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("general");
  const [krForms, setKrForms] = useState<KRFormItem[]>([emptyKR()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingObjective) {
      setTitle(editingObjective.title);
      setDescription(editingObjective.description || "");
      setChannel(editingObjective.channel || "general");
      if (editingKeyResults?.length) {
        setKrForms(editingKeyResults.map(kr => ({
          id: kr.id,
          title: kr.title,
          metric_direction: kr.metric_direction || "increase",
          baseline_value: Number(kr.baseline_value ?? 0),
          target_value: Number(kr.target_value),
          unit: kr.unit || "",
          data_source: kr.data_source || "manual",
          responsible: kr.responsible || "",
        })));
      } else {
        setKrForms([emptyKR()]);
      }
    } else {
      setTitle("");
      setDescription("");
      setChannel("general");
      setKrForms([emptyKR()]);
    }
  }, [editingObjective, editingKeyResults, open]);

  const updateKR = (index: number, field: keyof KRFormItem, value: any) => {
    setKrForms(prev => prev.map((kr, i) => i === index ? { ...kr, [field]: value } : kr));
  };

  const addKR = () => {
    if (krForms.length < 5) setKrForms(prev => [...prev, emptyKR()]);
  };

  const removeKR = (index: number) => {
    if (krForms.length > 1) setKrForms(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        objective: {
          id: editingObjective?.id,
          title,
          description: description || null,
          channel,
          quarter,
          year,
        },
        keyResults: krForms,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingObjective ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Título do Objetivo</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aumentar reconhecimento de marca e engajamento" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descreva o objetivo..." />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS_OKR.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quarter</Label>
              <Select value={quarter} disabled>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Q1","Q2","Q3","Q4"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ano</Label>
              <Select value={String(year)} disabled>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(year)}>{year}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Key Results</h4>

            {krForms.map((kr, idx) => (
              <div key={idx} className="rounded-xl border border-border p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">KR {idx + 1}</span>
                  {krForms.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeKR(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <Input value={kr.title} onChange={(e) => updateKR(idx, "title", e.target.value)} placeholder="Ex: Aumentar seguidores" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo de meta</Label>
                    <Select value={kr.metric_direction} onValueChange={(v) => updateKR(idx, "metric_direction", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRIC_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Fonte de dados</Label>
                    <Select value={kr.data_source} onValueChange={(v) => updateKR(idx, "data_source", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DATA_SOURCES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Baseline</Label>
                    <Input type="number" value={kr.baseline_value} onChange={(e) => updateKR(idx, "baseline_value", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Meta</Label>
                    <Input type="number" value={kr.target_value} onChange={(e) => updateKR(idx, "target_value", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Unidade</Label>
                    <Input value={kr.unit} onChange={(e) => updateKR(idx, "unit", e.target.value)} placeholder="Ex: seguidores, %" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <Input value={kr.responsible} onChange={(e) => updateKR(idx, "responsible", e.target.value)} placeholder="Ex: Equipe de Conteúdo" />
                </div>
              </div>
            ))}

            {krForms.length < 5 && (
              <Button variant="outline" size="sm" className="w-full" onClick={addKR}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar Key Result
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingObjective ? "Salvar Objetivo" : "Criar Objetivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CHANNELS_OKR } from "./okr-utils";
import { Loader2, Bot, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GenerateOKRsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  quarter: string;
  year: number;
  onSaved: () => void;
}

interface SuggestedKR {
  title: string;
  metric_direction: string;
  baseline_value: number;
  target_value: number;
  unit: string;
  data_source: string;
  responsible: string;
  selected: boolean;
}

interface SuggestedObj {
  title: string;
  description: string;
  channel: string;
  selected: boolean;
  key_results: SuggestedKR[];
}

export function GenerateOKRsDialog({ open, onOpenChange, projectId, quarter, year, onSaved }: GenerateOKRsDialogProps) {
  const { toast } = useToast();
  const [channel, setChannel] = useState("social");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedObj[] | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setSuggestions(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-okrs", {
        body: { project_id: projectId, quarter, year, channel, special_instructions: instructions },
      });
      if (error) throw error;
      if (data?.objectives) {
        setSuggestions(data.objectives.map((obj: any) => ({
          ...obj,
          selected: true,
          key_results: (obj.key_results ?? []).map((kr: any) => ({ ...kr, selected: true })),
        })));
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleObj = (idx: number) => {
    setSuggestions(prev => prev?.map((o, i) => i === idx ? { ...o, selected: !o.selected } : o) ?? null);
  };

  const toggleKR = (objIdx: number, krIdx: number) => {
    setSuggestions(prev => prev?.map((o, i) => i === objIdx ? {
      ...o,
      key_results: o.key_results.map((kr, j) => j === krIdx ? { ...kr, selected: !kr.selected } : kr),
    } : o) ?? null);
  };

  const handleSave = async () => {
    if (!suggestions) return;
    setSaving(true);
    try {
      for (const obj of suggestions.filter(o => o.selected)) {
        const { data: newObj, error: objErr } = await supabase
          .from("okr_objectives")
          .insert({
            project_id: projectId,
            title: obj.title,
            description: obj.description || null,
            channel: obj.channel,
            quarter,
            year,
          })
          .select("id")
          .single();
        if (objErr) throw objErr;

        const krsToInsert = obj.key_results.filter(kr => kr.selected).map(kr => ({
          objective_id: newObj.id,
          title: kr.title,
          target_value: kr.target_value,
          current_value: kr.baseline_value,
          baseline_value: kr.baseline_value,
          unit: kr.unit,
          data_source: kr.data_source,
          responsible: kr.responsible,
          metric_type: kr.data_source,
          metric_direction: kr.metric_direction,
        }));

        if (krsToInsert.length > 0) {
          const { error: krErr } = await supabase.from("okr_key_results").insert(krsToInsert);
          if (krErr) throw krErr;
        }
      }

      toast({ title: "OKRs salvas!" });
      onSaved();
      onOpenChange(false);
      setSuggestions(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSuggestions(null); }}>
      <DialogContent className="bg-card sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Gerar OKRs com IA
          </DialogTitle>
        </DialogHeader>

        {!suggestions && !loading && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              A IA vai sugerir OKRs baseados nos dados coletados da marca, análises aprovadas e benchmarks dos concorrentes.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quarter</Label>
                <Select value={quarter} disabled>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value={quarter}>{quarter}</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Canal foco</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS_OKR.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Instruções adicionais (opcional)</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Ex: Focar em crescimento orgânico e geração de leads" />
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Gerando sugestões...</span>
          </div>
        )}

        {suggestions && (
          <div className="space-y-4 py-2">
            {suggestions.map((obj, objIdx) => (
              <div key={objIdx} className={`rounded-xl border p-4 space-y-3 transition-opacity ${obj.selected ? "border-primary/30 bg-primary/5" : "opacity-50 border-border"}`}>
                <div className="flex items-center gap-2">
                  <Checkbox checked={obj.selected} onCheckedChange={() => toggleObj(objIdx)} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{obj.title}</p>
                    {obj.description && <p className="text-xs text-muted-foreground">{obj.description}</p>}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{obj.channel}</Badge>
                </div>
                {obj.selected && obj.key_results.map((kr, krIdx) => (
                  <div key={krIdx} className={`ml-6 rounded-lg border border-border p-3 flex items-center gap-3 ${kr.selected ? "" : "opacity-40"}`}>
                    <Checkbox checked={kr.selected} onCheckedChange={() => toggleKR(objIdx, krIdx)} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{kr.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {kr.baseline_value} → {kr.target_value} {kr.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {!suggestions && !loading && (
            <Button onClick={handleGenerate}>
              <Bot className="mr-2 h-4 w-4" />
              Gerar Sugestões
            </Button>
          )}
          {suggestions && (
            <Button onClick={handleSave} disabled={saving || !suggestions.some(o => o.selected)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar OKRs Aprovadas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, X, Sparkles, Award } from "lucide-react";

interface SocialProofEntry {
  id: string;
  type: "testimonial" | "metric" | "case" | "award" | "media" | "certification";
  text: string;
  source: string;
  metric_value?: string;
  is_verified: boolean;
  use_in: string[];
  is_ai_generated: boolean;
}

interface SocialProofBankProps {
  projectId: string;
  briefing: any;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  testimonial: { label: "Depoimento", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  metric: { label: "Métrica", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  case: { label: "Case", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  award: { label: "Prêmio", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  media: { label: "Mídia", className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  certification: { label: "Certificação", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300" },
};

export default function SocialProofBank({ projectId, briefing }: SocialProofBankProps) {
  const [entries, setEntries] = useState<SocialProofEntry[]>(() => {
    const b = briefing as any;
    return Array.isArray(b?.social_proof_bank) ? b.social_proof_bank : [];
  });
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<SocialProofEntry["type"]>("metric");
  const [newText, setNewText] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newMetric, setNewMetric] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback((data: SocialProofEntry[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data: current } = await supabase.from("projects").select("briefing").eq("id", projectId).single();
      const merged = { ...((current?.briefing as any) ?? {}), social_proof_bank: data };
      await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    }, 2000);
  }, [projectId]);

  useEffect(() => {
    const b = briefing as any;
    if (Array.isArray(b?.social_proof_bank)) setEntries(b.social_proof_bank);
  }, [briefing]);

  const addEntry = () => {
    if (!newText.trim() || !newSource.trim()) return;
    const entry: SocialProofEntry = {
      id: crypto.randomUUID(),
      type: newType,
      text: newText.trim(),
      source: newSource.trim(),
      metric_value: newMetric.trim() || undefined,
      is_verified: false,
      use_in: [],
      is_ai_generated: false,
    };
    const updated = [...entries, entry];
    setEntries(updated);
    save(updated);
    setAdding(false);
    setNewText(""); setNewSource(""); setNewMetric("");
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    save(updated);
  };

  const total = entries.length;
  const goal = 10;

  return (
    <div className="card-flat p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Provas Sociais</h3>
          <Badge variant="secondary" className="text-xs">{total}/{goal}</Badge>
        </div>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => toast.info("Em breve: sugestões de provas sociais com IA")}>
          <Sparkles className="h-3 w-3" /> Sugerir com IA
        </Button>
      </div>

      <Progress value={Math.min((total / goal) * 100, 100)} className="h-1.5" />

      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="bg-accent/30 rounded-lg p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <Badge className={`text-[10px] shrink-0 ${TYPE_BADGES[e.type]?.className}`}>{TYPE_BADGES[e.type]?.label}</Badge>
              <span className="text-sm flex-1">{e.text}</span>
              <button onClick={() => removeEntry(e.id)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-3 w-3" /></button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Fonte: {e.source}</span>
              {e.metric_value && <span>Valor: {e.metric_value}</span>}
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TYPE_BADGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="flex-1 h-8 text-xs" placeholder="Texto da prova social" value={newText} onChange={(e) => setNewText(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Input className="flex-1 h-8 text-xs" placeholder="Fonte (ex: Cliente X)" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
            <Input className="w-[120px] h-8 text-xs" placeholder="Valor (ex: 340%)" value={newMetric} onChange={(e) => setNewMetric(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={addEntry}>Adicionar</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="text-xs gap-1 w-full justify-start" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Adicionar Prova Social
        </Button>
      )}
    </div>
  );
}

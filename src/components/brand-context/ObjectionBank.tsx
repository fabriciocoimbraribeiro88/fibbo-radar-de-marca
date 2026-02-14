import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Plus, X, Sparkles, ShieldQuestion, ChevronDown } from "lucide-react";

interface ObjectionEntry {
  id: string;
  objection: string;
  response: string;
  content_angle: string;
  objective: string;
  severity: "common" | "critical" | "occasional";
  is_ai_generated: boolean;
}

interface ObjectionBankProps {
  projectId: string;
  briefing: any;
}

export default function ObjectionBank({ projectId, briefing }: ObjectionBankProps) {
  const [entries, setEntries] = useState<ObjectionEntry[]>(() => {
    const b = briefing as any;
    return Array.isArray(b?.objection_bank) ? b.objection_bank : [];
  });
  const [adding, setAdding] = useState(false);
  const [newObjection, setNewObjection] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [newAngle, setNewAngle] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback((data: ObjectionEntry[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data: current } = await supabase.from("projects").select("briefing").eq("id", projectId).single();
      const merged = { ...((current?.briefing as any) ?? {}), objection_bank: data };
      await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    }, 2000);
  }, [projectId]);

  useEffect(() => {
    const b = briefing as any;
    if (Array.isArray(b?.objection_bank)) setEntries(b.objection_bank);
  }, [briefing]);

  const addEntry = () => {
    if (!newObjection.trim() || !newResponse.trim()) return;
    const entry: ObjectionEntry = {
      id: crypto.randomUUID(),
      objection: newObjection.trim(),
      response: newResponse.trim(),
      content_angle: newAngle.trim(),
      objective: "conversion",
      severity: "common",
      is_ai_generated: false,
    };
    const updated = [...entries, entry];
    setEntries(updated);
    save(updated);
    setAdding(false);
    setNewObjection(""); setNewResponse(""); setNewAngle("");
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    save(updated);
  };

  const total = entries.length;
  const goal = 5;

  return (
    <div className="card-flat p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldQuestion className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Objeções do Público</h3>
          <Badge variant="secondary" className="text-xs">{total}/{goal}</Badge>
        </div>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => toast.info("Em breve: sugestões de objeções com IA")}>
          <Sparkles className="h-3 w-3" /> Sugerir com IA
        </Button>
      </div>

      <Progress value={Math.min((total / goal) * 100, 100)} className="h-1.5" />

      <div className="space-y-2">
        {entries.map((e) => (
          <Collapsible key={e.id}>
            <div className="bg-accent/30 rounded-lg">
              <div className="flex items-center gap-2 px-3 py-2">
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                  <span className="text-sm font-medium flex-1">"{e.objection}"</span>
                </CollapsibleTrigger>
                <button onClick={() => removeEntry(e.id)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-3 w-3" /></button>
              </div>
              <CollapsibleContent className="px-3 pb-3 space-y-1.5">
                <div className="text-xs space-y-1 pl-5">
                  <p><span className="text-muted-foreground">Resposta:</span> {e.response}</p>
                  {e.content_angle && <p><span className="text-muted-foreground">Ângulo de conteúdo:</span> {e.content_angle}</p>}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {adding ? (
        <div className="border rounded-lg p-3 space-y-2">
          <Input className="h-8 text-xs" placeholder='Objeção (ex: "É muito caro")' value={newObjection} onChange={(e) => setNewObjection(e.target.value)} />
          <Textarea className="text-xs min-h-[60px]" placeholder="Resposta (ex: Custo por resultado é 3x menor)" value={newResponse} onChange={(e) => setNewResponse(e.target.value)} />
          <Input className="h-8 text-xs" placeholder="Ângulo de conteúdo (ex: Post comparativo de custo-benefício)" value={newAngle} onChange={(e) => setNewAngle(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={addEntry}>Adicionar</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="text-xs gap-1 w-full justify-start" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3" /> Adicionar Objeção
        </Button>
      )}
    </div>
  );
}

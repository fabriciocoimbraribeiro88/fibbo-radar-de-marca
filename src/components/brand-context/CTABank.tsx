import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FORMULA_OBJECTIVES } from "@/lib/formulaConstants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, X, Sparkles, Megaphone } from "lucide-react";

interface CTAEntry {
  id: string;
  text: string;
  objective: string;
  format: string;
  intensity: "soft" | "medium" | "strong";
  is_ai_generated: boolean;
}

interface CTABankProps {
  projectId: string;
  briefing: any;
}

const PLACEHOLDERS: Record<string, string> = {
  awareness: "Ex: Salva pra lembrar · Compartilha com quem precisa ver · Ativa o sininho",
  education: "Ex: Comenta qual dica vai aplicar · Salva esse carrossel",
  authority: "Ex: Concorda? Comenta aí · Compartilha com quem discorda",
  conversion: "Ex: Saiba mais no link · Link na bio · Últimas vagas",
  community: "Ex: Qual é a sua opinião? · Marca quem concorda",
  social_proof: "Ex: Quer resultado assim? · DM que explico como",
  product: "Ex: Conheça mais · Veja os detalhes no link",
};

export default function CTABank({ projectId, briefing }: CTABankProps) {
  const [entries, setEntries] = useState<CTAEntry[]>(() => {
    const b = briefing as any;
    return Array.isArray(b?.cta_bank) ? b.cta_bank : [];
  });
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback((data: CTAEntry[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data: current } = await supabase.from("projects").select("briefing").eq("id", projectId).single();
      const merged = { ...((current?.briefing as any) ?? {}), cta_bank: data };
      await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    }, 2000);
  }, [projectId]);

  useEffect(() => {
    const b = briefing as any;
    if (Array.isArray(b?.cta_bank)) setEntries(b.cta_bank);
  }, [briefing]);

  const addEntry = (objective: string) => {
    if (!newText.trim()) return;
    const entry: CTAEntry = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      objective,
      format: "all",
      intensity: "medium",
      is_ai_generated: false,
    };
    const updated = [...entries, entry];
    setEntries(updated);
    save(updated);
    setNewText("");
    setAddingFor(null);
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    save(updated);
  };

  const total = entries.length;
  const goal = 21;

  return (
    <div className="card-flat p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Banco de CTAs</h3>
          <Badge variant="secondary" className="text-xs">{total}/{goal}</Badge>
        </div>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => toast.info("Em breve: sugestões de CTA com IA")}>
          <Sparkles className="h-3 w-3" /> Sugerir com IA
        </Button>
      </div>

      <Progress value={Math.min((total / goal) * 100, 100)} className="h-1.5" />

      <Accordion type="multiple" className="space-y-1">
        {FORMULA_OBJECTIVES.map((obj) => {
          const objEntries = entries.filter((e) => e.objective === obj.key);
          return (
            <AccordionItem key={obj.key} value={obj.key} className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{obj.label}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">{obj.description}</span>
                  <Badge variant="outline" className="text-[10px]">{objEntries.length}/3</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {objEntries.length === 0 && PLACEHOLDERS[obj.key] && (
                  <p className="text-xs text-muted-foreground italic">{PLACEHOLDERS[obj.key]}</p>
                )}
                {objEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm bg-accent/30 rounded-md px-2.5 py-1.5">
                    <span className="flex-1 truncate">{e.text}</span>
                    <button onClick={() => removeEntry(e.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}

                {addingFor === obj.key ? (
                  <div className="flex gap-2 items-center pt-1">
                    <Input className="flex-1 h-8 text-xs" placeholder="Texto do CTA" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEntry(obj.key)} />
                    <Button size="sm" className="h-8 text-xs" onClick={() => addEntry(obj.key)}>Adicionar</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingFor(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-xs gap-1 w-full justify-start" onClick={() => { setAddingFor(obj.key); setNewText(""); }}>
                    <Plus className="h-3 w-3" /> Adicionar CTA
                  </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FORMULA_FRAMES } from "@/lib/formulaConstants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, X, Sparkles, Anchor } from "lucide-react";

interface HookEntry {
  id: string;
  text: string;
  frame: string;
  format: string;
  style: "question" | "statement" | "command" | "statistic" | "story";
  is_ai_generated: boolean;
}

interface HookBankProps {
  projectId: string;
  briefing: any;
}

const PLACEHOLDERS: Record<string, string> = {
  villain: 'Ex: "Pare de acreditar que X funciona"',
  surprising_number: 'Ex: "97% das marcas erram nisso — e você?"',
  binary_comparison: 'Ex: "X vs Y: qual realmente funciona?"',
  future_vs_past: 'Ex: "Antes eu fazia X. Hoje faço Y."',
  myth_vs_reality: 'Ex: "Todo mundo diz que X. A verdade é outra."',
  own_framework: 'Ex: "O método de 3 passos que mudou nossos resultados"',
  timing: 'Ex: "Você tem 48h para fazer isso"',
  problem_solution: 'Ex: "Se você sofre com X, isso vai mudar tudo"',
  behind_scenes: 'Ex: "O que ninguém mostra sobre nosso processo"',
  contrarian: 'Ex: "Conselho impopular: pare de fazer X"',
  extreme_case: 'Ex: "Como saímos de R$0 para R$1M em 6 meses"',
  actionable_checklist: 'Ex: "5 sinais de que sua marca está estagnada"',
  timeline_journey: 'Ex: "A jornada de 0 a 10K seguidores"',
  aggressive_comparison: 'Ex: "Enquanto eles fazem X, nós fazemos Y"',
  prediction: 'Ex: "Em 2026 isso vai ser obrigatório"',
  vulnerable: 'Ex: "O maior erro que cometi na minha carreira"',
};

export default function HookBank({ projectId, briefing }: HookBankProps) {
  const [entries, setEntries] = useState<HookEntry[]>(() => {
    const b = briefing as any;
    return Array.isArray(b?.hook_bank) ? b.hook_bank : [];
  });
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const preferredFrames: string[] = (briefing as any)?.formula?.preferred_frames ?? FORMULA_FRAMES.map(f => f.key);
  const activeFrames = FORMULA_FRAMES.filter(f => preferredFrames.includes(f.key));

  const save = useCallback((data: HookEntry[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { data: current } = await supabase.from("projects").select("briefing").eq("id", projectId).single();
      const merged = { ...((current?.briefing as any) ?? {}), hook_bank: data };
      await supabase.from("projects").update({ briefing: merged as any }).eq("id", projectId);
    }, 2000);
  }, [projectId]);

  useEffect(() => {
    const b = briefing as any;
    if (Array.isArray(b?.hook_bank)) setEntries(b.hook_bank);
  }, [briefing]);

  const addEntry = (frame: string) => {
    if (!newText.trim()) return;
    const entry: HookEntry = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      frame,
      format: "all",
      style: "statement",
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
  const goal = activeFrames.length * 2;

  return (
    <div className="card-flat p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Anchor className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Banco de Hooks</h3>
          <Badge variant="secondary" className="text-xs">{total}/{goal}</Badge>
        </div>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => toast.info("Em breve: sugestões de hooks com IA")}>
          <Sparkles className="h-3 w-3" /> Sugerir com IA
        </Button>
      </div>

      <Progress value={Math.min((total / goal) * 100, 100)} className="h-1.5" />

      <Accordion type="multiple" className="space-y-1">
        {activeFrames.map((frame) => {
          const frameEntries = entries.filter((e) => e.frame === frame.key);
          return (
            <AccordionItem key={frame.key} value={frame.key} className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{frame.label}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">{frame.description}</span>
                  <Badge variant="outline" className="text-[10px]">{frameEntries.length}/2</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {frameEntries.length === 0 && PLACEHOLDERS[frame.key] && (
                  <p className="text-xs text-muted-foreground italic">{PLACEHOLDERS[frame.key]}</p>
                )}
                {frameEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm bg-accent/30 rounded-md px-2.5 py-1.5">
                    <span className="flex-1 truncate">{e.text}</span>
                    <button onClick={() => removeEntry(e.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}

                {addingFor === frame.key ? (
                  <div className="flex gap-2 items-center pt-1">
                    <Input className="flex-1 h-8 text-xs" placeholder="Texto do hook" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEntry(frame.key)} />
                    <Button size="sm" className="h-8 text-xs" onClick={() => addEntry(frame.key)}>Adicionar</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingFor(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-xs gap-1 w-full justify-start" onClick={() => { setAddingFor(frame.key); setNewText(""); }}>
                    <Plus className="h-3 w-3" /> Adicionar Hook
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

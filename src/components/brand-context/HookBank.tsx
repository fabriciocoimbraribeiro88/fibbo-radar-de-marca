import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FORMULA_FRAMES } from "@/lib/formulaConstants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const STYLE_BADGES: Record<string, { label: string; className: string }> = {
  question: { label: "Pergunta", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  statement: { label: "Afirmação", className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300" },
  command: { label: "Comando", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  statistic: { label: "Estatística", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  story: { label: "História", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

const FORMAT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "reels", label: "Reels" },
  { value: "carrossel", label: "Carrossel" },
  { value: "estatico", label: "Estático" },
];

const PLACEHOLDERS: Record<string, { text: string; style: string }> = {
  villain: { text: "Pare de acreditar que X funciona", style: "command" },
  surprising_number: { text: "97% das marcas erram nisso — e você?", style: "statistic" },
  binary_comparison: { text: "X vs Y: qual realmente funciona?", style: "question" },
  future_vs_past: { text: "Antes eu fazia X. Hoje faço Y. A diferença:", style: "story" },
  myth_vs_reality: { text: "Todo mundo diz que X. A verdade é outra.", style: "statement" },
  own_framework: { text: "O método de 3 passos que mudou nossos resultados", style: "statement" },
  timing: { text: "Você tem 48h para fazer isso antes que seja tarde", style: "command" },
  problem_solution: { text: "Se você sofre com X, isso vai mudar tudo", style: "statement" },
  behind_scenes: { text: "O que ninguém mostra sobre nosso processo", style: "story" },
  contrarian: { text: "Conselho impopular: pare de fazer X", style: "command" },
  extreme_case: { text: "Como saímos de R$0 para R$1M em 6 meses", style: "story" },
  actionable_checklist: { text: "5 sinais de que sua marca está estagnada", style: "statistic" },
  timeline_journey: { text: "A jornada de 0 a 10K seguidores: o que aprendi", style: "story" },
  aggressive_comparison: { text: "Enquanto eles fazem X, nós fazemos Y", style: "statement" },
  prediction: { text: "Em 2026 isso vai ser obrigatório", style: "statement" },
  vulnerable: { text: "O maior erro que cometi na minha carreira", style: "story" },
};

export default function HookBank({ projectId, briefing }: HookBankProps) {
  const [entries, setEntries] = useState<HookEntry[]>(() => {
    const b = briefing as any;
    return Array.isArray(b?.hook_bank) ? b.hook_bank : [];
  });
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newFormat, setNewFormat] = useState("all");
  const [newStyle, setNewStyle] = useState<HookEntry["style"]>("statement");
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
      format: newFormat,
      style: newStyle,
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
          const ph = PLACEHOLDERS[frame.key];
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
                {frameEntries.length === 0 && ph && (
                  <p className="text-xs text-muted-foreground italic">Ex: "{ph.text}"</p>
                )}
                {frameEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm bg-accent/30 rounded-md px-2.5 py-1.5">
                    <span className="flex-1 truncate">{e.text}</span>
                    <Badge className={`text-[10px] ${STYLE_BADGES[e.style]?.className}`}>{STYLE_BADGES[e.style]?.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{FORMAT_OPTIONS.find(f => f.value === e.format)?.label ?? e.format}</Badge>
                    <button onClick={() => removeEntry(e.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}

                {addingFor === frame.key ? (
                  <div className="flex flex-wrap gap-2 items-end pt-1">
                    <Input className="flex-1 min-w-[180px] h-8 text-xs" placeholder="Texto do hook" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEntry(frame.key)} />
                    <Select value={newFormat} onValueChange={setNewFormat}>
                      <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{FORMAT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={newStyle} onValueChange={(v) => setNewStyle(v as any)}>
                      <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STYLE_BADGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs" onClick={() => addEntry(frame.key)}>Adicionar</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingFor(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-xs gap-1 w-full justify-start" onClick={() => { setAddingFor(frame.key); setNewText(""); setNewFormat("all"); setNewStyle("statement"); }}>
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

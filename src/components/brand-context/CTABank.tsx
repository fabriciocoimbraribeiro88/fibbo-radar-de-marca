import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FORMULA_OBJECTIVES } from "@/lib/formulaConstants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const INTENSITY_BADGES: Record<string, { label: string; className: string }> = {
  soft: { label: "Suave", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  medium: { label: "Médio", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  strong: { label: "Forte", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const FORMAT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "reels", label: "Reels" },
  { value: "carrossel", label: "Carrossel" },
  { value: "stories", label: "Stories" },
  { value: "estatico", label: "Estático" },
];

const PLACEHOLDERS: Record<string, Record<string, string>> = {
  awareness: { soft: "Salva pra lembrar", medium: "Compartilha com quem precisa ver", strong: "Ativa o sininho — vem coisa boa" },
  education: { soft: "Comenta qual dica vai aplicar", medium: "Salva esse carrossel", strong: "Manda pro amigo que precisa disso" },
  authority: { soft: "Concorda? Comenta aí", medium: "Compartilha com quem discorda", strong: "Marca alguém que precisa repensar isso" },
  conversion: { soft: "Saiba mais no link", medium: "Link na bio → fale com a gente", strong: "Últimas vagas — DM agora" },
  community: { soft: "Qual é a sua opinião?", medium: "Marca quem concorda", strong: "Conta nos comentários sua experiência" },
  social_proof: { soft: "Quer resultado assim?", medium: "DM que explico como", strong: "Agenda sua sessão — link na bio" },
  product: { soft: "Conheça mais", medium: "Veja os detalhes no link", strong: "Garanta o seu — estoque limitado" },
};

export default function CTABank({ projectId, briefing }: CTABankProps) {
  const [entries, setEntries] = useState<CTAEntry[]>(() => {
    const b = briefing as any;
    return Array.isArray(b?.cta_bank) ? b.cta_bank : [];
  });
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newFormat, setNewFormat] = useState("all");
  const [newIntensity, setNewIntensity] = useState<"soft" | "medium" | "strong">("medium");
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
      format: newFormat,
      intensity: newIntensity,
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
                  <Badge variant="outline" className="text-[10px]">{objEntries.length}/3</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {objEntries.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Ex: {Object.values(PLACEHOLDERS[obj.key] ?? {}).join(" · ")}
                  </p>
                )}
                {objEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm bg-accent/30 rounded-md px-2.5 py-1.5">
                    <span className="flex-1 truncate">{e.text}</span>
                    <Badge className={`text-[10px] ${INTENSITY_BADGES[e.intensity]?.className}`}>{INTENSITY_BADGES[e.intensity]?.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{FORMAT_OPTIONS.find(f => f.value === e.format)?.label ?? e.format}</Badge>
                    <button onClick={() => removeEntry(e.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </div>
                ))}

                {addingFor === obj.key ? (
                  <div className="flex flex-wrap gap-2 items-end pt-1">
                    <Input className="flex-1 min-w-[180px] h-8 text-xs" placeholder="Texto do CTA" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEntry(obj.key)} />
                    <Select value={newFormat} onValueChange={setNewFormat}>
                      <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{FORMAT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={newIntensity} onValueChange={(v) => setNewIntensity(v as any)}>
                      <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soft">Suave</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="strong">Forte</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs" onClick={() => addEntry(obj.key)}>Adicionar</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingFor(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-xs gap-1 w-full justify-start" onClick={() => { setAddingFor(obj.key); setNewText(""); setNewFormat("all"); setNewIntensity("medium"); }}>
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

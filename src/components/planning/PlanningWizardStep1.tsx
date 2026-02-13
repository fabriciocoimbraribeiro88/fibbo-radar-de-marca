import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Instagram, Megaphone, Search, FileText } from "lucide-react";
import type { WizardData, Channel } from "@/pages/ProjectPlanning";

const CHANNELS: { value: Channel; label: string; icon: typeof Instagram; emoji: string }[] = [
  { value: "social", label: "Social", icon: Instagram, emoji: "📱" },
  { value: "ads", label: "Ads", icon: Megaphone, emoji: "📢" },
  { value: "seo", label: "SEO", icon: Search, emoji: "🔍" },
];

const CONTEXT_OPTIONS = [
  { key: "identity", label: "Identidade da Marca" },
  { key: "pillars", label: "Pilares de Conteúdo" },
  { key: "hashtags", label: "Estratégia de Hashtags" },
  { key: "seasonal", label: "Calendário Sazonal" },
  { key: "products", label: "Produtos" },
  { key: "memory", label: "Memória Estratégica" },
  { key: "references", label: "Referências" },
];

interface Props {
  projectId: string;
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
  onNext: () => void;
  onBack: () => void;
}

export default function PlanningWizardStep1({ projectId, wizardData, setWizardData, onNext, onBack }: Props) {
  const { data: analyses } = useQuery({
    queryKey: ["analyses-for-planning", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, type, period_start, period_end, status, created_at")
        .eq("project_id", projectId)
        .in("status", ["review", "approved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const canProceed = wizardData.analysisId && wizardData.channel;

  const toggleContext = (key: string) => {
    setWizardData((d) => ({
      ...d,
      contextIncludes: d.contextIncludes.includes(key)
        ? d.contextIncludes.filter((k) => k !== key)
        : [...d.contextIncludes, key],
    }));
  };

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Novo Planejamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">Etapa 1 de 3 — Base, Canal & Contexto</p>
      </div>

      {/* Analysis selection */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-foreground mb-3 block">Análise Base</Label>
        <div className="space-y-2">
          {analyses?.map((a) => (
            <Card
              key={a.id}
              className={`cursor-pointer transition-colors ${
                wizardData.analysisId === a.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/30"
              }`}
              onClick={() => setWizardData((d) => ({ ...d, analysisId: a.id }))}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.period_start && `${new Date(a.period_start).toLocaleDateString("pt-BR")}${a.period_end ? ` – ${new Date(a.period_end).toLocaleDateString("pt-BR")}` : ""}`}
                    {` · ${a.status === "approved" ? "Aprovada" : "Em revisão"}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!analyses || analyses.length === 0) && (
            <p className="text-sm text-muted-foreground">Nenhuma análise disponível. Crie e aprove uma análise primeiro.</p>
          )}
        </div>
      </div>

      {/* Channel selection */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-foreground mb-3 block">Canal</Label>
        <div className="grid grid-cols-3 gap-3">
          {CHANNELS.map((ch) => (
            <Card
              key={ch.value}
              className={`cursor-pointer transition-colors text-center ${
                wizardData.channel === ch.value ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/30"
              }`}
              onClick={() => setWizardData((d) => ({ ...d, channel: ch.value }))}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <span className="text-2xl">{ch.emoji}</span>
                <span className="text-sm font-medium text-foreground">{ch.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Context includes */}
      <div className="mb-8">
        <Label className="text-sm font-medium text-foreground mb-3 block">Contexto a Incluir</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONTEXT_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/30 transition-colors"
            >
              <Checkbox
                checked={wizardData.contextIncludes.includes(opt.key)}
                onCheckedChange={() => toggleContext(opt.key)}
              />
              <span className="text-sm text-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

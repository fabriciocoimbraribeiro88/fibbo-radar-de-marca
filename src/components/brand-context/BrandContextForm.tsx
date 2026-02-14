import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type SaveStatus = "idle" | "saving" | "saved";

interface BriefingData {
  basic_info: { sector: string; positioning: string; purpose: string };
  tone_of_voice: { personality: string; communication_style: string; characteristics: { how_speaks: string; feeling: string; approach: string } };
  word_universe: { technical: string; emotional: string; benefits: string; experience: string };
  values_essence: { values: string; essence: string; mission: string; vision: string };
  target_audience: { demographics: string; psychographics: string; pain_points: string; language: string };
  competitive_edge: { unique: string; advantages: string; value_proposition: string };
  communication_guidelines: { always: string; never: string; avoid: string };
  specific_language: { jargon: string; expressions: string; forbidden_words: string; preferred_synonyms: string };
  emotional_context: { desired_emotion: string; memory: string; connection: string };
  references: { success_cases: string; positive_benchmarks: string; cases_to_avoid: string };
  practical_application: { channels: string; channel_adaptations: string; seasonality: string };
  success_metrics: { effectiveness_metrics: string; expected_feedback: string };
}

const emptyBriefing: BriefingData = {
  basic_info: { sector: "", positioning: "", purpose: "" },
  tone_of_voice: { personality: "", communication_style: "", characteristics: { how_speaks: "", feeling: "", approach: "" } },
  word_universe: { technical: "", emotional: "", benefits: "", experience: "" },
  values_essence: { values: "", essence: "", mission: "", vision: "" },
  target_audience: { demographics: "", psychographics: "", pain_points: "", language: "" },
  competitive_edge: { unique: "", advantages: "", value_proposition: "" },
  communication_guidelines: { always: "", never: "", avoid: "" },
  specific_language: { jargon: "", expressions: "", forbidden_words: "", preferred_synonyms: "" },
  emotional_context: { desired_emotion: "", memory: "", connection: "" },
  references: { success_cases: "", positive_benchmarks: "", cases_to_avoid: "" },
  practical_application: { channels: "", channel_adaptations: "", seasonality: "" },
  success_metrics: { effectiveness_metrics: "", expected_feedback: "" },
};

function deepMerge(target: any, source: any): any {
  if (!source) return target;
  const result = { ...target };
  for (const key of Object.keys(target)) {
    if (typeof target[key] === "object" && target[key] !== null && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key] ?? target[key];
    }
  }
  return result;
}

interface Props {
  projectId: string;
  briefing: any;
  logoUrl?: string | null;
  onFillWithAI?: () => void;
  isFillingAI?: boolean;
}

export default function BrandContextForm({ projectId, briefing, logoUrl, onFillWithAI, isFillingAI }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BriefingData>(deepMerge(emptyBriefing, briefing));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(logoUrl ?? null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLogo(logoUrl ?? null);
  }, [logoUrl]);
  // Single effect: sync form whenever briefing prop changes (including AI fill)
  useEffect(() => {
    setForm(deepMerge(emptyBriefing, briefing));
  }, [briefing]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(
    async (data: BriefingData) => {
      if (!projectId) return;
      setSaveStatus("saving");
      const merged = { ...(briefing ?? {}), ...data };
      const { error } = await supabase
        .from("projects")
        .update({ briefing: merged as any })
        .eq("id", projectId);
      if (!error) {
        setSaveStatus("saved");
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
      }
    },
    [projectId, queryClient, briefing]
  );

  const update = (path: string, value: string) => {
    const keys = path.split(".");
    setForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(next), 2000);
      return next;
    });
  };

  const getValue = (path: string): string => {
    const keys = path.split(".");
    let obj: any = form;
    for (const k of keys) obj = obj?.[k];
    return obj ?? "";
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use PNG, JPG, SVG ou WEBP.", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${projectId}/brand/logo/logo_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signedData, error: signedErr } = await supabase.storage.from("brand-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedErr) throw signedErr;
      const url = signedData.signedUrl;
      const { error: updateErr } = await supabase.from("projects").update({ logo_url: url }).eq("id", projectId);
      if (updateErr) throw updateErr;
      setCurrentLogo(url);
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Logo atualizada!" });
    } catch (err) {
      toast({ title: "Erro no upload", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    const { error } = await supabase.from("projects").update({ logo_url: null }).eq("id", projectId);
    if (!error) {
      setCurrentLogo(null);
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Logo removida" });
    }
  };

  const Field = ({ label, path, rows }: { label: string; path: string; rows?: number }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {rows ? (
        <Textarea value={getValue(path)} onChange={(e) => update(path, e.target.value)} rows={rows} />
      ) : (
        <Input value={getValue(path)} onChange={(e) => update(path, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Formulário de Contexto</h2>
          <p className="text-sm text-muted-foreground mt-1">
            12 seções que definem a identidade completa da marca.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando…</>
            )}
            {saveStatus === "saved" && (
              <><CheckCircle2 className="h-3.5 w-3.5 text-primary" />Salvo</>
            )}
          </div>
          {onFillWithAI && (
            <Button
              onClick={onFillWithAI}
              disabled={isFillingAI}
              className="gradient-coral text-white"
              size="sm"
            >
              {isFillingAI ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Preencher com IA
            </Button>
          )}
        </div>
      </div>

      {/* Logo upload */}
      <div className="card-flat p-4">
        <Label className="text-xs text-muted-foreground mb-2 block">Logo da Marca</Label>
        <div className="flex items-center gap-4">
          {currentLogo ? (
            <div className="relative group">
              <img src={currentLogo} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border/30 bg-accent/30 p-1" />
              <button
                onClick={removeLogo}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center bg-accent/20">
              <Upload className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
              {currentLogo ? "Trocar logo" : "Enviar logo"}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, SVG ou WEBP</p>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["basic_info"]} className="space-y-2">
        <AccordionItem value="basic_info" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">1. Informações Básicas</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Setor" path="basic_info.sector" />
            <Field label="Posicionamento" path="basic_info.positioning" />
            <Field label="Propósito da Marca" path="basic_info.purpose" rows={3} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tone_of_voice" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">2. Tom de Voz e Linguagem Verbal</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Personalidade da Marca" path="tone_of_voice.personality" />
            <Field label="Estilo de Comunicação" path="tone_of_voice.communication_style" />
            <Field label="Como a marca fala?" path="tone_of_voice.characteristics.how_speaks" rows={2} />
            <Field label="Que sentimento transmite?" path="tone_of_voice.characteristics.feeling" rows={2} />
            <Field label="Como se aproxima do público?" path="tone_of_voice.characteristics.approach" rows={2} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="word_universe" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">3. Universo de Palavras</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Universo Técnico/Profissional" path="word_universe.technical" rows={3} />
            <Field label="Universo Emocional" path="word_universe.emotional" rows={3} />
            <Field label="Universo de Benefícios" path="word_universe.benefits" rows={3} />
            <Field label="Universo de Experiência" path="word_universe.experience" rows={3} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="values_essence" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">4. Valores e Essência</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Valores Fundamentais" path="values_essence.values" rows={3} />
            <Field label="Essência da Marca" path="values_essence.essence" />
            <Field label="Missão" path="values_essence.mission" rows={2} />
            <Field label="Visão" path="values_essence.vision" rows={2} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="target_audience" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">5. Público-Alvo</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Demografia" path="target_audience.demographics" rows={2} />
            <Field label="Psicografia" path="target_audience.psychographics" rows={3} />
            <Field label="Pain Points" path="target_audience.pain_points" rows={3} />
            <Field label="Linguagem do Público" path="target_audience.language" rows={2} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="competitive_edge" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">6. Diferencial Competitivo</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="O que Torna Única" path="competitive_edge.unique" rows={3} />
            <Field label="Vantagens Competitivas" path="competitive_edge.advantages" rows={3} />
            <Field label="Proposta de Valor" path="competitive_edge.value_proposition" rows={3} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="communication_guidelines" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">7. Diretrizes de Comunicação</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="SEMPRE" path="communication_guidelines.always" rows={4} />
            <Field label="NUNCA" path="communication_guidelines.never" rows={4} />
            <Field label="EVITAR" path="communication_guidelines.avoid" rows={4} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="specific_language" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">8. Linguagem Específica</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Jargões do Setor" path="specific_language.jargon" rows={3} />
            <Field label="Expressões da Marca" path="specific_language.expressions" rows={3} />
            <Field label="Palavras Proibidas" path="specific_language.forbidden_words" rows={2} />
            <Field label="Sinônimos Preferenciais" path="specific_language.preferred_synonyms" rows={3} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="emotional_context" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">9. Contexto Emocional</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Emoção que Quer Despertar" path="emotional_context.desired_emotion" rows={2} />
            <Field label="Como Quer Ser Lembrada" path="emotional_context.memory" rows={2} />
            <Field label="Conexão com o Público" path="emotional_context.connection" rows={2} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="references" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">10. Referências e Exemplos</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Comunicações de Sucesso" path="references.success_cases" rows={3} />
            <Field label="Benchmarks Positivos" path="references.positive_benchmarks" rows={3} />
            <Field label="Casos a Evitar" path="references.cases_to_avoid" rows={3} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="practical_application" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">11. Aplicação Prática</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Canais de Comunicação" path="practical_application.channels" rows={2} />
            <Field label="Adaptações por Canal" path="practical_application.channel_adaptations" rows={3} />
            <Field label="Sazonalidades" path="practical_application.seasonality" rows={2} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="success_metrics" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">12. Métricas de Sucesso</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Field label="Indicadores de Efetividade" path="success_metrics.effectiveness_metrics" rows={3} />
            <Field label="Feedback Esperado" path="success_metrics.expected_feedback" rows={3} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Users,
  Shuffle,
  Sparkles,
  Eye,
  Loader2,
  Calendar,
  Rocket,
  Stethoscope,
} from "lucide-react";

const ANALYSIS_TYPES = [
  { value: "brand_diagnosis", label: "Diagnóstico da Marca", description: "Análise profunda da sua marca", icon: Stethoscope },
  { value: "competitor_analysis", label: "Análise de Concorrentes", description: "Análise individual de cada concorrente", icon: Users },
  { value: "cross_analysis", label: "Análise Cruzada", description: "Marca vs. Concorrentes vs. Influencers", icon: Shuffle },
  { value: "influencer_analysis", label: "Análise de Influencers", description: "Análise de influenciadores", icon: Sparkles },
  { value: "inspiration_analysis", label: "Análise de Inspirações", description: "Análise de marcas inspiradoras", icon: Eye },
] as const;

const REPORT_SECTIONS = [
  { key: "big_numbers", label: "Big Numbers", always: true },
  { key: "performance", label: "Análise de Performance", always: true },
  { key: "sentiment", label: "Análise de Sentimento", always: true },
  { key: "formats", label: "Análise de Formatos", always: true },
  { key: "themes", label: "Análise de Temas", always: true },
  { key: "temporal", label: "Análise Temporal / Sazonalidade", always: true },
  { key: "hashtags", label: "Análise de Hashtags", always: true },
  { key: "recommendations", label: "Recomendações Estratégicas", always: true },
  { key: "content_bank", label: "Banco de Conteúdo", always: true },
  { key: "creative_guidelines", label: "Diretrizes Criativas", onlyTypes: ["brand_diagnosis"] },
  { key: "blue_oceans", label: "Oceanos Azuis", onlyTypes: ["cross_analysis"] },
  { key: "differentiation_matrix", label: "Matriz de Diferenciação", onlyTypes: ["cross_analysis"] },
];

const STEPS = ["Tipo", "Entidades", "Período", "Parâmetros", "Revisar"];

export default function NewAnalysis() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [analysisType, setAnalysisType] = useState("");
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>(
    REPORT_SECTIONS.filter((s) => s.always).map((s) => s.key)
  );
  const [creating, setCreating] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: entities } = useQuery({
    queryKey: ["project-entities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_entities")
        .select("*, monitored_entities(*)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const toggleEntity = (id: string) => {
    setSelectedEntities((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const visibleSections = REPORT_SECTIONS.filter(
    (s) => s.always || s.onlyTypes?.includes(analysisType)
  );

  const typeLabel = ANALYSIS_TYPES.find((t) => t.value === analysisType)?.label ?? "";

  const canNext = () => {
    if (step === 0) return !!analysisType;
    if (step === 1) {
      // Brand diagnosis doesn't require additional entities
      if (analysisType === "brand_diagnosis") return true;
      return selectedEntities.length > 0;
    }
    if (step === 2) return !!periodStart && !!periodEnd;
    if (step === 3) return selectedSections.length > 0;
    return true;
  };

  const handleCreate = async () => {
    if (!projectId || !user) return;
    setCreating(true);
    try {
      const title = `${typeLabel} — ${new Date().toLocaleDateString("pt-BR")}`;
      const { data, error } = await supabase
        .from("analyses")
        .insert({
          project_id: projectId,
          title,
          type: analysisType,
          status: "draft",
          period_start: periodStart,
          period_end: periodEnd,
          entities_included: selectedEntities,
          parameters: { sections: selectedSections } as any,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Trigger the pipeline
      const { error: fnErr } = await supabase.functions.invoke("run-analysis-pipeline", {
        body: { analysis_id: data.id },
      });

      if (fnErr) {
        toast({ title: "Análise criada, mas pipeline falhou", description: fnErr.message, variant: "destructive" });
      } else {
        toast({ title: "Análise iniciada!", description: "Os agentes IA estão trabalhando." });
      }

      navigate(`/projects/${projectId}/analyses/${data.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao criar análise", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const entitiesByType = (type: string) =>
    entities?.filter((e) => e.entity_role === type) ?? [];

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Nova Análise</h1>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`text-xs font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}
            >
              {s}
            </span>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      </div>

      {/* Step 0: Type */}
      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ANALYSIS_TYPES.map((t) => (
            <Card
              key={t.value}
              className={`cursor-pointer transition-all ${
                analysisType === t.value
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => setAnalysisType(t.value)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <t.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 1: Entities */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Brand always included */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Marca (sempre incluída)</p>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  {project?.brand_name?.slice(0, 2).toUpperCase() ?? "MR"}
                </div>
                <span className="text-sm font-medium text-foreground">{project?.brand_name ?? project?.name}</span>
                <Badge className="ml-auto bg-primary/20 text-primary">Marca</Badge>
              </CardContent>
            </Card>
          </div>

          {(["competitor", "influencer", "inspiration"] as const).map((type) => {
            const items = entitiesByType(type);
            if (!items.length) return null;
            const labels: Record<string, string> = {
              competitor: "Concorrentes",
              influencer: "Influencers",
              inspiration: "Inspirações",
            };
            return (
              <div key={type}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{labels[type]}</p>
                <div className="space-y-2">
                  {items.map((pe) => {
                    const e = pe.monitored_entities;
                    if (!e) return null;
                    const checked = selectedEntities.includes(e.id);
                    return (
                      <Card
                        key={pe.id}
                        className={`cursor-pointer transition-all ${checked ? "ring-1 ring-primary/50 bg-primary/5" : "hover:bg-accent/50"}`}
                        onClick={() => toggleEntity(e.id)}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <Checkbox checked={checked} onCheckedChange={() => toggleEntity(e.id)} />
                          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                            {e.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{e.name}</p>
                            {e.instagram_handle && (
                              <p className="text-xs text-muted-foreground">{e.instagram_handle}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 2: Period */}
      {step === 2 && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Período da análise</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data inicial</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data final</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A análise usará os dados coletados neste período. Certifique-se de que os dados já foram coletados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Parameters */}
      {step === 3 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-foreground mb-4">Seções do relatório</p>
            <div className="space-y-3">
              {visibleSections.map((s) => (
                <label
                  key={s.key}
                  className="flex items-center gap-3 cursor-pointer rounded-lg p-2 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedSections.includes(s.key)}
                    onCheckedChange={() => toggleSection(s.key)}
                  />
                  <span className="text-sm text-foreground">{s.label}</span>
                  {!s.always && (
                    <Badge variant="secondary" className="text-[10px]">
                      Exclusivo
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-medium text-foreground mb-2">Resumo da Análise</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium text-foreground">{typeLabel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Entidades</span>
                <span className="font-medium text-foreground">{selectedEntities.length + 1} (incluindo marca)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Período</span>
                <span className="font-medium text-foreground">
                  {periodStart && new Date(periodStart).toLocaleDateString("pt-BR")} –{" "}
                  {periodEnd && new Date(periodEnd).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Seções</span>
                <span className="font-medium text-foreground">{selectedSections.length} selecionadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Iniciar Análise
          </Button>
        )}
      </div>
    </div>
  );
}

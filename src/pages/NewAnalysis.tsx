import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Loader2,
  Settings,
  Users,
  FileText,
  Eye,
} from "lucide-react";
import AnalysisStep1 from "@/components/analysis/AnalysisStep1";
import AnalysisStep2 from "@/components/analysis/AnalysisStep2";
import AnalysisStep3 from "@/components/analysis/AnalysisStep3";
import AnalysisStep4 from "@/components/analysis/AnalysisStep4";
import {
  ANALYSIS_TYPES,
  getDefaultSections,
  calculatePeriodFromPreset,
  calculatePreviousPeriod,
} from "@/lib/analysisSections";

const STEPS = [
  { label: "Configurar", icon: Settings },
  { label: "Fontes", icon: Users },
  { label: "Seções", icon: FileText },
  { label: "Prévia", icon: Eye },
];

export default function NewAnalysis() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Step 1
  const [channel, setChannel] = useState<"social" | "ads" | "seo">("social");
  const [analysisType, setAnalysisType] = useState("");
  const [combinedTypes, setCombinedTypes] = useState<Set<string>>(new Set(["brand", "competitor"]));
  const [periodMode, setPeriodMode] = useState<"date" | "count">("date");
  const [periodPreset, setPeriodPreset] = useState("this_quarter");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [postsLimit, setPostsLimit] = useState(50);
  const [comparePrevious, setComparePrevious] = useState(false);
  const [largeDatasetAck, setLargeDatasetAck] = useState(false);

  // Step 2
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());

  // Step 3
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  // Step 4
  const [title, setTitle] = useState("");

  // Initialize period from preset
  useEffect(() => {
    if (periodPreset !== "custom") {
      const { start, end } = calculatePeriodFromPreset(periodPreset);
      setPeriodStart(start);
      setPeriodEnd(end);
    }
  }, [periodPreset]);

  // Reset sections when channel/type changes
  useEffect(() => {
    if (analysisType) {
      setSelectedSections(getDefaultSections(channel, analysisType));
      setSelectedEntities(new Set());
    }
  }, [channel, analysisType]);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Generate title when entering step 4
  useEffect(() => {
    if (step === 3) {
      const brandName = project?.brand_name ?? project?.name ?? "Marca";
      const channelLabel = channel === "social" ? "Social" : channel === "ads" ? "Ads" : "SEO";
      const typeLabel = ANALYSIS_TYPES.find((t) => t.value === analysisType)?.label ?? "";
      let periodLabel = "";
      if (periodMode === "count") {
        periodLabel = `${postsLimit} posts`;
      } else if (periodStart && periodEnd) {
        const s = new Date(periodStart);
        const e = new Date(periodEnd);
        periodLabel = `${s.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })} — ${e.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`;
      }
      setTitle(`${brandName} - ${channelLabel} - ${typeLabel} - ${periodLabel}`);
    }
  }, [step, project]);

  const { data: projectEntities } = useQuery({
    queryKey: ["project-entities-full", projectId],
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

  // Check data availability
  const { data: hasAdsData } = useQuery({
    queryKey: ["has-ads-data", projectId],
    queryFn: async () => {
      const entityIds = projectEntities?.map((pe) => pe.entity_id) ?? [];
      if (!entityIds.length) return false;
      const { count } = await supabase.from("ads_library").select("id", { count: "exact", head: true }).in("entity_id", entityIds);
      return (count ?? 0) > 0;
    },
    enabled: !!projectEntities,
  });

  const { data: hasSeoData } = useQuery({
    queryKey: ["has-seo-data", projectId],
    queryFn: async () => {
      const entityIds = projectEntities?.map((pe) => pe.entity_id) ?? [];
      if (!entityIds.length) return false;
      const { count } = await supabase.from("seo_data").select("id", { count: "exact", head: true }).in("entity_id", entityIds);
      return (count ?? 0) > 0;
    },
    enabled: !!projectEntities,
  });

  const brandEntity = projectEntities?.find((pe) => pe.entity_role === "brand")
    ?? projectEntities?.find((pe) => pe.monitored_entities?.instagram_handle === project?.instagram_handle);
  const entities = (projectEntities ?? []).map((pe) => ({
    id: pe.monitored_entities?.id ?? pe.entity_id,
    name: pe.monitored_entities?.name ?? "",
    instagram_handle: pe.monitored_entities?.instagram_handle,
    entity_role: pe.entity_role,
  }));

  const isLargeDataset =
    analysisType === "cross_analysis" &&
    periodMode === "date" &&
    periodStart &&
    periodEnd &&
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000 > 90;

  const canNext = () => {
    if (step === 0) {
      if (!analysisType) return false;
      if (periodMode === "date" && (!periodStart || !periodEnd || new Date(periodStart) >= new Date(periodEnd))) return false;
      if (isLargeDataset && !largeDatasetAck) return false;
      return true;
    }
    if (step === 1) {
      if (analysisType === "brand_diagnosis") return true;
      return selectedEntities.size > 0;
    }
    if (step === 2) return selectedSections.size > 0;
    return true;
  };

  const handleCreate = async () => {
    if (!projectId || !user) return;
    setCreating(true);
    try {
      const prevPeriod = comparePrevious && periodStart && periodEnd
        ? calculatePreviousPeriod(periodStart, periodEnd)
        : null;

      const { data, error } = await supabase
        .from("analyses")
        .insert({
          project_id: projectId,
          title,
          type: analysisType,
          status: "draft",
          period_start: periodMode === "date" ? periodStart : null,
          period_end: periodMode === "date" ? periodEnd : null,
          entities_included: [
            ...(["brand_diagnosis", "cross_analysis"].includes(analysisType) && brandEntity?.entity_id ? [brandEntity.entity_id] : []),
            ...Array.from(selectedEntities),
          ].filter(Boolean) as string[],
          parameters: {
            channel,
            sections: Array.from(selectedSections),
            posts_limit: periodMode === "count" ? postsLimit : null,
            compare_previous: comparePrevious,
            previous_period_start: prevPeriod?.start ?? null,
            previous_period_end: prevPeriod?.end ?? null,
            combined_types: analysisType === "cross_analysis" ? Array.from(combinedTypes) : null,
            large_dataset_ack: largeDatasetAck,
          } as any,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: fnErr } = await supabase.functions.invoke("run-analysis-pipeline", {
        body: { analysis_id: data.id },
      });

      if (fnErr) {
        toast({
          title: "Análise criada, mas pipeline falhou",
          description: fnErr.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Análise iniciada!",
          description: "Acompanhe o progresso na próxima tela.",
        });
        navigate(`/projects/${projectId}/analyses/${data.id}`);
      }
    } catch (err: any) {
      toast({ title: "Erro ao criar análise", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Novo Relatório</h1>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div
              key={s.label}
              className={`flex items-center gap-1.5 ${
                i <= step ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
      </div>

      {/* Steps */}
      {step === 0 && (
        <AnalysisStep1
          channel={channel}
          setChannel={setChannel}
          analysisType={analysisType}
          setAnalysisType={setAnalysisType}
          combinedTypes={combinedTypes}
          setCombinedTypes={setCombinedTypes}
          periodMode={periodMode}
          setPeriodMode={setPeriodMode}
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          periodStart={periodStart}
          setPeriodStart={setPeriodStart}
          periodEnd={periodEnd}
          setPeriodEnd={setPeriodEnd}
          postsLimit={postsLimit}
          setPostsLimit={setPostsLimit}
          comparePrevious={comparePrevious}
          setComparePrevious={setComparePrevious}
          largeDatasetAck={largeDatasetAck}
          setLargeDatasetAck={setLargeDatasetAck}
          hasAdsData={hasAdsData ?? false}
          hasSeoData={hasSeoData ?? false}
        />
      )}

      {step === 1 && (
        <AnalysisStep2
          channel={channel}
          project={project ?? null}
          entities={entities}
          selectedEntities={selectedEntities}
          setSelectedEntities={setSelectedEntities}
          analysisType={analysisType}
        />
      )}

      {step === 2 && (
        <AnalysisStep3
          channel={channel}
          analysisType={analysisType}
          selectedSections={selectedSections}
          setSelectedSections={setSelectedSections}
        />
      )}

      {step === 3 && (
        <AnalysisStep4
          channel={channel}
          analysisType={analysisType}
          periodMode={periodMode}
          periodStart={periodStart}
          periodEnd={periodEnd}
          postsLimit={postsLimit}
          comparePrevious={comparePrevious}
          selectedEntities={selectedEntities}
          selectedSections={selectedSections}
          title={title}
          setTitle={setTitle}
          projectId={projectId!}
          brandEntityId={brandEntity?.entity_id ?? null}
          allEntities={entities}
        />
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {step < 3 ? (
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
            Gerar Análise
          </Button>
        )}
      </div>
    </div>
  );
}

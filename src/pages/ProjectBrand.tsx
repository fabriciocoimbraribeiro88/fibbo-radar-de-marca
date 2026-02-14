import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Target, Package, LayoutGrid, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import BrandContextForm from "@/components/brand-context/BrandContextForm";
import HashtagStrategy from "@/components/brand-context/HashtagStrategy";
import SeasonalCalendar from "@/components/brand-context/SeasonalCalendar";
import ProductsCatalog from "@/components/brand-context/ProductsCatalog";

export default function ProjectBrand() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isFillingAI] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Check sources for context strength
  const { data: sources } = useQuery({
    queryKey: ["brand-sources", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_context_sources")
        .select("id, status, source_type")
        .eq("project_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: entities } = useQuery({
    queryKey: ["project-entities-count", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_entities")
        .select("id")
        .eq("project_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Context strength
  const processedSources = sources?.filter((s) => s.status === "processed") ?? [];
  const hasEntities = (entities?.length ?? 0) > 0;
  const hasSources = (sources?.length ?? 0) > 0;
  const hasProcessedSources = processedSources.length > 0;
  const sourceTypes = new Set(sources?.map((s) => s.source_type) ?? []);
  const isWeak = hasSources && sources!.length <= 1;

  const contextScore = (() => {
    let score = 0;
    if (hasEntities) score += 25;
    if (hasSources) score += 25;
    if (hasProcessedSources) score += 25;
    if (sources && sources.length >= 3) score += 15;
    if (sourceTypes.size >= 2) score += 10;
    return Math.min(score, 100);
  })();

  const canProceed = hasEntities && hasSources;

  const handleFillWithAI = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.functions.invoke("fill-brand-context", {
        body: { project_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Contexto de marca preenchido com IA!");
    } catch (e) {
      toast.error("Erro ao preencher: " + (e as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const tabs = [
    { value: "identity", label: "Identidade", icon: Target },
    { value: "content", label: "Conteúdo", icon: LayoutGrid },
    { value: "products", label: "Produtos", icon: Package },
  ];

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Contexto de Marca</h1>
        <p className="page-subtitle">
          Briefing completo da marca para contextualizar as análises. Preencha manualmente ou use IA.
        </p>
      </div>

      {/* Context Strength Bar */}
      <div className="card-flat p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Força do Contexto
          </span>
          <Badge
            variant="secondary"
            className={`text-xs border-0 rounded-full ${
              contextScore >= 80
                ? "bg-emerald-500/10 text-emerald-600"
                : contextScore >= 40
                ? "bg-amber-500/10 text-amber-600"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {contextScore}%
          </Badge>
        </div>
        <Progress value={contextScore} className="h-1.5 mb-2" />
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            {hasEntities ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <AlertTriangle className="h-3 w-3 text-muted-foreground/50" />}
            Fontes de dados
          </span>
          <span className="flex items-center gap-1">
            {hasSources ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <AlertTriangle className="h-3 w-3 text-muted-foreground/50" />}
            Docs/Briefings
          </span>
          <span className="flex items-center gap-1">
            {hasProcessedSources ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <AlertTriangle className="h-3 w-3 text-muted-foreground/50" />}
            Processadas
          </span>
        </div>
      </div>

      {/* Warnings */}
      {!canProceed && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong>Fontes necessárias.</strong> Adicione pelo menos uma fonte de dados e um documento/briefing na seção{" "}
            <a href={`/projects/${id}/sources`} className="text-primary underline underline-offset-2">Fontes de Dados</a>{" "}
            antes de gerar o contexto de marca.
          </AlertDescription>
        </Alert>
      )}

      {isWeak && canProceed && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong>Contexto fraco.</strong> Apenas {sources!.length} fonte adicionada. Para um contexto mais rico, adicione mais materiais (briefings, docs, URLs) na seção{" "}
            <a href={`/projects/${id}/sources`} className="text-primary underline underline-offset-2">Fontes de Dados</a>.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="identity" className="space-y-6">
        <div className="bg-accent/50 rounded-xl p-1 inline-flex flex-wrap gap-0.5">
          {tabs.map((tab) => (
            <TabsList key={tab.value} className="bg-transparent p-0 h-auto">
              <TabsTrigger
                value={tab.value}
                disabled={!canProceed}
                className="gap-1.5 text-xs sm:text-sm rounded-lg px-4 py-2 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-card/80 disabled:opacity-40"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            </TabsList>
          ))}
        </div>

        <TabsContent value="identity" className="space-y-6">
          <BrandContextForm
            projectId={id!}
            briefing={project?.briefing}
            onFillWithAI={handleFillWithAI}
            isFillingAI={isFillingAI}
          />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <HashtagStrategy projectId={id!} briefing={project?.briefing} />
          <SeasonalCalendar projectId={id!} briefing={project?.briefing} segment={project?.segment} />
        </TabsContent>

        <TabsContent value="products">
          <ProductsCatalog projectId={id!} briefing={project?.briefing} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Target, Package, LayoutGrid, AlertTriangle, ShieldAlert, ArrowRight, Database } from "lucide-react";
import BrandContextForm from "@/components/brand-context/BrandContextForm";
import HashtagStrategy from "@/components/brand-context/HashtagStrategy";
import SeasonalCalendar from "@/components/brand-context/SeasonalCalendar";
import ProductsCatalog from "@/components/brand-context/ProductsCatalog";
import ContextStrengthBar from "@/components/brand-context/ContextStrengthBar";

export default function ProjectBrand() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFillingAI, setIsFillingAI] = useState(false);

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

  // Check sources for blocking
  const { data: sourceData } = useQuery({
    queryKey: ["brand-context-check", id],
    queryFn: async () => {
      const [sourcesRes, entitiesRes] = await Promise.all([
        supabase.from("brand_context_sources").select("id, status, source_type").eq("project_id", id!),
        supabase.from("project_entities").select("id").eq("project_id", id!),
      ]);
      return {
        sources: sourcesRes.data ?? [],
        entityCount: entitiesRes.data?.length ?? 0,
      };
    },
    enabled: !!id,
  });

  const hasEntities = (sourceData?.entityCount ?? 0) > 0;
  const hasSources = (sourceData?.sources.length ?? 0) > 0;
  const canProceed = hasEntities && hasSources;
  const isWeak = hasSources && sourceData!.sources.length <= 1;

  const handleFillWithAI = async () => {
    if (!id) return;
    setIsFillingAI(true);
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
    } finally {
      setIsFillingAI(false);
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
      <div className="mb-6">
        <ContextStrengthBar projectId={id!} />
      </div>

      {/* Blocked state */}
      {!canProceed && (
        <div className="card-flat p-8 text-center mb-6">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-2">Fontes necessárias</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Adicione pelo menos uma fonte de dados e um documento/briefing na seção Fontes de Dados antes de gerar o contexto de marca.
          </p>
          <Button
            className="gradient-coral text-white rounded-lg shadow-sm"
            onClick={() => navigate(`/projects/${id}/sources`)}
          >
            <Database className="mr-2 h-4 w-4" />
            Ir para Fontes de Dados
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Weak warning */}
      {isWeak && canProceed && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong>Contexto fraco</strong> — suas fontes são limitadas. Adicione mais documentos, URLs ou texto na seção{" "}
            <button onClick={() => navigate(`/projects/${id}/sources`)} className="text-primary underline underline-offset-2">
              Fontes de Dados
            </button>{" "}
            para gerar um contexto mais completo e preciso.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs — disabled if can't proceed */}
      <div className={!canProceed ? "opacity-40 pointer-events-none" : ""}>
        <Tabs defaultValue="identity" className="space-y-6">
          <div className="bg-accent/50 rounded-xl p-1 inline-flex flex-wrap gap-0.5">
            {tabs.map((tab) => (
              <TabsList key={tab.value} className="bg-transparent p-0 h-auto">
                <TabsTrigger
                  value={tab.value}
                  className="gap-1.5 text-xs sm:text-sm rounded-lg px-4 py-2 text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-medium hover:bg-card/80"
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
    </div>
  );
}

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Target, Package, Brain, FileText, LayoutGrid } from "lucide-react";
import BrandContextSources from "@/components/brand-context/BrandContextSources";
import BrandContextForm from "@/components/brand-context/BrandContextForm";
import HashtagStrategy from "@/components/brand-context/HashtagStrategy";
import SeasonalCalendar from "@/components/brand-context/SeasonalCalendar";
import ProductsCatalog from "@/components/brand-context/ProductsCatalog";
import StrategicMemory from "@/components/brand-context/StrategicMemory";

export default function ProjectBrand() {
  const { id } = useParams<{ id: string }>();
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
    { value: "memory", label: "Memória", icon: Brain },
    { value: "sources", label: "Fontes", icon: FileText },
  ];

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Contexto de Marca</h1>
        <p className="page-subtitle">
          Briefing completo da marca para contextualizar as análises. Preencha manualmente ou use IA.
        </p>
      </div>

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

        <TabsContent value="memory">
          <StrategicMemory projectId={id!} briefing={project?.briefing} />
        </TabsContent>

        <TabsContent value="sources">
          <BrandContextSources projectId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

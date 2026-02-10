import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import BrandContextSources from "@/components/brand-context/BrandContextSources";
import BrandContextForm from "@/components/brand-context/BrandContextForm";

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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Contexto de Marca</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Briefing completo da marca para contextualizar as análises. Preencha manualmente ou use IA.
        </p>
      </div>

      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sources">Fontes de Contexto</TabsTrigger>
          <TabsTrigger value="form">Formulário de Contexto</TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          <BrandContextSources
            projectId={id!}
            onFillWithAI={handleFillWithAI}
            isFillingAI={isFillingAI}
          />
        </TabsContent>

        <TabsContent value="form">
          <BrandContextForm projectId={id!} briefing={project?.briefing} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

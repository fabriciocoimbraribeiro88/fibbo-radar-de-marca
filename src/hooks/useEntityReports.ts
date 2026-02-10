import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EntityReport {
  id: string;
  entity_id: string;
  project_id: string;
  computed_metrics: any;
  ai_analysis: string | null;
  model_used: string | null;
  posts_analyzed: number;
  created_at: string;
  created_by: string | null;
}

export function useEntityReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ["entity-reports", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("entity_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EntityReport[];
    },
    enabled: !!projectId,
  });
}

export function useProjectEntities(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-entities-for-reports", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_entities")
        .select("entity_id, entity_role, monitored_entities(id, name, instagram_handle)")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data ?? []).map((pe: any) => ({
        id: pe.monitored_entities?.id ?? pe.entity_id,
        name: pe.monitored_entities?.name ?? "",
        handle: pe.monitored_entities?.instagram_handle ?? "",
        role: pe.entity_role,
      }));
    },
    enabled: !!projectId,
  });
}

export function useGenerateReport(projectId: string | undefined) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const queryClient = useQueryClient();

  const generate = async (entityId: string, useAi = true) => {
    if (!projectId) return;
    setIsGenerating(true);
    setProgress("Buscando posts e calculando métricas...");
    try {
      const { data, error } = await supabase.functions.invoke("process-entity-data", {
        body: { entity_id: entityId, project_id: projectId, use_ai: useAi },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProgress("");
      toast.success(`Relatório gerado! ${data.posts_analyzed} posts analisados.`);
      queryClient.invalidateQueries({ queryKey: ["entity-reports", projectId] });
      return data;
    } catch (err: any) {
      toast.error(`Erro ao gerar relatório: ${err.message}`);
      throw err;
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  return { generate, isGenerating, progress };
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  const deleteReport = async (reportId: string, projectId: string) => {
    const { error } = await supabase.from("entity_reports").delete().eq("id", reportId);
    if (error) {
      toast.error("Erro ao excluir relatório");
      throw error;
    }
    toast.success("Relatório excluído");
    queryClient.invalidateQueries({ queryKey: ["entity-reports", projectId] });
  };

  return { deleteReport };
}

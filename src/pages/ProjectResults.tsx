import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResultsOverview } from "@/components/results/ResultsOverview";
import { OKRsPanel } from "@/components/results/OKRsPanel";
import { ReportsPanel } from "@/components/results/ReportsPanel";
import { NPSPanel } from "@/components/results/NPSPanel";
import { ResultsSettings } from "@/components/results/ResultsSettings";

export default function ProjectResults() {
  const { id: projectId } = useParams<{ id: string }>();

  const { data: project } = useQuery({
    queryKey: ["project-contracted-services", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("contracted_services")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const contractedChannels: string[] =
    (project?.contracted_services as any)?.channels ?? [];

  if (!projectId) return null;

  return (
    <div className="max-w-5xl animate-fade-in">
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="okrs">OKRs</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="nps">NPS</TabsTrigger>
          <TabsTrigger value="settings">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ResultsOverview projectId={projectId} contractedChannels={contractedChannels} />
        </TabsContent>

        <TabsContent value="okrs">
          <OKRsPanel projectId={projectId} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsPanel projectId={projectId} contractedChannels={contractedChannels} />
        </TabsContent>

        <TabsContent value="nps">
          <NPSPanel projectId={projectId} />
        </TabsContent>

        <TabsContent value="settings">
          <ResultsSettings projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

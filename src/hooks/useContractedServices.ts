import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContractedServices {
  channels: string[];
  package_name?: string;
  start_date?: string;
  renewal_date?: string;
  monthly_fee?: number;
}

export function useContractedServices(projectId: string | undefined) {
  const { data, isLoading } = useQuery({
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

  const cs = data?.contracted_services as ContractedServices | null;
  const channels: string[] = cs?.channels ?? [];

  return {
    channels,
    services: cs ?? { channels: [] },
    isLoading,
    hasChannel: (ch: string) => channels.includes(ch),
  };
}

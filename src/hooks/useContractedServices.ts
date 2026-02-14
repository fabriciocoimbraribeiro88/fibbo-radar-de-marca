import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContractedServices(projectId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["contracted-services", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("contracted_services")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      const cs = (data?.contracted_services as any) ?? {};
      return (cs.channels as string[]) ?? [];
    },
    enabled: !!projectId,
  });

  return {
    channels: data ?? [],
    isLoading,
    hasChannel: (ch: string) => (data ?? []).includes(ch),
  };
}

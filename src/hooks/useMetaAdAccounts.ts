import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMetaAdAccounts(projectId?: string) {
  return useQuery({
    queryKey: ["meta-ad-accounts", projectId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("meta_ad_accounts")
        .select("*")
        .order("created_at", { ascending: true });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllMetaAdAccounts() {
  return useQuery({
    queryKey: ["meta-ad-accounts", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_ad_accounts")
        .select("*")
        .order("account_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

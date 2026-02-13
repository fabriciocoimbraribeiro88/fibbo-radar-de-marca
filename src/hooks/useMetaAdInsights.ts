import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaInsightsTotals {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgCpc: number;
  avgCpm: number;
  avgCtr: number;
  currency: string;
}

export interface MetaInsightsData {
  daily: any[];
  campaigns: any[];
  totals: MetaInsightsTotals | null;
}

export function useMetaAdInsights(
  projectId: string | undefined,
  metaAccountId?: string
) {
  return useQuery<MetaInsightsData>({
    queryKey: ["meta-ad-insights", projectId ?? "none", metaAccountId ?? "all"],
    queryFn: async () => {
      // Get accounts for this project (or specific account)
      let accountsQuery = supabase
        .from("meta_ad_accounts")
        .select("id, meta_account_id, currency")
        .eq("is_active", true);

      if (metaAccountId) {
        accountsQuery = accountsQuery.eq("meta_account_id", metaAccountId);
      } else if (projectId) {
        accountsQuery = accountsQuery.eq("project_id", projectId);
      } else {
        return { daily: [], campaigns: [], totals: null };
      }

      const { data: accounts } = await accountsQuery;
      if (!accounts?.length)
        return { daily: [], campaigns: [], totals: null };

      const accountRefIds = accounts.map((a) => a.id);
      const currency = accounts[0].currency || "BRL";

      // Fetch daily account-level insights
      const { data: daily } = await supabase
        .from("meta_ad_insights")
        .select("*")
        .in("account_ref", accountRefIds)
        .eq("level", "account")
        .order("date_start", { ascending: true });

      // Fetch campaign-level insights (latest only for summary)
      const { data: campaigns } = await supabase
        .from("meta_ad_insights")
        .select("*")
        .in("account_ref", accountRefIds)
        .eq("level", "campaign")
        .order("date_start", { ascending: false });

      // Calculate totals from daily data
      const dailyRows = daily ?? [];
      let totals: MetaInsightsTotals | null = null;

      if (dailyRows.length > 0) {
        const totalSpend = dailyRows.reduce(
          (s, r) => s + (Number(r.spend) || 0),
          0
        );
        const totalImpressions = dailyRows.reduce(
          (s, r) => s + (Number(r.impressions) || 0),
          0
        );
        const totalClicks = dailyRows.reduce(
          (s, r) => s + (Number(r.clicks) || 0),
          0
        );
        const totalReach = dailyRows.reduce(
          (s, r) => s + (Number(r.reach) || 0),
          0
        );

        totals = {
          totalSpend,
          totalImpressions,
          totalClicks,
          totalReach,
          avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
          avgCpm:
            totalImpressions > 0
              ? (totalSpend / totalImpressions) * 1000
              : 0,
          avgCtr:
            totalImpressions > 0
              ? (totalClicks / totalImpressions) * 100
              : 0,
          currency,
        };
      }

      // Aggregate campaigns: group by campaign_id to get totals per campaign
      const campaignRows = campaigns ?? [];
      const campaignAgg = new Map<string, any>();
      for (const row of campaignRows) {
        const key = row.campaign_id || "unknown";
        if (!campaignAgg.has(key)) {
          campaignAgg.set(key, {
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
            campaign_objective: row.campaign_objective,
            campaign_status: row.campaign_status,
            impressions: 0,
            clicks: 0,
            spend: 0,
            reach: 0,
          });
        }
        const agg = campaignAgg.get(key)!;
        agg.impressions += Number(row.impressions) || 0;
        agg.clicks += Number(row.clicks) || 0;
        agg.spend += Number(row.spend) || 0;
        agg.reach += Number(row.reach) || 0;
      }

      const aggregatedCampaigns = Array.from(campaignAgg.values()).map(
        (c) => ({
          ...c,
          cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
          ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        })
      );

      return {
        daily: dailyRows,
        campaigns: aggregatedCampaigns,
        totals,
      };
    },
    enabled: !!(projectId || metaAccountId),
    staleTime: 5 * 60 * 1000,
  });
}

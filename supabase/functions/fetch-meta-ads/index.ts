import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

// ── Pagination helper for Meta Graph API ──
async function fetchAllPages(
  baseUrl: string,
  token: string
): Promise<any[]> {
  const all: any[] = [];
  let nextUrl: string | null = `${baseUrl}&access_token=${token}`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Meta API error (${res.status}): ${text.substring(0, 300)}`
      );
    }
    const json = await res.json();
    if (json.data) all.push(...json.data);
    nextUrl = json.paging?.next ?? null;
    // Small delay to respect rate limits
    if (nextUrl) await new Promise((r) => setTimeout(r, 200));
  }

  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const accessToken = Deno.env.get("META_ADS_ACCESS_TOKEN");

  if (!accessToken) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "META_ADS_ACCESS_TOKEN não configurado",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ── ACTION: sync-accounts ──
    if (action === "sync-accounts") {
      return await handleSyncAccounts(supabase, accessToken);
    }

    // ── ACTION: assign-account ──
    if (action === "assign-account") {
      return await handleAssignAccount(supabase, body);
    }

    // ── ACTION: fetch-insights ──
    if (action === "fetch-insights") {
      return await handleFetchInsights(supabase, accessToken, body);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Ação desconhecida: ${action}. Use: sync-accounts, assign-account, fetch-insights`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ══════════════════════════════════════════════
// ACTION: sync-accounts
// Fetches ALL ad accounts from Meta and upserts them
// ══════════════════════════════════════════════
async function handleSyncAccounts(supabase: any, token: string) {
  const accounts = await fetchAllPages(
    `${META_API_BASE}/me/adaccounts?fields=id,name,account_status,business_name,currency,timezone_name&limit=100`,
    token
  );

  const rows = accounts.map((a: any) => ({
    meta_account_id: a.id,
    account_name: a.name,
    business_name: a.business_name ?? null,
    currency: a.currency ?? "BRL",
    timezone_name: a.timezone_name ?? null,
    account_status: a.account_status ?? 1,
    is_active: a.account_status === 1,
  }));

  const BATCH = 50;
  let synced = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("meta_ad_accounts")
      .upsert(batch, { onConflict: "meta_account_id", ignoreDuplicates: false });
    if (error) {
      console.error("Upsert error:", error.message);
    } else {
      synced += batch.length;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      accounts_synced: synced,
      accounts: rows.map((r: any) => ({
        id: r.meta_account_id,
        name: r.account_name,
        business_name: r.business_name,
        account_status: r.account_status,
      })),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ══════════════════════════════════════════════
// ACTION: assign-account
// Maps a Meta ad account to a project/entity
// ══════════════════════════════════════════════
async function handleAssignAccount(supabase: any, body: any) {
  const { meta_account_id, project_id, entity_id } = body;

  if (!meta_account_id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "meta_account_id é obrigatório",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const updateData: Record<string, any> = {};
  if (project_id !== undefined) updateData.project_id = project_id;
  if (entity_id !== undefined) updateData.entity_id = entity_id;

  const { error } = await supabase
    .from("meta_ad_accounts")
    .update(updateData)
    .eq("meta_account_id", meta_account_id);

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Conta atualizada" }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ══════════════════════════════════════════════
// ACTION: fetch-insights
// Fetches campaigns, ads, and insights for one account
// ══════════════════════════════════════════════
async function handleFetchInsights(
  supabase: any,
  token: string,
  body: any
) {
  const {
    meta_account_id,
    project_id,
    date_preset = "last_30d",
  } = body;

  if (!meta_account_id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "meta_account_id é obrigatório",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Find the account reference in our DB
  const { data: accountRow } = await supabase
    .from("meta_ad_accounts")
    .select("id, entity_id")
    .eq("meta_account_id", meta_account_id)
    .single();

  const accountRefId = accountRow?.id ?? null;
  const entityId = accountRow?.entity_id ?? null;

  // Create fetch log
  const { data: fetchLog } = await supabase
    .from("data_fetch_logs")
    .insert({ status: "running", started_at: new Date().toISOString() })
    .select()
    .single();
  const logId = fetchLog?.id;

  try {
    // Strip "act_" prefix if present for URL, but Meta API uses act_ format
    const accountId = meta_account_id;

    // ── Step 1: Fetch campaigns ──
    console.log(`Fetching campaigns for ${accountId}...`);
    const campaigns = await fetchAllPages(
      `${META_API_BASE}/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=100`,
      token
    );
    console.log(`Found ${campaigns.length} campaigns`);

    // Build campaign lookup
    const campaignMap = new Map(
      campaigns.map((c: any) => [c.id, c])
    );

    // ── Step 2: Fetch ads with creatives ──
    console.log(`Fetching ads for ${accountId}...`);
    const ads = await fetchAllPages(
      `${META_API_BASE}/${accountId}/ads?fields=id,name,status,campaign_id,creative{title,body,image_url,video_id,call_to_action_type,object_story_spec,thumbnail_url}&limit=100`,
      token
    );
    console.log(`Found ${ads.length} ads`);

    // Upsert ads into ads_library
    const adRows = ads.map((ad: any) => {
      const creative = ad.creative || {};
      const campaign = campaignMap.get(ad.campaign_id) || {};
      return {
        entity_id: entityId,
        platform: "meta",
        ad_id: ad.id,
        ad_title: creative.title ?? ad.name ?? null,
        ad_body: creative.body ?? null,
        ad_creative_url: creative.image_url ?? creative.thumbnail_url ?? null,
        ad_type: campaign.objective ?? null,
        is_active: ad.status === "ACTIVE",
        campaign_id: ad.campaign_id ?? null,
        campaign_name: campaign.name ?? null,
        campaign_objective: campaign.objective ?? null,
        meta_account_ref: accountRefId,
        cta_text: creative.call_to_action_type ?? null,
        metadata: ad,
        fetched_at: new Date().toISOString(),
      };
    });

    // Batch upsert ads
    const AD_BATCH = 100;
    let adsImported = 0;
    for (let i = 0; i < adRows.length; i += AD_BATCH) {
      const batch = adRows.slice(i, i + AD_BATCH);
      const { error } = await supabase.from("ads_library").upsert(batch, {
        onConflict: "id",
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`Ads upsert error at batch ${i}:`, error.message);
      } else {
        adsImported += batch.length;
      }
    }

    // ── Step 3: Fetch account-level insights (daily breakdown) ──
    console.log(`Fetching account-level insights for ${accountId}...`);
    let accountInsights: any[] = [];
    try {
      const insightsRes = await fetch(
        `${META_API_BASE}/${accountId}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action&date_preset=${date_preset}&time_increment=1&access_token=${token}`
      );
      if (insightsRes.ok) {
        const insightsJson = await insightsRes.json();
        accountInsights = insightsJson.data || [];
        // Follow pagination
        let nextPage = insightsJson.paging?.next;
        while (nextPage) {
          const nextRes = await fetch(nextPage);
          if (!nextRes.ok) break;
          const nextJson = await nextRes.json();
          if (nextJson.data) accountInsights.push(...nextJson.data);
          nextPage = nextJson.paging?.next;
        }
      }
    } catch (err) {
      console.error("Account insights error:", err);
    }
    console.log(`Found ${accountInsights.length} account-level insight rows`);

    // Upsert account-level insights
    const accountInsightRows = accountInsights.map((row: any) => ({
      meta_account_id: accountId,
      account_ref: accountRefId,
      entity_id: entityId,
      campaign_id: null,
      campaign_name: null,
      campaign_status: null,
      campaign_objective: null,
      ad_id: null,
      ad_name: null,
      date_start: row.date_start,
      date_stop: row.date_stop,
      impressions: parseInt(row.impressions || "0"),
      clicks: parseInt(row.clicks || "0"),
      spend: parseFloat(row.spend || "0"),
      cpc: row.cpc ? parseFloat(row.cpc) : null,
      cpm: row.cpm ? parseFloat(row.cpm) : null,
      ctr: row.ctr ? parseFloat(row.ctr) : null,
      reach: parseInt(row.reach || "0"),
      frequency: row.frequency ? parseFloat(row.frequency) : null,
      actions: row.actions ?? null,
      cost_per_action: row.cost_per_action ?? null,
      level: "account",
      fetched_at: new Date().toISOString(),
      metadata: row,
    }));

    let insightsImported = 0;
    const INS_BATCH = 200;
    for (let i = 0; i < accountInsightRows.length; i += INS_BATCH) {
      const batch = accountInsightRows.slice(i, i + INS_BATCH);
      const { error } = await supabase.from("meta_ad_insights").upsert(batch, {
        onConflict: "meta_account_id,campaign_id,ad_id,date_start,level",
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`Account insights upsert error at batch ${i}:`, error.message);
      } else {
        insightsImported += batch.length;
      }
    }

    // ── Step 4: Fetch campaign-level insights ──
    console.log(`Fetching campaign-level insights for ${accountId}...`);
    let campaignInsights: any[] = [];
    try {
      const campInsRes = await fetch(
        `${META_API_BASE}/${accountId}/insights?fields=campaign_id,campaign_name,impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action&date_preset=${date_preset}&time_increment=1&level=campaign&access_token=${token}`
      );
      if (campInsRes.ok) {
        const campInsJson = await campInsRes.json();
        campaignInsights = campInsJson.data || [];
        let nextPage = campInsJson.paging?.next;
        while (nextPage) {
          const nextRes = await fetch(nextPage);
          if (!nextRes.ok) break;
          const nextJson = await nextRes.json();
          if (nextJson.data) campaignInsights.push(...nextJson.data);
          nextPage = nextJson.paging?.next;
        }
      }
    } catch (err) {
      console.error("Campaign insights error:", err);
    }
    console.log(
      `Found ${campaignInsights.length} campaign-level insight rows`
    );

    const campaignInsightRows = campaignInsights.map((row: any) => {
      const camp = campaignMap.get(row.campaign_id) || {};
      return {
        meta_account_id: accountId,
        account_ref: accountRefId,
        entity_id: entityId,
        campaign_id: row.campaign_id ?? null,
        campaign_name: row.campaign_name ?? camp.name ?? null,
        campaign_status: camp.status ?? null,
        campaign_objective: camp.objective ?? null,
        ad_id: null,
        ad_name: null,
        date_start: row.date_start,
        date_stop: row.date_stop,
        impressions: parseInt(row.impressions || "0"),
        clicks: parseInt(row.clicks || "0"),
        spend: parseFloat(row.spend || "0"),
        cpc: row.cpc ? parseFloat(row.cpc) : null,
        cpm: row.cpm ? parseFloat(row.cpm) : null,
        ctr: row.ctr ? parseFloat(row.ctr) : null,
        reach: parseInt(row.reach || "0"),
        frequency: row.frequency ? parseFloat(row.frequency) : null,
        actions: row.actions ?? null,
        cost_per_action: row.cost_per_action ?? null,
        level: "campaign",
        fetched_at: new Date().toISOString(),
        metadata: row,
      };
    });

    for (let i = 0; i < campaignInsightRows.length; i += INS_BATCH) {
      const batch = campaignInsightRows.slice(i, i + INS_BATCH);
      const { error } = await supabase.from("meta_ad_insights").upsert(batch, {
        onConflict: "meta_account_id,campaign_id,ad_id,date_start,level",
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`Campaign insights upsert error at batch ${i}:`, error.message);
      } else {
        insightsImported += batch.length;
      }
    }

    // Update account last_synced_at
    if (accountRefId) {
      await supabase
        .from("meta_ad_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", accountRefId);
    }

    // Update fetch log
    if (logId) {
      await supabase.from("data_fetch_logs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        records_fetched: adsImported + insightsImported,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        message: `${adsImported} anúncios e ${insightsImported} insights importados`,
        ads_count: adsImported,
        insights_count: insightsImported,
        campaigns_count: campaigns.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Erro na coleta";
    console.error("Fetch insights error:", errMsg);

    if (logId) {
      await supabase.from("data_fetch_logs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errMsg,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

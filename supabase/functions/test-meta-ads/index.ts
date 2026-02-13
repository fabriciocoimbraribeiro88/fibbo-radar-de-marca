const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // 1. Validate token by fetching user info
    const meRes = await fetch(
      `${META_API_BASE}/me?fields=id,name&access_token=${accessToken}`
    );
    if (!meRes.ok) {
      const errText = await meRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Token inválido (${meRes.status}): ${errText.substring(0, 200)}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const meData = await meRes.json();

    // 2. Fetch all ad accounts (with pagination)
    const accounts: any[] = [];
    let nextUrl: string | null =
      `${META_API_BASE}/me/adaccounts?fields=id,name,account_status,business_name,currency,timezone_name&limit=100&access_token=${accessToken}`;

    while (nextUrl) {
      const res = await fetch(nextUrl);
      if (!res.ok) {
        const errText = await res.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erro ao buscar contas (${res.status}): ${errText.substring(0, 200)}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const json = await res.json();
      if (json.data) {
        accounts.push(...json.data);
      }
      nextUrl = json.paging?.next ?? null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: meData.id, name: meData.name },
        accounts: accounts.map((a: any) => ({
          id: a.id,
          name: a.name,
          account_status: a.account_status,
          business_name: a.business_name,
          currency: a.currency,
          timezone_name: a.timezone_name,
        })),
      }),
      {
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

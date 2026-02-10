import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apifyToken = Deno.env.get("APIFY_API_TOKEN");

  if (!apifyToken) {
    return new Response(
      JSON.stringify({ success: false, error: "APIFY_API_TOKEN não configurado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const {
      entity_id,
      results_limit = 30,
      date_from,
      date_to,
      collect_ads = false,
      collect_seo = false,
    } = body;

    if (!entity_id) {
      return new Response(
        JSON.stringify({ success: false, error: "entity_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get entity
    const { data: entity, error: entityErr } = await supabase
      .from("monitored_entities")
      .select("*")
      .eq("id", entity_id)
      .single();

    if (entityErr || !entity) {
      return new Response(
        JSON.stringify({ success: false, error: "Entidade não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!entity.instagram_handle) {
      return new Response(
        JSON.stringify({ success: false, error: "Entidade sem handle do Instagram" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const handle = entity.instagram_handle.replace("@", "");

    // Create fetch log
    const { data: fetchLog } = await supabase
      .from("data_fetch_logs")
      .insert({ status: "running", started_at: new Date().toISOString() })
      .select()
      .single();

    const logId = fetchLog?.id;
    let totalRecords = 0;

    try {
      // 1. Fetch profile
      console.log(`Fetching profile for @${handle}...`);
      const profileRun = await runApifyActor(apifyToken, "apify~instagram-profile-scraper", {
        usernames: [handle],
      });

      if (profileRun && profileRun.length > 0) {
        const p = profileRun[0];
        const profileData = {
          entity_id,
          handle,
          snapshot_date: new Date().toISOString().split("T")[0],
          followers_count: p.followersCount ?? p.subscribersCount ?? null,
          following_count: p.followsCount ?? p.followingCount ?? null,
          posts_count: p.postsCount ?? null,
          bio: p.biography ?? p.bio ?? null,
          profile_pic_url: p.profilePicUrl ?? p.profilePicUrlHD ?? null,
          is_verified: p.verified ?? p.isVerified ?? false,
          metadata: p,
        };

        const { error: profileErr } = await supabase.from("instagram_profiles").upsert(profileData, {
          onConflict: "handle,snapshot_date",
          ignoreDuplicates: false,
        });
        if (profileErr) console.error("Profile upsert error:", profileErr.message);
        totalRecords++;
        console.log(`Profile saved for @${handle}`);
      }

      // 2. Fetch posts with options
      console.log(`Fetching posts for @${handle} (limit: ${results_limit}, dateFrom: ${date_from || 'none'}, dateTo: ${date_to || 'none'})...`);
      
      const postInput: Record<string, unknown> = {
        username: [handle],
        resultsLimit: results_limit,
      };

      // If date mode, remove limit so we fetch all and filter after
      if (date_from || date_to) {
        postInput.resultsLimit = 0; // 0 = unlimited in Apify
      }

      const postsRun = await runApifyActor(apifyToken, "apify~instagram-post-scraper", postInput);

      if (postsRun && postsRun.length > 0) {
        let filteredPosts = postsRun;

        // Filter by date if provided
        if (date_from || date_to) {
          const from = date_from ? new Date(date_from).getTime() : 0;
          const to = date_to ? new Date(date_to + "T23:59:59").getTime() : Date.now();
          filteredPosts = postsRun.filter((post: any) => {
            if (!post.timestamp) return true;
            const postTime = new Date(post.timestamp).getTime();
            return postTime >= from && postTime <= to;
          });
        }

        const posts = filteredPosts.map((post: any) => ({
          entity_id,
          post_id_instagram: post.id || post.shortCode || `${handle}_${post.timestamp}`,
          shortcode: post.shortCode ?? null,
          post_url: post.url ?? null,
          post_type: post.type ?? null,
          caption: post.caption ?? null,
          posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
          likes_count: post.likesCount ?? null,
          comments_count: post.commentsCount ?? null,
          views_count: post.videoViewCount ?? post.videoPlayCount ?? null,
          shares_count: null,
          saves_count: null,
          hashtags: post.hashtags ?? null,
          mentions: post.mentions ?? null,
          thumbnail_url: post.displayUrl ?? null,
          media_urls: post.images ?? post.displayUrls ?? null,
          is_pinned: post.isPinned ?? false,
          fetched_at: new Date().toISOString(),
          metadata: post,
        }));

        for (const post of posts) {
          const { error: postErr } = await supabase.from("instagram_posts").upsert(post, {
            onConflict: "post_id_instagram",
            ignoreDuplicates: false,
          });
          if (postErr) console.error("Post upsert error:", postErr.message);
        }
        totalRecords += posts.length;
        console.log(`${posts.length} posts saved for @${handle}`);
      }

      // 3. Collect Ads (placeholder - log intent for now)
      if (collect_ads) {
        console.log(`Ads collection requested for @${handle} — feature pending integration`);
      }

      // 4. Collect SEO (placeholder - log intent for now)
      if (collect_seo) {
        console.log(`SEO collection requested for @${handle} — feature pending integration`);
      }

      // Update fetch log as completed
      if (logId) {
        await supabase
          .from("data_fetch_logs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            records_fetched: totalRecords,
          })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Coleta concluída para @${handle}`,
          records: totalRecords,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      const errMsg = fetchError instanceof Error ? fetchError.message : "Erro na coleta";
      console.error("Fetch error:", errMsg);

      if (logId) {
        await supabase
          .from("data_fetch_logs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: errMsg,
          })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function runApifyActor(
  token: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<any[]> {
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;

  const response = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify actor ${actorId} failed (${response.status}): ${text.substring(0, 300)}`);
  }

  return await response.json();
}

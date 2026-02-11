import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { entity_id, results_limit = 30, action = "start" } = body;

    // ── CHECK action: poll for run status and import results ──
    if (action === "check") {
      return await handleCheck(body, supabase, apifyToken);
    }

    // ── START action: kick off Apify runs ──
    if (!entity_id) {
      return new Response(
        JSON.stringify({ success: false, error: "entity_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    try {
      // 1. Fetch profile SYNCHRONOUSLY (fast, ~5-30s)
      console.log(`Fetching profile for @${handle}...`);
      const profileRun = await runApifyActorSync(apifyToken, "apify~instagram-profile-scraper", {
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
        console.log(`Profile saved for @${handle}`);
      }

      // 2. Start post scraper ASYNCHRONOUSLY (returns immediately with runId)
      const effectiveLimit = (!results_limit || results_limit <= 0) ? 50000 : results_limit;
      console.log(`Starting async post scraper for @${handle} (limit: ${effectiveLimit})...`);

      const postInput = {
        username: [handle],
        resultsLimit: effectiveLimit,
      };

      const runInfo = await startApifyActorAsync(apifyToken, "apify~instagram-post-scraper", postInput);
      console.log(`Post scraper started: runId=${runInfo.id}, datasetId=${runInfo.defaultDatasetId}`);

      // Update fetch log with run info
      if (logId) {
        await supabase
          .from("data_fetch_logs")
          .update({
            apify_run_id: runInfo.id,
            status: "running",
          })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "running",
          message: `Perfil salvo. Coleta de posts iniciada para @${handle}`,
          run_id: runInfo.id,
          dataset_id: runInfo.defaultDatasetId,
          log_id: logId,
          entity_id,
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

// ── Handle CHECK action: poll run status and import results ──
async function handleCheck(
  body: any,
  supabase: any,
  apifyToken: string
) {
  const { run_id, dataset_id, entity_id, log_id } = body;

  if (!run_id) {
    return new Response(
      JSON.stringify({ success: false, error: "run_id é obrigatório para check" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Check run status
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${run_id}?token=${apifyToken}`
    );
    if (!statusRes.ok) {
      throw new Error(`Failed to check run status: ${statusRes.status}`);
    }
    const runData = await statusRes.json();
    const runStatus = runData.data?.status;

    console.log(`Run ${run_id} status: ${runStatus}`);

    if (runStatus === "RUNNING" || runStatus === "READY") {
      return new Response(
        JSON.stringify({
          success: true,
          status: "running",
          message: "Coleta em andamento...",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      if (log_id) {
        await supabase.from("data_fetch_logs").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: `Apify run ${runStatus}`,
        }).eq("id", log_id);
      }
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          error: `Apify run ${runStatus}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SUCCEEDED - fetch dataset items and import
    const effectiveDatasetId = dataset_id || runData.data?.defaultDatasetId;
    if (!effectiveDatasetId) {
      throw new Error("No dataset ID available");
    }

    console.log(`Fetching dataset items from ${effectiveDatasetId}...`);

    // Fetch all items with pagination
    const PAGE_SIZE = 1000;
    let allItems: any[] = [];
    let offset = 0;

    while (true) {
      const itemsRes = await fetch(
        `https://api.apify.com/v2/datasets/${effectiveDatasetId}/items?token=${apifyToken}&limit=${PAGE_SIZE}&offset=${offset}`
      );
      if (!itemsRes.ok) {
        throw new Error(`Failed to fetch dataset items: ${itemsRes.status}`);
      }
      const items = await itemsRes.json();
      if (!items || items.length === 0) break;
      allItems = allItems.concat(items);
      if (items.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    console.log(`Fetched ${allItems.length} items from dataset`);

    // Import posts in batches
    let totalImported = 0;
    const BATCH = 200;

    for (let i = 0; i < allItems.length; i += BATCH) {
      const batch = allItems.slice(i, i + BATCH);
      const posts = batch.map((post: any) => {
        const handle = post.ownerUsername ?? "";
        const viewsCount = post.videoViewCount ?? post.videoPlayCount ?? null;
        
        // Infer post type from multiple signals
        let postType: string | null = post.type || null;
        if (!postType || postType === "Image") {
          const url = post.url || "";
          if (url.includes("/reel/")) {
            postType = "Reel";
          } else if (url.includes("/tv/")) {
            postType = "Video";
          } else if (post.isVideo === true || post.videoUrl || viewsCount) {
            postType = post.productType === "clips" ? "Reel" : "Video";
          } else if (
            (Array.isArray(post.images) && post.images.length > 1) ||
            (Array.isArray(post.sidecarImages) && post.sidecarImages.length > 1) ||
            post.mediaCount > 1 ||
            post.productType === "carousel_container"
          ) {
            postType = "Sidecar";
          } else {
            postType = "Image";
          }
        }
        
        return {
          entity_id,
          post_id_instagram: post.id || post.shortCode || `${handle}_${post.timestamp}`,
          shortcode: post.shortCode ?? null,
          post_url: post.url ?? null,
          post_type: postType,
          caption: post.caption ?? null,
          posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
          likes_count: post.likesCount ?? null,
          comments_count: post.commentsCount ?? null,
          views_count: viewsCount,
          shares_count: null,
          saves_count: null,
          hashtags: post.hashtags ?? null,
          mentions: post.mentions ?? null,
          thumbnail_url: post.displayUrl ?? null,
          media_urls: post.images ?? post.displayUrls ?? null,
          is_pinned: post.isPinned ?? false,
          fetched_at: new Date().toISOString(),
          metadata: post,
        };
      });

      const { data: upsertedPosts, error: upsertErr } = await supabase
        .from("instagram_posts")
        .upsert(posts, { onConflict: "post_id_instagram", ignoreDuplicates: false })
        .select("id, post_id_instagram");

      if (upsertErr) {
        console.error(`Batch upsert error at offset ${i}:`, upsertErr.message);
      } else {
        totalImported += posts.length;

        // Extract comments from latestComments
        if (upsertedPosts) {
          const postIdMap = new Map(upsertedPosts.map((p: any) => [p.post_id_instagram, p.id]));

          for (const rawPost of batch) {
            const comments = rawPost.latestComments;
            if (!Array.isArray(comments) || comments.length === 0) continue;

            const postIdInstagram = rawPost.id || rawPost.shortCode || `${rawPost.ownerUsername}_${rawPost.timestamp}`;
            const dbPostId = postIdMap.get(postIdInstagram);
            if (!dbPostId) continue;

            const mappedComments = comments.map((c: any) => ({
              post_id: dbPostId,
              comment_id_instagram: c.id || `${c.ownerUsername || "anon"}_${c.timestamp || Date.now()}`,
              text: c.text || null,
              username: c.ownerUsername || null,
              commented_at: c.timestamp ? new Date(c.timestamp).toISOString() : null,
              likes_count: c.likesCount ?? 0,
              replied_to: c.repliedTo || null,
              fetched_at: new Date().toISOString(),
              metadata: c,
            }));

            await supabase
              .from("instagram_comments")
              .upsert(mappedComments, { onConflict: "comment_id_instagram", ignoreDuplicates: false });
          }
        }
      }
    }

    console.log(`Imported ${totalImported} posts for entity ${entity_id}`);

    // Update fetch log
    if (log_id) {
      await supabase.from("data_fetch_logs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        records_fetched: totalImported + 1, // +1 for profile
      }).eq("id", log_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        message: `${totalImported} posts importados`,
        records: totalImported,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Check error:", msg);

    if (log_id) {
      await supabase.from("data_fetch_logs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: msg,
      }).eq("id", log_id);
    }

    return new Response(
      JSON.stringify({ success: false, status: "failed", error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// ── Sync call for fast actors (profile) ──
async function runApifyActorSync(
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

// ── Async call for slow actors (posts) ── returns run info immediately
async function startApifyActorAsync(
  token: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<{ id: string; defaultDatasetId: string }> {
  const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
  const response = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify actor ${actorId} start failed (${response.status}): ${text.substring(0, 300)}`);
  }

  const result = await response.json();
  return {
    id: result.data.id,
    defaultDatasetId: result.data.defaultDatasetId,
  };
}

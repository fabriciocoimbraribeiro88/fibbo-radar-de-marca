import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractShortCode(url: string): string | null {
  const match = url?.match(/\/(p|reel|tv)\/([^/?]+)/);
  return match ? match[2] : null;
}

function mapApifyPost(post: any, entityId: string) {
  const shortCode = post.shortCode || extractShortCode(post.url) || null;
  const postIdInstagram =
    post.id || shortCode || `${post.ownerUsername || "unknown"}_${post.timestamp || Date.now()}`;

  const likesCount =
    post.likesCount != null && post.likesCount !== -1 ? post.likesCount : null;
  const commentsCount =
    post.commentsCount != null && post.commentsCount !== -1 ? post.commentsCount : null;
  const viewsCount =
    post.videoViewCount || post.videoPlayCount || null;

  // Media URLs: try images array, then displayUrls, then single displayUrl
  let mediaUrls: string[] | null = null;
  if (Array.isArray(post.images) && post.images.length > 0) {
    mediaUrls = post.images;
  } else if (Array.isArray(post.displayUrls) && post.displayUrls.length > 0) {
    mediaUrls = post.displayUrls;
  }

  // Infer post type when not provided
  let postType: string | null = post.type || null;
  if (!postType) {
    const url = post.url || "";
    if (url.includes("/reel/")) {
      postType = "Reel";
    } else if (url.includes("/tv/")) {
      postType = "Video";
    } else if (post.videoViewCount || post.videoPlayCount) {
      postType = "Video";
    } else if (Array.isArray(post.images) && post.images.length > 1) {
      postType = "Sidecar";
    } else {
      postType = "Image";
    }
  }

  return {
    entity_id: entityId,
    post_id_instagram: postIdInstagram,
    shortcode: shortCode,
    post_url: post.url || null,
    post_type: postType,
    caption: post.caption || null,
    posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
    likes_count: likesCount,
    comments_count: commentsCount,
    views_count: viewsCount,
    
    hashtags: Array.isArray(post.hashtags) && post.hashtags.length > 0 ? post.hashtags : null,
    mentions: Array.isArray(post.mentions) && post.mentions.length > 0 ? post.mentions : null,
    thumbnail_url: post.displayUrl || null,
    media_urls: mediaUrls,
    is_pinned: post.isPinned ?? false,
    fetched_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_id, posts } = await req.json();

    if (!entity_id || !Array.isArray(posts) || posts.length === 0) {
      return new Response(
        JSON.stringify({ error: "entity_id and posts array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify entity exists
    const { data: entity, error: entityError } = await supabase
      .from("monitored_entities")
      .select("id")
      .eq("id", entity_id)
      .single();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: "Entity not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BATCH_SIZE = 500;
    let totalImported = 0;
    let errors: string[] = [];

    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      const mapped = batch.map((p: any) => mapApifyPost(p, entity_id));

      const { error: upsertError, count } = await supabase
        .from("instagram_posts")
        .upsert(mapped, { onConflict: "post_id_instagram", ignoreDuplicates: false })
        .select("id");

      if (upsertError) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`);
      } else {
        totalImported += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        total_imported: totalImported,
        total_received: posts.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

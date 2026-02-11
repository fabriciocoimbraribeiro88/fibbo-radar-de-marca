import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function mapComment(comment: any, postId: string) {
  return {
    post_id: postId,
    comment_id_instagram: comment.id || `${comment.ownerUsername || "anon"}_${comment.timestamp || Date.now()}`,
    text: comment.text || null,
    username: comment.ownerUsername || null,
    commented_at: comment.timestamp ? new Date(comment.timestamp).toISOString() : null,
    likes_count: comment.likesCount ?? 0,
    replied_to: comment.repliedTo || null,
    fetched_at: new Date().toISOString(),
    metadata: comment,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_id, project_id } = await req.json();

    if (!entity_id && !project_id) {
      return new Response(
        JSON.stringify({ error: "entity_id or project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get entity IDs to process
    let entityIds: string[] = [];
    if (entity_id) {
      entityIds = [entity_id];
    } else if (project_id) {
      const { data: pes } = await supabase
        .from("project_entities")
        .select("entity_id")
        .eq("project_id", project_id);
      entityIds = (pes || []).map((pe: any) => pe.entity_id);
    }

    if (entityIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total_comments: 0, message: "No entities found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalComments = 0;
    let totalPosts = 0;
    const errors: string[] = [];

    for (const eid of entityIds) {
      // Paginate through posts with metadata containing latestComments
      const PAGE_SIZE = 500;
      let offset = 0;

      while (true) {
        const { data: posts, error: postsErr } = await supabase
          .from("instagram_posts")
          .select("id, metadata")
          .eq("entity_id", eid)
          .not("metadata", "is", null)
          .range(offset, offset + PAGE_SIZE - 1);

        if (postsErr) {
          errors.push(`Entity ${eid}: ${postsErr.message}`);
          break;
        }
        if (!posts || posts.length === 0) break;

        for (const post of posts) {
          const meta = post.metadata as any;
          const comments = meta?.latestComments;
          if (!Array.isArray(comments) || comments.length === 0) continue;

          const mapped = comments.map((c: any) => mapComment(c, post.id));

          const { error: upsertErr } = await supabase
            .from("instagram_comments")
            .upsert(mapped, { onConflict: "comment_id_instagram", ignoreDuplicates: false });

          if (upsertErr) {
            errors.push(`Post ${post.id}: ${upsertErr.message}`);
          } else {
            totalComments += mapped.length;
            totalPosts++;
          }
        }

        if (posts.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
    }

    console.log(`Extracted ${totalComments} comments from ${totalPosts} posts`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        total_comments: totalComments,
        total_posts_with_comments: totalPosts,
        entities_processed: entityIds.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("extract-comments error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

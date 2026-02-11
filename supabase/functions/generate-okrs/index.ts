import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, quarter, year, channel, special_instructions } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Fetch project data
    const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" };

    const projectRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&select=*`, { headers });
    const [project] = await projectRes.json();

    // Fetch brand entity
    const entitiesRes = await fetch(`${supabaseUrl}/rest/v1/project_entities?project_id=eq.${project_id}&select=entity_id,entity_role,monitored_entities(id,name,instagram_handle)`, { headers });
    const entities = await entitiesRes.json();
    const brandEntity = entities.find((e: any) => e.entity_role === "brand");
    const brandEntityId = brandEntity?.entity_id;

    // Fetch latest Instagram profile
    let profileData: any = null;
    if (brandEntityId) {
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/instagram_profiles?entity_id=eq.${brandEntityId}&order=snapshot_date.desc&limit=1`, { headers });
      const profiles = await profileRes.json();
      profileData = profiles[0] || null;
    }

    // Fetch recent posts metrics
    let postsMetrics: any = null;
    if (brandEntityId) {
      const postsRes = await fetch(`${supabaseUrl}/rest/v1/instagram_posts?entity_id=eq.${brandEntityId}&order=posted_at.desc&limit=50&select=likes_count,comments_count,engagement_total,saves_count,shares_count,post_type`, { headers });
      const posts = await postsRes.json();
      if (posts.length > 0) {
        const totalLikes = posts.reduce((s: number, p: any) => s + (p.likes_count ?? 0), 0);
        const totalComments = posts.reduce((s: number, p: any) => s + (p.comments_count ?? 0), 0);
        const totalEng = posts.reduce((s: number, p: any) => s + (p.engagement_total ?? (p.likes_count ?? 0) + (p.comments_count ?? 0)), 0);
        postsMetrics = {
          count: posts.length,
          avg_likes: Math.round(totalLikes / posts.length),
          avg_comments: Math.round(totalComments / posts.length),
          avg_engagement: Math.round(totalEng / posts.length),
          engagement_rate: profileData?.followers_count
            ? Number(((totalEng / posts.length) / profileData.followers_count * 100).toFixed(2))
            : null,
        };
      }
    }

    // Fetch latest approved analysis
    const analysisRes = await fetch(`${supabaseUrl}/rest/v1/analyses?project_id=eq.${project_id}&status=eq.approved&order=created_at.desc&limit=1`, { headers });
    const [latestAnalysis] = await analysisRes.json();

    // Fetch competitor data for benchmarks
    const competitors = entities.filter((e: any) => e.entity_role === "competitor");
    let competitorBenchmarks: any[] = [];
    for (const comp of competitors.slice(0, 3)) {
      const compProfileRes = await fetch(`${supabaseUrl}/rest/v1/instagram_profiles?entity_id=eq.${comp.entity_id}&order=snapshot_date.desc&limit=1`, { headers });
      const [compProfile] = await compProfileRes.json();
      if (compProfile) {
        competitorBenchmarks.push({
          name: comp.monitored_entities?.name,
          followers: compProfile.followers_count,
        });
      }
    }

    // Build prompt
    const systemPrompt = `Você é um especialista em estratégia digital. Gere OKRs realistas baseados nos dados atuais da marca e benchmarks dos concorrentes.

REGRAS:
- Máximo 3 objetivos
- 2-4 key results por objetivo  
- Metas devem ser ambiciosas mas atingíveis (crescimento de 10-30% por quarter)
- Baselines devem refletir dados reais fornecidos
- Cada KR deve ter unidade de medida clara
- Responsáveis devem ser genéricos (Equipe de Conteúdo, Equipe de Performance, Equipe de Marketing)
- Considerar sazonalidade e tendências
- O campo metric_direction deve ser: increase, decrease, maintain ou achieve
- O campo data_source deve ser: manual, instagram, ads ou analytics

Responda SOMENTE com JSON válido no formato:
{
  "objectives": [
    {
      "title": "string",
      "description": "string",
      "channel": "instagram|social|ads|seo|general",
      "key_results": [
        {
          "title": "string",
          "metric_direction": "increase|decrease|maintain|achieve",
          "baseline_value": number,
          "target_value": number,
          "unit": "string",
          "data_source": "manual|instagram|ads|analytics",
          "responsible": "string"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Dados da marca "${project?.brand_name || project?.name}":
${profileData ? `- Seguidores: ${profileData.followers_count}\n- Following: ${profileData.following_count}\n- Posts: ${profileData.posts_count}` : "- Sem dados de perfil"}
${postsMetrics ? `- Média de likes: ${postsMetrics.avg_likes}\n- Média de comentários: ${postsMetrics.avg_comments}\n- Engajamento médio: ${postsMetrics.avg_engagement}\n- Taxa de engajamento: ${postsMetrics.engagement_rate}%` : ""}

Concorrentes (benchmark):
${competitorBenchmarks.length > 0 ? competitorBenchmarks.map(c => `- ${c.name}: ${c.followers} seguidores`).join("\n") : "- Sem dados de concorrentes"}

Quarter: ${quarter} ${year}
Canal foco: ${channel}
${special_instructions ? `\nInstruções adicionais: ${special_instructions}` : ""}

Gere OKRs para este quarter.`;

    // Call AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

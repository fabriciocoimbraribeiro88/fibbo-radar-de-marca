import { supabase } from "@/integrations/supabase/client";

interface EntityEntry {
  name: string;
  instagram_handle: string;
  website_url: string;
  type: "competitor" | "influencer" | "inspiration";
}

interface CreateProjectParams {
  projectName: string;
  brandName: string;
  segment: string;
  websiteUrl: string;
  instagramHandle: string;
  brandDescription: string;
  targetAudience: string;
  toneOfVoice: string;
  keywords: string[];
  entities: EntityEntry[];
  dataSources: {
    instagramPosts: boolean;
    instagramComments: boolean;
    adsLibrary: boolean;
    seoData: boolean;
  };
  schedule: string;
}

export async function createProject(params: CreateProjectParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Generate slug from project name
  const slug = params.projectName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: params.projectName,
      brand_name: params.brandName,
      slug: `${slug}-${Date.now()}`,
      segment: params.segment,
      website_url: params.websiteUrl || null,
      instagram_handle: params.instagramHandle || null,
      brand_description: params.brandDescription || null,
      target_audience: params.targetAudience || null,
      tone_of_voice: params.toneOfVoice || null,
      keywords: params.keywords.length > 0 ? params.keywords : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (projectError) throw projectError;

  // 2. Add creator as project member (owner)
  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "owner",
  });

  // 3. Create monitored entities and link them
  for (const entity of params.entities) {
    const { data: entityData, error: entityError } = await supabase
      .from("monitored_entities")
      .insert({
        name: entity.name,
        type: entity.type,
        instagram_handle: entity.instagram_handle || null,
        website_url: entity.website_url || null,
        segment: params.segment,
      })
      .select()
      .single();

    if (entityError) throw entityError;

    // Link entity to project
    await supabase.from("project_entities").insert({
      project_id: project.id,
      entity_id: entityData.id,
      entity_role: entity.type,
    });

    // 4. Create data fetch configs for each entity based on selected sources
    const sources: string[] = [];
    if (params.dataSources.instagramPosts) sources.push("instagram_posts");
    if (params.dataSources.instagramComments) sources.push("instagram_comments");
    if (params.dataSources.adsLibrary) sources.push("ads_library");
    if (params.dataSources.seoData) sources.push("seo");

    for (const source of sources) {
      await supabase.from("data_fetch_configs").insert({
        entity_id: entityData.id,
        source_type: source,
        schedule: params.schedule,
        is_active: true,
      });
    }
  }

  return project;
}

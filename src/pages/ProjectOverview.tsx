import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Instagram,
  BarChart3,
  Calendar,
  Database,
  Gauge,
} from "lucide-react";
import { useLatestFibboScores } from "@/hooks/useFibboScores";

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ["project-overview-stats", id],
    queryFn: async () => {
      const { data: peData } = await supabase
        .from("project_entities")
        .select("id, entity_id")
        .eq("project_id", id!);
      const entityIds = peData?.map((e) => e.entity_id) ?? [];

      const [analysesRes, postsRes, profilesRes] = await Promise.all([
        supabase.from("analyses").select("id", { count: "exact", head: true }).eq("project_id", id!),
        supabase.from("instagram_posts").select("id", { count: "exact", head: true }).in("entity_id", entityIds),
        supabase.from("instagram_profiles").select("id", { count: "exact", head: true }).in("entity_id", entityIds),
      ]);
      return {
        entities: peData?.length ?? 0,
        analyses: analysesRes.count ?? 0,
        posts: postsRes.count ?? 0,
        profiles: profilesRes.count ?? 0,
      };
    },
    enabled: !!id,
  });

  const { data: fibboScores } = useLatestFibboScores(id);
  const brandFibbo = fibboScores?.find((s) => s.entity_role === "brand");

  const statCards = [
    { label: "Entidades", value: stats?.entities ?? 0, icon: Users, path: "sources" },
    { label: "Posts Coletados", value: stats?.posts ?? 0, icon: Instagram, path: "dashboard" },
    { label: "Análises", value: stats?.analyses ?? 0, icon: BarChart3, path: "analyses" },
    { label: "Fibbo Score", value: brandFibbo ? brandFibbo.total_score.toFixed(1) : "—", icon: Gauge, path: "fibbo-score" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">{project?.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project?.segment && <Badge variant="secondary" className="mr-2">{project.segment}</Badge>}
          {project?.brand_description || "Visão geral do projeto."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => navigate(`/projects/${id}/${s.path}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold font-mono text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Brand summary */}
      {project && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Briefing da Marca</h3>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Marca</span>
                <p className="text-foreground">{project.brand_name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Instagram</span>
                <p className="text-foreground">{project.instagram_handle || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Público-Alvo</span>
                <p className="text-foreground">{project.target_audience || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tom de Voz</span>
                <p className="text-foreground">{project.tone_of_voice || "—"}</p>
              </div>
              {project.keywords && project.keywords.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Keywords</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {project.keywords.map((k) => (
                      <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

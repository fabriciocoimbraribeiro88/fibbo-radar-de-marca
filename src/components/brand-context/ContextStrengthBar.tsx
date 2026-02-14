import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ContextStrengthBarProps {
  projectId: string;
  compact?: boolean;
}

interface StrengthLevel {
  label: string;
  message: string;
  colorClass: string;
}

function getLevel(score: number): StrengthLevel {
  if (score >= 81) return { label: "Forte", message: "Contexto rico — pronto para gerar", colorClass: "bg-emerald-500/10 text-emerald-600" };
  if (score >= 61) return { label: "Bom", message: "Contexto sólido para gerar insights", colorClass: "bg-emerald-400/10 text-emerald-500" };
  if (score >= 36) return { label: "Básico", message: "Bom começo — mais fontes melhoram a qualidade", colorClass: "bg-amber-400/10 text-amber-500" };
  if (score >= 16) return { label: "Fraco", message: "Adicione mais documentos e informações", colorClass: "bg-amber-500/10 text-amber-600" };
  return { label: "Muito Fraco", message: "Adicione fontes para começar", colorClass: "bg-destructive/10 text-destructive" };
}

export default function ContextStrengthBar({ projectId, compact = false }: ContextStrengthBarProps) {
  const { data } = useQuery({
    queryKey: ["context-strength", projectId],
    queryFn: async () => {
      const [sourcesRes, entitiesRes, projectRes, postsCountRes] = await Promise.all([
        supabase.from("brand_context_sources").select("id, status, source_type").eq("project_id", projectId),
        supabase.from("project_entities").select("entity_id").eq("project_id", projectId),
        supabase.from("projects").select("briefing").eq("id", projectId).single(),
        // Check if brand has posts
        supabase
          .from("project_entities")
          .select("entity_id")
          .eq("project_id", projectId)
          .eq("entity_role", "brand" as any)
          .limit(1),
      ]);

      const sources = sourcesRes.data ?? [];
      const entityCount = entitiesRes.data?.length ?? 0;
      const briefing = projectRes.data?.briefing as Record<string, any> | null;
      const brandEntityId = postsCountRes.data?.[0]?.entity_id;

      let hasBrandPosts = false;
      if (brandEntityId) {
        const { count } = await supabase
          .from("instagram_posts")
          .select("id", { count: "exact", head: true })
          .eq("entity_id", brandEntityId);
        hasBrandPosts = (count ?? 0) > 0;
      }

      // Calculate score
      let score = 0;

      // Instagram da marca coletado (tem posts): +20
      if (hasBrandPosts) score += 20;

      // Website URL adicionada: +5
      const urlSources = sources.filter((s) => s.source_type === "url" && s.status === "processed");
      score += Math.min(urlSources.length * 5, 15);

      // Cada documento processado: +10 (max 30)
      const docSources = sources.filter((s) => s.source_type === "document" && s.status === "processed");
      score += Math.min(docSources.length * 10, 30);

      // Cada texto colado processado: +5 (max 15)
      const textSources = sources.filter((s) => s.source_type === "text" && s.status === "processed");
      score += Math.min(textSources.length * 5, 15);

      // Briefing preenchido (>3 seções): +15
      if (briefing) {
        const filledSections = Object.values(briefing).filter((v) => v && String(v).trim().length > 0).length;
        if (filledSections > 3) score += 15;
      }

      // Has entities: +5
      if (entityCount > 0) score += 5;

      return { score: Math.min(score, 100), sources, entityCount };
    },
  });

  const score = data?.score ?? 0;
  const level = getLevel(score);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Progress value={score} className="h-1.5 flex-1" />
        <Badge variant="secondary" className={`text-[10px] border-0 rounded-full shrink-0 ${level.colorClass}`}>
          {level.label} {score}%
        </Badge>
      </div>
    );
  }

  return (
    <div className="card-flat p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Força do Contexto
        </span>
        <Badge variant="secondary" className={`text-xs border-0 rounded-full ${level.colorClass}`}>
          {level.label} — {score}%
        </Badge>
      </div>
      <Progress value={score} className="h-2" />
      <p className="text-xs text-muted-foreground">{level.message}</p>
    </div>
  );
}

import { Heart, MessageCircle, Eye, Users, Instagram, Zap } from "lucide-react";
import type { CategoryKey } from "./FilterBar";

function fmt(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const accentMap: Record<CategoryKey, string> = {
  brand: "border-l-primary",
  competitor: "border-l-[hsl(239_84%_67%)]",
  influencer: "border-l-[hsl(330_81%_60%)]",
  inspiration: "border-l-[hsl(160_84%_39%)]",
};

export interface EntityMetrics {
  entity_id: string;
  entity_name: string;
  instagram_handle: string | null;
  entity_type: string;
  posts_count: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_engagement: number;
  avg_engagement: number;
  followers: number | null;
  following: number | null;
}

interface Props {
  entity: EntityMetrics;
  category: CategoryKey;
}

export default function EntityCard({ entity: e, category }: Props) {
  return (
    <div
      className={`group bg-card rounded-2xl border border-border/50 ${accentMap[category]} border-l-[3px] p-5 space-y-4 transition-all hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Header */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{e.entity_name}</p>
        {e.instagram_handle && (
          <p className="text-xs text-muted-foreground mt-0.5">@{e.instagram_handle.replace("@", "")}</p>
        )}
      </div>

      {/* Big metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={<Users className="h-3.5 w-3.5" />} value={fmt(e.followers)} label="Seguidores" />
        <Metric icon={<Instagram className="h-3.5 w-3.5" />} value={fmt(e.posts_count)} label="Posts" />
        <Metric icon={<Zap className="h-3.5 w-3.5" />} value={fmt(e.avg_engagement)} label="Eng. Médio" />
      </div>

      {/* Separator */}
      <div className="h-px bg-border/60" />

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={<Heart className="h-3.5 w-3.5" />} value={fmt(e.total_likes)} label="Curtidas" />
        <Metric icon={<MessageCircle className="h-3.5 w-3.5" />} value={fmt(e.total_comments)} label="Comentários" />
        <Metric icon={<Eye className="h-3.5 w-3.5" />} value={fmt(e.total_views)} label="Views" />
      </div>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}</div>
      <p className="text-lg font-bold font-mono text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

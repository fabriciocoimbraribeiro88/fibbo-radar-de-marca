import { Crown, Swords, Sparkles, Users } from "lucide-react";
import type { CategoryKey } from "./FilterBar";

const meta: Record<CategoryKey, { icon: React.ElementType; label: string; color: string }> = {
  brand: { icon: Crown, label: "Marca", color: "text-primary" },
  competitor: { icon: Swords, label: "Concorrentes", color: "text-[hsl(239_84%_67%)]" },
  influencer: { icon: Users, label: "Influencers", color: "text-[hsl(330_81%_60%)]" },
  inspiration: { icon: Sparkles, label: "Inspirações", color: "text-[hsl(160_84%_39%)]" },
};

interface Props {
  category: CategoryKey;
  count: number;
}

export default function SectionHeader({ category, count }: Props) {
  const { icon: Icon, label, color } = meta[category];
  return (
    <div className="flex items-center gap-2.5">
      <h2 className="text-base font-semibold text-foreground">{label}</h2>
      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
    </div>
  );
}

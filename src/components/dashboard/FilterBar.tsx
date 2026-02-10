import { cn } from "@/lib/utils";
import { Crown, Swords, Sparkles, Users } from "lucide-react";

export type CategoryKey = "brand" | "competitor" | "influencer" | "inspiration";

interface FilterBarProps {
  categories: { key: CategoryKey; label: string; count: number }[];
  entities: { id: string; name: string; category: CategoryKey }[];
  selectedCategories: Set<string>;
  selectedEntities: Set<string>;
  onToggleCategory: (key: CategoryKey) => void;
  onToggleEntity: (id: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
}

const categoryIcons: Record<CategoryKey, React.ElementType> = {
  brand: Crown,
  competitor: Swords,
  influencer: Users,
  inspiration: Sparkles,
};

const categoryColors: Record<CategoryKey, string> = {
  brand: "bg-primary/10 text-primary border-primary/20",
  competitor: "bg-[hsl(239_84%_67%/0.1)] text-[hsl(239_84%_67%)] border-[hsl(239_84%_67%/0.2)]",
  influencer: "bg-[hsl(330_81%_60%/0.1)] text-[hsl(330_81%_60%)] border-[hsl(330_81%_60%/0.2)]",
  inspiration: "bg-[hsl(160_84%_39%/0.1)] text-[hsl(160_84%_39%)] border-[hsl(160_84%_39%/0.2)]",
};

export default function FilterBar({
  categories,
  entities,
  selectedCategories,
  selectedEntities,
  onToggleCategory,
  onToggleEntity,
  onSelectAll,
  isAllSelected,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* All pill */}
      <button
        onClick={onSelectAll}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-all",
          isAllSelected
            ? "bg-foreground text-background border-foreground"
            : "bg-card text-muted-foreground border-border hover:border-foreground/30"
        )}
      >
        Todos
      </button>

      {/* Divider */}
      <div className="h-5 w-px bg-border shrink-0" />

      {/* Category pills */}
      {categories.map((cat) => {
        const Icon = categoryIcons[cat.key];
        const active = selectedCategories.has(cat.key);
        return (
          <button
            key={cat.key}
            onClick={() => onToggleCategory(cat.key)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all",
              active
                ? categoryColors[cat.key]
                : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            )}
          >
            <Icon className="h-3 w-3" />
            {cat.label}
            <span className="text-[10px] opacity-60">{cat.count}</span>
          </button>
        );
      })}

      {/* Divider */}
      {entities.length > 0 && <div className="h-5 w-px bg-border shrink-0" />}

      {/* Entity pills */}
      {entities.map((ent) => {
        const active = selectedEntities.has(ent.id);
        return (
          <button
            key={ent.id}
            onClick={() => onToggleEntity(ent.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all",
              active
                ? categoryColors[ent.category]
                : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            )}
          >
            {ent.name.length > 16 ? ent.name.slice(0, 16) + "…" : ent.name}
          </button>
        );
      })}
    </div>
  );
}

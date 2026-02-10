import type { PostLimit } from "@/hooks/useProjectDashboardData";

/* ── Post limit types ── */
const POST_LIMITS: { value: PostLimit; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: 50, label: "Últimos 50" },
  { value: 100, label: "Últimos 100" },
  { value: 200, label: "Últimos 200" },
  { value: 500, label: "Últimos 500" },
];

/* ── Source selection types ── */
export type SourceMode = "brand_only" | "brand_vs_all" | "brand_vs_competitors" | "brand_vs_influencers" | "brand_vs_inspiration" | "brand_vs_selected";

const SOURCE_MODES: { value: SourceMode; label: string }[] = [
  { value: "brand_only", label: "Apenas Marca" },
  { value: "brand_vs_all", label: "Marca vs Todos" },
  { value: "brand_vs_competitors", label: "Marca vs Concorrentes" },
  { value: "brand_vs_influencers", label: "Marca vs Influencers" },
  { value: "brand_vs_inspiration", label: "Marca vs Inspiração" },
];

export interface EntityOption {
  id: string;
  name: string;
  handle: string | null;
  role: string;
}

interface Props {
  postLimit: PostLimit;
  onPostLimitChange: (l: PostLimit) => void;
  sourceMode: SourceMode;
  onSourceModeChange: (m: SourceMode) => void;
  selectedEntityIds: Set<string>;
  onToggleEntity: (id: string) => void;
  entities: EntityOption[];
  brandEntityId: string | null;
}

export default function DashboardFilters({
  postLimit, onPostLimitChange,
  sourceMode, onSourceModeChange,
  selectedEntityIds, onToggleEntity,
  entities, brandEntityId,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Row 1: Post limit */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Quantidade</span>
        {POST_LIMITS.map((p) => (
          <button
            key={String(p.value)}
            onClick={() => onPostLimitChange(p.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              postLimit === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Row 2: Source mode pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Fontes</span>
        {SOURCE_MODES.map((sm) => (
          <button
            key={sm.value}
            onClick={() => onSourceModeChange(sm.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              sourceMode === sm.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {sm.label}
          </button>
        ))}
      </div>

      {/* Row 3: Individual entity pills — only visible in brand_only mode */}
      {sourceMode === "brand_only" && entities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Marca</span>
          {entities.map((e) => {
            const selected = selectedEntityIds.has(e.id);
            return (
              <button
                key={e.id}
                onClick={() => onToggleEntity(e.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {e.handle ? e.handle.replace("@", "") : e.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatNum } from "@/lib/formatNumber";

interface Entity {
  id: string;
  name: string;
  instagram_handle?: string | null;
  entity_role: string;
  postCount?: number;
  adsCount?: number;
  seoCount?: number;
}

interface Step2Props {
  channel: "social" | "ads" | "seo";
  project: { brand_name: string; name: string } | null;
  entities: Entity[];
  selectedEntities: Set<string>;
  setSelectedEntities: (s: Set<string>) => void;
  analysisType: string;
}

const ROLE_LABELS: Record<string, string> = {
  competitor: "Concorrente",
  influencer: "Influencer",
  inspiration: "Inspiração",
  brand: "Marca",
};

export default function AnalysisStep2({
  channel,
  project,
  entities,
  selectedEntities,
  setSelectedEntities,
  analysisType,
}: Step2Props) {
  const toggle = (id: string) => {
    const next = new Set(selectedEntities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEntities(next);
  };

  // Filter entities by analysis type
  const relevantRoles = (() => {
    switch (analysisType) {
      case "brand_diagnosis":
        return [];
      case "competitor_analysis":
        return ["competitor"];
      case "influencer_analysis":
        return ["influencer"];
      case "inspiration_analysis":
        return ["inspiration"];
      case "cross_analysis":
        return ["competitor", "influencer", "inspiration"];
      default:
        return ["competitor", "influencer", "inspiration"];
    }
  })();

  const filteredEntities = entities.filter((e) => relevantRoles.includes(e.entity_role));
  const groupedByRole = relevantRoles.reduce(
    (acc, role) => {
      acc[role] = filteredEntities.filter((e) => e.entity_role === role);
      return acc;
    },
    {} as Record<string, Entity[]>
  );

  const totalSelected = selectedEntities.size + 1; // +1 for brand
  const totalRecords = filteredEntities
    .filter((e) => selectedEntities.has(e.id))
    .reduce((sum, e) => {
      if (channel === "social") return sum + (e.postCount ?? 0);
      if (channel === "ads") return sum + (e.adsCount ?? 0);
      return sum + (e.seoCount ?? 0);
    }, 0);

  const channelDataKey =
    channel === "social" ? "postCount" : channel === "ads" ? "adsCount" : "seoCount";
  const channelIcon = channel === "social" ? "📱" : channel === "ads" ? "📢" : "🔍";
  const channelLabel =
    channel === "social" ? "posts" : channel === "ads" ? "anúncios" : "keywords";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Selecione as fontes de dados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Escolha quais entidades incluir na análise.
        </p>
      </div>

      {/* Brand always included */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Marca (sempre incluída)
        </p>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              {project?.brand_name?.slice(0, 2).toUpperCase() ?? "MR"}
            </div>
            <span className="text-sm font-medium text-foreground">
              {project?.brand_name ?? project?.name}
            </span>
            <Badge className="ml-auto bg-primary/20 text-primary">Marca</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Entity groups */}
      {relevantRoles.map((role) => {
        const items = groupedByRole[role] ?? [];
        if (!items.length) return null;
        return (
          <div key={role}>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {ROLE_LABELS[role] ?? role}
            </p>
            <div className="space-y-2">
              {items.map((e) => {
                const checked = selectedEntities.has(e.id);
                const count = e[channelDataKey as keyof Entity] as number | undefined;
                return (
                  <Card
                    key={e.id}
                    className={`cursor-pointer transition-all ${
                      checked
                        ? "ring-1 ring-primary/50 bg-primary/5"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => toggle(e.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(e.id)}
                      />
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
                        {e.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{e.name}</p>
                        {e.instagram_handle && (
                          <p className="text-xs text-muted-foreground">
                            {e.instagram_handle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {ROLE_LABELS[e.entity_role]}
                        </Badge>
                        {count != null && (
                          <span className="text-xs text-muted-foreground">
                            {channelIcon} {formatNum(count)} {channelLabel}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Info bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg p-3">
        <span>
          📊 {totalSelected} entidade{totalSelected !== 1 ? "s" : ""} |{" "}
          ~{formatNum(totalRecords)} registros | ~5 min estimados
        </span>
      </div>
    </div>
  );
}

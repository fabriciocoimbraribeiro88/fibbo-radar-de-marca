import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Plus, Instagram, Megaphone, Search } from "lucide-react";

const CHANNEL_ICONS: Record<string, typeof Instagram> = {
  social: Instagram,
  instagram: Instagram,
  ads: Megaphone,
  seo: Search,
};

const PIPELINE_COLUMNS = [
  { key: "editorial", label: "Editorial", statuses: ["draft"], emoji: "📝" },
  { key: "titles", label: "Títulos", statuses: ["titles_review"], emoji: "✏️" },
  { key: "briefings", label: "Briefings", statuses: ["briefings_review"], emoji: "📋" },
  { key: "creatives", label: "Criativos", statuses: ["approved", "active"], emoji: "🎨" },
] as const;

interface Props {
  projectId: string;
  onNewPlanning: () => void;
  onOpenEditorial: (id: string) => void;
  onOpenTitlesReview: (id: string) => void;
  onOpenBriefingsReview: (id: string) => void;
  onOpenCreatives: (id: string) => void;
}

export default function ProductionKanban({
  projectId,
  onNewPlanning,
  onOpenEditorial,
  onOpenTitlesReview,
  onOpenBriefingsReview,
  onOpenCreatives,
}: Props) {
  const { data: calendars, isLoading } = useQuery({
    queryKey: ["planning-calendars", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_calendars")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: itemCounts } = useQuery({
    queryKey: ["planning-item-counts", projectId],
    queryFn: async () => {
      if (!calendars?.length) return {};
      const ids = calendars.map((c) => c.id);
      const { data, error } = await supabase
        .from("planning_items")
        .select("calendar_id")
        .in("calendar_id", ids)
        .neq("status", "cancelled");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const item of data ?? []) {
        counts[item.calendar_id] = (counts[item.calendar_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!calendars?.length,
  });

  const handleClick = (cal: any) => {
    const status = cal.status ?? "draft";
    if (status === "draft") onOpenEditorial(cal.id);
    else if (status === "titles_review") onOpenTitlesReview(cal.id);
    else if (status === "briefings_review") onOpenBriefingsReview(cal.id);
    else if (status === "approved" || status === "active") onOpenCreatives(cal.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const hasCalendars = calendars && calendars.length > 0;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Produção</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline de conteúdo — cada planejamento avança etapa por etapa.
          </p>
        </div>
        <Button onClick={onNewPlanning}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Planejamento
        </Button>
      </div>

      {!hasCalendars ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum planejamento criado</p>
            <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
              Crie um calendário de conteúdo baseado nas análises aprovadas.
            </p>
            <Button className="mt-4" onClick={onNewPlanning}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Planejamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {PIPELINE_COLUMNS.map((col) => {
            const colStatuses = col.statuses as readonly string[];
            const columnCalendars = calendars.filter((c) =>
              colStatuses.includes(c.status ?? "draft")
            );

            return (
              <div key={col.key} className="space-y-3">
                {/* Column header */}
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <span className="text-sm">{col.emoji}</span>
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {col.label}
                  </span>
                  <Badge variant="secondary" className="text-[9px] ml-auto">
                    {columnCalendars.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[120px]">
                  {columnCalendars.map((cal) => {
                    const ChannelIcon = CHANNEL_ICONS[cal.type ?? "social"] ?? CalendarDays;
                    const totalItems = itemCounts?.[cal.id] ?? 0;

                    return (
                      <Card
                        key={cal.id}
                        className="cursor-pointer hover:bg-accent/30 transition-colors"
                        onClick={() => handleClick(cal)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
                              <ChannelIcon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground line-clamp-2">
                                {cal.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {cal.period_start && cal.period_end && (
                                  <span className="text-[9px] text-muted-foreground">
                                    {new Date(cal.period_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                    {" – "}
                                    {new Date(cal.period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                  </span>
                                )}
                                {totalItems > 0 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    · {totalItems} posts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

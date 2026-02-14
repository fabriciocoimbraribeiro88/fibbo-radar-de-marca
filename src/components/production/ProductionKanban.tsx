import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Plus, Instagram, Megaphone, Search, Check } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { differenceInWeeks } from "date-fns";

const CHANNEL_ICONS: Record<string, typeof Instagram> = {
  social: Instagram,
  instagram: Instagram,
  ads: Megaphone,
  seo: Search,
};

const STEPS = [
  { key: "editorial", label: "Editorial", statuses: ["draft"] },
  { key: "titles", label: "Títulos", statuses: ["titles_review"] },
  { key: "briefings", label: "Briefings", statuses: ["briefings_review"] },
  { key: "creatives", label: "Criativos", statuses: ["approved", "active"] },
] as const;

type FilterKey = "all" | "editorial" | "titles" | "briefings" | "creatives" | "done";

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "editorial", label: "Editorial" },
  { value: "titles", label: "Títulos" },
  { value: "briefings", label: "Briefings" },
  { value: "creatives", label: "Criativos" },
  { value: "done", label: "Concluídos" },
];

function matchesFilter(status: string | null, filter: FilterKey): boolean {
  if (filter === "all") {
    // Hide completed by default
    return status !== "done";
  }
  if (filter === "done") return status === "done";
  const step = STEPS.find((s) => s.key === filter);
  if (!step) return true;
  return (step.statuses as readonly string[]).includes(status ?? "draft");
}

function getStepIndex(status: string | null): number {
  const s = status ?? "draft";
  return STEPS.findIndex((step) => (step.statuses as readonly string[]).includes(s));
}

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
  const [filter, setFilter] = useState<FilterKey>("all");

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

  const { data: itemsByCalendar } = useQuery({
    queryKey: ["planning-items-summary", projectId],
    queryFn: async () => {
      if (!calendars?.length) return {};
      const ids = calendars.map((c) => c.id);
      const { data, error } = await supabase
        .from("planning_items")
        .select("calendar_id, format")
        .in("calendar_id", ids)
        .neq("status", "cancelled");
      if (error) throw error;

      const result: Record<string, { total: number; formats: Record<string, number> }> = {};
      for (const item of data ?? []) {
        if (!result[item.calendar_id]) {
          result[item.calendar_id] = { total: 0, formats: {} };
        }
        result[item.calendar_id].total++;
        const fmt = item.format ?? "Outro";
        result[item.calendar_id].formats[fmt] = (result[item.calendar_id].formats[fmt] ?? 0) + 1;
      }
      return result;
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

  const hasCalendars = calendars && calendars.length > 0;

  const filteredCalendars = useMemo(
    () => (calendars ?? []).filter((cal) => matchesFilter(cal.status, filter)),
    [calendars, filter]
  );

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, editorial: 0, titles: 0, briefings: 0, creatives: 0, done: 0 };
    for (const cal of calendars ?? []) {
      if (cal.status !== "done") c.all++;
      for (const opt of FILTER_OPTIONS) {
        if (opt.value !== "all" && matchesFilter(cal.status, opt.value)) c[opt.value]++;
      }
    }
    return c;
  }, [calendars]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

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

      {/* Filter bar */}
      {hasCalendars && (
        <div className="mb-4">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(v) => { if (v) setFilter(v as FilterKey); }}
            className="flex flex-wrap gap-1"
          >
            {FILTER_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                size="sm"
                className="text-xs px-3 h-8 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {opt.label}
                {counts[opt.value] > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">{counts[opt.value]}</span>
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

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
        <div className="space-y-4">
          {filteredCalendars.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum planejamento nesta etapa.
            </p>
          ) : filteredCalendars.map((cal) => {
            const ChannelIcon = CHANNEL_ICONS[cal.type ?? "social"] ?? CalendarDays;
            const summary = itemsByCalendar?.[cal.id];
            const totalItems = summary?.total ?? 0;
            const formats = summary?.formats ?? {};
            const currentStepIdx = getStepIndex(cal.status);

            // Posts per week
            let postsPerWeek: string | null = null;
            if (totalItems > 0 && cal.period_start && cal.period_end) {
              const weeks = Math.max(1, differenceInWeeks(new Date(cal.period_end), new Date(cal.period_start)));
              postsPerWeek = (totalItems / weeks).toFixed(1).replace(/\.0$/, "");
            }

            // Top formats sorted by count
            const sortedFormats = Object.entries(formats)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3);

            return (
              <Card
                key={cal.id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => handleClick(cal)}
              >
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <ChannelIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">
                        {cal.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {cal.period_start && cal.period_end && (
                          <span>
                            {new Date(cal.period_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            {" – "}
                            {new Date(cal.period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                        {totalItems > 0 && <span>{totalItems} posts</span>}
                        {postsPerWeek && <span>{postsPerWeek}/sem</span>}
                      </div>
                    </div>
                  </div>

                  {/* Format badges */}
                  {sortedFormats.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {sortedFormats.map(([fmt, count]) => (
                        <Badge key={fmt} variant="secondary" className="text-[10px] font-normal">
                          {fmt} {Math.round((count / totalItems) * 100)}%
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stepper */}
                  <div className="flex items-center gap-0">
                    {STEPS.map((step, idx) => {
                      const isCompleted = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                isCurrent && "bg-primary text-primary-foreground shadow-sm",
                                isCompleted && "bg-primary/20 text-primary",
                                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                              )}
                            >
                              {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                            </div>
                            <span
                              className={cn(
                                "text-[11px] font-medium whitespace-nowrap hidden sm:inline",
                                isCurrent && "text-foreground",
                                isCompleted && "text-primary",
                                !isCompleted && !isCurrent && "text-muted-foreground"
                              )}
                            >
                              {step.label}
                            </span>
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div
                              className={cn(
                                "flex-1 h-px mx-2",
                                idx < currentStepIdx ? "bg-primary/40" : "bg-border"
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

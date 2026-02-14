import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Plus, Instagram, Megaphone, Search, FileText, Eye } from "lucide-react";

const CHANNEL_ICONS: Record<string, typeof Instagram> = {
  social: Instagram,
  instagram: Instagram,
  ads: Megaphone,
  seo: Search,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  titles_review: { label: "Revisando Títulos", color: "bg-blue-500/15 text-blue-600" },
  briefings_review: { label: "Revisando Briefings", color: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Aprovado", color: "bg-green-500/15 text-green-600" },
  active: { label: "Ativo", color: "bg-green-500/15 text-green-600" },
};

interface Props {
  projectId: string;
  onNewPlanning: () => void;
  onOpenCalendar: (id: string) => void;
  onOpenTitlesReview: (id: string) => void;
  onOpenBriefingsReview: (id: string) => void;
}

export default function PlanningList({ projectId, onNewPlanning, onOpenCalendar, onOpenTitlesReview, onOpenBriefingsReview }: Props) {
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
        .select("calendar_id, status")
        .in("calendar_id", ids)
        .neq("status", "cancelled");
      if (error) throw error;
      const counts: Record<string, Record<string, number>> = {};
      for (const item of data ?? []) {
        if (!counts[item.calendar_id]) counts[item.calendar_id] = {};
        const s = item.status ?? "idea";
        counts[item.calendar_id][s] = (counts[item.calendar_id][s] ?? 0) + 1;
      }
      return counts;
    },
    enabled: !!calendars?.length,
  });

  const handleClick = (cal: any) => {
    if (cal.status === "titles_review") onOpenTitlesReview(cal.id);
    else if (cal.status === "briefings_review") onOpenBriefingsReview(cal.id);
    else if (cal.status === "approved" || cal.status === "active") onOpenCalendar(cal.id);
    else onOpenCalendar(cal.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Editorial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere calendários, planos de mídia e estratégias de conteúdo baseados nas análises.
          </p>
        </div>
        <Button onClick={onNewPlanning}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Planejamento
        </Button>
      </div>

      {(!calendars || calendars.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Nenhum editorial criado</p>
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
        <div className="space-y-3">
          {calendars.map((cal) => {
            const ChannelIcon = CHANNEL_ICONS[cal.type ?? "social"] ?? CalendarDays;
            const st = STATUS_LABELS[cal.status ?? "draft"] ?? STATUS_LABELS.draft;
            const counts = itemCounts?.[cal.id] ?? {};
            const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

            return (
              <Card
                key={cal.id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => handleClick(cal)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <ChannelIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{cal.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cal.period_start && cal.period_end && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(cal.period_start).toLocaleDateString("pt-BR")} – {new Date(cal.period_end).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {totalItems > 0 && (
                          <span className="text-[10px] text-muted-foreground">· {totalItems} itens</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(cal.status === "approved" || cal.status === "briefings_review") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); onOpenBriefingsReview(cal.id); }}
                      >
                        <FileText className="h-3 w-3" />
                        Briefings
                      </Button>
                    )}
                    <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
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

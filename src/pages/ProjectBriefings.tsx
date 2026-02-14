import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CalendarDays, ArrowLeft, Instagram, Megaphone, Search } from "lucide-react";
import BriefingsReview from "@/components/planning/BriefingsReview";

const CHANNEL_ICONS: Record<string, typeof Instagram> = {
  social: Instagram,
  instagram: Instagram,
  ads: Megaphone,
  seo: Search,
};

export default function ProjectBriefings() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);

  const { data: calendars, isLoading } = useQuery({
    queryKey: ["briefings-calendars", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_calendars")
        .select("*")
        .eq("project_id", projectId!)
        .in("status", ["briefings_review", "approved", "active"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Count briefed items per calendar
  const { data: briefingCounts } = useQuery({
    queryKey: ["briefing-counts", projectId, calendars?.map((c) => c.id)],
    queryFn: async () => {
      if (!calendars?.length) return {};
      const ids = calendars.map((c) => c.id);
      const { data, error } = await supabase
        .from("planning_items")
        .select("calendar_id, status, metadata")
        .in("calendar_id", ids)
        .neq("status", "cancelled");
      if (error) throw error;

      const counts: Record<string, { total: number; approved: number; pending: number; rejected: number }> = {};
      for (const item of data ?? []) {
        if (!counts[item.calendar_id]) counts[item.calendar_id] = { total: 0, approved: 0, pending: 0, rejected: 0 };
        const md = (item.metadata as any) ?? {};
        if (md.title_status !== "approved") continue;
        counts[item.calendar_id].total++;
        const bs = md.briefing_status ?? "pending";
        if (bs === "approved") counts[item.calendar_id].approved++;
        else if (bs === "rejected") counts[item.calendar_id].rejected++;
        else counts[item.calendar_id].pending++;
      }
      return counts;
    },
    enabled: !!calendars?.length,
  });

  if (!projectId) return null;

  // If viewing a specific calendar's briefings
  if (activeCalendarId) {
    return (
      <div className="max-w-5xl animate-fade-in">
        <BriefingsReview
          projectId={projectId}
          calendarId={activeCalendarId}
          onFinalized={() => setActiveCalendarId(null)}
          onBack={() => setActiveCalendarId(null)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Briefings</h1>
        <p className="page-subtitle">
          Revise e aprove os briefings gerados a partir dos planejamentos.
        </p>
      </div>

      {(!calendars || calendars.length === 0) ? (
        <Card className="border-dashed card-flat">
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum briefing disponível</p>
            <p className="mt-1 text-xs text-muted-foreground text-center max-w-sm">
              Os briefings aparecem aqui depois de gerados no fluxo de Planejamento.
            </p>
            <Link to={`/projects/${projectId}/planning`}>
              <Button className="mt-4" variant="outline">
                <CalendarDays className="mr-2 h-4 w-4" />
                Ir para Planejamento
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {calendars.map((cal) => {
            const ChannelIcon = CHANNEL_ICONS[cal.type ?? "social"] ?? CalendarDays;
            const counts = briefingCounts?.[cal.id] ?? { total: 0, approved: 0, pending: 0, rejected: 0 };
            const isFullyApproved = counts.total > 0 && counts.pending === 0;

            return (
              <Card
                key={cal.id}
                className="card-interactive"
                onClick={() => setActiveCalendarId(cal.id)}
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
                        {counts.total > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            · {counts.total} briefings
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {counts.total > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-green-600 font-medium">{counts.approved} ✓</span>
                        {counts.pending > 0 && <span className="text-amber-600 font-medium">{counts.pending} ⏳</span>}
                        {counts.rejected > 0 && <span className="text-destructive font-medium">{counts.rejected} ✗</span>}
                      </div>
                    )}
                    <Badge className={`text-[10px] ${isFullyApproved ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600"}`}>
                      {isFullyApproved ? "Aprovado" : "Em revisão"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  date: string;
  type: "report_generated" | "okr_updated" | "nps_received" | "measurement_added";
  title: string;
  description?: string;
}

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  report_generated: { color: "bg-blue-500", label: "Relatório" },
  okr_updated: { color: "bg-emerald-500", label: "OKR" },
  nps_received: { color: "bg-violet-500", label: "NPS" },
  measurement_added: { color: "bg-gray-400", label: "Medição" },
};

export function ResultsTimeline({ projectId }: { projectId: string }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["results-timeline", projectId],
    queryFn: async () => {
      const timeline: TimelineEvent[] = [];

      // Fetch automated reports
      const { data: reports } = await supabase
        .from("automated_reports")
        .select("id, title, created_at, report_type, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const r of reports ?? []) {
        timeline.push({
          id: `report-${r.id}`,
          date: r.created_at ?? "",
          type: "report_generated",
          title: r.title,
          description: `Relatório ${r.status === "draft" ? "em rascunho" : r.status}`,
        });
      }

      // Fetch NPS
      const { data: nps } = await supabase
        .from("nps_surveys")
        .select("id, score, classification, period, answered_at, created_at")
        .eq("project_id", projectId)
        .not("score", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      for (const n of nps ?? []) {
        timeline.push({
          id: `nps-${n.id}`,
          date: n.answered_at ?? n.created_at ?? "",
          type: "nps_received",
          title: `NPS ${n.period}: ${n.score}`,
          description: n.classification === "promoter" ? "Promotor" : n.classification === "detractor" ? "Detrator" : "Neutro",
        });
      }

      // Sort by date desc
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return timeline.slice(0, 20);
    },
  });

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-4">Atividades Recentes</h3>
      {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
      {!isLoading && (!events || events.length === 0) && (
        <p className="text-xs text-muted-foreground">Nenhuma atividade registrada ainda.</p>
      )}
      <div className="relative space-y-4">
        {events?.map((event, i) => {
          const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.measurement_added;
          return (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-2.5 w-2.5 rounded-full ${config.color} mt-1.5`} />
                {i < (events.length - 1) && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-xs text-muted-foreground">
                  {event.date ? format(new Date(event.date), "dd MMM yyyy", { locale: ptBR }) : "—"}
                </p>
                <p className="text-sm font-medium">{event.title}</p>
                {event.description && (
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_LABELS: Record<string, string> = {
  weekly_checkin: "Check-in Semanal",
  weekly_report: "Report Semanal",
  monthly_report: "Relatório Mensal",
  monthly_nps: "NPS Mensal",
  quarterly_report: "Relatório Trimestral",
  quarterly_nps: "NPS Trimestral",
  annual_report: "Relatório Anual",
};

export function UpcomingActions({ projectId }: { projectId: string }) {
  const { data: schedules } = useQuery({
    queryKey: ["results-schedules", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_schedules")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("next_run_at", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-4">Próximas Ações</h3>
      {(!schedules || schedules.length === 0) && (
        <p className="text-xs text-muted-foreground">
          Nenhuma agenda configurada. Ative relatórios automáticos na aba Configuração.
        </p>
      )}
      <div className="space-y-2">
        {schedules?.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="text-[10px] shrink-0">
                {TYPE_LABELS[s.report_type] ?? s.report_type}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {s.next_run_at
                  ? format(new Date(s.next_run_at), "dd/MM", { locale: ptBR })
                  : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

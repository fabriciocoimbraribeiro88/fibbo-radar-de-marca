import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Wand2 } from "lucide-react";

const REPORT_TYPES = [
  {
    key: "weekly_checkin",
    label: "Check-in Semanal Rápido",
    description: "Resumo de KPIs, destaques e plano da semana.",
    frequency: "Toda sexta-feira",
    default_day_of_week: 5,
  },
  {
    key: "weekly_report",
    label: "Report Semanal",
    description: "KPIs + comparativo semana anterior + otimizações.",
    frequency: "Toda sexta-feira",
    default_day_of_week: 5,
  },
  {
    key: "monthly_report",
    label: "Relatório Mensal Completo",
    description: "Relatório qualitativo com performance, canais, público, criativos e insights.",
    frequency: "Todo dia 5 do mês seguinte",
    default_day_of_month: 5,
  },
  {
    key: "monthly_nps",
    label: "NPS Mensal",
    description: "Pesquisa de satisfação simples (score 0-10).",
    frequency: "Após relatório mensal",
  },
  {
    key: "quarterly_report",
    label: "Relatório Trimestral",
    description: "Relatório estratégico com análise de OKRs, ROI e plano do próximo quarter.",
    frequency: "A cada 3 meses",
  },
  {
    key: "quarterly_nps",
    label: "NPS Trimestral Completo",
    description: "Pesquisa detalhada com avaliação por aspecto + feedback qualitativo.",
    frequency: "Após revisão trimestral",
  },
  {
    key: "annual_report",
    label: "Relatório Anual",
    description: "Relatório premium com retrospectiva completa.",
    frequency: "Anual",
  },
];

export function ResultsSettings({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Schedules
  const { data: schedules } = useQuery({
    queryKey: ["report-schedules", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_schedules")
        .select("*")
        .eq("project_id", projectId);
      return data ?? [];
    },
  });

  const scheduleByType = Object.fromEntries((schedules ?? []).map(s => [s.report_type, s]));

  const toggleSchedule = async (reportType: string, active: boolean) => {
    const existing = scheduleByType[reportType];
    if (existing) {
      await supabase.from("report_schedules").update({ is_active: active }).eq("id", existing.id);
    } else {
      const typeConfig = REPORT_TYPES.find(t => t.key === reportType);
      await supabase.from("report_schedules").insert({
        project_id: projectId,
        report_type: reportType,
        is_active: active,
        day_of_week: (typeConfig as any)?.default_day_of_week ?? null,
        day_of_month: (typeConfig as any)?.default_day_of_month ?? null,
        config: { include_ai_analysis: true, include_okr_review: true },
        created_by: user?.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["report-schedules", projectId] });
    queryClient.invalidateQueries({ queryKey: ["results-schedules", projectId] });
  };

  const activateAll = async () => {
    for (const type of REPORT_TYPES) {
      if (!scheduleByType[type.key]) {
        await supabase.from("report_schedules").insert({
          project_id: projectId,
          report_type: type.key,
          is_active: true,
          day_of_week: (type as any).default_day_of_week ?? null,
          day_of_month: (type as any).default_day_of_month ?? null,
          config: { include_ai_analysis: true, include_okr_review: true },
          created_by: user?.id,
        });
      } else {
        await supabase.from("report_schedules").update({ is_active: true }).eq("id", scheduleByType[type.key].id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["report-schedules", projectId] });
    toast({ title: "Todos os relatórios ativados!" });
  };

  return (
    <div className="space-y-6">
      {/* Report Schedules */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agenda de Relatórios</h3>
        <Button size="sm" variant="outline" onClick={activateAll}>
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Ativar Todos
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-4">
        A configuração de Serviços Contratados foi movida para a página de Fontes.
      </p>

      <div className="space-y-2">
        {REPORT_TYPES.map(type => {
          const schedule = scheduleByType[type.key];
          return (
            <Card key={type.key} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">{type.label}</h4>
                  <p className="text-[10px] text-muted-foreground">{type.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Frequência: {type.frequency}</p>
                </div>
                <Switch
                  checked={schedule?.is_active ?? false}
                  onCheckedChange={(v) => toggleSchedule(type.key, v)}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

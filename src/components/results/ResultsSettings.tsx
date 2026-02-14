import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Instagram,
  Megaphone,
  Globe,
  Wand2,
} from "lucide-react";

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

interface ServiceToggleCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  kpis: string[];
}

function ServiceToggleCard({ icon: Icon, title, description, active, onToggle, kpis }: ServiceToggleCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${active ? "border-primary/50 bg-primary/5" : "opacity-60"}`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Switch checked={active} onCheckedChange={onToggle} onClick={(e) => e.stopPropagation()} />
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">{description}</p>
      <div className="flex flex-wrap gap-1">
        {kpis.slice(0, 4).map(k => (
          <Badge key={k} variant="secondary" className="text-[9px]">{k}</Badge>
        ))}
        {kpis.length > 4 && <Badge variant="secondary" className="text-[9px]">+{kpis.length - 4}</Badge>}
      </div>
    </Card>
  );
}

interface ContractedServices {
  channels: string[];
  package_name?: string;
  start_date?: string;
  renewal_date?: string;
  monthly_fee?: number;
}

export function ResultsSettings({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Contracted services state
  const [services, setServices] = useState<ContractedServices>({ channels: [] });
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ["project-contracted-services", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("contracted_services")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (project?.contracted_services && typeof project.contracted_services === "object") {
      const cs = project.contracted_services as any;
      setServices({
        channels: cs.channels ?? [],
        package_name: cs.package_name ?? "",
        start_date: cs.start_date ?? "",
        renewal_date: cs.renewal_date ?? "",
        monthly_fee: cs.monthly_fee ?? undefined,
      });
    }
  }, [project]);

  // Debounced save
  const saveServices = useCallback((updated: ContractedServices) => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(async () => {
      await supabase.from("projects").update({ contracted_services: updated as any }).eq("id", projectId);
      queryClient.invalidateQueries({ queryKey: ["project-contracted-services", projectId] });
    }, 2000);
    setSaveTimer(timer);
  }, [projectId, saveTimer, queryClient]);

  useEffect(() => {
    return () => { if (saveTimer) clearTimeout(saveTimer); };
  }, [saveTimer]);

  const toggleChannel = (ch: string) => {
    const updated = { ...services };
    if (updated.channels.includes(ch)) {
      updated.channels = updated.channels.filter(c => c !== ch);
    } else {
      updated.channels = [...updated.channels, ch];
    }
    setServices(updated);
    saveServices(updated);
  };

  const updateField = (field: keyof ContractedServices, value: any) => {
    const updated = { ...services, [field]: value };
    setServices(updated);
    saveServices(updated);
  };

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
      {/* Contracted Services */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">Serviços Contratados</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Selecione os serviços incluídos no contrato deste cliente. Os relatórios serão personalizados automaticamente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ServiceToggleCard
            icon={Instagram}
            title="Social"
            description="Gestão de redes sociais, conteúdo orgânico, engajamento"
            active={services.channels.includes("social")}
            onToggle={() => toggleChannel("social")}
            kpis={["Seguidores", "Engajamento", "Alcance", "Salvamentos", "Compartilhamentos"]}
          />
          <ServiceToggleCard
            icon={Megaphone}
            title="Ads"
            description="Tráfego pago, campanhas Meta/Google, conversões"
            active={services.channels.includes("ads")}
            onToggle={() => toggleChannel("ads")}
            kpis={["Investimento", "CPL", "CPA", "ROAS", "CTR", "Conversões"]}
          />
          <ServiceToggleCard
            icon={Globe}
            title="SEO"
            description="Otimização orgânica, palavras-chave, tráfego orgânico"
            active={services.channels.includes("seo")}
            onToggle={() => toggleChannel("seo")}
            kpis={["Tráfego Orgânico", "Posição Média", "Keywords Top 10", "Backlinks", "Domain Authority"]}
          />
        </div>

        {/* Contract info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
          <div>
            <Label className="text-[10px] text-muted-foreground">Nome do Pacote</Label>
            <Input
              value={services.package_name ?? ""}
              onChange={(e) => updateField("package_name", e.target.value)}
              placeholder="Ex: Growth"
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Data Início</Label>
            <Input
              type="date"
              value={services.start_date ?? ""}
              onChange={(e) => updateField("start_date", e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Data Renovação</Label>
            <Input
              type="date"
              value={services.renewal_date ?? ""}
              onChange={(e) => updateField("renewal_date", e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Fee Mensal (R$)</Label>
            <Input
              type="number"
              value={services.monthly_fee ?? ""}
              onChange={(e) => updateField("monthly_fee", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="0"
              className="h-8 text-xs mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Report Schedules */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agenda de Relatórios</h3>
        <Button size="sm" variant="outline" onClick={activateAll}>
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Ativar Todos
        </Button>
      </div>

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

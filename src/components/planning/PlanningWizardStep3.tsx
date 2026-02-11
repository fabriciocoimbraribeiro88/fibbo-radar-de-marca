import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Rocket, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WizardData } from "@/pages/ProjectPlanning";

interface Props {
  projectId: string;
  project: any;
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
  onGenerated: (calendarId: string) => void;
  onBack: () => void;
}

function calculatePeriodFromPreset(preset: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (preset) {
    case "next_month": return { start: fmt(new Date(y, m + 1, 1)), end: fmt(new Date(y, m + 2, 0)) };
    case "next_quarter": { const nq = Math.floor(m / 3) + 1; const nqY = nq > 3 ? y + 1 : y; const s = (nq % 4) * 3; return { start: fmt(new Date(nqY, s, 1)), end: fmt(new Date(nqY, s + 3, 0)) }; }
    case "next_semester": { const ns = m < 6 ? 6 : 0; const nsY = m < 6 ? y : y + 1; return { start: fmt(new Date(nsY, ns, 1)), end: fmt(new Date(nsY, ns + 6, 0)) }; }
    case "next_year": return { start: fmt(new Date(y + 1, 0, 1)), end: fmt(new Date(y + 1, 11, 31)) };
    default: return { start: "", end: "" };
  }
}

export default function PlanningWizardStep3({ projectId, project, wizardData, setWizardData, onGenerated, onBack }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const period = useMemo(() => {
    if (wizardData.periodPreset === "custom") return { start: wizardData.periodStart, end: wizardData.periodEnd };
    return calculatePeriodFromPreset(wizardData.periodPreset);
  }, [wizardData.periodPreset, wizardData.periodStart, wizardData.periodEnd]);

  const weeks = useMemo(() => {
    if (!period.start || !period.end) return 4;
    return Math.max(1, Math.round((new Date(period.end).getTime() - new Date(period.start).getTime()) / (7 * 24 * 60 * 60 * 1000)));
  }, [period]);

  const totalPosts = wizardData.postsPerWeek * weeks;
  const extraPosts = Math.ceil(totalPosts * 0.25);
  const totalGenerated = totalPosts + extraPosts;

  const brandName = project?.brand_name ?? project?.name ?? "Marca";
  const defaultTitle = useMemo(() => {
    const channelLabel = wizardData.channel === "social" ? "Calendário Social" : wizardData.channel === "ads" ? "Calendário Ads" : "Calendário SEO";
    if (period.start && period.end) {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      const fmt = (d: Date) => {
        const m = d.toLocaleDateString("pt-BR", { month: "long" });
        return m.charAt(0).toUpperCase() + m.slice(1);
      };
      const startMonth = fmt(startDate);
      const endMonth = fmt(endDate);
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      const months = startMonth === endMonth
        ? `${startMonth} ${startYear}`
        : startYear === endYear
          ? `${startMonth}/${endMonth} ${startYear}`
          : `${startMonth} ${startYear}/${endMonth} ${endYear}`;
      return `${brandName} - ${channelLabel} - ${months}`;
    }
    return `${brandName} - ${channelLabel}`;
  }, [wizardData.channel, period.start, period.end, brandName]);

  const title = wizardData.title || defaultTitle;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Create planning_calendar
      const { data: calendar, error: calErr } = await supabase
        .from("planning_calendars")
        .insert({
          project_id: projectId,
          title,
          type: wizardData.channel,
          generated_from_analysis: wizardData.analysisId,
          period_start: period.start,
          period_end: period.end,
          status: "titles_review",
        })
        .select()
        .single();
      if (calErr) throw calErr;

      // 2. Call edge function
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("generate-planning-titles", {
        body: {
          calendar_id: calendar.id,
          analysis_id: wizardData.analysisId,
          project_id: projectId,
          channel: wizardData.channel,
          period_start: period.start,
          period_end: period.end,
          parameters: {
            posts_per_week: wizardData.postsPerWeek,
            extra_percentage: 25,
            format_mix: wizardData.formatMix,
            responsibles: wizardData.responsibles,
            preferred_times: wizardData.usePreferredTimes ? wizardData.preferredTimes : null,
            context_includes: wizardData.contextIncludes,
            special_instructions: wizardData.specialInstructions,
            content_approach: wizardData.contentApproach,
            selected_lenses: wizardData.selectedLenses,
            provocation_level: wizardData.provocationLevel,
          },
        },
      });
      if (fnErr) throw fnErr;

      toast({ title: "Calendário de títulos gerado!" });
      onGenerated(calendar.id);
    } catch (e: any) {
      toast({ title: "Erro ao gerar", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Revisão & Gerar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Etapa 3 de 3 — Revise as configurações e gere o calendário</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-2">
          <Label className="text-sm font-medium">Título do Planejamento</Label>
          <Input
            value={title}
            onChange={(e) => setWizardData((d) => ({ ...d, title: e.target.value }))}
            placeholder={defaultTitle}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><span className="font-medium">{wizardData.channel === "social" ? "📱 Social" : wizardData.channel === "ads" ? "📢 Ads" : "🔍 SEO"}</span></div>
            {period.start && (
              <div className="flex justify-between"><span className="text-muted-foreground">Período</span><span className="font-medium">{new Date(period.start).toLocaleDateString("pt-BR")} — {new Date(period.end).toLocaleDateString("pt-BR")}</span></div>
            )}
             {wizardData.channel === "social" && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Abordagem</span><span className="font-medium">{wizardData.contentApproach === "theses" ? "⚡ Teses Narrativas" : "📋 Pilares Tradicionais"}</span></div>
                {wizardData.contentApproach === "theses" && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lentes</span><span className="font-medium text-right">{wizardData.selectedLenses.join(" · ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Provocação</span><span className="font-medium">Nível {wizardData.provocationLevel}/5</span></div>
                  </>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Posts</span><span className="font-medium">{totalPosts} planejados + {extraPosts} extras = {totalGenerated} títulos serão gerados</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mix</span><span className="font-medium">{Object.entries(wizardData.formatMix).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}%`).join(" · ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Responsáveis</span><span className="font-medium">{wizardData.responsibles.map((r) => `${r.code} ${r.percentage}%`).join(" · ")}</span></div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contexto</span>
              <span className="font-medium text-right">{wizardData.contextIncludes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(" · ")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={generating} size="lg">
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando calendário de títulos...</>
          ) : (
            <><Rocket className="mr-2 h-4 w-4" /> Gerar Calendário de Títulos</>
          )}
        </Button>
      </div>
    </>
  );
}

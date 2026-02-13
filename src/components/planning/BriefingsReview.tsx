import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, Check, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFrameLabel, getObjectiveLabel, getMethodLabel } from "@/lib/formulaConstants";

const STATUS_EMOJI: Record<string, string> = { pending: "⏳", approved: "✅", rejected: "❌" };
const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  projectId: string;
  calendarId: string;
  onFinalized: () => void;
  onBack: () => void;
}

export default function BriefingsReview({ projectId, calendarId, onFinalized, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [finalizing, setFinalizing] = useState(false);

  const { data: calendar } = useQuery({
    queryKey: ["planning-calendar", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase.from("planning_calendars").select("*").eq("id", calendarId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["planning-items-briefings", calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_items")
        .select("*")
        .eq("calendar_id", calendarId)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data?.filter((i) => (i.metadata as any)?.title_status === "approved");
    },
  });

  const approvedCount = items?.filter((i) => (i.metadata as any)?.briefing_status === "approved").length ?? 0;
  const rejectedCount = items?.filter((i) => (i.metadata as any)?.briefing_status === "rejected").length ?? 0;
  const pendingCount = (items?.length ?? 0) - approvedCount - rejectedCount;
  const canFinalize = pendingCount === 0 && (items?.length ?? 0) > 0;

  const updateBriefingStatus = async (itemId: string, status: "approved" | "rejected") => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;
    const metadata = { ...(item.metadata as any ?? {}), briefing_status: status };
    await supabase.from("planning_items").update({ metadata }).eq("id", itemId);
    queryClient.invalidateQueries({ queryKey: ["planning-items-briefings", calendarId] });
  };

  const updateField = async (itemId: string, field: string, value: any) => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;
    if (["copy_text", "theme", "target_audience", "visual_brief", "description", "title", "hashtags"].includes(field)) {
      await supabase.from("planning_items").update({ [field]: value }).eq("id", itemId);
    } else {
      const metadata = { ...(item.metadata as any ?? {}), [field]: value };
      await supabase.from("planning_items").update({ metadata }).eq("id", itemId);
    }
    queryClient.invalidateQueries({ queryKey: ["planning-items-briefings", calendarId] });
  };

  const approveAll = async () => {
    if (!items) return;
    for (const item of items) {
      const metadata = { ...(item.metadata as any ?? {}), briefing_status: "approved" };
      await supabase.from("planning_items").update({ metadata }).eq("id", item.id);
    }
    queryClient.invalidateQueries({ queryKey: ["planning-items-briefings", calendarId] });
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const approved = items?.filter((i) => (i.metadata as any)?.briefing_status === "approved") ?? [];
      for (const item of approved) {
        await supabase.from("planning_items").update({ status: "briefed" }).eq("id", item.id);
      }
      const rejected = items?.filter((i) => (i.metadata as any)?.briefing_status === "rejected") ?? [];
      for (const item of rejected) {
        await supabase.from("planning_items").update({ status: "cancelled" }).eq("id", item.id);
      }
      await supabase.from("planning_calendars").update({ status: "approved" }).eq("id", calendarId);
      toast({ title: "Planejamento finalizado!" });
      onFinalized();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setFinalizing(false);
    }
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Briefings — {calendar?.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items?.length ?? 0} briefings gerados</p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span>Aprovados: <strong className="text-green-600">{approvedCount}</strong></span>
            <span>Reprovados: <strong className="text-destructive">{rejectedCount}</strong></span>
            <span>Pendentes: <strong>{pendingCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={approveAll}>
              <Check className="mr-1 h-3 w-3" /> Aprovar Todos
            </Button>
            <Button size="sm" disabled={!canFinalize || finalizing} onClick={handleFinalize}>
              {finalizing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
              Finalizar Planejamento
            </Button>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-3">
        {items?.map((item, idx) => {
          const md = (item.metadata as any) ?? {};
          const briefingStatus = md.briefing_status ?? "pending";
          const date = item.scheduled_date ? new Date(item.scheduled_date + "T12:00:00") : null;
          const dayShort = date ? DAY_NAMES_SHORT[date.getDay()] : "";
          const dateStr = date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
          const slides = md.slides as any[] | undefined;
          const hasFormula = !!(md.formula || md.formula_analysis);

          return (
            <AccordionItem key={item.id} value={item.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 text-left flex-1">
                  <span>{STATUS_EMOJI[briefingStatus]}</span>
                  <span className="text-xs font-mono text-muted-foreground">POST {idx + 1}</span>
                  <span className="text-xs text-muted-foreground">{dateStr} {dayShort} {item.scheduled_time ?? ""}</span>
                  <Badge variant="secondary" className="text-[9px]">{item.format ?? ""}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{item.content_type ?? ""}</Badge>
                  {md.territory && <Badge variant="outline" className="text-[8px]">{md.lens ?? ""}</Badge>}
                  {md.formula && (
                    <Badge variant="outline" className="text-[8px] bg-primary/5">
                      {getFrameLabel(md.formula.frame)}
                    </Badge>
                  )}
                  {md.formula_score != null && (
                    <span className={`text-[10px] font-bold font-mono ${
                      md.formula_score >= 80 ? "text-green-600" : md.formula_score >= 60 ? "text-amber-600" : "text-destructive"
                    }`}>
                      {md.formula_score}
                    </span>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">{md.responsible_code ?? ""}</span>
                  <span className="text-sm font-medium text-foreground truncate flex-1">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {/* F.O.R.M.U.L.A.™ Analysis Card */}
                {hasFormula && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-foreground">Análise F.O.R.M.U.L.A.™</h4>
                        {md.formula_score != null && (
                          <span className={`text-sm font-bold font-mono ${
                            md.formula_score >= 80 ? "text-green-600" :
                            md.formula_score >= 60 ? "text-amber-600" : "text-destructive"
                          }`}>
                            {md.formula_score}/100
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {[
                          { letter: "F", label: "Frame", value: getFrameLabel(md.formula?.frame), ok: md.formula_analysis?.frame_applied },
                          { letter: "O", label: "Objective", value: getObjectiveLabel(md.formula?.objective), ok: md.formula_analysis?.objective_clear },
                          { letter: "R", label: "Reference", value: md.formula?.reference_type, ok: md.formula_analysis?.reference_present },
                          { letter: "M", label: "Method", value: getMethodLabel(md.formula?.method), ok: md.formula_analysis?.method_followed },
                          { letter: "U", label: "Uniqueness", value: md.formula?.uniqueness_element, ok: md.formula_analysis?.uniqueness_present },
                          { letter: "L", label: "Language", value: "Tom adequado", ok: md.formula_analysis?.language_compliant },
                          { letter: "A", label: "Action", value: md.formula?.cta, ok: md.formula_analysis?.cta_specific },
                        ].map(({ letter, label, value, ok }) => (
                          <div key={letter} className="flex items-center gap-2 text-xs">
                            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{letter}</span>
                            <span className="text-muted-foreground w-16 shrink-0">{label}:</span>
                            <span className="text-foreground truncate flex-1">{value ?? "—"}</span>
                            {ok === true ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            ) : ok === false ? (
                              <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            ) : (
                              <span className="text-muted-foreground text-[10px] shrink-0">—</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Thesis context (if theses approach) */}
                {md.thesis && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                    <Label className="text-xs text-primary font-semibold">Tese Narrativa</Label>
                    <Textarea rows={2} className="mt-1 bg-transparent border-primary/20" defaultValue={md.thesis} onBlur={(e) => updateField(item.id, "thesis", e.target.value)} />
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      {md.territory && <span>Território: <strong>{md.territory}</strong></span>}
                      {md.lens && <span>Lente: <strong>{md.lens}</strong></span>}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Objetivo</Label>
                  <Textarea rows={2} className="mt-1" defaultValue={md.objective ?? ""} onBlur={(e) => updateField(item.id, "objective", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Conceito</Label>
                  <Textarea rows={2} className="mt-1" defaultValue={md.concept ?? ""} onBlur={(e) => updateField(item.id, "concept", e.target.value)} />
                </div>

                {md.argument && (
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">Argumento Central</Label>
                    <Textarea rows={4} className="mt-1" defaultValue={md.argument ?? ""} onBlur={(e) => updateField(item.id, "argument", e.target.value)} />
                  </div>
                )}
                {md.evidence && (
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">Evidência / Exemplo</Label>
                    <Textarea rows={3} className="mt-1" defaultValue={md.evidence ?? ""} onBlur={(e) => updateField(item.id, "evidence", e.target.value)} />
                  </div>
                )}
                {md.resolution && (
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">Resolução / Provocação Final</Label>
                    <Textarea rows={2} className="mt-1" defaultValue={md.resolution ?? ""} onBlur={(e) => updateField(item.id, "resolution", e.target.value)} />
                  </div>
                )}

                {(item.format === "Carrossel" && slides) ? (
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">Lâminas</Label>
                    <div className="space-y-2 mt-1">
                      {slides.map((slide: any, si: number) => (
                        <div key={si}>
                          <Label className="text-[10px] text-muted-foreground">{slide.type === "cover" ? "Capa" : slide.type === "cta" ? "CTA" : `Lâmina ${si + 1}`}</Label>
                          <Input className="h-8 text-sm" defaultValue={slide.text ?? ""} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : item.format === "Reels" ? (
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">Roteiro</Label>
                    <Textarea rows={4} className="mt-1" defaultValue={md.script ?? ""} onBlur={(e) => updateField(item.id, "script", e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold">Texto da Imagem</Label>
                    <Textarea rows={2} className="mt-1" defaultValue={md.image_text ?? item.description ?? ""} onBlur={(e) => updateField(item.id, "description", e.target.value)} />
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Caption</Label>
                  <Textarea rows={4} className="mt-1" defaultValue={item.copy_text ?? ""} onBlur={(e) => updateField(item.id, "copy_text", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">CTA</Label>
                  <Input className="h-8 text-sm" defaultValue={item.theme ?? ""} onBlur={(e) => updateField(item.id, "theme", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Hashtags</Label>
                  <Input className="h-8 text-sm" defaultValue={item.hashtags?.join(" ") ?? ""} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold">Brief Visual / Referências</Label>
                  <Textarea rows={3} className="mt-1" defaultValue={item.visual_brief ?? ""} onBlur={(e) => updateField(item.id, "visual_brief", e.target.value)} />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateBriefingStatus(item.id, "approved")}>
                    <Check className="mr-1 h-3 w-3" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateBriefingStatus(item.id, "rejected")}>
                    <X className="mr-1 h-3 w-3" /> Reprovar
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-8 pt-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Planejamento gerado por <span className="font-semibold text-foreground">Fibbo Radar</span> — Inteligência Competitiva com IA
        </p>
      </div>
    </>
  );
}

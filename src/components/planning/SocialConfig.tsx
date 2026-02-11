import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Info, Zap, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WizardData, Responsible } from "@/pages/ProjectPlanning";

const PERIOD_PRESETS = [
  { value: "next_month", label: "Próximo Mês" },
  { value: "next_quarter", label: "Próximo Trimestre" },
  { value: "next_semester", label: "Próximo Semestre" },
  { value: "next_year", label: "Próximo Ano" },
  { value: "custom", label: "Personalizado" },
];

const FORMATS = ["Reels", "Carrossel", "Estático", "Stories"];
const ALL_LENSES = ["Sociológica", "Psicológica", "Econômica", "Tecnológica", "Contraintuitiva", "Histórica/Futurista"];
const PROVOCATION_LABELS: Record<number, string> = { 1: "Consultivo", 2: "Moderado", 3: "Assertivo", 4: "Provocativo", 5: "Confrontador" };

function calculatePeriod(preset: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "next_month":
      return { start: fmt(new Date(y, m + 1, 1)), end: fmt(new Date(y, m + 2, 0)) };
    case "next_quarter": {
      const nq = Math.floor(m / 3) + 1;
      const nqYear = nq > 3 ? y + 1 : y;
      const nqStart = (nq % 4) * 3;
      return { start: fmt(new Date(nqYear, nqStart, 1)), end: fmt(new Date(nqYear, nqStart + 3, 0)) };
    }
    case "next_semester": {
      const ns = m < 6 ? 6 : 0;
      const nsY = m < 6 ? y : y + 1;
      return { start: fmt(new Date(nsY, ns, 1)), end: fmt(new Date(nsY, ns + 6, 0)) };
    }
    case "next_year":
      return { start: fmt(new Date(y + 1, 0, 1)), end: fmt(new Date(y + 1, 11, 31)) };
    default:
      return { start: "", end: "" };
  }
}

interface Props {
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
  projectId: string;
}

export default function SocialConfig({ wizardData, setWizardData, projectId }: Props) {
  const { toast } = useToast();
  const [suggestingMix, setSuggestingMix] = useState(false);
  const { data: project } = useQuery({
    queryKey: ["project-briefing", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("briefing").eq("id", projectId).single();
      return data;
    },
    enabled: !!projectId,
  });

  const tensionTerritories = (project?.briefing as any)?.tension_territories ?? [];
  const period = useMemo(() => {
    if (wizardData.periodPreset === "custom") return { start: wizardData.periodStart, end: wizardData.periodEnd };
    return calculatePeriod(wizardData.periodPreset);
  }, [wizardData.periodPreset, wizardData.periodStart, wizardData.periodEnd]);

  const weeks = useMemo(() => {
    if (!period.start || !period.end) return 4;
    const ms = new Date(period.end).getTime() - new Date(period.start).getTime();
    return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
  }, [period]);

  const totalPosts = wizardData.postsPerWeek * weeks;
  const extraPosts = Math.ceil(totalPosts * 0.25);
  const totalGenerated = totalPosts + extraPosts;

  const formatTotal = Object.values(wizardData.formatMix).reduce((a, b) => a + b, 0);
  const responsibleTotal = wizardData.responsibles.reduce((a, r) => a + r.percentage, 0);

  const updateFormat = (format: string, value: number) => {
    setWizardData((d) => ({ ...d, formatMix: { ...d.formatMix, [format]: value } }));
  };

  const updateResponsible = (idx: number, field: keyof Responsible, value: any) => {
    setWizardData((d) => {
      const updated = [...d.responsibles];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...d, responsibles: updated };
    });
  };

  const addResponsible = () => {
    setWizardData((d) => ({
      ...d,
      responsibles: [...d.responsibles, { name: "", code: "", handle: null, percentage: 0 }],
    }));
  };

  const removeResponsible = (idx: number) => {
    setWizardData((d) => ({ ...d, responsibles: d.responsibles.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      {/* Content Approach - Theses vs Pillars */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Abordagem de Conteúdo</Label>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${wizardData.contentApproach === "pillars" ? "font-medium text-foreground" : "text-muted-foreground"}`}>Pilares</span>
              <Switch
                checked={wizardData.contentApproach === "theses"}
                onCheckedChange={(v) => setWizardData((d) => ({ ...d, contentApproach: v ? "theses" : "pillars" }))}
              />
              <span className={`text-xs ${wizardData.contentApproach === "theses" ? "font-medium text-foreground" : "text-muted-foreground"}`}>Teses Narrativas</span>
            </div>
          </div>

          {wizardData.contentApproach === "theses" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  Cada post será uma <strong>tese</strong> — um argumento original gerado pelo cruzamento de Territórios de Tensão × Lentes Narrativas. Muito mais diferenciado que pilares genéricos.
                </p>
              </div>

              {/* Tension Territories status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Territórios de Tensão</Label>
                {tensionTerritories.length > 0 ? (
                  <div className="space-y-1">
                    {tensionTerritories.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                        <Zap className="h-3 w-3 text-primary shrink-0" />
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground">— {t.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-yellow-700">
                      Nenhum Território de Tensão definido. Defina-os em <strong>Contexto de Marca → Conteúdo</strong> ou a IA gerará automaticamente a partir dos pilares.
                    </p>
                  </div>
                )}
              </div>

              {/* Narrative Lenses */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Lentes Narrativas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_LENSES.map((lens) => (
                    <button
                      key={lens}
                      onClick={() => {
                        setWizardData((d) => ({
                          ...d,
                          selectedLenses: d.selectedLenses.includes(lens)
                            ? d.selectedLenses.filter((l) => l !== lens)
                            : [...d.selectedLenses, lens],
                        }));
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        wizardData.selectedLenses.includes(lens)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {lens}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provocation level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Nível de Provocação</Label>
                  <span className="text-xs font-medium text-primary">{PROVOCATION_LABELS[wizardData.provocationLevel]}</span>
                </div>
                <Slider
                  value={[wizardData.provocationLevel]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([v]) => setWizardData((d) => ({ ...d, provocationLevel: v }))}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Consultivo</span>
                  <span>Confrontador</span>
                </div>
              </div>

              {/* Category Mix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Mix de Categorias</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${Object.values(wizardData.categoryMix).reduce((a, b) => a + b, 0) === 100 ? "text-green-600" : "text-destructive"}`}>
                      {Object.values(wizardData.categoryMix).reduce((a, b) => a + b, 0)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      disabled={suggestingMix}
                      onClick={async () => {
                        setSuggestingMix(true);
                        try {
                          const { data: proj } = await supabase.from("projects").select("briefing, segment, brand_name").eq("id", projectId).single();
                          const briefing = proj?.briefing as any;
                          const segment = proj?.segment ?? "";
                          const pillars = briefing?.content_pillars ?? [];
                          const territories = briefing?.tension_territories ?? [];
                          const seasonal = briefing?.seasonal_calendar ?? [];

                          const { data: memories } = await supabase
                            .from("brand_memory_entries")
                            .select("summary, learnings, pillar_performance")
                            .eq("project_id", projectId)
                            .eq("is_active", true)
                            .order("year", { ascending: false })
                            .limit(2);

                          const { data: refs } = await supabase
                            .from("brand_references")
                            .select("type, title")
                            .eq("project_id", projectId)
                            .limit(20);

                          const successCount = refs?.filter(r => r.type === "success_post" || r.type === "kv").length ?? 0;
                          const seasonalCount = Array.isArray(seasonal) ? seasonal.length : 0;

                          const prompt = `Baseado no contexto abaixo, sugira o mix ideal de categorias de conteúdo (em %) para o calendário de ${proj?.brand_name ?? "marca"}.

Segmento: ${segment}
Pilares: ${pillars.map((p: any) => p.name).join(", ")}
Territórios de tensão: ${territories.map((t: any) => t.name).join(", ") || "nenhum definido"}
Cases de sucesso cadastrados: ${successCount}
Datas sazonais cadastradas: ${seasonalCount}
Memória estratégica: ${memories?.map(m => m.summary).join("; ") ?? "nenhuma"}

As 4 categorias são:
- thesis: Posts com teses narrativas provocativas (cruzamento de territórios × lentes)
- best_practice: Posts baseados em cases de sucesso e melhores práticas
- seasonal: Posts conectados a datas sazonais e momentos culturais
- connection: Posts de conexão (bastidores, produto, educativo, storytelling)

Considere:
- Se há poucos cases de sucesso, reduza best_practice
- Se há muitas datas sazonais no período, aumente seasonal
- Marcas B2B geralmente precisam de mais thesis e best_practice
- Marcas B2C precisam de mais connection e seasonal
- O total DEVE ser 100%

Responda APENAS com JSON: {"thesis": N, "best_practice": N, "seasonal": N, "connection": N}`;

                          const { data: fnData, error: fnErr } = await supabase.functions.invoke("fill-brand-context", {
                            body: { prompt, project_id: projectId },
                          });

                          // Try parsing the AI response
                          let suggestedMix: Record<string, number> | null = null;
                          const responseText = typeof fnData === "string" ? fnData : fnData?.result ?? fnData?.content ?? JSON.stringify(fnData);
                          const jsonMatch = responseText?.match?.(/\{[\s\S]*?\}/);
                          if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            if (parsed.thesis && parsed.best_practice && parsed.seasonal && parsed.connection) {
                              suggestedMix = parsed;
                            }
                          }

                          if (suggestedMix) {
                            setWizardData((d) => ({ ...d, categoryMix: suggestedMix! }));
                            toast({ title: "Mix sugerido pela IA aplicado!" });
                          } else {
                            toast({ title: "Não foi possível gerar sugestão", variant: "destructive" });
                          }
                        } catch (e: any) {
                          toast({ title: "Erro ao sugerir mix", description: e.message, variant: "destructive" });
                        } finally {
                          setSuggestingMix(false);
                        }
                      }}
                    >
                      {suggestingMix ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {suggestingMix ? "Analisando..." : "Sugerir com IA"}
                    </Button>
                  </div>
                </div>
                {[
                  { key: "thesis", label: "⚡ Teses Narrativas", desc: "Provocativas e diferenciadas" },
                  { key: "best_practice", label: "🏆 Cases & Melhores Práticas", desc: "Baseado no que funcionou" },
                  { key: "seasonal", label: "📅 Datas Sazonais", desc: "Momentos culturais e comemorações" },
                  { key: "connection", label: "🤝 Conexão", desc: "Bastidores, produto, educativo" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs">{label}</span>
                        <span className="text-[9px] text-muted-foreground ml-1.5">{desc}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{wizardData.categoryMix[key] ?? 0}%</span>
                    </div>
                    <Slider
                      value={[wizardData.categoryMix[key] ?? 0]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setWizardData((d) => ({ ...d, categoryMix: { ...d.categoryMix, [key]: v } }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Period */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Período</Label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map((p) => (
              <Button
                key={p.value}
                variant={wizardData.periodPreset === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const calc = calculatePeriod(p.value);
                  setWizardData((d) => ({ ...d, periodPreset: p.value, periodStart: calc.start, periodEnd: calc.end }));
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {wizardData.periodPreset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="date" value={wizardData.periodStart} onChange={(e) => setWizardData((d) => ({ ...d, periodStart: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input type="date" value={wizardData.periodEnd} onChange={(e) => setWizardData((d) => ({ ...d, periodEnd: e.target.value }))} />
              </div>
            </div>
          )}
          {period.start && period.end && (
            <p className="text-xs text-muted-foreground">
              {new Date(period.start).toLocaleDateString("pt-BR")} – {new Date(period.end).toLocaleDateString("pt-BR")} · {weeks} semanas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Frequência</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Posts por semana</span>
              <span className="text-sm font-mono font-medium text-primary">{wizardData.postsPerWeek}</span>
            </div>
            <Slider
              value={[wizardData.postsPerWeek]}
              min={1}
              max={7}
              step={1}
              onValueChange={([v]) => setWizardData((d) => ({ ...d, postsPerWeek: v }))}
            />
            <p className="text-xs text-muted-foreground">
              Total no período: ~{totalPosts} posts · 25% extra para seleção: ~{totalGenerated} posts serão gerados
            </p>
            <div className="flex items-start gap-2 p-2 rounded bg-muted/50">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground">
                Geramos 25% a mais do planejado para que você possa descartar os que não se encaixam e manter os melhores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Mix */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Mix de Formatos</Label>
            <span className={`text-xs font-mono ${formatTotal === 100 ? "text-green-600" : "text-destructive"}`}>
              Total: {formatTotal}% {formatTotal === 100 ? "✅" : ""}
            </span>
          </div>
          {FORMATS.map((f) => (
            <div key={f} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{f}</span>
                <span className="text-xs font-mono text-muted-foreground">{wizardData.formatMix[f] ?? 0}%</span>
              </div>
              <Slider
                value={[wizardData.formatMix[f] ?? 0]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => updateFormat(f, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Responsibles */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Responsáveis</Label>
            <span className={`text-xs font-mono ${responsibleTotal === 100 ? "text-green-600" : "text-destructive"}`}>
              Total: {responsibleTotal}% {responsibleTotal === 100 ? "✅" : ""}
            </span>
          </div>
          {wizardData.responsibles.map((r, idx) => (
            <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Nome/Apelido</Label>
                  <Input className="h-8 text-sm" value={r.name} onChange={(e) => updateResponsible(idx, "name", e.target.value)} placeholder="Equipe Interna" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Sigla</Label>
                  <Input className="h-8 text-sm" value={r.code} onChange={(e) => updateResponsible(idx, "code", e.target.value.toUpperCase())} placeholder="INT" maxLength={4} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Instagram</Label>
                  <Input className="h-8 text-sm" value={r.handle ?? ""} onChange={(e) => updateResponsible(idx, "handle", e.target.value || null)} placeholder="@usuario" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Slider
                    value={[r.percentage]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => updateResponsible(idx, "percentage", v)}
                  />
                </div>
                <span className="text-xs font-mono w-10 text-right">{r.percentage}%</span>
                {wizardData.responsibles.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeResponsible(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addResponsible}>
            <Plus className="mr-1 h-3 w-3" /> Adicionar Responsável
          </Button>
        </CardContent>
      </Card>

      {/* Preferred times */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={wizardData.usePreferredTimes}
              onCheckedChange={(v) => setWizardData((d) => ({ ...d, usePreferredTimes: !!v }))}
            />
            <span className="text-sm text-foreground">Definir horários preferenciais</span>
          </label>
          {wizardData.usePreferredTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Seg-Sex (separados por vírgula)</Label>
                <Input
                  className="h-8 text-sm"
                  value={wizardData.preferredTimes.weekday.join(", ")}
                  onChange={(e) => setWizardData((d) => ({
                    ...d,
                    preferredTimes: { ...d.preferredTimes, weekday: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
                  }))}
                  placeholder="09:00, 12:00, 18:00"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sáb-Dom</Label>
                <Input
                  className="h-8 text-sm"
                  value={wizardData.preferredTimes.weekend.join(", ")}
                  onChange={(e) => setWizardData((d) => ({
                    ...d,
                    preferredTimes: { ...d.preferredTimes, weekend: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
                  }))}
                  placeholder="11:00"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Special instructions */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <Label className="text-sm font-medium">Instruções Adicionais</Label>
          <Textarea
            rows={3}
            value={wizardData.specialInstructions}
            onChange={(e) => setWizardData((d) => ({ ...d, specialInstructions: e.target.value }))}
            placeholder="Instruções especiais para a IA..."
          />
        </CardContent>
      </Card>
    </div>
  );
}

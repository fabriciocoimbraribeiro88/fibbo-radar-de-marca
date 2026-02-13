import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info, Sparkles } from "lucide-react";
import type { WizardData, Colab } from "@/pages/ProjectPlanning";

const PERIOD_PRESETS = [
  { value: "next_month", label: "Próximo Mês" },
  { value: "next_quarter", label: "Próximo Trimestre" },
  { value: "next_semester", label: "Próximo Semestre" },
  { value: "next_year", label: "Próximo Ano" },
  { value: "custom", label: "Personalizado" },
];

const FORMATS = ["Reels", "Carrossel", "Estático", "Stories"];

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
  

  const updateFormat = (format: string, value: number) => {
    setWizardData((d) => ({ ...d, formatMix: { ...d.formatMix, [format]: value } }));
  };

  const updateColab = (idx: number, field: keyof Colab, value: any) => {
    setWizardData((d) => {
      const updated = [...d.colabs];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...d, colabs: updated };
    });
  };

  const addColab = () => {
    setWizardData((d) => ({
      ...d,
      colabs: [...d.colabs, { instagram: "", description: "", percentage: 0 }],
    }));
  };

  const removeColab = (idx: number) => {
    setWizardData((d) => ({ ...d, colabs: d.colabs.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      {/* F.O.R.M.U.L.A.™ Methodology */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Metodologia F.O.R.M.U.L.A.™</Label>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
            <p className="text-xs text-muted-foreground">
              Cada post será gerado com base em <strong>7 filtros obrigatórios</strong> que garantem conteúdo anti-genérico e estratégico:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { letter: "F", name: "Frame", desc: "Enquadramento — ângulo de ataque único" },
                { letter: "O", name: "Objective", desc: "Objetivo estratégico do post" },
                { letter: "R", name: "Reference", desc: "Evidência concreta obrigatória" },
                { letter: "M", name: "Method", desc: "Formato narrativo estruturado" },
                { letter: "U", name: "Uniqueness", desc: "Singularidade da marca" },
                { letter: "L", name: "Language", desc: "Palavras de força e tom de voz" },
                { letter: "A", name: "Action", desc: "CTA específico por objetivo" },
              ].map(({ letter, name, desc }) => (
                <div key={letter} className="flex items-start gap-2">
                  <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                    {letter}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-foreground">{name}</span>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground border-t border-primary/10 pt-2">
              A IA usará automaticamente o histórico de postagens, briefing da marca e conteúdos carregados para calibrar cada filtro.
            </p>
          </div>
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

      {/* Colabs */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={wizardData.useColabs}
              onCheckedChange={(v) => {
                const enabled = !!v;
                setWizardData((d) => ({
                  ...d,
                  useColabs: enabled,
                  colabs: enabled ? (d.colabs.length === 0 ? [{ instagram: "", description: "", percentage: 0 }] : d.colabs) : [],
                  colabPercentage: enabled ? d.colabPercentage : 0,
                }));
              }}
            />
            <span className="text-sm font-medium text-foreground">Incluir Colabs</span>
          </label>
          <p className="text-[10px] text-muted-foreground">
            Ative se houver posts em parceria com colaboradores externos.
          </p>

          {wizardData.useColabs && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">% dos posts em colab</span>
                  <span className="text-sm font-mono font-medium text-primary">{wizardData.colabPercentage}%</span>
                </div>
                <Slider
                  value={[wizardData.colabPercentage]}
                  min={5}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setWizardData((d) => ({ ...d, colabPercentage: v }))}
                />
                <p className="text-[10px] text-muted-foreground">
                  {wizardData.colabPercentage}% dos posts serão em colab · {100 - wizardData.colabPercentage}% equipe interna
                </p>
              </div>

              {wizardData.colabs.map((c, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Instagram</Label>
                      <Input className="h-8 text-sm" value={c.instagram} onChange={(e) => updateColab(idx, "instagram", e.target.value)} placeholder="@usuario" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Descrição do Parceiro</Label>
                      <Input className="h-8 text-sm" value={c.description} onChange={(e) => updateColab(idx, "description", e.target.value)} placeholder="Ex: Influenciador fitness" />
                    </div>
                  </div>
                  {wizardData.colabs.length > 1 && (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeColab(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addColab}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar Colab
              </Button>
            </div>
          )}
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

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import type { WizardData, Responsible } from "@/pages/ProjectPlanning";

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
}

export default function SocialConfig({ wizardData, setWizardData }: Props) {
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

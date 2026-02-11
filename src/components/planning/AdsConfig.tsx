import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WizardData } from "@/pages/ProjectPlanning";

const PLATFORMS = ["Meta", "Google", "TikTok", "LinkedIn"];
const AD_TYPES = ["Awareness", "Engajamento", "Tráfego", "Conversão", "Leads", "Remarketing"];

interface Props {
  projectId: string;
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
}

export default function AdsConfig({ wizardData, setWizardData }: Props) {
  const togglePlatform = (p: string) => {
    setWizardData((d) => {
      const platforms = d.adsPlatforms.includes(p)
        ? d.adsPlatforms.filter((x) => x !== p)
        : [...d.adsPlatforms, p];
      return { ...d, adsPlatforms: platforms };
    });
  };

  const toggleType = (t: string) => {
    setWizardData((d) => ({
      ...d,
      adsTypes: d.adsTypes.includes(t) ? d.adsTypes.filter((x) => x !== t) : [...d.adsTypes, t],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Plataformas</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent/30">
                <Checkbox checked={wizardData.adsPlatforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                <span className="text-sm">{p}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Budget</Label>
          <div>
            <Label className="text-xs text-muted-foreground">Orçamento mensal (R$)</Label>
            <Input
              type="number"
              value={wizardData.adsBudget}
              onChange={(e) => setWizardData((d) => ({ ...d, adsBudget: Number(e.target.value) }))}
            />
          </div>
          {wizardData.adsPlatforms.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Distribuição por plataforma</Label>
              {wizardData.adsPlatforms.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="text-sm w-20">{p}</span>
                  <Slider
                    className="flex-1"
                    value={[wizardData.adsPlatformDistribution[p] ?? 0]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setWizardData((d) => ({ ...d, adsPlatformDistribution: { ...d.adsPlatformDistribution, [p]: v } }))}
                  />
                  <span className="text-xs font-mono w-10 text-right">{wizardData.adsPlatformDistribution[p] ?? 0}%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Campanhas</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Campanhas por mês</Label>
              <Select value={String(wizardData.adsCampaignsPerMonth)} onValueChange={(v) => setWizardData((d) => ({ ...d, adsCampaignsPerMonth: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Criativos por campanha</Label>
              <Select value={String(wizardData.adsCreativesPerCampaign)} onValueChange={(v) => setWizardData((d) => ({ ...d, adsCreativesPerCampaign: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Tipos de Campanha</Label>
          <div className="flex flex-wrap gap-2">
            {AD_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent/30">
                <Checkbox checked={wizardData.adsTypes.includes(t)} onCheckedChange={() => toggleType(t)} />
                <span className="text-sm">{t}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label className="text-sm font-medium">Instruções Adicionais</Label>
          <Textarea
            rows={3}
            value={wizardData.specialInstructions}
            onChange={(e) => setWizardData((d) => ({ ...d, specialInstructions: e.target.value }))}
            placeholder="Instruções especiais para a geração de campanhas..."
          />
        </CardContent>
      </Card>
    </div>
  );
}

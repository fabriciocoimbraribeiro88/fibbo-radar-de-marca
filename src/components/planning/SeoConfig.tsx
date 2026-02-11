import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WizardData } from "@/pages/ProjectPlanning";

const BLOG_TYPES = ["Artigo Padrão", "Super Artigo", "Artigo Âncora"];
const BLOG_DESCS: Record<string, string> = {
  "Artigo Padrão": "600-800 palavras",
  "Super Artigo": "1.200-1.500 palavras",
  "Artigo Âncora": "2.400-3.000 palavras",
};
const KEYWORD_STRATEGIES = ["Cauda longa", "Cauda curta", "Perguntas", "Transacional", "Informacional", "Navegacional"];

interface Props {
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
}

export default function SeoConfig({ wizardData, setWizardData }: Props) {
  const blogMixTotal = Object.values(wizardData.seoBlogMix).reduce((a, b) => a + b, 0);

  const toggleStrategy = (s: string) => {
    setWizardData((d) => ({
      ...d,
      seoKeywordStrategies: d.seoKeywordStrategies.includes(s)
        ? d.seoKeywordStrategies.filter((x) => x !== s)
        : [...d.seoKeywordStrategies, s],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Volume</Label>
          <div>
            <Label className="text-xs text-muted-foreground">Blogs por mês</Label>
            <Select value={String(wizardData.seoBlogsPerMonth)} onValueChange={(v) => setWizardData((d) => ({ ...d, seoBlogsPerMonth: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Mix de Blogs</Label>
            <span className={`text-xs font-mono ${blogMixTotal === 100 ? "text-green-600" : "text-destructive"}`}>
              Total: {blogMixTotal}% {blogMixTotal === 100 ? "✅" : ""}
            </span>
          </div>
          {BLOG_TYPES.map((t) => (
            <div key={t} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t} <span className="text-xs text-muted-foreground">({BLOG_DESCS[t]})</span></span>
                <span className="text-xs font-mono text-muted-foreground">{wizardData.seoBlogMix[t] ?? 0}%</span>
              </div>
              <Slider
                value={[wizardData.seoBlogMix[t] ?? 0]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => setWizardData((d) => ({ ...d, seoBlogMix: { ...d.seoBlogMix, [t]: v } }))}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Com {wizardData.seoBlogsPerMonth} blogs/mês: ~{Math.round(wizardData.seoBlogsPerMonth * (wizardData.seoBlogMix["Artigo Padrão"] ?? 0) / 100)} padrão · ~{Math.round(wizardData.seoBlogsPerMonth * (wizardData.seoBlogMix["Super Artigo"] ?? 0) / 100)} super · ~{Math.round(wizardData.seoBlogsPerMonth * (wizardData.seoBlogMix["Artigo Âncora"] ?? 0) / 100)} âncora
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Estratégias de Keywords</Label>
          <div className="flex flex-wrap gap-2">
            {KEYWORD_STRATEGIES.map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-accent/30">
                <Checkbox checked={wizardData.seoKeywordStrategies.includes(s)} onCheckedChange={() => toggleStrategy(s)} />
                <span className="text-sm">{s}</span>
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
            placeholder="Instruções especiais para a geração de conteúdo SEO..."
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  type SocialChannel, type FibboScoreConfig, type ChannelThresholds,
  CHANNEL_DEFAULTS, FIBBO_CONFIG_DEFAULTS,
  getChannelLabel, getChannelIcon, classifyScore,
  applySensitivity, SENSITIVITY_LEVELS, deepMergeConfig, ALL_CHANNELS,
} from "@/lib/fibboScoreConfig";

interface FibboScoreAdminProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FibboScoreConfig;
  onSave: (config: FibboScoreConfig) => void;
  activeChannels: SocialChannel[];
}

export function FibboScoreAdmin({ open, onOpenChange, config, onSave, activeChannels }: FibboScoreAdminProps) {
  const channels = activeChannels.length > 0 ? activeChannels : ["instagram" as SocialChannel];

  // Sensitivity per channel (1-5)
  const [sensitivities, setSensitivities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const ch of ALL_CHANNELS) initial[ch] = 3;
    return initial;
  });

  // Weights per channel
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const ch of ALL_CHANNELS) initial[ch] = (config.weights[ch] ?? 1) * 100;
    return initial;
  });

  const currentConfig = useMemo((): FibboScoreConfig => {
    const channelsConfig: Record<string, ChannelThresholds> = {};
    for (const ch of ALL_CHANNELS) {
      const level = SENSITIVITY_LEVELS.find((l) => l.value === (sensitivities[ch] ?? 3));
      const multiplier = level?.multiplier ?? 1;
      channelsConfig[ch] = applySensitivity(CHANNEL_DEFAULTS[ch], multiplier);
    }
    const w: Partial<Record<SocialChannel, number>> = {};
    for (const ch of ALL_CHANNELS) {
      w[ch] = (weights[ch] ?? 100) / 100;
    }
    return { channels: channelsConfig as Record<SocialChannel, ChannelThresholds>, weights: w };
  }, [sensitivities, weights]);

  const handlePresetAll = (level: number) => {
    const next: Record<string, number> = {};
    for (const ch of ALL_CHANNELS) next[ch] = level;
    setSensitivities(next);
  };

  const handleSave = () => {
    onSave(currentConfig);
    onOpenChange(false);
  };

  const handleRestore = () => {
    const initial: Record<string, number> = {};
    for (const ch of ALL_CHANNELS) initial[ch] = 3;
    setSensitivities(initial);
    const w: Record<string, number> = {};
    for (const ch of ALL_CHANNELS) w[ch] = 100;
    setWeights(w);
  };

  const getSensitivityLabel = (val: number) =>
    SENSITIVITY_LEVELS.find((l) => l.value === val)?.label ?? "Equilibrado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">⚙️ Configuração do FibboScore</DialogTitle>
          <DialogDescription className="text-xs">
            Ajuste a sensibilidade e pesos por canal. Alterações afetam o próximo cálculo.
          </DialogDescription>
        </DialogHeader>

        {/* Channel weights */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Peso dos Canais no Score Geral</Label>
          <div className="space-y-2">
            {channels.map((ch) => (
              <div key={ch} className="flex items-center gap-3">
                <span className="text-sm w-28 shrink-0">
                  {getChannelIcon(ch)} {getChannelLabel(ch)}
                </span>
                <Slider
                  value={[weights[ch] ?? 100]}
                  onValueChange={([v]) => setWeights((p) => ({ ...p, [ch]: v }))}
                  min={0} max={200} step={10}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-12 text-right">{weights[ch] ?? 100}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-channel sensitivity */}
        <Tabs defaultValue={channels[0]} className="mt-4">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            {channels.map((ch) => (
              <TabsTrigger key={ch} value={ch} className="text-xs gap-1 px-2 py-1">
                {getChannelIcon(ch)} {getChannelLabel(ch)}
              </TabsTrigger>
            ))}
          </TabsList>

          {channels.map((ch) => (
            <TabsContent key={ch} value={ch} className="space-y-4 mt-3">
              {(["presenca", "engajamento", "conteudo", "competitividade"] as const).map((dim) => (
                <div key={dim} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold capitalize">{dim} (0-25)</Label>
                    <Badge variant="secondary" className="text-[10px]">
                      {getSensitivityLabel(sensitivities[ch] ?? 3)}
                    </Badge>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label className="text-xs">Sensibilidade geral do canal</Label>
                <Slider
                  value={[sensitivities[ch] ?? 3]}
                  onValueChange={([v]) => setSensitivities((p) => ({ ...p, [ch]: v }))}
                  min={1} max={5} step={1}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Rigoroso</span>
                  <span>Equilibrado</span>
                  <span>Muito Generoso</span>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Presets */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Presets:</span>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handlePresetAll(1)}>Rigoroso</Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handlePresetAll(3)}>Equilibrado</Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handlePresetAll(5)}>Generoso</Button>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" size="sm" onClick={handleRestore} className="text-xs">
            Restaurar Padrão
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs">
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

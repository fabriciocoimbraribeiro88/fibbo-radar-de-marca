import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Megaphone, Search, AlertTriangle, Info, Calendar, Hash } from "lucide-react";
import {
  ANALYSIS_TYPES,
  PERIOD_PRESETS,
  POSTS_LIMIT_OPTIONS,
  calculatePeriodFromPreset,
  calculatePreviousPeriod,
} from "@/lib/analysisSections";

interface Step1Props {
  channel: "social" | "ads" | "seo";
  setChannel: (c: "social" | "ads" | "seo") => void;
  analysisType: string;
  setAnalysisType: (t: string) => void;
  combinedTypes: Set<string>;
  setCombinedTypes: (s: Set<string>) => void;
  periodMode: "date" | "count";
  setPeriodMode: (m: "date" | "count") => void;
  periodPreset: string;
  setPeriodPreset: (p: string) => void;
  periodStart: string;
  setPeriodStart: (s: string) => void;
  periodEnd: string;
  setPeriodEnd: (s: string) => void;
  postsLimit: number;
  setPostsLimit: (n: number) => void;
  comparePrevious: boolean;
  setComparePrevious: (b: boolean) => void;
  largeDatasetAck: boolean;
  setLargeDatasetAck: (b: boolean) => void;
  hasAdsData: boolean;
  hasSeoData: boolean;
  contractedChannels?: string[];
}

const CHANNELS = [
  {
    value: "social" as const,
    label: "Social",
    icon: Smartphone,
    desc: "Instagram, TikTok, LinkedIn e outras redes sociais.",
  },
  {
    value: "ads" as const,
    label: "Ads",
    icon: Megaphone,
    desc: "Meta Ads, Google Ads, TikTok Ads e outras plataformas de anúncios.",
  },
  {
    value: "seo" as const,
    label: "SEO",
    icon: Search,
    desc: "Rankings, keywords, tráfego orgânico e backlinks.",
  },
];

export default function AnalysisStep1(props: Step1Props) {
  const {
    channel, setChannel,
    analysisType, setAnalysisType,
    combinedTypes, setCombinedTypes,
    periodMode, setPeriodMode,
    periodPreset, setPeriodPreset,
    periodStart, setPeriodStart,
    periodEnd, setPeriodEnd,
    postsLimit, setPostsLimit,
    comparePrevious, setComparePrevious,
    largeDatasetAck, setLargeDatasetAck,
    hasAdsData, hasSeoData,
    contractedChannels,
  } = props;

  const isChannelDisabled = (ch: string) =>
    contractedChannels && contractedChannels.length > 0 && !contractedChannels.includes(ch);

  const handlePreset = (preset: string) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      const { start, end } = calculatePeriodFromPreset(preset);
      setPeriodStart(start);
      setPeriodEnd(end);
    }
  };

  const prevPeriod =
    periodMode === "date" && periodStart && periodEnd
      ? calculatePreviousPeriod(periodStart, periodEnd)
      : null;

  const isLargeDataset =
    analysisType === "cross_analysis" &&
    periodMode === "date" &&
    periodStart &&
    periodEnd &&
    (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000 > 90;

  // Filter analysis types based on channel
  const visibleTypes = ANALYSIS_TYPES.filter((t) => {
    if (channel === "ads") {
      return !["influencer_analysis", "inspiration_analysis"].includes(t.value);
    }
    if (channel === "seo") {
      return !["influencer_analysis"].includes(t.value);
    }
    return true;
  });

  const combinedOptions = (() => {
    const base = [
      { value: "brand", label: "Marca", locked: true },
      { value: "competitor", label: "Concorrentes", locked: false },
    ];
    if (channel === "social") {
      base.push(
        { value: "influencer", label: "Influencers", locked: false },
        { value: "inspiration", label: "Inspirações", locked: false }
      );
    }
    if (channel === "seo") {
      base.push({ value: "inspiration", label: "Inspirações", locked: false });
    }
    return base;
  })();

  return (
    <div className="space-y-8">
      {/* Channel */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">
          Qual canal você quer analisar?
        </h2>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {CHANNELS.map((c) => {
            const disabled = isChannelDisabled(c.value);
            return (
              <Card
                key={c.value}
                className={`transition-all ${
                  disabled
                    ? "opacity-40 cursor-not-allowed"
                    : `cursor-pointer ${
                        channel === c.value
                          ? "ring-2 ring-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      }`
                }`}
                onClick={() => !disabled && setChannel(c.value)}
                title={disabled ? "Serviço não contratado" : undefined}
              >
                <CardContent className="p-4 text-center">
                  <c.icon className="h-6 w-6 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  {disabled && (
                    <Badge variant="secondary" className="text-[9px] mt-2">Não contratado</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {channel === "ads" && !hasAdsData && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs">
              Nenhum dado de Ads coletado. Adicione fontes de Ads antes de analisar.
            </span>
          </div>
        )}
        {channel === "seo" && !hasSeoData && (
          <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs">
              Nenhum dado de SEO coletado. Adicione fontes de SEO antes de analisar.
            </span>
          </div>
        )}
      </div>

      {/* Analysis Type */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">
          O que você quer analisar?
        </h2>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {visibleTypes.map((t) => (
            <Card
              key={t.value}
              className={`cursor-pointer transition-all ${
                "fullWidth" in t && t.fullWidth ? "col-span-2" : ""
              } ${
                analysisType === t.value
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => setAnalysisType(t.value)}
            >
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground">
                  {t.emoji} {t.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                {t.value === "cross_analysis" && analysisType === "cross_analysis" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Incluir:</p>
                    <div className="flex flex-wrap gap-3">
                      {combinedOptions.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-1.5 text-xs cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={combinedTypes.has(opt.value)}
                            disabled={opt.locked}
                            onCheckedChange={(checked) => {
                              const next = new Set(combinedTypes);
                              if (checked) next.add(opt.value);
                              else next.delete(opt.value);
                              setCombinedTypes(next);
                            }}
                          />
                          <span className="text-foreground">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    {isLargeDataset && (
                      <div className="flex items-start gap-2 mt-3 p-2 rounded bg-yellow-500/10 text-yellow-700">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p>Análises combinadas com grandes volumes podem ser menos precisas.</p>
                          <p>Para períodos superiores a 1 trimestre, recomendamos análises individuais.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Period */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">
          Selecione o período de análise
        </h2>
        <div className="space-y-3 mt-3">
          {/* By Period */}
          <Card
            className={`cursor-pointer transition-all ${
              periodMode === "date" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"
            }`}
            onClick={() => setPeriodMode("date")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Por Período</span>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    periodMode === "date"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Analisar dados dentro de um intervalo de datas.
              </p>
              {periodMode === "date" && (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PERIOD_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          periodPreset === p.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent text-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreset(p.value);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {periodPreset === "custom" && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">De</Label>
                        <Input
                          type="date"
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Até</Label>
                        <Input
                          type="date"
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  )}
                  {periodStart && periodEnd && (
                    <div
                      className="rounded-lg border border-border p-3 mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={comparePrevious}
                          onCheckedChange={(v) => setComparePrevious(!!v)}
                        />
                        <div>
                          <span className="text-xs font-medium text-foreground">
                            Comparar com período anterior
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Inclui variação % em todas as métricas.
                          </p>
                          {comparePrevious && prevPeriod && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Período anterior:{" "}
                              {new Date(prevPeriod.start).toLocaleDateString("pt-BR")} —{" "}
                              {new Date(prevPeriod.end).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* By Count */}
          <Card
            className={`cursor-pointer transition-all ${
              periodMode === "count" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent/50"
            }`}
            onClick={() => {
              setPeriodMode("count");
              setComparePrevious(false);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Por Quantidade</span>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    periodMode === "count"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Analisar os N posts/registros mais recentes.
              </p>
              {periodMode === "count" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {POSTS_LIMIT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          postsLimit === o.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent text-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostsLimit(o.value);
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Comparação com período anterior não disponível neste modo.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {isLargeDataset && analysisType === "cross_analysis" && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={largeDatasetAck}
                onCheckedChange={(v) => setLargeDatasetAck(!!v)}
              />
              <span className="text-xs text-yellow-700">
                Entendo que análises combinadas com grandes volumes podem ser menos precisas e desejo continuar.
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

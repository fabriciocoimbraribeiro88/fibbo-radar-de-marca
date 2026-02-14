import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionCard from "./SectionCard";
import { getSelectableSections, type AnalysisSection } from "@/lib/analysisSections";
import { Smartphone, Megaphone, Search, Info } from "lucide-react";

interface Step3Props {
  channel: "social" | "ads" | "seo";
  analysisType: string;
  selectedSections: Set<string>;
  setSelectedSections: (s: Set<string>) => void;
}

const CHANNEL_INFO = {
  social: { icon: Smartphone, label: "Social" },
  ads: { icon: Megaphone, label: "Ads" },
  seo: { icon: Search, label: "SEO" },
};

export default function AnalysisStep3({
  channel,
  analysisType,
  selectedSections,
  setSelectedSections,
}: Step3Props) {
  const sections = getSelectableSections(channel, analysisType);
  const channelInfo = CHANNEL_INFO[channel];

  const toggle = (key: string) => {
    const next = new Set(selectedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedSections(next);
  };

  const selectAll = () => {
    setSelectedSections(new Set(sections.map((s) => s.key)));
  };

  const deselectAll = () => {
    setSelectedSections(new Set());
  };

  const selectRecommended = () => {
    setSelectedSections(new Set(sections.filter((s) => s.defaultOn).map((s) => s.key)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Monte as seções do relatório</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Selecione quais análises incluir. As seções disponíveis variam conforme o canal selecionado.
        </p>
      </div>

      {/* Channel indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <channelInfo.icon className="h-3.5 w-3.5" />
        <span>Canal: <strong className="text-foreground">{channelInfo.label}</strong></span>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={selectAll}>
          Selecionar Todas
        </Button>
        <Button variant="outline" size="sm" onClick={deselectAll}>
          Desmarcar Todas
        </Button>
        <Button variant="outline" size="sm" onClick={selectRecommended}>
          Seleção Recomendada
        </Button>
      </div>

      {/* Section cards */}
      <div className="space-y-2">
        {sections.map((s) => (
          <SectionCard
            key={s.key}
            section={s}
            checked={selectedSections.has(s.key)}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* Footer info */}
      <div className="space-y-2 text-xs text-muted-foreground bg-accent/50 rounded-lg p-3">
        <p>
          📋 {selectedSections.size} seções selecionadas + Resumo Executivo (automático) |
          ~5 min estimados
        </p>
        <div className="flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>O Resumo Executivo é gerado automaticamente como primeira seção do relatório.</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        📌 Todo relatório inclui automaticamente a assinatura: "Relatório gerado por FibboMetrics — Inteligência Competitiva com IA"
      </p>
    </div>
  );
}

export type AnalysisSection = {
  key: string;
  label: string;
  icon: string;
  description: string;
  always?: boolean;
  generatedLast?: boolean;
  defaultOn?: boolean;
  onlyTypes?: string[];
  excludeTypes?: string[];
};

export const SOCIAL_SECTIONS: AnalysisSection[] = [
  {
    key: "executive_summary",
    label: "Resumo Executivo",
    icon: "FileText",
    always: true,
    generatedLast: true,
    description:
      "Síntese de 1 página com principais achados, oportunidades e 3 ações prioritárias. Escrito para stakeholders. Inclui veredicto: avançando, estagnada ou regredindo.",
  },
  {
    key: "big_numbers",
    label: "Big Numbers",
    icon: "BarChart3",
    defaultOn: true,
    description:
      "Métricas consolidadas: posts, curtidas, comentários, views, engajamento médio, taxa de engajamento, crescimento de seguidores. Com variação % vs período anterior (se habilitado).",
  },
  {
    key: "profile_bio",
    label: "Análise de Perfil & Bio",
    icon: "User",
    defaultOn: true,
    description:
      "Avaliação da bio, foto de perfil, destaques e link. Comparativo entre entidades. Sugestões de otimização para conversão.",
  },
  {
    key: "performance",
    label: "Análise de Performance",
    icon: "TrendingUp",
    defaultOn: true,
    description:
      "Performance detalhada de cada post e perfil. Padrões de engajamento, melhores horários, frequência ideal. Top 10 e bottom 10 posts com análise.",
  },
  {
    key: "sentiment",
    label: "Análise de Sentimento",
    icon: "MessageCircle",
    defaultOn: true,
    excludeTypes: ["inspiration_analysis"],
    description:
      "Classificação de sentimento das captions e comentários. Temas que geram reações positivas e negativas. Mapa de percepção.",
  },
  {
    key: "formats",
    label: "Análise de Formatos",
    icon: "Film",
    defaultOn: true,
    description:
      "Comparativo entre Reels, Carrossel, Estático, Stories, Vídeo. Qual gera mais engajamento, alcance e saves. Mix ideal com % por formato.",
  },
  {
    key: "themes",
    label: "Análise de Temas",
    icon: "Tags",
    defaultOn: true,
    description:
      "Categorização por tema/pilar. Quais ressoam mais. Cruzamento com pilares do contexto de marca. Gap analysis de temas não explorados.",
  },
  {
    key: "copy_analysis",
    label: "Análise de Copy & Captions",
    icon: "Type",
    defaultOn: false,
    description:
      "Padrões de copy: comprimento ideal, emojis, perguntas vs afirmações, CTAs mais eficazes, hooks de abertura e estrutura narrativa dos melhores posts.",
  },
  {
    key: "temporal",
    label: "Análise Temporal & Sazonalidade",
    icon: "Calendar",
    defaultOn: true,
    description:
      "Padrões temporais: melhores dias, horários de pico, sazonalidades. Heatmap dia × horário. Frequência vs engajamento. Gaps no calendário.",
  },
  {
    key: "hashtags",
    label: "Análise de Hashtags",
    icon: "Hash",
    defaultOn: true,
    description:
      "Estratégia de hashtags: quais geram alcance, exclusivas vs setor. Comparativo com concorrentes. Recomendações de novas hashtags.",
  },
  {
    key: "swot",
    label: "Análise SWOT",
    icon: "Shield",
    defaultOn: true,
    onlyTypes: ["brand_diagnosis", "cross_analysis"],
    description:
      "Forças, Fraquezas, Oportunidades e Ameaças a partir dos dados. Cruza com concorrentes para identificar vantagens e vulnerabilidades reais.",
  },
  {
    key: "recommendations",
    label: "Recomendações Estratégicas",
    icon: "Target",
    defaultOn: true,
    description:
      "Recomendações priorizadas por impacto × facilidade. Cada uma com: ação, métrica esperada e prazo sugerido.",
  },
  {
    key: "content_bank",
    label: "Banco de Conteúdo",
    icon: "Lightbulb",
    defaultOn: false,
    description:
      "Sugestões concretas de posts: temas, formatos, hooks, CTAs e hashtags. Cada sugestão é um brief criativo pronto para produção.",
  },
  {
    key: "fibbo_score",
    label: "Fibbo Score",
    icon: "Gauge",
    defaultOn: true,
    description:
      "Score de maturidade digital (0-100) com 4 dimensões: Presença, Engajamento, Conteúdo e Competitividade. Permite comparar a marca com concorrentes.",
  },
  {
    key: "creative_guidelines",
    label: "Diretrizes Criativas",
    icon: "Palette",
    defaultOn: false,
    onlyTypes: ["brand_diagnosis", "cross_analysis"],
    description:
      "Recomendações visuais: paleta predominante nos posts de sucesso, estilos de thumbnail, padrões de copy. Alinhamento com o brand book.",
  },
];

export const ADS_SECTIONS: AnalysisSection[] = [
  {
    key: "executive_summary",
    label: "Resumo Executivo",
    icon: "FileText",
    always: true,
    generatedLast: true,
    description:
      "Síntese dos principais achados da análise de anúncios. ROI geral, melhores campanhas e recomendações de otimização.",
  },
  {
    key: "big_numbers",
    label: "Big Numbers",
    icon: "BarChart3",
    defaultOn: true,
    description:
      "Total de anúncios ativos/inativos, investimento estimado total, impressões estimadas, tipos de anúncio e distribuição por plataforma.",
  },
  {
    key: "ad_performance",
    label: "Performance de Anúncios",
    icon: "TrendingUp",
    defaultOn: true,
    description:
      "Ranking dos anúncios por tempo ativo, análise de criativos (imagem vs vídeo vs carrossel), CTAs mais utilizados e landing pages.",
  },
  {
    key: "ad_creative",
    label: "Análise de Criativos",
    icon: "Image",
    defaultOn: true,
    description:
      "Padrões visuais dos anúncios: formatos, estilos de copy, CTAs, uso de texto vs imagem. O que os concorrentes estão fazendo diferente.",
  },
  {
    key: "ad_messaging",
    label: "Análise de Mensagens & Ofertas",
    icon: "MessageSquare",
    defaultOn: true,
    description:
      "Temas das campanhas, propostas de valor comunicadas, promoções e ofertas ativas. Comparativo de posicionamento em ads.",
  },
  {
    key: "ad_temporal",
    label: "Análise Temporal de Ads",
    icon: "Calendar",
    defaultOn: true,
    description:
      "Quando cada entidade anuncia mais, duração média dos anúncios, sazonalidade de campanhas, gaps identificados.",
  },
  {
    key: "ad_competitive",
    label: "Benchmark Competitivo de Ads",
    icon: "Swords",
    defaultOn: true,
    onlyTypes: ["cross_analysis", "competitor_analysis"],
    description:
      "Comparativo de estratégia de ads entre entidades: volume, formatos, mensagens, investimento estimado, canais e períodos.",
  },
  {
    key: "recommendations",
    label: "Recomendações de Mídia",
    icon: "Target",
    defaultOn: true,
    description:
      "Recomendações para campanhas: formatos que funcionam no setor, mensagens a testar, gaps de posicionamento para explorar, sugestões de criativos.",
  },
];

export const SEO_SECTIONS: AnalysisSection[] = [
  {
    key: "executive_summary",
    label: "Resumo Executivo",
    icon: "FileText",
    always: true,
    generatedLast: true,
    description:
      "Síntese da posição orgânica da marca vs concorrentes. Oportunidades de keywords e recomendações de conteúdo para SEO.",
  },
  {
    key: "big_numbers",
    label: "Big Numbers",
    icon: "BarChart3",
    defaultOn: true,
    description:
      "Keywords monitoradas, posição média, domain authority, estimativa de tráfego orgânico, total de backlinks. Comparativo entre entidades.",
  },
  {
    key: "keyword_rankings",
    label: "Análise de Keywords",
    icon: "Search",
    defaultOn: true,
    description:
      "Posição de cada keyword por entidade. Keywords onde a marca está ganhando vs perdendo. Oportunidades de keywords não exploradas.",
  },
  {
    key: "content_gaps",
    label: "Gap de Conteúdo SEO",
    icon: "FileSearch",
    defaultOn: true,
    description:
      "Keywords para as quais os concorrentes rankeiam mas a marca não. Oportunidades de conteúdo baseadas em volume de busca e dificuldade.",
  },
  {
    key: "domain_authority",
    label: "Autoridade de Domínio",
    icon: "Shield",
    defaultOn: true,
    description:
      "Comparativo de domain authority, backlinks e perfil de links entre entidades. Evolução ao longo do tempo.",
  },
  {
    key: "seo_temporal",
    label: "Evolução Temporal SEO",
    icon: "Calendar",
    defaultOn: true,
    description:
      "Mudanças de posição ao longo do tempo. Keywords que subiram e caíram. Correlação com publicações de conteúdo.",
  },
  {
    key: "recommendations",
    label: "Recomendações SEO",
    icon: "Target",
    defaultOn: true,
    description:
      "Priorização de keywords para atacar, sugestões de conteúdo para blog/site, recomendações de link building e otimizações on-page.",
  },
];

export function getSectionsForChannel(channel: "social" | "ads" | "seo"): AnalysisSection[] {
  switch (channel) {
    case "social":
      return SOCIAL_SECTIONS;
    case "ads":
      return ADS_SECTIONS;
    case "seo":
      return SEO_SECTIONS;
  }
}

export function getSelectableSections(
  channel: "social" | "ads" | "seo",
  analysisType: string
): AnalysisSection[] {
  return getSectionsForChannel(channel).filter((s) => {
    if (s.always) return false;
    if (s.onlyTypes && !s.onlyTypes.includes(analysisType)) return false;
    if (s.excludeTypes && s.excludeTypes.includes(analysisType)) return false;
    return true;
  });
}

export function getDefaultSections(
  channel: "social" | "ads" | "seo",
  analysisType: string
): Set<string> {
  return new Set(
    getSelectableSections(channel, analysisType)
      .filter((s) => s.defaultOn)
      .map((s) => s.key)
  );
}

export const ANALYSIS_TYPES = [
  {
    value: "brand_diagnosis",
    label: "Análise da Marca",
    description: "Deep dive na performance, conteúdo e estratégia da sua marca.",
    emoji: "👑",
  },
  {
    value: "competitor_analysis",
    label: "Análise de Concorrentes",
    description: "Análise individual de cada concorrente monitorado.",
    emoji: "⚔️",
  },
  {
    value: "influencer_analysis",
    label: "Análise de Influencers",
    description: "Avaliação dos influenciadores monitorados e oportunidades.",
    emoji: "✨",
  },
  {
    value: "inspiration_analysis",
    label: "Análise de Inspirações",
    description: "Benchmark de marcas inspiradoras e tendências.",
    emoji: "👁️",
  },
  {
    value: "cross_analysis",
    label: "Análise Combinada",
    description:
      "Analise múltiplas fontes juntas. Cruza dados para encontrar oportunidades e gaps.",
    emoji: "🔄",
    fullWidth: true as const,
  },
] as const;

export const PERIOD_PRESETS = [
  { value: "this_month", label: "Este Mês" },
  { value: "last_month", label: "Último Mês" },
  { value: "this_quarter", label: "Este Trimestre" },
  { value: "last_quarter", label: "Último Trimestre" },
  { value: "this_year", label: "Este Ano" },
  { value: "custom", label: "Personalizado" },
] as const;

export const POSTS_LIMIT_OPTIONS = [
  { value: 30, label: "Últimos 30" },
  { value: 50, label: "Últimos 50" },
  { value: 100, label: "Últimos 100" },
  { value: 200, label: "Últimos 200" },
] as const;

export function calculatePeriodFromPreset(preset: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "this_month":
      return {
        start: fmt(new Date(year, month, 1)),
        end: fmt(new Date(year, month + 1, 0)),
      };
    case "last_month":
      return {
        start: fmt(new Date(year, month - 1, 1)),
        end: fmt(new Date(year, month, 0)),
      };
    case "this_quarter":
      return {
        start: fmt(new Date(year, quarter * 3, 1)),
        end: fmt(new Date(year, quarter * 3 + 3, 0)),
      };
    case "last_quarter": {
      const lq = quarter === 0 ? 3 : quarter - 1;
      const lqYear = quarter === 0 ? year - 1 : year;
      return {
        start: fmt(new Date(lqYear, lq * 3, 1)),
        end: fmt(new Date(lqYear, lq * 3 + 3, 0)),
      };
    }
    case "this_year":
      return {
        start: fmt(new Date(year, 0, 1)),
        end: fmt(new Date(year, 11, 31)),
      };
    default:
      return { start: "", end: "" };
  }
}

export function calculatePreviousPeriod(
  start: string,
  end: string
): { start: string; end: string } {
  const s = new Date(start);
  const e = new Date(end);
  const durationMs = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 86400000); // day before start
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

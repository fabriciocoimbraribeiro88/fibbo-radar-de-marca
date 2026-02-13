// ── FibboScore Configuration: Types, Defaults & Helpers ──

export type SocialChannel = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'facebook';

export interface ChannelThresholds {
  presenca: {
    followerGrowthMaxPct: number;
    postsPerWeekMax: number;
    reachRateMaxPct: number;
    seoPositionCutoff: number;
    seoTopPosition: number;
  };
  engajamento: {
    engagementRateMaxPct: number;
    commentRateMaxPct: number;
    saveRateMaxPct: number;
    sentimentScoreMax: number;
    trendThresholdPct: number;
  };
  conteudo: {
    pillarDeviationMultiplier: number;
    consistencyRatioThresholds: [number, number, number];
    hashtagLiftThresholdPct: number;
  };
  competitividade: {
    engRatioMin: number;
    engRatioMax: number;
    seoAdvantageMax: number;
    neutralScore: number;
  };
}

export interface FibboScoreConfig {
  channels: Record<SocialChannel, ChannelThresholds>;
  weights: Partial<Record<SocialChannel, number>>;
}

export const CHANNEL_DEFAULTS: Record<SocialChannel, ChannelThresholds> = {
  instagram: {
    presenca: { followerGrowthMaxPct: 5, postsPerWeekMax: 4, reachRateMaxPct: 8, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 3, commentRateMaxPct: 0.1, saveRateMaxPct: 0.3, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2.5, 4, 7], hashtagLiftThresholdPct: 10 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  tiktok: {
    presenca: { followerGrowthMaxPct: 10, postsPerWeekMax: 5, reachRateMaxPct: 15, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 6, commentRateMaxPct: 0.15, saveRateMaxPct: 0.2, sentimentScoreMax: 8, trendThresholdPct: 8 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [3, 5, 8], hashtagLiftThresholdPct: 15 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  youtube: {
    presenca: { followerGrowthMaxPct: 4, postsPerWeekMax: 2, reachRateMaxPct: 5, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 4, commentRateMaxPct: 0.08, saveRateMaxPct: 0.1, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2, 3.5, 6], hashtagLiftThresholdPct: 8 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  linkedin: {
    presenca: { followerGrowthMaxPct: 4, postsPerWeekMax: 3, reachRateMaxPct: 6, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 2, commentRateMaxPct: 0.05, saveRateMaxPct: 0.1, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2, 3, 5], hashtagLiftThresholdPct: 8 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  twitter: {
    presenca: { followerGrowthMaxPct: 3, postsPerWeekMax: 7, reachRateMaxPct: 4, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 1.5, commentRateMaxPct: 0.03, saveRateMaxPct: 0.05, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [3, 5, 8], hashtagLiftThresholdPct: 5 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
  facebook: {
    presenca: { followerGrowthMaxPct: 2, postsPerWeekMax: 4, reachRateMaxPct: 4, seoPositionCutoff: 80, seoTopPosition: 20 },
    engajamento: { engagementRateMaxPct: 1, commentRateMaxPct: 0.03, saveRateMaxPct: 0.05, sentimentScoreMax: 8, trendThresholdPct: 5 },
    conteudo: { pillarDeviationMultiplier: 1.5, consistencyRatioThresholds: [2, 3, 5], hashtagLiftThresholdPct: 5 },
    competitividade: { engRatioMin: 0.3, engRatioMax: 2.0, seoAdvantageMax: 15, neutralScore: 13 },
  },
};

export const FIBBO_CONFIG_DEFAULTS: FibboScoreConfig = {
  channels: CHANNEL_DEFAULTS,
  weights: {},
};

export function classifyScore(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Forte";
  if (score >= 50) return "Mediano";
  if (score >= 35) return "Em desenvolvimento";
  return "Crítico";
}

export function getChannelLabel(channel: SocialChannel): string {
  const labels: Record<SocialChannel, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    twitter: "X / Twitter",
    facebook: "Facebook",
  };
  return labels[channel];
}

export function getChannelIcon(channel: SocialChannel): string {
  const icons: Record<SocialChannel, string> = {
    instagram: "📸",
    tiktok: "🎵",
    youtube: "▶️",
    linkedin: "💼",
    twitter: "𝕏",
    facebook: "📘",
  };
  return icons[channel];
}

export const ALL_CHANNELS: SocialChannel[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'twitter', 'facebook'];

export const SENSITIVITY_LEVELS = [
  { value: 1, label: "Rigoroso", multiplier: 0.6 },
  { value: 2, label: "Exigente", multiplier: 0.8 },
  { value: 3, label: "Equilibrado", multiplier: 1.0 },
  { value: 4, label: "Generoso", multiplier: 1.3 },
  { value: 5, label: "Muito Generoso", multiplier: 1.6 },
] as const;

export function applySensitivity(
  defaults: ChannelThresholds,
  multiplier: number
): ChannelThresholds {
  const cap = (v: number, max: number) => Math.max(0, Math.min(v, max));
  return {
    presenca: {
      followerGrowthMaxPct: cap(defaults.presenca.followerGrowthMaxPct * multiplier, 50),
      postsPerWeekMax: cap(defaults.presenca.postsPerWeekMax * multiplier, 14),
      reachRateMaxPct: cap(defaults.presenca.reachRateMaxPct * multiplier, 30),
      seoPositionCutoff: Math.min(defaults.presenca.seoPositionCutoff, 100),
      seoTopPosition: defaults.presenca.seoTopPosition,
    },
    engajamento: {
      engagementRateMaxPct: cap(defaults.engajamento.engagementRateMaxPct * multiplier, 15),
      commentRateMaxPct: cap(defaults.engajamento.commentRateMaxPct * multiplier, 5),
      saveRateMaxPct: cap(defaults.engajamento.saveRateMaxPct * multiplier, 5),
      sentimentScoreMax: defaults.engajamento.sentimentScoreMax,
      trendThresholdPct: defaults.engajamento.trendThresholdPct,
    },
    conteudo: {
      pillarDeviationMultiplier: defaults.conteudo.pillarDeviationMultiplier,
      consistencyRatioThresholds: defaults.conteudo.consistencyRatioThresholds.map(
        (v) => v * multiplier
      ) as [number, number, number],
      hashtagLiftThresholdPct: cap(defaults.conteudo.hashtagLiftThresholdPct * multiplier, 50),
    },
    competitividade: {
      engRatioMin: defaults.competitividade.engRatioMin,
      engRatioMax: cap(defaults.competitividade.engRatioMax * multiplier, 5),
      seoAdvantageMax: defaults.competitividade.seoAdvantageMax,
      neutralScore: defaults.competitividade.neutralScore,
    },
  };
}

/** Deep merge two objects (simple version for config) */
export function deepMergeConfig<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key in override) {
    if (override[key] !== undefined && override[key] !== null) {
      if (
        typeof override[key] === "object" &&
        !Array.isArray(override[key]) &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key])
      ) {
        (result as any)[key] = deepMergeConfig(base[key] as any, override[key] as any);
      } else {
        (result as any)[key] = override[key];
      }
    }
  }
  return result;
}

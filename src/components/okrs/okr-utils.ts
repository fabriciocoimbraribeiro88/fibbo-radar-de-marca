export function calculateProgress(baseline: number, target: number, current: number): number {
  if (target === baseline) return current >= target ? 100 : 0;
  if (target < baseline) {
    // Decrease goal (e.g. CPL)
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.min(Math.max(Math.round(progress), 0), 100);
  }
  const progress = ((current - baseline) / (target - baseline)) * 100;
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

export function getQuarterProgress(quarter: string, year: number): number {
  const quarters: Record<string, [number, number]> = {
    Q1: [0, 2],
    Q2: [3, 5],
    Q3: [6, 8],
    Q4: [9, 11],
  };
  const [startMonth, endMonth] = quarters[quarter] ?? [0, 2];
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);
  const now = new Date();
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const total = end.getTime() - start.getTime();
  return Math.min(Math.round((elapsed / total) * 100), 100);
}

export function getQuarterDates(quarter: string, year: number) {
  const quarters: Record<string, [number, number]> = {
    Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
  };
  const [startMonth, endMonth] = quarters[quarter] ?? [0, 2];
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0);
  return { start, end };
}

export type OKRStatus = "on_track" | "at_risk" | "behind" | "achieved";

export function computeStatus(progress: number, quarterElapsed: number): OKRStatus {
  if (progress >= 100) return "achieved";
  if (progress >= quarterElapsed - 10) return "on_track";
  if (progress >= quarterElapsed - 25) return "at_risk";
  return "behind";
}

export const STATUS_CONFIG: Record<OKRStatus, { label: string; emoji: string; className: string }> = {
  on_track: { label: "No caminho", emoji: "🟢", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  at_risk: { label: "Em risco", emoji: "🟡", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  behind: { label: "Atrasado", emoji: "🔴", className: "bg-destructive/15 text-destructive" },
  achieved: { label: "Atingido", emoji: "⭐", className: "bg-primary/15 text-primary" },
};

export const CHANNELS_OKR = [
  { value: "instagram", label: "Instagram" },
  { value: "social", label: "Social" },
  { value: "ads", label: "Ads" },
  { value: "seo", label: "SEO" },
  { value: "general", label: "Geral" },
];

export const METRIC_DIRECTIONS = [
  { value: "increase", label: "Aumentar" },
  { value: "decrease", label: "Diminuir" },
  { value: "maintain", label: "Manter" },
  { value: "achieve", label: "Atingir" },
];

export const DATA_SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "instagram", label: "Instagram" },
  { value: "ads", label: "Ads" },
  { value: "analytics", label: "Analytics" },
];

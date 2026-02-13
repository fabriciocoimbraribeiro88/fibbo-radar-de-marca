export const FORMULA_FRAMES = [
  { key: "villain", label: "Vilão Claro", description: "Identifique um inimigo claro do público" },
  { key: "surprising_number", label: "Número Surpreendente", description: "Dado que choca e gera curiosidade" },
  { key: "binary_comparison", label: "Comparação Binária", description: "X vs Y — forçar escolha" },
  { key: "future_vs_past", label: "Futuro vs Passado", description: "Contraste temporal provocativo" },
  { key: "myth_vs_reality", label: "Mito vs Realidade", description: "Destruir crença popular" },
  { key: "own_framework", label: "Framework Próprio", description: "Metodologia proprietária da marca" },
  { key: "timing", label: "Timing", description: "Conectar com momento atual relevante" },
  { key: "problem_solution", label: "Problema→Solução", description: "Dor clara e resolução objetiva" },
  { key: "behind_scenes", label: "Behind the Scenes", description: "Bastidores que geram conexão" },
  { key: "contrarian", label: "Contrarian", description: "Opinião contra o consenso" },
  { key: "extreme_case", label: "Caso Extremo", description: "Exemplo radical que ilustra o ponto" },
  { key: "actionable_checklist", label: "Checklist Acionável", description: "Lista prática e salvável" },
  { key: "timeline_journey", label: "Timeline/Jornada", description: "Evolução no tempo" },
  { key: "aggressive_comparison", label: "Comparativo Agressivo", description: "Comparação direta e ousada" },
  { key: "prediction", label: "Predição", description: "Previsão fundamentada" },
  { key: "vulnerable", label: "Vulnerável", description: "Vulnerabilidade autêntica" },
] as const;

export const FORMULA_OBJECTIVES = [
  { key: "awareness", label: "Awareness", description: "Ampliar alcance e reconhecimento", abbr: "AWR" },
  { key: "education", label: "Educação", description: "Ensinar e agregar valor", abbr: "EDU" },
  { key: "authority", label: "Autoridade", description: "Posicionar como referência", abbr: "AUT" },
  { key: "conversion", label: "Conversão", description: "Gerar leads e vendas", abbr: "CNV" },
  { key: "community", label: "Comunidade", description: "Engajar e construir comunidade", abbr: "COM" },
  { key: "social_proof", label: "Prova Social", description: "Depoimentos e resultados", abbr: "SPR" },
  { key: "product", label: "Produto", description: "Mostrar produto com valor", abbr: "PRD" },
] as const;

export const FORMULA_METHODS = [
  { key: "pas", label: "PAS", description: "Problem-Agitate-Solve" },
  { key: "bab", label: "BAB", description: "Before-After-Bridge" },
  { key: "numbered_list", label: "Lista Numerada", description: "Listicle estruturado" },
  { key: "timeline", label: "Timeline", description: "Cronologia de eventos" },
  { key: "comparative", label: "Comparativo", description: "Lado a lado" },
  { key: "framework", label: "Framework", description: "Modelo mental proprietário" },
  { key: "case_study", label: "Case Study", description: "Estudo de caso real" },
  { key: "myth_busting", label: "Mito-Detonado", description: "Destruir crença popular" },
  { key: "checklist", label: "Checklist", description: "Lista de verificação" },
  { key: "behind_scenes", label: "Behind the Scenes", description: "Bastidores" },
  { key: "strong_opinion", label: "Opinião Forte", description: "Posicionamento claro" },
  { key: "trend", label: "Tendência", description: "Análise de tendência" },
  { key: "common_mistake", label: "Erro Comum", description: "Erros que o público comete" },
  { key: "competitor_comparison", label: "Competidor", description: "Comparação com concorrente" },
  { key: "data_storytelling", label: "Data Storytelling", description: "Narrativa com dados" },
  { key: "ugc_testimonial", label: "UGC/Depoimento", description: "Conteúdo de usuários" },
] as const;

export function getFrameLabel(key: string | undefined): string {
  if (!key) return "—";
  return FORMULA_FRAMES.find((f) => f.key === key)?.label ?? key;
}

export function getObjectiveLabel(key: string | undefined): string {
  if (!key) return "—";
  return FORMULA_OBJECTIVES.find((o) => o.key === key)?.label ?? key;
}

export function getObjectiveAbbr(key: string | undefined): string {
  if (!key) return "—";
  return FORMULA_OBJECTIVES.find((o) => o.key === key)?.abbr ?? key.slice(0, 3).toUpperCase();
}

export function getMethodLabel(key: string | undefined): string {
  if (!key) return "—";
  return FORMULA_METHODS.find((m) => m.key === key)?.label ?? key;
}

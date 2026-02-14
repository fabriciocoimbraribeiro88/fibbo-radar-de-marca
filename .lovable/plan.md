

# Fluxo Unificado de Producao

## Problema Atual

Hoje existem 4 seções separadas na navegação (Calendário, Editorial, Briefings, Criativos) que na verdade representam etapas de um mesmo processo de produção de conteúdo. Isso obriga o usuário a navegar entre páginas diferentes para acompanhar o progresso, sem ter visibilidade clara do pipeline completo.

## Proposta

Unificar tudo em uma única seção chamada **"Produção"** com duas áreas:

### Area 1: Calendário Estratégico
O planejamento anual (temas, datas, foco por mês) fica acessível via uma aba ou botão no topo da página. Funciona exatamente como hoje, sem alterações funcionais.

### Area 2: Pipeline de Conteúdo
Cada calendário editorial aparece como um card com um **stepper visual** mostrando em qual fase está:

```text
[1. Editorial] → [2. Títulos] → [3. Briefings] → [4. Criativos]
```

Ao clicar em um calendário, o usuário entra em uma **visão de detalhe com stepper horizontal fixo no topo**, podendo navegar entre as fases concluídas sem sair da página.

### Navegação Atualizada

**Antes (4 itens):**
- Calendário
- Editorial
- Briefings
- Criativos

**Depois (1 item):**
- Produção

## Experiência do Usuário

1. O usuário acessa "Produção"
2. Vê duas abas: **Calendário Estratégico** e **Conteúdo**
3. Na aba "Conteúdo", vê a lista de calendários com status visual (stepper em miniatura)
4. Clica em "Novo Planejamento" → entra no wizard (steps 1-3, como hoje)
5. Ao finalizar o wizard, vai direto para a fase de Títulos, com o stepper mostrando o progresso
6. Avança para Briefings → Criativos, tudo dentro da mesma tela
7. Pode voltar a qualquer fase anterior clicando no stepper

## Detalhes Técnicos

### 1. Nova página unificada: `ProjectProduction.tsx`
- Substitui `ProjectPlanning.tsx`, `ProjectBriefings.tsx`, `ProjectCreatives.tsx` e `ProjectAnnualCalendar.tsx`
- Gerencia o estado interno com abas (Calendário Estratégico | Conteúdo) e fases do pipeline
- O componente `PlanningList` é adaptado para mostrar o stepper em miniatura em cada card
- As fases internas reutilizam os componentes existentes: `TitlesReview`, `BriefingsReview`, e a lógica de criativos

### 2. Componente `ProductionStepper.tsx`
- Stepper horizontal com 4 passos: Editorial → Títulos → Briefings → Criativos
- Indica visualmente qual passo está ativo, completo ou pendente
- Clicável para navegar entre fases já concluídas

### 3. Atualização de rotas (`App.tsx`)
- Remover rotas separadas: `/calendar`, `/planning`, `/briefings`, `/creatives`
- Adicionar rota única: `/production`

### 4. Atualização da navegação (`ProjectLayout.tsx`)
- Grupo AÇÃO passa de 4 itens para 1:
  ```
  AÇÃO
    └─ Produção
  ```

### 5. Lógica de estado do pipeline
- O status do `planning_calendar` já indica a fase (`draft`, `titles_review`, `briefings_review`, `approved`)
- Adicionar lógica para detectar fase de criativos (quando há `creative_outputs` para os itens)
- Mapeamento de status para step do stepper:
  - `draft` / wizard → Step 1 (Editorial)
  - `titles_review` → Step 2 (Títulos)
  - `briefings_review` → Step 3 (Briefings)
  - `approved` / `active` → Step 4 (Criativos)

### 6. Componentes reutilizados sem alteração
- `PlanningWizardStep1`, `Step2`, `Step3` (wizard de configuração)
- `TitlesReview` (revisão A/B)
- `BriefingsReview` (aprovação de briefings)
- Lógica de geração de criativos e legendas (extraída para componente dedicado)
- `ProjectAnnualCalendar` (conteúdo do calendário estratégico, embutido na aba)

### 7. Arquivos removidos/deprecados
- `src/pages/ProjectBriefings.tsx` (lógica absorvida)
- `src/pages/ProjectCreatives.tsx` (lógica absorvida)
- `src/pages/ProjectAnnualCalendar.tsx` (embutido como aba)
- `src/pages/ProjectPlanning.tsx` (substituído por `ProjectProduction.tsx`)


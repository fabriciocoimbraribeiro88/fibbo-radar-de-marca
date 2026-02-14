

## Reorganizar Sidebar + Criar modulo de Check-in

### 1. Reorganizar a navegacao lateral

Mover OKRs de "ACAO" para uma nova secao "RESULTADOS" e adicionar Check-in nessa mesma secao.

**Estrutura final da sidebar:**

```text
CONFIGURACAO
  Fontes de Dados
  Contexto de Marca

ANALISE
  Dashboard
  Metricas Avancadas

ACAO
  Planejamento
  Briefings
  Criativos

RESULTADOS
  OKRs
  Check-in
```

**Arquivo:** `src/components/ProjectLayout.tsx`
- Adicionar nova secao "RESULTADOS" com OKRs e Check-in
- Remover OKRs da secao "ACAO"
- Importar icone `ClipboardCheck` para Check-in
- Adicionar `checkin: "Check-in"` ao `PATH_LABELS`

---

### 2. Criar tabela `checkins` no banco de dados

Nova tabela para armazenar check-ins com checklists editaveis:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| project_id | uuid FK | Projeto |
| type | text | `weekly`, `monthly`, `quarterly`, `annual` |
| title | text | Ex: "Report Semanal - S23" |
| reference_date | date | Data de referencia do periodo |
| status | text | `pending`, `in_progress`, `completed` |
| checklist | jsonb | Array de itens `[{id, text, checked, notes}]` |
| summary | text | Resumo/notas gerais |
| nps_score | integer | Nota NPS (0-10), quando aplicavel |
| nps_feedback | text | Feedback qualitativo do NPS |
| participants | text[] | Nomes dos participantes |
| created_by | uuid | Usuario que criou |
| completed_at | timestamptz | Quando foi finalizado |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: mesma logica dos demais -- `is_project_member(auth.uid(), project_id)` para SELECT, INSERT, UPDATE, DELETE.

---

### 3. Criar pagina `ProjectCheckins.tsx`

Interface dividida em duas areas:

**Lado esquerdo: Check-in atual / Novo check-in**
- Seletor de tipo (Semanal, Mensal, Trimestral, Anual)
- Ao selecionar, carrega template editavel com os itens do checklist
- Cada item pode ser marcado como feito, editado, ou removido
- Botao para adicionar novos itens ao checklist
- Campo de resumo/notas gerais
- Campos de NPS (score + feedback) para tipos mensal/trimestral/anual
- Campo de participantes
- Botoes: Salvar rascunho / Marcar como concluido

**Templates padrao por tipo:**

- **Semanal**: KPIs semana, Comparativo anterior, Destaques, Otimizacoes, Plano proxima semana
- **Mensal**: Resumo executivo, Performance geral, Analise por canal, Analise de publico, Criativos, Otimizacoes, Insights, Conteudo organico, Proximo mes, NPS
- **Trimestral**: Tudo do mensal + Analise OKRs, ROI, Historico testes, Analise competitiva, Estrategia proximo tri, NPS completo
- **Anual**: Versao expandida do trimestral com retrospectiva 12 meses

**Lado direito / abaixo: Historico**
- Lista de check-ins anteriores filtrados por tipo e periodo
- Cada card mostra: tipo, data, status, % itens completos
- Ao clicar, abre o check-in para visualizar ou continuar editando
- Indicador visual de NPS (quando disponivel)

---

### 4. Registrar rota no App.tsx

**Arquivo:** `src/App.tsx`
- Importar `ProjectCheckins`
- Adicionar rota `<Route path="checkin" element={<ProjectCheckins />} />`

---

### Detalhes tecnicos

**Arquivos modificados:**
- `src/components/ProjectLayout.tsx` -- reorganizar sidebar
- `src/App.tsx` -- adicionar rota

**Arquivos criados:**
- `src/pages/ProjectCheckins.tsx` -- pagina principal com checklist interativo + historico

**Migration SQL:**
- Criar tabela `checkins` com RLS policies
- Trigger `update_updated_at` para manter `updated_at` atualizado

**Componentes reutilizados:**
- Card, Badge, Button, Select, Tabs, Checkbox do shadcn/ui
- Mesmo padrao visual das demais paginas (max-w-5xl, animate-fade-in, headers consistentes)


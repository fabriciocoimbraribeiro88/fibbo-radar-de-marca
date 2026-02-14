

# Separar Calendario em Duas Partes

## Resumo

O calendario sazonal atual no Contexto de Marca sera **simplificado** para conter apenas datas e nomes de eventos (como ja esta). Uma **nova pagina "Calendario Anual"** sera criada na secao ACAO com a estrutura completa do PPTX: tema do mes, foco estrategico, timeline de producao (KV), datas com tipos de acao, e notas adicionais.

---

## Etapa 1 — Manter Calendario Sazonal no Contexto de Marca (sem mudancas)

O componente `SeasonalCalendar.tsx` atual ja esta no formato correto: lista minimalista com nome do evento e data, agrupada por mes, com botao "Sugerir com IA". **Nao precisa de alteracao.**

---

## Etapa 2 — Nova pagina "Calendario Anual" na secao ACAO

### 2.1 Estrutura de dados

Armazenada no campo JSONB `briefing.annual_calendar` do projeto:

```text
briefing.annual_calendar = {
  year: 2026,
  months: [
    {
      month: 0,           // Janeiro
      theme: "Ano novo, obra nova!",
      focus: "Atendimento consultivo e planejamento",
      kv_planning: "novembro/2025",
      kv_production: "dezembro/2025",
      notes: "Lancamento do garoto propaganda...",
      dates: [
        {
          id: "uuid",
          name: "Dia Internacional do Lego",
          date: "28/01",
          action_types: ["acao em loja", "conteudo digital"]
        }
      ]
    },
    ...12 meses
  ]
}
```

### 2.2 Tipos de acao (chips coloridos)

Baseados no PPTX:
- conteudo digital
- acao em loja
- PDV
- relacionamento
- endomarketing
- acao social
- evento
- guerrilha

### 2.3 Interface da pagina

Cada mes sera um card colapsavel com:

1. **Header**: Nome do mes + tema em destaque
2. **Campos editaveis**: Tema, Foco, Timeline KV (planejamento e producao), Notas
3. **Lista de datas**: Nome, data (dd/mm), chips de tipo de acao
4. **Botao "+"** para adicionar datas manualmente
5. **Botao "Gerar com IA"** no topo da pagina para preencher o calendario completo (12 meses com temas + datas)

### 2.4 Novo arquivo

`src/pages/ProjectAnnualCalendar.tsx` — Pagina completa com a interface descrita acima.

### 2.5 Roteamento e navegacao

- **App.tsx**: Adicionar rota `calendar` dentro de `/projects/:id`
- **ProjectLayout.tsx**: Adicionar item "Calendario Anual" com icone `CalendarRange` no grupo ACAO (entre Planejamento e Briefings)
- **PATH_LABELS**: Adicionar `calendar: "Calendario Anual"`

### 2.6 Edge function

Atualizar `generate-seasonal-calendar` para aceitar um parametro `mode`:
- `mode: "dates_only"` (padrao atual) — retorna apenas datas para o Contexto de Marca
- `mode: "full_calendar"` — retorna a estrutura completa com temas, focos, timelines e datas com tipos de acao por mes

O prompt sera estendido para gerar a estrutura mensal completa quando em modo full.

---

## Detalhes tecnicos

### Arquivos a criar
- `src/pages/ProjectAnnualCalendar.tsx`

### Arquivos a modificar
- `src/App.tsx` — nova rota
- `src/components/ProjectLayout.tsx` — novo item no menu ACAO + PATH_LABELS
- `supabase/functions/generate-seasonal-calendar/index.ts` — adicionar modo "full_calendar"

### Persistencia
Usa merge no campo `briefing` (padrao existente): `briefing.annual_calendar` para a estrutura completa, `briefing.seasonal_calendar` continua independente para as datas simples.


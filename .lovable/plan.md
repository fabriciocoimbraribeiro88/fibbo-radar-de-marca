

# Redesign: Lista de Producao com Indicador de Progresso

## O Problema

O Kanban de 4 colunas nao funciona por 3 motivos:

1. **Colunas vazias**: Os planejamentos se acumulam em 1-2 fases, deixando outras colunas vazias
2. **Modelo mental errado**: Kanban e para itens independentes em paralelo. Aqui cada planejamento e um fluxo sequencial unico
3. **Pouca informacao**: Os cards pequenos nao mostram dados suficientes para decidir qual abrir

## A Proposta

Substituir o Kanban por uma **lista de cards** onde cada planejamento mostra todas as informacoes relevantes + um indicador de progresso inline.

```text
+------------------------------------------------------------------+
| Fev/Mar 2026 - Social - fibbo                                    |
| 01 mar - 31 mar  |  12 posts  |  3/sem  |  Reels 40% Carrossel 30%  |
|                                                                  |
|  [==Editorial==][==Titulos==][  Briefings  ][  Criativos  ]      |
|           ✓            ●                                         |
+------------------------------------------------------------------+
```

Cada card mostra:
- Titulo, periodo e canal (com icone)
- Volume: total de posts, frequencia semanal
- Mix de formatos em badges coloridos
- **Barra de progresso com 4 etapas** mostrando visualmente onde esta
- A etapa atual fica destacada e clicavel

## Como Funciona

1. O usuario ve a lista completa de planejamentos, ordenada por data de criacao
2. Cada card mostra o progresso de forma clara e visual
3. Clicar no card abre o detalhe na etapa atual (mesmo comportamento de hoje)
4. O botao "Novo Planejamento" continua no topo

## Detalhes Tecnicos

### 1. Substituir `ProductionKanban.tsx`

Trocar o grid de 4 colunas por uma lista vertical de cards expandidos. Cada card inclui:
- Query existente de `planning_calendars` (sem mudanca)
- Query existente de `planning_items` para contar posts e calcular mix de formatos
- Mini stepper horizontal inline (4 bolhas conectadas por linha)

### 2. Mini Stepper Inline

Componente leve que recebe o `status` do calendario e renderiza 4 circulos:
- Circulo preenchido = etapa concluida
- Circulo com borda destacada = etapa atual
- Circulo cinza = etapa futura

### 3. Informacoes do Card

Para cada calendario, calcular no frontend:
- Total de `planning_items` (ja existe a query)
- Mix de formatos: agrupar items por `format` e calcular percentual
- Posts por semana: total / semanas do periodo

### 4. Arquivos Alterados

- `src/components/production/ProductionKanban.tsx` — reescrever como lista vertical com cards informativos
- Nenhum outro arquivo precisa mudar (a logica de navegacao em `ProjectProduction.tsx` permanece identica)

### 5. Dados adicionais no card

A query de items precisa ser expandida para trazer `format` alem de `calendar_id`, permitindo calcular o mix de formatos diretamente na lista.

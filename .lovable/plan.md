
# Corrigir Area de Selecao de Titulos do Planejamento

## Problemas Identificados

### 1. Titulos duplicados/faltando (Bug critico de pareamento)
A funcao `groupIntoPairs()` agrupa items pelo campo `metadata.slot_index`. Porem, os dados no banco mostram que TODOS os items tem `slot_index: null`. Isso faz com que todos os items com `content_approach: "formula"` caiam no slot 0, criando um unico grupo gigante ao inves de pares A/B corretos.

**Causa raiz**: A edge function `generate-planning-titles` gera items no formato `slots` com `slot_index`, mas quando a IA retorna o JSON com `slot_index: 0` para todos (ou o campo nao e preenchido corretamente), o front quebra.

**Solucao**: Reescrever `groupIntoPairs()` para usar uma estrategia de fallback mais robusta:
- Se `slot_index` estiver presente e valido, usar ele
- Senao, agrupar items por `scheduled_date + scheduled_time + format` (pois ambas opcoes A/B compartilham mesma data/hora/formato)
- Se ainda nao parear, usar agrupamento sequencial (2 a 2, ordenados por data)

### 2. Edicao nao funciona corretamente
O `saveEdit()` depende de encontrar o "par" correto para rejeitar o sibling. Com o pareamento quebrado, o sibling nao e encontrado ou o item errado e rejeitado.

**Solucao**: Corrigir junto com o fix de pareamento. Alem disso, melhorar o dialog de edicao para ser mais completo.

### 3. Edge function sem slot_index
A edge function `generate-planning-titles` depende da IA retornar `slot_index` no JSON. Quando a IA nao retorna ou retorna incorretamente, os items ficam sem `slot_index`.

**Solucao**: Forcar `slot_index` no backend usando o indice do loop, nao o valor da IA.

## Mudancas Tecnicas

### Arquivo 1: `src/components/planning/TitlesReview.tsx`

1. **Reescrever `groupIntoPairs()`**:
   - Primeiro tenta agrupar por `slot_index` (se presente e unico)
   - Fallback: agrupa por chave composta `scheduled_date|scheduled_time|format`
   - Fallback final: agrupa sequencialmente de 2 em 2 por data
   - Garantir que cada grupo tenha no maximo 2 items

2. **Corrigir `selectOption()`**: 
   - Garantir que apenas o sibling direto do par seja rejeitado
   - Usar `queryClient.invalidateQueries` com `await` para evitar race conditions

3. **Corrigir `saveEdit()`**:
   - Mesma logica de busca do par corrigida

4. **Melhorar contagem de selecionados**: 
   - Contar corretamente mesmo quando pareamento nao e perfeito (items impares)

5. **Corrigir `handleGenerateBriefings()`**:
   - Filtrar items aprovados corretamente independente do pareamento

### Arquivo 2: `supabase/functions/generate-planning-titles/index.ts`

1. **Forcar `slot_index` no backend** (linhas 668-701):
   - Usar o indice do loop `for` ao inves de confiar no `slot.slot_index` da IA
   - Garantir que cada par A/B receba o mesmo `slot_index` incrementado sequencialmente

```text
Antes:  const slotIdx = regenerate_slot ?? slot.slot_index ?? 0;
Depois: const slotIdx = regenerate_slot ?? loopIndex;  // loopIndex do for
```

### Arquivo 3: `src/components/planning/BriefingsReview.tsx`

1. **Corrigir hashtags input**: O campo de hashtags nao salva ao editar (falta `onBlur` handler)
2. **Corrigir slides edit**: As laminas do carrossel nao salvam edicoes (Input sem `onBlur`)

## Resultado Esperado

- Posts aparecem corretamente em pares A/B, mesmo para dados antigos sem `slot_index`
- Selecionar uma opcao marca a outra como rejeitada corretamente
- Editar um titulo salva e seleciona corretamente
- Novos calendarios gerados terao `slot_index` correto desde o inicio
- Campos de hashtags e laminas salvam edicoes no BriefingsReview

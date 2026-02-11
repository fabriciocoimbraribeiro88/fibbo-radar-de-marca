
# Integrar Metodologia de Teses Narrativas ao Planejamento

## Resumo

Substituir a logica de geracao baseada em "pilares genericos" por um framework de **Territorios de Tensao x Lentes Narrativas**. O objetivo e que cada post seja uma **tese** -- um argumento original e provocativo -- construido a partir das melhores praticas identificadas nas Metricas Avancadas, do contexto de marca completo e da memoria estrategica.

A mudanca principal e nos prompts das Edge Functions e na UI de configuracao/revisao. Nenhuma migration de banco e necessaria -- tudo cabe no JSONB existente.

---

## O que muda no fluxo

```text
ANTES:
Pilares de Conteudo --> Titulos genericos por pilar

DEPOIS:
Territorios de Tensao (derivados dos pilares + analise)
        x
Lentes Narrativas (6 angulos de analise)
        =
Teses unicas por post --> Headlines provocativas --> Briefings com argumento central
```

O sistema continua usando os pilares como base de distribuicao, mas cada post gerado agora carrega: territorio, lente, tese e headline no formato `[FRASE CURTA] - [COMPLEMENTO PROVOCADOR]`.

---

## Parte 1: Territorios de Tensao no Contexto de Marca

**Arquivo novo:** `src/components/brand-context/TensionTerritories.tsx`

**Editar:** `src/pages/ProjectBrand.tsx` -- adicionar a secao dentro da aba "Conteudo" (abaixo de ContentPillars)

Cada territorio e armazenado em `projects.briefing.tension_territories` (JSONB existente):

```text
tension_territories: [
  {
    id: "uuid",
    name: "Conexao Digital vs. Isolamento Real",
    pole_a: "Conexao Digital",
    pole_b: "Isolamento Real",
    description: "A tecnologia nos conecta ou nos isola?",
    brand_position: "Defendemos que a tecnologia deve servir a conexao humana real",
    related_pillar: "Nome do Pilar"  (vinculo opcional)
  }
]
```

Interface:
- Lista de 3-5 territorios com campos: nome da dualidade, descricao da tensao, posicionamento da marca
- Botao "Gerar com IA a partir dos Pilares" que transforma os pilares existentes em territorios usando a logica da metodologia (pergunta de tensao para cada pilar)
- Botao salvar (grava no briefing JSONB)

---

## Parte 2: Configuracao no Wizard (SocialConfig)

**Editar:** `src/pages/ProjectPlanning.tsx` -- adicionar campos ao tipo `WizardData`:

```text
contentApproach: "theses" | "pillars"   (default: "theses")
selectedLenses: string[]                (default: todas 6)
provocationLevel: number                (default: 3, range 1-5)
```

**Editar:** `src/components/planning/SocialConfig.tsx` -- nova secao "Abordagem de Conteudo":

- Toggle: Teses Narrativas (recomendado) vs Pilares Tradicionais
- Se Teses: checkboxes com as 6 lentes (Sociologica, Psicologica, Economica, Tecnologica, Contraintuitiva, Historica/Futurista)
- Slider: Nivel de provocacao (1=consultivo, 5=confrontador)
- Mostra os territorios definidos no contexto de marca (read-only, com link para editar)
- Se nenhum territorio definido, mostra aviso sugerindo criar na aba de Contexto de Marca

**Editar:** `src/components/planning/PlanningWizardStep3.tsx` -- exibir no resumo: abordagem selecionada, lentes ativas, nivel de provocacao

---

## Parte 3: Reescrita do Prompt -- generate-planning-titles

**Editar:** `supabase/functions/generate-planning-titles/index.ts`

Mudancas principais:

1. Receber `content_approach`, `selected_lenses`, `provocation_level` nos parametros
2. Se `contentApproach === "theses"`:
   - Buscar `briefing.tension_territories` alem dos pilares
   - Construir a Matriz (Territorios x Lentes) no prompt
   - Novo system prompt focado em teses narrativas (conforme metodologia)
   - Cada item gerado tera campos extras no metadata: `territory`, `lens`, `thesis`
3. Se `contentApproach === "pillars"`: manter comportamento atual (fallback)

Novo system prompt (modo teses):

```text
Voce e um Arquiteto de Narrativas de Marca. Seu trabalho e construir um universo intelectual para a marca, nao preencher um calendario com posts genericos.

Voce desenvolve TESES -- argumentos originais com angulo claro e provocacao que forcam a audiencia a refletir, salvar e compartilhar.

PROCESSO:
1. Para cada post, CRUZE um Territorio de Tensao com uma Lente Narrativa
2. Extraia uma tese unica dessa intersecao
3. Transforme a tese em uma headline no formato: [FRASE CURTA E FORTE] - [COMPLEMENTO PROVOCADOR] (caixa alta)

AS 6 LENTES:
- Sociologica: impacto no coletivo, normas sociais, estruturas de poder
- Psicologica: ansiedades, desejos, vieses cognitivos do individuo
- Economica: quem ganha/perde, fluxo de capital, o que esta sendo mercantilizado
- Tecnologica: como a inovacao acelera ou distorce a tensao
- Contraintuitiva: verdade surpreendente, inversao de logica
- Historica/Futurista: de onde veio, para onde vai, padroes ciclicos

REGRAS CRITICAS:
- Cada post e uma TESE, nao um topico
- NUNCA crie algo que o concorrente poderia ter escrito
- SEM jargoes corporativos (sinergia, paradigma, disruptivo, game-changer, escalavel)
- SEM cliches ("em um mundo cada vez mais...", "pensando fora da caixa")
- SEM obviedades ("a tecnologia e importante", "a saude e fundamental")
- Use os posts que FUNCIONARAM como inspiracao de angulo, nao de conteudo
- Use os posts que NAO FUNCIONARAM para saber o que evitar
- Use a analise de concorrentes para garantir DIFERENCIACAO
- Considere a memoria estrategica para nao repetir abordagens recentes
```

Formato de saida atualizado:

```text
{
  "items": [
    {
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "content_type": "Nome Completo do Pilar",
      "format": "Carrossel",
      "responsible_code": "INT",
      "title": "O PARADOXO DA HIPERCONEXAO - POR QUE QUANTO MAIS CONECTADOS ESTAMOS, MAIS SOZINHOS NOS SENTIMOS",
      "territory": "Conexao Digital vs. Isolamento Real",
      "lens": "Contraintuitiva",
      "thesis": "A promessa de conectividade digital criou uma geracao que confunde presenca digital com intimidade real."
    }
  ]
}
```

O `territory`, `lens` e `thesis` sao salvos no campo `metadata` de cada `planning_item`.

---

## Parte 4: Reescrita do Prompt -- generate-planning-briefings

**Editar:** `supabase/functions/generate-planning-briefings/index.ts`

Mudancas:

1. Buscar todo o contexto de marca (briefing, analise, referencias, memoria) -- atualmente so busca nome da marca
2. Incluir a tese de cada item no prompt (vem do metadata)
3. Novo micro-framework para cada briefing:
   - **Headline de Tensao**: ja vem do titulo aprovado
   - **Argumento Central**: 2-3 paragrafos/slides defendendo a tese com linguagem acessivel
   - **Evidencia/Exemplo**: dado concreto, case real, analogia poderosa que ancora o argumento
   - **Resolucao/Provocacao Final**: conexao com a marca ou pergunta aberta que deixa a audiencia pensando
4. O tom e de "intelectual acessivel" -- ideias complexas explicadas com linguagem simples

---

## Parte 5: Adaptar UI de Revisao

**Editar:** `src/components/planning/TitlesReview.tsx`

- Adicionar colunas "Territorio" e "Lente" na tabela (quando modo teses)
- O titulo agora e uma headline em caixa alta (formatacao visual)
- Exibir a tese (1-2 frases) como subtexto abaixo do titulo ou no hover
- No dialog de edicao, adicionar campos Territorio, Lente, Tese

**Editar:** `src/components/planning/DistributionTables.tsx`

- Adicionar tabela "Distribuicao por Territorio" e "Distribuicao por Lente" (alem das existentes por Pilar/Formato/Responsavel)

**Editar:** `src/components/planning/BriefingsReview.tsx`

- Exibir territorio e lente no header do accordion
- Adicionar campo "Tese" editavel
- Reorganizar campos seguindo o micro-framework: Headline > Argumento > Evidencia > Resolucao

---

## Parte 6: Armazenamento

Nenhuma migration necessaria. Tudo no JSONB existente:

| Dado | Onde |
|------|------|
| Territorios de Tensao | `projects.briefing.tension_territories` |
| Territorio do post | `planning_items.metadata.territory` |
| Lente do post | `planning_items.metadata.lens` |
| Tese do post | `planning_items.metadata.thesis` |
| Abordagem (theses/pillars) | Parametro passado na geracao |
| Nivel de provocacao | Parametro passado na geracao |

---

## Arquivos a criar/editar

| Arquivo | Acao |
|---------|------|
| `src/components/brand-context/TensionTerritories.tsx` | Criar -- UI para definir territorios de tensao |
| `src/pages/ProjectBrand.tsx` | Editar -- adicionar TensionTerritories na aba Conteudo |
| `src/pages/ProjectPlanning.tsx` | Editar -- novos campos no tipo WizardData + defaults |
| `src/components/planning/SocialConfig.tsx` | Editar -- toggle abordagem + lentes + provocacao |
| `src/components/planning/PlanningWizardStep3.tsx` | Editar -- mostrar abordagem no resumo |
| `src/components/planning/TitlesReview.tsx` | Editar -- colunas territorio/lente/tese |
| `src/components/planning/DistributionTables.tsx` | Editar -- tabelas por territorio/lente |
| `src/components/planning/BriefingsReview.tsx` | Editar -- campos tese + micro-framework |
| `supabase/functions/generate-planning-titles/index.ts` | Editar -- novo prompt com matriz de teses |
| `supabase/functions/generate-planning-briefings/index.ts` | Editar -- buscar contexto completo + micro-framework |

---

## Compatibilidade

- O modo "Pilares Tradicionais" continua funcionando como fallback
- Se o projeto nao tem territorios definidos, o sistema gera teses a partir dos pilares (transforma automaticamente no prompt)
- Territorios podem ser vinculados a pilares para manter rastreabilidade nas distribuicoes



# Contexto de Marca -- Preenchimento Manual e Automatico com IA

## Resumo

Transformar a pagina "Marca" em "Contexto de Marca" com um formulario expandido de 12 secoes e um fluxo de preenchimento automatico por IA. O usuario podera colar links, textos de briefing ou enviar documentos, e a IA preenchera o formulario completo.

## O que muda para o usuario

1. O menu lateral passa de "Marca" para "Contexto de Marca"
2. A pagina tera duas abas: **Fontes de Contexto** (onde o usuario alimenta materiais) e **Formulario de Contexto** (os 12 blocos do briefing)
3. Um botao "Preencher com IA" processa os materiais enviados e preenche todos os campos automaticamente
4. O usuario pode editar manualmente qualquer campo a qualquer momento (auto-save mantido)

## Detalhes Tecnicos

### 1. Banco de Dados

A tabela `projects` ja possui a coluna `briefing` (tipo JSON). Sera utilizada para armazenar todo o contexto de marca estruturado em 12 secoes. Nao e necessario criar novas tabelas.

Nova tabela `brand_context_sources` para armazenar os materiais enviados pelo usuario:

```sql
CREATE TABLE public.brand_context_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'url', 'text', 'document'
  content TEXT,              -- URL ou texto colado
  file_url TEXT,             -- path no storage (para documentos)
  file_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'error'
  extracted_text TEXT,       -- texto extraido pelo scraping/parsing
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_context_sources ENABLE ROW LEVEL SECURITY;
-- RLS: acesso via project_members
```

### 2. Edge Function: `fill-brand-context`

Nova edge function que:
- Recebe `project_id` como parametro
- Busca todas as `brand_context_sources` do projeto
- Concatena os textos extraidos
- Envia para Lovable AI (opus 4.6) com tool calling para retornar o JSON estruturado dos 12 blocos
- Salva o resultado na coluna `projects.briefing`

Modelo: opus 4.6

### 3. Edge Function: `extract-brand-source`

Nova edge function que:
- Recebe uma URL e faz scraping basico (fetch HTML + extrai texto)
- Ou recebe texto puro e salva diretamente
- Atualiza `brand_context_sources.extracted_text` e marca `status = 'processed'`

### 4. Frontend: `src/pages/ProjectBrand.tsx` (reescrita)

**Aba "Fontes de Contexto":**
- Lista de materiais adicionados (cards com tipo, nome, status)
- Botao "+ Adicionar Fonte" abre dialog com opcoes:
  - Colar URL (site, rede social, blog)
  - Colar texto (ata de reuniao, briefing)
  - Upload de documento (PDF, DOCX -- armazenado no Storage)
- Botao principal "Preencher com IA" que chama a edge function

**Aba "Formulario de Contexto" (12 secoes colapsaveis via Accordion):**
1. Informacoes Basicas (setor, posicionamento, proposito)
2. Tom de Voz e Linguagem Verbal
3. Universo de Palavras (4 sub-campos por universo tematico)
4. Valores e Essencia (valores, essencia, missao, visao)
5. Publico-Alvo (demografia, psicografia, pain points, linguagem)
6. Diferencial Competitivo
7. Diretrizes de Comunicacao (SEMPRE / NUNCA / EVITAR)
8. Linguagem Especifica (jargoes, expressoes, palavras proibidas, sinonimos)
9. Contexto Emocional
10. Referencias e Exemplos
11. Aplicacao Pratica (canais, adaptacoes, sazonalidades)
12. Metricas de Sucesso

Cada campo e um `Textarea` ou `Input` com auto-save (debounce de 2s, mesmo padrao atual).

### 5. Navegacao

Atualizar `ProjectLayout.tsx`: renomear "Marca" para "Contexto de Marca" no menu lateral.

### 6. Storage

Criar bucket `brand-documents` para upload de arquivos de briefing (PDF, DOCX, etc).

### Estrutura JSON do `briefing`

```text
{
  "basic_info": { "sector", "positioning", "purpose" },
  "tone_of_voice": { "personality", "communication_style", "characteristics": { "how_speaks", "feeling", "approach" } },
  "word_universe": { "technical", "emotional", "benefits", "experience" },
  "values_essence": { "values", "essence", "mission", "vision" },
  "target_audience": { "demographics", "psychographics", "pain_points", "language" },
  "competitive_edge": { "unique", "advantages", "value_proposition" },
  "communication_guidelines": { "always", "never", "avoid" },
  "specific_language": { "jargon", "expressions", "forbidden_words", "preferred_synonyms" },
  "emotional_context": { "desired_emotion", "memory", "connection" },
  "references": { "success_cases", "positive_benchmarks", "cases_to_avoid" },
  "practical_application": { "channels", "channel_adaptations", "seasonality" },
  "success_metrics": { "effectiveness_metrics", "expected_feedback" }
}
```

### Arquivos a criar/editar

| Arquivo | Acao |
|---|---|
| `src/pages/ProjectBrand.tsx` | Reescrever com abas e 12 secoes |
| `src/components/ProjectLayout.tsx` | Renomear "Marca" para "Contexto de Marca" |
| `supabase/functions/fill-brand-context/index.ts` | Criar -- chamada Lovable AI |
| `supabase/functions/extract-brand-source/index.ts` | Criar -- scraping/extração |
| `supabase/config.toml` | Registrar novas functions |
| Migration SQL | Criar tabela `brand_context_sources` + bucket storage |


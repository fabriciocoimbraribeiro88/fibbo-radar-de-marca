

## Criativos -- Geracão de Posts com IA

### Resumo

Criar uma nova secão **Criativos** no menu ACAO (entre Briefings e OKRs) onde o usuario pode gerar imagens conceito para cada briefing aprovado usando o modelo Nano Banana (google/gemini-2.5-flash-image). Para cada briefing, a IA gera 2 opcoes visuais. O usuario seleciona a melhor, rejeita ambas (para regenerar), ou marca como "Referencia" -- enviando automaticamente para o banco de referencias no Contexto de Marca.

Tambem sera adicionado um campo de upload de logo na pagina de Contexto de Marca (tab Identidade).

---

### Fluxo do Usuario

1. Usuario vai em **Briefings** e aprova os briefings
2. Acessa **Criativos** no menu lateral
3. Ve a lista de calendarios com briefings aprovados
4. Clica num calendario e ve os briefings aprovados, cada um com botao "Gerar Criativos"
5. A IA gera 2 opcoes de imagem lado a lado
6. Usuario pode: **Selecionar A**, **Selecionar B**, ou **Refazer** (regenera o par)
7. Ao selecionar, pode clicar em **Salvar como Referencia** -- a imagem vai para `brand_references` com tipo `kv`

---

### Mudancas Tecnicas

#### 1. Nova tabela: `creative_outputs`

```sql
CREATE TABLE public.creative_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  planning_item_id UUID NOT NULL REFERENCES planning_items(id),
  option_a_url TEXT,
  option_b_url TEXT,
  selected_option TEXT, -- 'a', 'b', or NULL
  prompt_used TEXT,
  status TEXT DEFAULT 'pending', -- pending, generating, generated, selected
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creative_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view creatives"
  ON creative_outputs FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can insert creatives"
  ON creative_outputs FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can update creatives"
  ON creative_outputs FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Members can delete creatives"
  ON creative_outputs FOR DELETE
  USING (is_project_member(auth.uid(), project_id));
```

#### 2. Edge Function: `generate-creative`

- Recebe `planning_item_id` e `project_id`
- Busca o briefing do item (titulo, descricao, conceito, visual_brief, copy_text, formato)
- Busca a `logo_url` do projeto
- Busca referencias existentes do `brand_references` para contexto visual
- Monta prompt descrevendo o post desejado com instrucoes de estilo e incluir a logo
- Chama o Lovable AI Gateway (`ai.gateway.lovable.dev`) com modelo `google/gemini-2.5-flash-image` 2 vezes (opcao A e B com angulos criativos diferentes)
- Salva as imagens base64 no bucket `brand-documents` (path: `{project_id}/creatives/`)
- Retorna as URLs publicas

#### 3. Nova pagina: `ProjectCreatives.tsx`

- Lista de calendarios com briefings aprovados (status `briefed` ou `approved` no calendario)
- Ao clicar num calendario: lista os planning_items com `status = 'briefed'` e `metadata.briefing_status = 'approved'`
- Para cada item, mostra:
  - Titulo + formato + data
  - Se ja tem creative_output: exibe as 2 imagens lado a lado
  - Botoes: Selecionar A | Selecionar B | Refazer
  - Botao "Salvar como Referencia" (apos selecao)
- Estado vazio: card com CTA para ir aos Briefings

#### 4. Upload de Logo no Contexto de Marca

- Adicionar no componente `BrandContextForm` (tab Identidade) um campo de upload de logo
- Faz upload para `brand-documents/{project_id}/brand/logo/`
- Salva a URL no campo `logo_url` da tabela `projects`
- Exibe preview da logo atual se existir

#### 5. Salvar como Referencia

- Ao clicar "Salvar como Referencia" num criativo selecionado:
  - Insere na tabela `brand_references` com `type = 'kv'`
  - `image_url` = URL da imagem selecionada
  - `title` = titulo do planning_item
  - `description` = conceito do briefing
  - Toast de sucesso
  - Badge visual "Referencia" aparece no card

#### 6. Rotas e Navegacao

- Nova rota: `/projects/:id/creatives` em `App.tsx`
- Novo item no menu ACAO em `ProjectLayout.tsx`: "Criativos" com icone `Paintbrush` (entre Briefings e OKRs)
- Breadcrumb label: `creatives: "Criativos"`

---

### Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `src/pages/ProjectCreatives.tsx` | Pagina principal de criativos |
| `supabase/functions/generate-creative/index.ts` | Edge function de geracao de imagem |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Adicionar rota `/creatives` |
| `src/components/ProjectLayout.tsx` | Menu item + breadcrumb |
| `src/components/brand-context/BrandContextForm.tsx` | Campo upload de logo |
| Migration SQL | Tabela `creative_outputs` |




## Nova Tab "Referências" no Contexto de Marca

### O que sera feito

Adicionar uma **quarta tab "Referências"** na pagina de Contexto de Marca, dedicada exclusivamente a gestao do banco de referencias da marca. O componente `BrandReferences.tsx` ja existe e esta completo, mas nao esta sendo renderizado em nenhum lugar.

### Mudanca

**Arquivo: `src/pages/ProjectBrand.tsx`**

1. Importar `BrandReferences` de `@/components/brand-context/BrandReferences`
2. Adicionar nova tab no array `tabs`:
   - `{ value: "references", label: "Referências", icon: ImageIcon }`
   - Importar o icone `ImageIcon` de `lucide-react`
3. Adicionar novo `TabsContent` para `"references"` renderizando `<BrandReferences projectId={id!} briefing={project?.briefing} />`

### Resultado

As tabs ficam: **Identidade** | **Estrategia** | **Produtos** | **Referencias**

A tab Referencias permite gerenciar:
- Key Visuals (imagens de referencia)
- Posts de sucesso e falha (com metricas)
- Campanhas (com periodo, resultados e aprendizados)
- Filtros por tipo, pilar e plataforma
- Upload de imagens, tags, URL externa

Suporta criativos, copys de posts de redes sociais, artigos, campanhas -- tudo via os 4 tipos existentes (KV, Post Sucesso, Post Falha, Campanha).

### Detalhes tecnicos

Apenas 3 linhas de mudanca em `ProjectBrand.tsx`: 1 import, 1 item no array de tabs, 1 TabsContent. Nenhuma migration ou componente novo necessario.



# Fibbo Radar — Fase 1: Fundação

## Visão Geral
Construir a base completa do sistema de inteligência competitiva digital, incluindo identidade visual, autenticação com roles, schema do banco de dados, e as páginas essenciais de gestão de projetos e entidades. Ao final desta fase, o sistema estará funcional para criar projetos, configurar marcas e gerenciar concorrentes/influencers/inspirações.

---

## 1. Identidade Visual & Tema
- Aplicar o tema dark mode com as cores definidas (roxo #6C2BD9, dark navy #1E1E2E, accent teal #00D4AA, background #0F0F1A)
- Tipografia Inter para textos e JetBrains Mono para dados/métricas
- Estilo SaaS moderno com glassmorphism sutil, cantos arredondados e micro-animações
- Ícone de radar/satélite estilizado como logo

## 2. Banco de Dados (Lovable Cloud / Supabase)
- Criar todo o schema de tabelas conforme especificado: profiles, projects, project_members, monitored_entities, project_entities, instagram_profiles, instagram_posts, instagram_comments, ads_library, seo_data, data_fetch_configs, data_fetch_logs, analyses, analysis_sections, reports, okr_objectives, okr_key_results, okr_measurements, planning_calendars, planning_items, notifications
- Roles armazenados em tabela separada (user_roles) com função `has_role` security definer
- RLS em todas as tabelas: usuários só veem projetos dos quais são membros, admins veem tudo
- Trigger para auto-criar perfil no signup

## 3. Autenticação & Permissões
- Tela de login estilizada com branding Fibbo Radar
- Login com email/senha via Supabase Auth
- 3 roles: admin, analyst, viewer
- Página de perfil com avatar, nome e role
- Proteção de rotas por autenticação

## 4. Layout Principal
- Sidebar fixa à esquerda (colapsável) com: logo, seletor de projeto (dropdown), links de navegação com ícones, avatar do usuário no bottom
- Top bar com breadcrumbs, botão de notificações (bell icon com badge), search global
- Responsivo: sidebar colapsa em telas menores

## 5. Dashboard Geral (/)
- Cards resumo de todos os projetos ativos do usuário (logo, nome, status, últimas métricas, última análise)
- Botão "Novo Projeto"
- Lista de notificações recentes
- Atividade recente (últimas análises, coletas, relatórios)
- Empty state com CTA quando não há projetos

## 6. Novo Projeto — Wizard (/projects/new)
- Wizard multi-step com progress bar (5 steps):
  - **Step 1 - Informações da Marca:** nome do projeto, marca, segmento (dropdown), website, Instagram handle, upload de logo
  - **Step 2 - Briefing Estratégico:** descrição da marca, público-alvo, tom de voz (com sugestões por segmento), palavras-chave (tag input), prioridades estratégicas (até 5 com título/nível/objetivo), diferenciais
  - **Step 3 - Concorrentes & Referências:** adicionar concorrentes (min 1, max 10), influencers e inspirações com nome, handle e website
  - **Step 4 - Fontes de Dados:** toggles por entidade para Instagram Posts, Comentários, Ads Library, SEO; frequência de coleta; período inicial
  - **Step 5 - Revisão & Criação:** resumo completo + botão "Criar Projeto e Iniciar Coleta"

## 7. Configuração da Marca (/projects/:id/brand)
- Formulário editável com tabs: Geral | Briefing | Prioridades | Identidade Visual
- Auto-save com indicador (debounce 2s, "Salvando..." → "Salvo ✓")

## 8. Entidades (/projects/:id/entities)
- 3 tabs: Concorrentes | Influencers | Inspirações
- Cards por entidade com avatar, nome, handle, seguidores, status da última coleta, quick actions
- Modal para adicionar nova entidade
- Reutilização de entidades entre projetos com badge "Dados compartilhados com X projetos"

## 9. Configurações (/settings)
- **Equipe:** lista de membros, convite por email (admin only), convites pendentes com status, alterar/remover roles
- **Integrações:** campos para API keys do Apify e Anthropic (armazenados como secrets do Supabase), botão "Testar Conexão" com feedback visual
- **Billing/Uso:** placeholder para dashboard de consumo

## 10. Seed Data
- Projeto demo "TechStore Brasil" (e-commerce de eletrônicos)
- 3 concorrentes: MegaShop, DigitalMart, ByteStore
- 2 influencers: @techreviewer, @gadgetmania
- 20 posts por entidade com métricas variadas
- 50 comentários com sentimentos variados

## 11. Componentes Base
- BigNumberCard (valor animado, sparkline, badge de variação)
- EntityCard (avatar, nome, badges, mini métricas, actions)
- Skeleton loaders para todas as páginas
- Toast notifications para sucesso/erro
- Modais de confirmação para ações destrutivas

## 12. Qualidade
- Todos os textos em português brasileiro
- Tooltips explicativos
- Empty states com CTAs claros
- Loading states em todas as ações assíncronas
- Error handling com mensagens amigáveis
- Paginação em tabelas (50 items/página)

---

## Próximas Fases (não incluídas neste plano)
- **Fase 2:** Integração Apify, dashboards de dados (Social/Ads/SEO), gráficos interativos
- **Fase 3:** Pipeline de análise com agentes IA (Claude), relatórios, planejamento, OKRs, exportação PDF

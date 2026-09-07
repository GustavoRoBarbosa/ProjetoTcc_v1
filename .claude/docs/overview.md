# Visão geral — ProjetoTcc_v1 ("GRB OFICE")

## O que é

Projeto de TCC (trabalho de conclusão de curso) full-stack: um painel de gestão
("GRB OFICE"). O usuário decidiu, com tempo de sobra antes da banca, corrigir
bugs e robustecer a base (banco/backend/autenticação) antes de partir para o
catálogo de peças.

Estado em 2026-08-04: nove rodadas de trabalho concluídas nesta sessão:

1. Correção de bugs conhecidos (listar_usuarios, badge admin/adm).
2. Banco/backend mais robusto (migrations reais, credenciais fora do código).
3. Autenticação JWT de verdade (antes só existia um "login" que salvava dado
   em `localStorage`, sem validação nenhuma no backend).
4. Catálogo de peças completo: models (Categoria/Fornecedor/Peça com upload
   de imagem), API REST com permissões por tipo de usuário, e as telas
   correspondentes no frontend. Depois refinado com regras de negócio mais
   rígidas (campos obrigatórios, validação de telefone) a partir de feedback
   de uso real.
5. Upgrade de schema: remoção de tabelas órfãs (`produtos` e a cadeia de
   carrinho/pedido que dependia dela — resquício de uma modelagem anterior,
   nunca integrada ao Django), soft delete (`ativo`/`excluido_em`) + trilha
   de auditoria (`auditoria.LogAtividade`) em todo o catálogo.
6. Dashboard com dados reais (peças no catálogo, peças para repor, usuários
   ativos) e duas telas novas só para admin: **Usuários** (conceder/revogar
   `pode_gerenciar_pecas` de um funcionário pela interface) e **Log de
   Atividades** (visualizar o que o `auditoria.LogAtividade` já vinha
   registrando).
7. Confirmação de email no cadastro (conta fica bloqueada até clicar no
   link recebido) e login com Google (Google Identity Services no
   frontend + verificação do ID token no backend via `google-auth`), mais
   um botão de mostrar/ocultar senha no Login e no Cadastro. Gmail SMTP
   real já configurado e testado (envio de verdade, não só console).
8. "Esqueci minha senha" (link por email, mesma arquitetura de token da
   confirmação de cadastro, validade de 1h) e exibição da senha digitada
   no card "Informações do Usuário" do Dashboard — guardada só na memória
   da aba (`services/sessaoSenha.js`), nunca em disco, com toggle
   mostrar/ocultar. Durante a configuração do Gmail nesta rodada,
   surgiram 2 problemas reais de infraestrutura local (não do código):
   processos `runserver` órfãos no Windows segurando credenciais antigas
   em memória, e a exigência de manter a verificação em duas etapas
   sempre ativa pra senhas de app do Gmail continuarem válidas — ambos
   documentados em backend.md/known-issues.md.

9. Vitrine pública estilo Mercado Livre na rota `/` (sugestão do
   orientador): visitante sem conta navega o catálogo (`Loja.jsx` +
   `LojaProduto.jsx`, endpoints `AllowAny` `loja/pecas/`), e só precisa
   logar ao tentar comprar. Área do cliente separada da área de gestão
   (`Sidebar`/`PrivateRoute` agora brancham por `tipo === "cliente"` via
   uma prop `apenasEquipe`) — cliente só vê Minha Conta, Carrinho e
   Histórico de Compras, nunca as telas de Peças/Categorias/Fornecedores/
   Usuários/Logs/Dashboard admin, que eram "tapa-buraco" inicial. Carrinho
   de compras completo, persistido no banco por usuário (app novo
   `pedidos`: `Carrinho`/`ItemCarrinho`/`Pedido`/`ItemPedido`), com
   finalização de pedido transacional (decrementa estoque, snapshot de
   preço/nome pro histórico não mudar retroativamente).

10. Início do roadmap final (`.claude/docs/roadmap-final.md`, comparação
    com o TDS do TCC): **Item 1 — Fluxo de Encomenda (RF07/RF08)**
    completo — cliente encomenda peça sem estoque (`Encomenda`, app
    `pedidos`), equipe aprova/recusa numa tela dedicada (`/encomendas`),
    aprovar soma a quantidade ao estoque pra viabilizar a compra depois.
    Além do item do roadmap, duas melhorias pedidas durante o teste
    manual: (a) sistema de notificação (`ToastContext`/`useToast`)
    substituindo todo `alert()` nativo do projeto; (b) checkout via
    **Stripe Checkout** em modo teste substituindo o antigo
    `POST /api/carrinho/finalizar/` direto — agora o carrinho redireciona
    pro Stripe, e o `Pedido` só é criado depois de confirmar o pagamento
    na página de retorno (`/pagamento-sucesso`). Pagamento simulado
    (chaves de teste), mas o fluxo é real — ver known-issues.md pros
    detalhes e limitações (sem webhook, sem gateway de produção).
    Refinamentos adicionais durante o teste manual: (c) `Encomenda` ganhou
    status `concluida` — vínculo `ItemCarrinho.encomenda`/
    `ItemPedido.encomenda` marca a encomenda como concluída quando o
    pagamento do "Comprar agora" é confirmado, em vez de ficar presa em
    "aprovada" pra sempre; (d) `adicionar_item` agora lida com pedir mais
    unidades do que há em estoque comprando o disponível e encomendando o
    excedente automaticamente (flexibiliza a regra original de RF07 — ver
    known-issues.md); (e) página de produto (`LojaProduto.jsx`) reformulada
    com seletor de quantidade (stepper -/input/+) e layout mais organizado.

11. **Item 2 — Reserva (RF06)** completo. Decisão confirmada com o
    usuário: reserva **sem prazo de expiração** — `Pedido` ganhou o
    status `reservado` (`POST /api/carrinho/reservar/`, reaproveitando a
    mesma lógica de finalização do checkout, sem passar pelo Stripe).
    Nova tela `/reservas` (equipe) lista reservas ativas de todos os
    clientes e cancela manualmente (devolve o estoque) — única forma de
    liberar uma reserva parada, já que não há expiração automática.
    `HistoricoCompras.jsx` agora mostra o status de cada pedido (Pago/
    Reservado/Cancelado). Duas melhorias adicionais pedidas no teste
    manual: (a) `ConfirmContext`/`useConfirm` — modal de confirmação
    estilizado substituindo todo `window.confirm()` nativo do projeto
    (mesmo espírito do `ToastContext` do Item 1); (b) a Reserva agora é
    **opcional/configurável** — `ConfiguracaoSistema` (model singleton,
    `GET`/`PATCH /api/configuracoes/`) com um toggle em nova tela
    `/configuracoes` (só admin) que liga/desliga a funcionalidade a
    qualquer momento; desligado, o botão "Reservar" some do carrinho **e**
    o backend recusa `POST /api/carrinho/reservar/` (não é só uma máscara
    visual).

Durante os testes manuais (feitos pelo usuário no navegador), apareceram e
foram corrigidos vários bugs reais — ver `known-issues.md`, seção "Resolvido".

## Stack

- **Backend**: Django 6.0.5 + Django REST Framework 3.17.1, MySQL (via
  mysqlclient), django-cors-headers, PyJWT (autenticação), google-auth
  (verificação do login Google), stripe (checkout/pagamento simulado),
  python-decouple (config via `.env`), Pillow (upload de imagem). Apps:
  `usuarios` (contas), `catalogo`
  (peças/categorias/fornecedores, + endpoints públicos da vitrine),
  `auditoria` (log de atividades) e `pedidos` (carrinho e pedidos).
- **Frontend**: Create React App, React 19.2.6, react-router-dom 7.15.1, axios 1.16.1.
  CSS puro (sem framework de UI).

## Arquitetura

SPA React consumindo uma API REST exposta pelo Django sob `/api/`.

Autenticação por **JWT customizado** (implementado com PyJWT, não o
`djangorestframework-simplejwt` "oficial" — ver known-issues.md para o
porquê): login retorna um par de tokens (access de 30 min, refresh de 7
dias); o frontend guarda ambos e anexa o access token em todo request
protegido; um interceptor renova automaticamente quando ele expira.
Endpoints públicos (login/cadastro/refresh) são explicitamente excluídos
de receber esse header — ver known-issues.md para o bug que isso evitou.
Detalhes em [frontend.md](frontend.md) e [backend.md](backend.md).

**Cadastro com confirmação de email + login com Google**: contas criadas
por email/senha nascem bloqueadas (`email_confirmado=False`) até clicar
no link recebido por email (`FRONTEND_URL/confirmar-email?token=...`,
token JWT de 48h). Contas via "Entrar com Google" pulam essa etapa (o
Google já validou o email) e nascem/vinculam automaticamente no primeiro
login. Ver [backend.md](backend.md) para o fluxo completo dos dois.

Autorização por permissão granular: `adm` sempre pode gerenciar o catálogo;
`funcionario` só se um admin conceder (`pode_gerenciar_pecas`); `cliente`
nunca. A permissão é checada a cada requisição direto no banco — revogar
tem efeito imediato, sem precisar deslogar.

**Soft delete + auditoria**: nenhum registro do catálogo (peça, categoria,
fornecedor) é apagado de verdade pela API — "excluir" marca `ativo=False`
e `excluido_em=<momento da exclusão>`, e o item some das listagens sem
sumir do banco. Toda criação/edição/exclusão no catálogo, além de
autocadastro de usuário e concessão/revogação de permissão, gera uma
entrada em `auditoria.LogAtividade` (quem fez, quando, o quê), consultável
só por admin em `GET /api/logs/`.

Convenção da API: endpoints de negócio (login/cadastro/refresh) sempre
respondem HTTP 200 com corpo `{success: bool, message?: str, ...}` — o
frontend confere `success`, não o status HTTP. Já o catálogo (ViewSets do
DRF) segue a convenção REST padrão de status HTTP (200/201/204/401/403/404).
Erros de autenticação usam 401; erros de permissão (autenticado mas sem
autorização) usam 403.

## Estrutura do repositório

```
backend/
  core/            settings, urls, wsgi/asgi (projeto Django "core")
  usuarios/        contas/autenticação: model Usuario, views, urls, auth.py, permissions.py
  catalogo/        peças: models (Categoria/Fornecedor/Peca), serializers (+ público), views (ViewSets + vitrine), urls
  auditoria/        log de atividades: model LogAtividade, serializers, views, urls
  pedidos/         carrinho e pedidos: models (Carrinho/ItemCarrinho/Pedido/ItemPedido), serializers, views, urls
  manage.py
  requirements.txt
  .env             configs locais, inclui credenciais de email e Google Client ID (não versionado)
  .env.example     nomes das variáveis de ambiente esperadas (versionado)
  media/           uploads de imagem de peça (não versionado, gerado em runtime)

frontend/
  .env             REACT_APP_GOOGLE_CLIENT_ID (não versionado)
  src/
    pages/         Loja.jsx/LojaProduto.jsx (vitrine pública), Login.jsx, Cadastro.jsx,
                    ConfirmarEmail.jsx, Dashboard.jsx, Pecas.jsx, Categorias.jsx, Fornecedores.jsx,
                    Usuarios.jsx (admin), Logs.jsx (admin), ContaCliente.jsx, Carrinho.jsx,
                    HistoricoCompras.jsx (área do cliente)
    components/    Sidebar.jsx, LojaHeader.jsx
    routes/        PrivateRoute.jsx (guarda de rota autenticada)
    services/      api.js (instância axios + interceptors de JWT)
    css/           um CSS por página/componente + Catalogo.css compartilhado
  package.json

.venv/             virtualenv Python do backend
```

## Escopo atual das features

- Cadastro de usuário (`/cadastro`) com validação de senha forte, telefone BR,
  e-mail único, e confirmação por email obrigatória antes de conseguir logar.
- Login (`/`) por e-mail + senha (com botão de mostrar/ocultar senha) ou
  por conta Google, com autenticação JWT real (access/refresh tokens,
  endpoints protegidos no backend) nos dois casos.
- Dashboard (`/dashboard`, rota protegida) — cards com dados reais: total
  de peças, peças para repor, usuários ativos.
- **Catálogo de peças** (`/pecas`, `/categorias`, `/fornecedores`, todas
  protegidas): CRUD completo de peças (código, nome, descrição, preço,
  estoque, estoque mínimo, nível de prioridade, categoria, fornecedor e
  imagem — todos obrigatórios), categorias (nome + descrição obrigatória) e
  fornecedores (nome + telefone ou e-mail obrigatório). Leitura liberada a
  qualquer usuário logado; escrita (criar/editar/excluir) só para admin ou
  funcionário autorizado. Excluir é soft delete — nada some do banco.
- **Tela de Usuários** (`/usuarios`, só admin): lista todos os usuários e
  permite conceder/revogar `pode_gerenciar_pecas` de um funcionário
  diretamente pela interface (endpoint `PATCH /api/usuarios/<id>/permissao-pecas/`).
- **Tela de Log de Atividades** (`/logs`, só admin): visualiza o que
  `GET /api/logs/` retorna — quem fez o quê e quando, no catálogo e na
  gestão de usuários.
- **Vitrine pública** (`/`, sem login): grid de produtos estilo Mercado
  Livre + página de detalhe (`/produto/:id`); "Comprar" exige login,
  "Encomendar" aparece no lugar quando a peça está sem estoque (RF07).
- **Área do cliente** (`/minha-conta`, `/carrinho`, `/historico-compras`,
  qualquer logado): informações pessoais, carrinho de compras persistido
  no banco (adicionar/alterar quantidade/remover), checkout via **Stripe
  Checkout** em modo teste (`/pagamento-sucesso` confirma o pagamento e
  só então cria o pedido) ou "Reservar" (sem pagamento, sem prazo,
  RF06), histórico de pedidos já finalizados (com status Pago/Reservado/
  Cancelado) e das próprias encomendas (com botão "Comprar agora" quando
  aprovada). Cliente (`tipo === "cliente"`) não tem acesso às telas de
  gestão acima — só equipe (`adm`/`funcionario`).
- **Tela de Encomendas** (`/encomendas`, equipe com `PodeGerenciarPecas`):
  fila de encomendas pendentes (RF07), aprovar/recusar (RF08).
- **Tela de Reservas** (`/reservas`, equipe com `PodeGerenciarPecas`):
  reservas ativas de todos os clientes (RF06), cancelar devolve o estoque.

Para detalhes de implementação, ver [backend.md](backend.md) e
[frontend.md](frontend.md). Para bugs e pontos de atenção conhecidos, ver
[known-issues.md](known-issues.md).
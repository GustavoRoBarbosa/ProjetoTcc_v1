# Bugs conhecidos e pontos de atenção

Lista consolidada de coisas que um futuro contribuidor (humano ou Claude)
deve saber antes de mexer no código.

## Resolvido

- ~~`listar_usuarios` retorna só o primeiro usuário~~ — corrigido: o
  `return Response(dados)` foi movido para fora do `for` em
  `backend/usuarios/views.py`.
- ~~Mismatch `"admin"` vs `"adm"` no badge do Dashboard~~ — corrigido: a
  comparação em `frontend/src/pages/Dashboard.jsx` agora usa `"adm"`.
- ~~`requirements.txt` em UTF-16~~ — corrigido, arquivo salvo em UTF-8.
- ~~Tabela `usuarios` não gerenciada pelo Django~~ — corrigido: model agora
  `managed = True`, com migrations reais (`0001_initial` aplicada com
  `--fake` sobre a tabela existente, `0002_usuario_pode_gerenciar_pecas`
  aplicada de verdade).
- ~~Configs de desenvolvimento hardcoded~~ — corrigido: `SECRET_KEY`,
  `DEBUG`, `ALLOWED_HOSTS`, credenciais do MySQL e
  `CORS_ALLOW_ALL_ORIGINS` agora vêm de `backend/.env` via
  `python-decouple`.
- ~~Sem autenticação real~~ — corrigido: login agora emite um par de
  tokens JWT (access/refresh) via `backend/usuarios/auth.py`; endpoints
  passam a exigir `IsAuthenticated` por padrão (ver backend.md).
- ~~Arquivo `er.name` solto na raiz~~ — removido (era um dump acidental de
  `git config --list`, sem conteúdo real).
- ~~Falhas de autenticação retornavam 403 em vez de 401~~ — corrigido:
  `JWTAuthentication` (`backend/usuarios/auth.py`) não implementava
  `authenticate_header()`, então o DRF forçava 403 em qualquer falha de
  autenticação (token ausente, inválido ou expirado). Isso quebrava
  silenciosamente o refresh automático do frontend, que só reage a 401.
  Adicionado `authenticate_header()` retornando `'Bearer'`.
- ~~Token expirado no `localStorage` derrubava até o login~~ — corrigido:
  o interceptor de request em `frontend/src/services/api.js` anexava o
  `accessToken` salvo em **toda** requisição, inclusive `/api/login/`,
  `/api/cadastro/` e `/api/token/refresh/`. Se esse token estivesse
  expirado/inválido, o backend rejeitava a autenticação antes mesmo de
  chegar na permissão `AllowAny` desses endpoints, e o usuário via "Erro
  ao conectar com o servidor" tentando logar de novo. Corrigido excluindo
  esses 3 endpoints públicos de receberem o header `Authorization`.
- ~~Excluir categoria/fornecedor com peça vinculada estourava 500~~ —
  corrigido: `Peca.categoria`/`Peca.fornecedor` usam `on_delete=PROTECT`
  desde que viraram obrigatórios, e um `ProtectedError` não tratado
  virava um erro 500 genérico. Superado de vez pelo soft delete (ver
  backend.md) — "excluir" pela API não apaga a linha, então o `PROTECT`
  só entraria em cena num `DELETE` de verdade fora da API normal.
- ~~"Contato" sozinho (nome de pessoa) contava como fornecedor
  contatável~~ — corrigido: a validação passou a exigir telefone OU
  e-mail especificamente; `contato` é só informativo.
- ~~Máscara de telefone deixava `"("` sobrando como "preenchido"~~ —
  corrigido: `formatarTelefone` (frontend) retorna string vazia de
  verdade quando não há dígito nenhum, e o backend
  (`validate_telefone`) normaliza qualquer valor sem dígitos para `''`
  em vez de tratar como telefone parcial inválido.
- ~~Sem tela para conceder/revogar `pode_gerenciar_pecas`~~ — corrigido:
  `frontend/src/pages/Usuarios.jsx` (só admin) lista usuários e alterna a
  permissão de cada funcionário pela interface.
- ~~Log de auditoria sem tela no frontend~~ — corrigido:
  `frontend/src/pages/Logs.jsx` (só admin) exibe o que `GET /api/logs/`
  retorna.
- ~~Dashboard com dados placeholder~~ — corrigido: os 3 cards agora
  mostram números reais (peças no catálogo, peças para repor, usuários
  ativos), calculados no cliente a partir de `GET /api/pecas/` e
  `GET /api/usuarios/`.

## Falsos alarmes (não são bugs, mas já causaram confusão)

- **Email de redefinição de senha "não trocava" de remetente**
  Depois de trocar `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` no `.env` e
  reiniciar o backend, o email continuava saindo com a credencial
  antiga. Causa real: matar só o processo Python que estava ouvindo a
  porta 8000 (`Get-NetTCPConnection -LocalPort 8000`) não elimina todos
  os processos `runserver` que o autoreloader do Django pode ter deixado
  rodando soltos em background no Windows — algum processo zumbi
  continuava respondendo com o `.env` antigo carregado em memória.
  Resolvido matando **todos** os processos Python do projeto
  (`Get-Process python | Where-Object { $_.Path -like "*ProjetoTcc_v1*" }`)
  antes de subir um `runserver` novo. Ver backend.md, seção "Setup local".

- **Senha de app do Gmail "parava de funcionar" do nada**
  Duas vezes nesta sessão uma senha de app recém-criada passou a dar
  `535 5.7.8 BadCredentials` pouco depois de funcionar. Causa: o usuário
  desativou a verificação em duas etapas da conta Google depois de gerar
  a senha de app — o Google revoga automaticamente todas as senhas de
  app assim que o 2FA é desligado. A verificação em duas etapas precisa
  ficar ligada permanentemente, não só no momento de gerar a senha.

- **MySQL Workbench "some" com usuários novos**
  Rodar `select * from usuarios;` no Workbench com a opção **"Limit to X
  rows"** ativa (padrão da toolbar) e sem `ORDER BY` faz o MySQL devolver
  só os primeiros N registros que encontrar — como não há ordenação,
  isso tende a mostrar os ids mais baixos (mais antigos), cortando antes
  de chegar nos cadastros mais recentes. Os dados estão lá; é só usar
  `order by idUsu desc` ou aumentar/desligar o limite pra ver os
  registros novos. A tela "Usuários" do admin não tem esse problema
  porque a API não aplica limite nenhum.

- ~~Cabeçalho da vitrine pública dava a impressão de deslogar o usuário~~
  — corrigido: `Loja.jsx`/`LojaProduto.jsx` tinham cabeçalho hardcoded
  sempre mostrando "Entrar/Criar conta", mesmo com o usuário já logado
  (a sessão nunca caía de verdade, só a UI não refletia). Extraído
  `components/LojaHeader.jsx`, que lê `localStorage` e mostra o estado
  certo.

## Em aberto

- **Validação duplicada entre frontend e backend**
  As regras de complexidade de senha existem tanto em
  `backend/usuarios/views.py::cadastrar` (regex Python) quanto em
  `frontend/src/pages/Cadastro.jsx` (regex JS). Hoje estão sincronizadas,
  mas não há fonte única de verdade — mudanças precisam ser replicadas
  manualmente nos dois lados.

- **JWT customizado (não é o `djangorestframework-simplejwt` "oficial")**
  Optamos por implementar geração/validação de token à mão com PyJWT
  (`backend/usuarios/auth.py`) em vez de adotar o `AUTH_USER_MODEL`
  customizado que o `simplejwt` "oficialmente" espera, porque isso exigiria
  fazer `Usuario` herdar de `AbstractBaseUser`/`PermissionsMixin` e mexer
  em tabelas internas do Django (`auth`, `admin`) que já tinham migrations
  aplicadas. Não é uma falha, é uma escolha consciente de escopo — mas vale
  saber que não é "o jeito padrão do Django REST Framework", caso surja essa
  pergunta na banca.

- **`django.contrib.admin` não é usado**
  `Usuario` não está registrado no admin do Django (`usuarios/admin.py`
  vazio) e o login do `/admin/` não funciona com o model `Usuario` (usa o
  sistema de auth padrão do Django, que é independente do nosso JWT
  customizado). Não é um problema, só um lembrete de que `/admin/` não é o
  mesmo sistema de login do resto do app.

- **CORS ainda liberado para todas as origens em dev**
  `CORS_ALLOW_ALL_ORIGINS=True` no `.env` local é aceitável para
  desenvolvimento, mas precisa virar uma lista restrita de origens antes
  de qualquer deploy fora do localhost.

- **Sem endpoint/tela para reativar um item soft-deletado**
  Depois de excluir uma peça/categoria/fornecedor (`ativo=False`), não
  existe hoje um jeito pela API/frontend de reverter isso — só direto no
  banco (`UPDATE ... SET ativo=1, excluido_em=NULL`). Se isso vier a ser
  necessário na prática, precisa de uma ação dedicada (ex:
  `POST /api/pecas/<id>/reativar/`).

- **Dashboard calcula estatísticas no cliente**
  `Peças no Catálogo`/`Peças para Repor`/`Usuários Ativos` são calculados
  em `Dashboard.jsx` a partir das listas completas de `/api/pecas/` e
  `/api/usuarios/`. Funciona bem no volume atual; se o catálogo crescer
  muito, vale migrar para um endpoint de resumo no backend (evita
  trafegar a lista inteira só para contar).

- **Contas Google não têm telefone**
  `Usuario.telUsu` fica `''` (vazio) pra contas criadas via "Entrar com
  Google" — o Google não fornece telefone no token, e o cadastro por
  Google não pede esse dado. Se alguma tela passar a exigir telefone
  preenchido, contas Google vão precisar de um fluxo de completar
  cadastro (hoje não existe).

- **Sem endpoint pra desvincular Google de uma conta**
  Uma vez que `Usuario.google_id` é preenchido (login Google pela
  primeira vez), não existe um jeito pela API de "desvincular" e voltar
  a exigir email/senha — só direto no banco
  (`UPDATE usuarios SET google_id = NULL`).

- **Reenviar confirmação / esqueci minha senha não têm limite de taxa (rate limit)**
  `POST /api/reenviar-confirmacao/` e `POST /api/esqueci-senha/` podem
  ser chamados repetidamente pro mesmo email sem nenhum cooldown — em
  produção isso seria vetor de abuso (spam pro mesmo destinatário, ou
  gasto de cota do provedor de email). Aceitável pro escopo do TCC, mas
  vale lembrar se o projeto for além disso.

- **Token de redefinição de senha não é de uso único**
  `POST /api/redefinir-senha/` aceita o mesmo token várias vezes até ele
  expirar (1h) — não existe uma lista de "tokens já usados" (a
  arquitetura de tokens do projeto é toda stateless, sem tabela de
  controle). Na prática o risco é baixo (quem tem o token já conseguiria
  trocar a senha de qualquer forma), mas é diferente de "consumir o link
  na primeira vez", que é o comportamento mais comum em produtos reais.

- **Senha exibida no Dashboard só existe na sessão do login mais recente**
  `services/sessaoSenha.js` guarda a senha digitada só numa variável de
  módulo JS (nunca em disco) — F5 na página, fechar a aba, ou ter logado
  via Google fazem a linha "Senha" no Dashboard cair no placeholder
  "faça login novamente para visualizar". É o comportamento esperado
  (trade-off de segurança escolhido deliberadamente), não um bug.

- **Checkout via Stripe, mas em modo teste (pagamento simulado)**
  O carrinho finaliza através do Stripe Checkout de verdade (sessão
  criada em `POST /api/carrinho/checkout/`, confirmada em
  `POST /api/carrinho/confirmar-pagamento/` — ver backend.md), mas usando
  as chaves de **teste** do Stripe. Nenhum valor real circula; é
  intencional pro escopo do TCC (o pagamento de verdade exigiria conta
  business verificada, não faz sentido pro projeto), mas vale deixar
  claro que não é um esquecimento nem um "fake" só no frontend — o fluxo
  de checkout, sessão e confirmação é real, só o dinheiro é que é de
  brinquedo.

- **Sem webhook do Stripe — confirmação depende do navegador voltar**
  Não existe um endpoint `/webhooks/stripe/` escutando eventos do Stripe.
  A confirmação do pagamento (`confirmar_pagamento`) só acontece quando o
  navegador do cliente chega na `success_url` depois de pagar. Se o
  cliente fechar a aba/perder conexão exatamente entre pagar no Stripe e
  ser redirecionado de volta, o pagamento (simulado) fica "só no
  Stripe" e nenhum `Pedido` é criado — o estoque não é descontado.
  Resolver isso de verdade exigiria um webhook (fora do escopo comum de
  TCC); aceitável dado que é modo teste e o volume de uso é baixo.

- **Encomenda "excedente" flexibiliza a regra original de RF07**
  A definição original (ver roadmap-final.md) era "encomenda só faz
  sentido quando `quantidade_estoque == 0`". Agora `adicionar_item`
  (`pedidos/views.py`) também cria uma encomenda automática quando o
  cliente pede mais unidades do que há em estoque (ex: pede 5, só há 2 —
  compra as 2 e encomenda as 3 restantes), mesmo a peça tendo estoque
  parcial (`> 0`). `criar_encomenda` (usado pelo botão "Encomendar" da
  vitrine, só visível quando `disponivel == false`) continua exigindo
  `quantidade_estoque == 0` — a flexibilização é só no fluxo automático
  do carrinho.

- **Reserva sem prazo de expiração — decisão de escopo confirmada**
  RF06 pedia decidir isso antes de modelar. Optou-se por **sem prazo**: a
  peça fica reservada até a equipe cancelar manualmente
  (`PATCH /api/reservas/<id>/cancelar/`, tela `/reservas`) — não há job
  periódico nem checagem de expiração na consulta. Mais simples pro
  escopo do TCC; risco é uma reserva nunca retirada "prender" estoque
  indefinidamente até alguém perceber e cancelar na tela.

- **Cliente não cancela a própria reserva**
  Só a equipe (`PodeGerenciarPecas`) tem acesso a
  `PATCH /api/reservas/<id>/cancelar/`. Se o cliente desistir de uma
  reserva, hoje precisa pedir pra equipe cancelar — não existe um botão
  "desistir da reserva" na área do cliente (`HistoricoCompras.jsx` só
  mostra o status, sem ação).

- **Checkout não usa `select_for_update()` — race condition teórica de
  estoque**
  `_criar_pedido_do_carrinho` (`pedidos/views.py`) confere
  `quantidade_estoque` antes de entrar no `transaction.atomic()`, mas não
  bloqueia a linha da `Peca` durante a transação. Dois checkouts
  concorrentes da última unidade em estoque, no instante exato entre a
  checagem e o commit, poderiam ambos passar. Risco baixo na escala de
  uso do projeto (TCC, não produção com tráfego real), mas é o tipo de
  coisa que pode virar pergunta na banca.

- **Aprovar encomenda soma estoque antes do cliente realmente comprar**
  `validar_encomenda` já incrementa `Peca.quantidade_estoque` no momento
  da aprovação (RF08), não no momento da compra — decisão consciente pra
  simplificar o fluxo (sem isso o cliente não teria como comprar a peça
  depois de aprovada). Efeito colateral: se o cliente nunca voltar pra
  comprar, o estoque fica "inflado" artificialmente até alguém perceber.
  Sem prazo de expiração de encomenda aprovada (mesma categoria de
  decisão da "Reserva" no roadmap — ver `.claude/docs/roadmap-final.md`).

- **Carrinho é só do usuário logado, sem carrinho de convidado**
  Não há carrinho anônimo/`localStorage` que se funde ao carrinho do
  banco no momento do login — adicionar ao carrinho sempre exige estar
  logado (o botão "Comprar" da vitrine pública manda pro login antes
  disso). Simplifica bastante o modelo, mas significa que navegar como
  visitante e "guardar pra depois" sem logar não existe.
# Frontend — React (Create React App)

## Stack e dependências (`frontend/package.json`)

- React 19.2.6 / react-dom 19.2.6
- react-router-dom 7.15.1
- axios 1.16.1
- react-scripts 5.0.1 (toolchain CRA padrão)
- testing-library (instalado, sem testes escritos ainda)

Scripts padrão CRA: `start`, `build`, `test`, `eject`.
`frontend/README.md` é o boilerplate padrão do CRA, sem conteúdo específico do projeto.

## Estrutura (`frontend/src/`)

```
App.js
components/Sidebar.jsx
components/LojaHeader.jsx
css/Cadastro.css
css/Catalogo.css
css/Dashboard.css
css/Login.css
css/Sidebar.css
css/Loja.css
css/Carrinho.css
index.css
index.js
pages/Cadastro.jsx
pages/Categorias.jsx
pages/ConfirmarEmail.jsx
pages/Dashboard.jsx
pages/EsqueciSenha.jsx
pages/Fornecedores.jsx
pages/Login.jsx
pages/Logs.jsx
pages/Pecas.jsx
pages/RedefinirSenha.jsx
pages/Usuarios.jsx
pages/Loja.jsx
pages/LojaProduto.jsx
pages/ContaCliente.jsx
pages/HistoricoCompras.jsx
pages/Carrinho.jsx
routes/PrivateRoute.jsx
services/api.js
services/sessaoSenha.js
```

`.env` (não versionado) precisa de `REACT_APP_GOOGLE_CLIENT_ID` pro botão
"Entrar com Google" aparecer — sem essa variável, o botão simplesmente
não é renderizado (ver `pages/Login.jsx`). CRA só lê variáveis
`REACT_APP_*` na inicialização do `npm start`; editar o `.env` exige
reiniciar o processo, o hot-reload normal não pega essa mudança.

## `services/api.js` — cliente HTTP

Instância axios única, com baseURL fixa apontando para o backend Django local
na porta 8000. Páginas chamam `api.post("login/", ...)`,
`api.post("cadastro/", ...)` etc. com paths relativos.

Agora tem dois interceptors, que fazem o cliente trabalhar junto com o JWT
do backend (ver [backend.md](backend.md#autenticação--jwt-customizado-backendusuariosauthpy)):

- **Request interceptor**: antes de cada chamada, lê `accessToken` do
  `localStorage` e anexa `Authorization: Bearer <token>` no header, se
  existir — **exceto** em `login/`, `login-google/`, `cadastro/`,
  `token/refresh/`, `confirmar-email/`, `reenviar-confirmacao/`,
  `esqueci-senha/` e `redefinir-senha/` (`ENDPOINTS_PUBLICOS`). Mandar um
  token velho/expirado pra esses
  endpoints públicos fazia o backend rejeitar a autenticação antes de
  checar que a rota é aberta, derrubando até o login com 403 (bug real
  encontrado em teste manual — ver known-issues.md).
- **Response interceptor**: se uma resposta vier com **401** (access token
  expirado ou ausente) e a requisição ainda não tiver tentado renovar,
  chama `POST token/refresh/` com o `refreshToken` salvo, guarda o novo
  par de tokens e repete a requisição original automaticamente — tudo
  transparente para quem chamou `api.post(...)`/`api.get(...)`. Várias
  chamadas que falhem ao mesmo tempo compartilham a mesma promise de
  refresh (evita disparar refresh em paralelo). Se o refresh também
  falhar (refresh token expirado/inválido), limpa `usuario`/`accessToken`/
  `refreshToken` do `localStorage` — na prática, a próxima navegação para
  uma rota protegida cai no `PrivateRoute` e volta pro login.

## Rotas (`App.js`, React Router v7, `BrowserRouter`)

| Path | Elemento | Protegida? |
|---|---|---|
| `/` | `<Login />` | Não |
| `/cadastro` | `<Cadastro />` | Não |
| `/confirmar-email` | `<ConfirmarEmail />` (lê `?token=` da URL) | Não |
| `/esqueci-senha` | `<EsqueciSenha />` | Não |
| `/redefinir-senha` | `<RedefinirSenha />` (lê `?token=` da URL) | Não |
| `/dashboard` | `<Dashboard />` (dentro de `<PrivateRoute>`) | Sim |
| `/pecas` | `<Pecas />` (dentro de `<PrivateRoute>`) | Sim |
| `/categorias` | `<Categorias />` (dentro de `<PrivateRoute>`) | Sim |
| `/fornecedores` | `<Fornecedores />` (dentro de `<PrivateRoute>`) | Sim |
| `/usuarios` | `<Usuarios />` (dentro de `<PrivateRoute>`, tela recusa se não-admin) | Sim |
| `/logs` | `<Logs />` (dentro de `<PrivateRoute>`, tela recusa se não-admin) | Sim |

### `routes/PrivateRoute.jsx`

Guarda client-side: checa a presença de `usuario` **e** `accessToken` no
`localStorage`. Não decodifica/valida o token (isso é responsabilidade do
backend a cada requisição) — é só uma guarda de UX para não mostrar a tela
a quem nunca logou. Se o access token estiver expirado mas o refresh ainda
for válido, o interceptor de `services/api.js` renova sozinho nos
bastidores; só quando o refresh também falha é que a sessão é encerrada de
verdade.

## Páginas

### `pages/Login.jsx`
- Inputs controlados `email`/`senha`, com botão de **mostrar/ocultar
  senha** (👁/🙈, alterna `type="text"`/`type="password"` — ver seção CSS
  abaixo pro `.senha-wrapper` compartilhado).
- Submit: `POST /api/login/` via `api.post("login/", {email, senha})`.
- Sucesso: `guardarSenhaDigitada(senha)` (ver `services/sessaoSenha.js`
  abaixo) + `entrarComSucesso(dados)` salva `usuario`/`accessToken`/
  `refreshToken` no `localStorage` e navega pra `/dashboard` — a segunda
  função é compartilhada com o callback do login Google (mesmo formato de
  resposta dos dois, ver backend.md), mas só o login por senha chama
  `guardarSenhaDigitada` (login Google não tem senha nossa).
- Falha (ex: `email_confirmado=False`): `alert(response.data.message)`.
- Link **"Não recebeu o email de confirmação? Reenviar"** — chama
  `POST /api/reenviar-confirmacao/` com o email já digitado no campo.
- Link **"Esqueci minha senha"** → `/esqueci-senha`.
- **Botão "Entrar com Google"**: renderizado pelo próprio script do
  Google (`window.google.accounts.id.renderButton`, script carregado em
  `public/index.html`), inicializado num `useEffect` com
  `process.env.REACT_APP_GOOGLE_CLIENT_ID`. Sem essa env var ou sem o
  script carregado, o `useEffect` simplesmente retorna cedo — o botão não
  aparece, mas a tela não quebra. O callback do Google devolve um
  `credential` (ID token), mandado pro backend em
  `POST /api/login-google/`.
- Erro de rede/exceção: `console.log` + `alert("Erro ao conectar com o servidor")`.
- Link para `/cadastro`. Estilizado por `css/Login.css` (branding "GRB OFICE").

### `pages/Cadastro.jsx`
- Inputs controlados: `nome`, `email`, `senha` (com mostrar/ocultar,
  mesmo padrão do Login), `telefone`.
- **Validação client-side antes de chamar a API** (espelha, mas não é
  idêntica à do backend):
  - `nome`, `email`, `telefone` obrigatórios (via `alert()`).
  - Senha: regex `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/`
    (minúscula + maiúscula + dígito + especial + ≥8 chars) — mesma regra do backend.
  - **Não** valida formato de e-mail no client (só o backend faz isso).
- Telefone com formatação em tempo real: remove não-dígitos e aplica
  `(XX) XXXXX-XXXX` via `replace()` encadeados, `maxLength={15}`.
- Submit: `POST /api/cadastro/` com `{nome, email, senha, telefone}`.
  Sucesso não navega mais pro dashboard nem loga automaticamente — a
  conta fica pendente de confirmação de email (mensagem do backend
  já explica isso, ex. "Enviamos um link de confirmação..."), navega de
  volta pra `/`.
- Falha: `alert(response.data.message)` (mensagem de validação do backend, ex.
  e-mail duplicado).
- Link para `/` ("Já tem uma conta? Fazer login"). Estilizado por `css/Cadastro.css`.

### `pages/ConfirmarEmail.jsx`
- Lê `?token=` da URL via `useSearchParams` (react-router-dom) — é a
  página que o link do email de confirmação abre.
- `useEffect` dispara `POST /api/confirmar-email/ {token}` assim que a
  página carrega. Estados: `carregando` → `sucesso` | `erro`, mensagem
  exibida vem direto de `response.data.message` (o backend já manda
  texto pronto pro usuário).
- Sucesso: botão pra ir pro login (`/`). Erro (token expirado/inválido):
  link de volta pro cadastro. Reaproveita o layout de `css/Login.css`
  (`.login-page`/`.login-card`) pra manter a identidade visual.

### `pages/EsqueciSenha.jsx`
- Formulário de um campo só (email). Submit: `POST /api/esqueci-senha/
  {email}`, mostra em `alert()` a mensagem genérica que o backend sempre
  devolve (não revela se o email existe ou não). Link de volta pro login.

### `pages/RedefinirSenha.jsx`
- Lê `?token=` da URL (`useSearchParams`) — página que o link do email de
  redefinição abre.
- Dois campos de senha (nova + confirmar), ambos com o mesmo toggle
  mostrar/ocultar (`.senha-wrapper`) das outras telas.
- Validação client-side: mesma regex de força de senha do Cadastro, mais
  checagem de que os dois campos batem, antes de mandar
  `POST /api/redefinir-senha/ {token, nova_senha}`.
- Sucesso: `alert(message)` + navega pro login (`/`). Falha (token
  expirado/inválido, senha fraca): só o `alert()`, fica na mesma tela.

### `pages/Dashboard.jsx`
- Lê o objeto `usuario` do `localStorage` (sem null-guard — assume que existe,
  o que é garantido pelo `PrivateRoute` em uso normal).
- Renderiza `<Sidebar />` + cabeçalho com data atual
  (`toLocaleDateString("pt-BR", {...})`) e botão "Sair" que limpa
  `usuario`, `accessToken` e `refreshToken` do `localStorage` e navega
  para `/`.
- Corpo: mensagem de boas-vindas, três cards de estatística **com dados
  reais** (não são mais placeholder), e um card "Informações do Usuário"
  com nome/e-mail/tipo e badge:
  - **Peças no Catálogo**: `pecasResp.data.length`.
  - **Peças para Repor**: conta quantas peças têm
    `quantidade_estoque <= quantidade_minima`.
  - **Usuários Ativos**: conta quantos usuários têm `ativo === true`.
  - Não existe endpoint de estatística dedicado — os números vêm de
    `Promise.all([api.get("pecas/"), api.get("usuarios/")])` no
    `useEffect` e são contados no cliente. Se o catálogo crescer muito,
    isso é candidato a virar um endpoint de resumo no backend.
- Badge do tipo: `usuario.tipo === "adm"` → estilo de administrador (bug de
  mismatch com `"admin"` já corrigido).
- **Linha "Senha"** no card de informações: lê `obterSenhaDigitada()` de
  `services/sessaoSenha.js`. Se tiver valor, mostra pontinhos
  (`"•".repeat(senha.length)`) com um botão de olho pra alternar pra
  texto puro; se não tiver (página recarregada, ou login foi via Google),
  mostra um placeholder fixo explicando que é preciso logar de novo pra
  ver. `sair()` chama `limparSenhaDigitada()` além de limpar o
  `localStorage`.

### `pages/Usuarios.jsx` (só admin)
- Lista todos os usuários (`GET /api/usuarios/`: nome, email, tipo, ativo,
  pode_gerenciar_pecas).
- Se `usuario.tipo !== "adm"`, a página nem tenta carregar dado — mostra
  só uma mensagem "Só administradores acessam esta tela." (checagem de
  UX; a garantia real é o backend recusar o `PATCH` pra quem não é admin).
- Para cada linha com `tipo === "funcionario"`, um botão
  "Conceder"/"Revogar" chama
  `PATCH usuarios/<id>/permissao-pecas/ {pode_gerenciar_pecas: bool}`
  e recarrega a lista. Linhas de `adm`/`cliente` mostram texto informativo
  no lugar do botão (admin sempre tem acesso; cliente nunca).

### `pages/Logs.jsx` (só admin)
- Lista o log de auditoria (`GET /api/logs/`): data/hora formatada em
  pt-BR, nome de quem fez, ação (traduzida via `ROTULO_ACAO`: criar →
  "Criou" etc.), modelo + id do registro afetado, e a descrição gravada
  pelo backend.
- Mesma guarda de UX que `Usuarios.jsx` — só tenta buscar dado se
  `usuario.tipo === "adm"`.

### Catálogo de peças — `pages/Pecas.jsx`, `Categorias.jsx`, `Fornecedores.jsx`

As 3 páginas seguem o mesmo padrão: layout `dashboard-layout` +
`<Sidebar />` (reaproveitado do Dashboard), busca os dados da API ao
montar (`useEffect`), e exibem uma tabela. Um helper local
`podeGerenciar(usuario)` (repetido nas 3 — `usuario.tipo === "adm" ||
(usuario.tipo === "funcionario" && usuario.pode_gerenciar_pecas)`) decide
se mostra os controles de criar/editar/excluir. Essa checagem é só de UX
(esconder um botão que ia dar 403); a permissão de verdade é sempre do
backend (`PodeGerenciarPecas`, ver backend.md).

- **`Categorias.jsx`** / **`Fornecedores.jsx`**: formulário inline (sem
  modal) com `editandoId` para servir tanto criar quanto editar (mesmo
  padrão do `Pecas.jsx`, botão "Editar" preenche o form com os dados
  atuais e faz `PATCH` em vez de `POST`). Descrição de categoria é
  obrigatória. Fornecedor exige telefone OU e-mail preenchido (`contato`
  sozinho não conta — validação espelhada do backend, ver backend.md);
  o campo telefone tem máscara `(XX) XXXXX-XXXX` aplicada via
  `formatarTelefone()`, que deixa números `0800` sem parênteses/traço
  (não têm DDD) e nunca deixa só um `"("` sobrando quando o campo é
  apagado. "Excluir" chama `DELETE`, que no backend é soft delete — o
  item some da lista mas continua no banco.
- **`Pecas.jsx`**: a mais completa — formulário com selects de categoria/
  fornecedor (carregados junto via `Promise.all`, **obrigatórios**),
  campo de upload de imagem (**obrigatório ao criar**; ao editar, deixar
  em branco mantém a imagem atual), descrição obrigatória, mais os campos
  `quantidade_minima` (estoque mínimo) e `nivel_prioridade`
  (alta/média/baixa). Serve tanto para criar quanto editar (mesmo
  formulário, `editandoId` decide se é `POST` ou `PATCH`). Como tem
  upload de arquivo, monta um `FormData` em vez de mandar objeto JS puro
  — é assim que o Axios sabe mandar `multipart/form-data` (o
  `PecaViewSet` no backend usa `MultiPartParser` justamente por causa
  disso). A tabela mostra a miniatura da imagem, nome da categoria/
  fornecedor (resolvido pelo backend no serializer, sem chamada extra),
  um badge de prioridade e um badge "repor" quando
  `quantidade_estoque <= quantidade_minima`.

## Componentes

### `components/Sidebar.jsx`
- Navegação lateral compartilhada por todas as páginas autenticadas.
- Bloco de marca ("GRB OFICE" / "Painel de Gestão") linkando para `/dashboard`.
- Itens de navegação: Início, Peças, Categorias, Fornecedores sempre
  visíveis; **Usuários** e **Log de Atividades** só aparecem quando
  `usuario?.tipo === "adm"` — destaque de item ativo via `useLocation()`.
- Rodapé mostra avatar (iniciais via `getInitiais`), nome e tipo do usuário
  logado, lidos de `localStorage["usuario"]`.

## CSS

Um arquivo CSS por página/componente (`Cadastro.css`, `Dashboard.css`,
`Login.css`, `Sidebar.css`) mais `index.css` global. `css/Catalogo.css` é
compartilhado pelas 3 páginas do catálogo (toolbar, formulário, tabela,
botões `.btn-primary`/`.btn-secondary`/`.btn-danger`) reaproveitando as
mesmas variáveis de tema (`--primary`, `--bg-card`, etc.) definidas em
`index.css`. `index.css` também define `.senha-wrapper`/
`.btn-mostrar-senha` — o wrapper posicionado (`position: relative`) com o
botão do "olho" absoluto dentro do campo, usado em `Login.jsx`,
`Cadastro.jsx` e `RedefinirSenha.jsx` pro toggle de mostrar/ocultar
senha. CSS puro, escrito à mão, sem framework de UI.

## `services/sessaoSenha.js`

Guarda a senha digitada no login **só numa variável de módulo JS** —
nunca em `localStorage`/`sessionStorage`. Uma variável de módulo
sobrevive à navegação entre páginas dentro da mesma aba (React Router
troca de rota sem recarregar o JS), mas some com F5 ou ao fechar a aba.
Escolha deliberada: guardar em disco seria mais "conveniente" (sobrevive
a F5), mas deixaria a senha em texto puro exposta a XSS ou acesso físico
ao navegador depois que a sessão já acabou — em memória, o risco fica
limitado à aba atual, e você tem que logar de novo pra ver a senha depois
de um F5.

- `guardarSenhaDigitada(senha)` — chamado só por `Login.jsx` no login por
  senha (não no callback do Google — contas Google não têm senha nossa).
- `obterSenhaDigitada()` — lido por `Dashboard.jsx` pra exibir a linha
  "Senha" no card de informações.
- `limparSenhaDigitada()` — chamado no logout (`Dashboard.jsx::sair`),
  junto da limpeza do `localStorage`.

## Fluxo de autenticação (resumo)

"Estar logado" agora envolve três chaves no `localStorage`:
- `usuario` — dados de exibição (nome/email/tipo), não usado para segurança.
- `accessToken` — anexado em toda requisição pelo interceptor de `api.js`;
  expira em 30 min (definido no backend).
- `refreshToken` — usado automaticamente pelo interceptor para renovar o
  access token quando ele expira; expira em 7 dias.

Login grava as três; logout (Dashboard) remove as três; `PrivateRoute`
exige `usuario` + `accessToken` para deixar entrar. A validação real (o
token é válido? o usuário ainda está ativo? tem permissão pra isso?)
sempre acontece no backend a cada requisição — o frontend só decide o que
mostrar. Ver [backend.md](backend.md) para o que a API realmente
retorna/exige.

Duas portas de entrada além do login por senha, ambas terminando no
mesmo `entrarComSucesso()`/mesmas três chaves de `localStorage`:
- **Login com Google** (`Login.jsx`): callback do Google → `POST
  /api/login-google/` → mesmo formato de resposta do login normal.
- **Confirmação de email**: não loga sozinha — só desbloqueia a conta
  pra que o login normal funcione depois (`ConfirmarEmail.jsx` só chama
  `POST /api/confirmar-email/` e manda o usuário pra tela de login).

**Esqueci minha senha** é um fluxo à parte, em duas telas
(`EsqueciSenha.jsx` → `RedefinirSenha.jsx`), que também não loga sozinho
— só troca a senha e manda o usuário pra tela de login normal, de novo
com a senha nova.

## Vitrine pública + área do cliente + carrinho

A rota `/` deixou de ser o login e virou uma vitrine pública estilo
Mercado Livre (sugestão do orientador), navegável sem conta. `/login`
passou a ser a URL do login. Isso obrigou trocar todo `navigate("/")`/
`<Link to="/">` que antes significava "ir pro login"
(`Cadastro.jsx`, `ConfirmarEmail.jsx`, `EsqueciSenha.jsx`,
`RedefinirSenha.jsx`) para `"/login"`.

- **`pages/Loja.jsx`** — grid de cards (`GET /api/loja/pecas/`), clicar
  num card navega para `/produto/:id`.
- **`pages/LojaProduto.jsx`** — detalhe do produto (`GET
  /api/loja/pecas/:id/`). Botão "Comprar": se não há `usuario` no
  `localStorage`, manda pro login com `?next=/produto/:id` (ver
  `Login.jsx` abaixo); se já está logado, `POST /api/carrinho/itens/`
  direto e navega pra `/carrinho`.
- **`components/LojaHeader.jsx`** — cabeçalho compartilhado por `Loja.jsx`
  e `LojaProduto.jsx`. Existe porque as duas páginas tinham cabeçalho
  próprio hardcoded pra sempre mostrar "Entrar/Criar conta", o que fazia
  um usuário já logado, ao voltar pra vitrine, achar que tinha sido
  deslogado (não tinha — só a UI não refletia a sessão). Agora lê
  `localStorage` e mostra 🛒 Carrinho / "Olá, {nome}" / Sair quando
  logado.
- **`pages/ContaCliente.jsx`** (`/minha-conta`) — home do cliente logado:
  atalhos pra Ofertas (`/`) e Histórico de Compras, mais o card de
  informações pessoais (mesmo padrão de senha visível do Dashboard, via
  `services/sessaoSenha.js`).
- **`pages/Carrinho.jsx`** (`/carrinho`) — lista itens (`GET
  /api/carrinho/`), +/- quantidade (`PATCH
  /api/carrinho/itens/:id/`), remover (`DELETE
  /api/carrinho/itens/:id/`), "Finalizar pedido" (`POST
  /api/carrinho/finalizar/`) → sucesso navega pra
  `/historico-compras`; falha (ex: estoque mudou) alerta e recarrega o
  carrinho.
- **`pages/HistoricoCompras.jsx`** — reescrita para mostrar pedidos reais
  (`GET /api/pedidos/`) em vez do placeholder anterior.
- **`Login.jsx`** — lê `?next=` da URL (`useSearchParams`); se presente,
  `entrarComSucesso` navega pra lá em vez do destino padrão por tipo.
  Isso fecha o fluxo "ver produto sem login → Comprar → login → volta
  pro produto".

### Separação cliente vs equipe

`tipo === "cliente"` não deve enxergar as telas de gestão
(Peças/Categorias/Fornecedores/Usuários/Logs/Dashboard admin) — eram só
um "tapa-buraco" inicial, não a área real do cliente.

- **`routes/PrivateRoute.jsx`** ganhou a prop `apenasEquipe` (default
  `false`). Sem login → redireciona pra `/login`. Logado mas
  `apenasEquipe` e `tipo === "cliente"` → redireciona pra `/minha-conta`
  em vez de mostrar a tela.
- **`App.js`** — `/dashboard`, `/pecas`, `/categorias`, `/fornecedores`,
  `/usuarios`, `/logs` agora usam `<PrivateRoute apenasEquipe>`.
  `/minha-conta`, `/historico-compras`, `/carrinho` usam `PrivateRoute`
  normal (qualquer logado entra).
- **`components/Sidebar.jsx`** — branch completo em `ehCliente =
  usuario?.tipo === "cliente"`: cliente vê Minha Conta/Carrinho/Histórico
  de Compras/Ofertas; equipe vê o menu de gestão de sempre + um link
  "Ver Loja" pra `/`.

# Backend — Django + DRF

## Stack e dependências (`backend/requirements.txt`)

- Django 6.0.5
- djangorestframework 3.17.1
- django-cors-headers 4.9.0
- google-auth 2.56.2 + requests 2.34.2 — verificação do ID token do
  "Entrar com Google" (google-auth precisa do `requests` como transporte
  HTTP; sem ele, dá `ImportError` na hora de verificar o token)
- mysqlclient 2.2.8
- Pillow 12.3.0 — necessário para `ImageField` (upload de foto de peça)
- PyJWT 2.13.0 — geração/validação dos tokens de autenticação
- python-decouple 3.8 — leitura de configs a partir do `.env`
- asgiref 3.11.1, sqlparse 0.5.5, tzdata 2026.2

`requirements.txt` está em UTF-8 (foi corrigido — antes estava em UTF-16, o
que quebrava `pip install`).

Projeto Django chamado `core`, com três apps: `usuarios` (contas/autenticação),
`catalogo` (peças, categorias, fornecedores) e `auditoria` (log de atividades).

## `backend/core/settings.py`

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, credenciais do MySQL e
  `CORS_ALLOW_ALL_ORIGINS` agora vêm de variáveis de ambiente via
  `python-decouple` (`config(...)`), lidas de `backend/.env` (não
  versionado — só `backend/.env.example` vai pro git, com os nomes das
  variáveis e sem segredos reais).
- `INSTALLED_APPS`: apps padrão do Django + `rest_framework`, `corsheaders`, `usuarios`.
- `MIDDLEWARE`: `CorsMiddleware` primeiro, depois stack padrão do Django.
- `ROOT_URLCONF = 'core.urls'`.
- **Banco de dados** — MySQL, credenciais lidas do `.env`:
  ```python
  DATABASES = {
      'default': {
          'ENGINE': 'django.db.backends.mysql',
          'NAME': config('DB_NAME', default='tcc'),
          'USER': config('DB_USER', default='root'),
          'PASSWORD': config('DB_PASSWORD', default=''),
          'HOST': config('DB_HOST', default='localhost'),
          'PORT': config('DB_PORT', default='3306'),
      }
  }
  ```
  Requer MySQL local com database `tcc`. A tabela `usuarios` agora **é
  gerenciada pelo Django** via migrations (ver seção Model).
- **`REST_FRAMEWORK`** configurado — por padrão toda view exige usuário
  autenticado:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_AUTHENTICATION_CLASSES': ['usuarios.auth.JWTAuthentication'],
      'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
  }
  ```
  Views públicas (login, cadastro, refresh de token) sobrescrevem isso com
  `@permission_classes([AllowAny])`.
- `STATIC_URL = 'static/'`.
- `MEDIA_URL = 'media/'` / `MEDIA_ROOT = BASE_DIR / 'media'` — onde ficam as
  fotos de peça (`Peca.imagem`). Servido pelo próprio Django só quando
  `DEBUG=True` (via `static()` em `core/urls.py`); em produção isso
  normalmente viraria outro serviço (nginx, object storage).
- **Email** (confirmação de cadastro): `EMAIL_HOST_USER` vazio no `.env`
  → `EMAIL_BACKEND` cai pro console (`django.core.mail.backends.console`),
  e o email inteiro é impresso no terminal do backend em vez de
  enviado — útil pra testar sem depender de credenciais reais. Com
  `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` preenchidos (senha de app do
  Gmail), vira SMTP de verdade (`smtp.gmail.com:587`, TLS).
- `FRONTEND_URL` — usado só pra montar o link que vai no email de
  confirmação (`{FRONTEND_URL}/confirmar-email?token=...`).
- `GOOGLE_CLIENT_ID` — Client ID OAuth do Google Cloud Console, usado
  pelo backend pra verificar a assinatura do token que o frontend recebe
  do Google (ver seção "Login com Google" abaixo). Sem isso configurado,
  o endpoint `login-google/` recusa com uma mensagem clara em vez de
  quebrar.

## Autenticação — JWT customizado (`backend/usuarios/auth.py`)

O projeto **não** usa o model de usuário padrão do Django
(`django.contrib.auth.models.User`) nem o `djangorestframework-simplejwt`
"do jeito oficial" — `Usuario` é um model próprio, então em vez de forçar
essa integração (o que exigiria reescrever boa parte do model e mexer nas
tabelas internas do Django), implementamos um fluxo de JWT simples e
explícito com a biblioteca **PyJWT**:

- **Access token**: vida de 30 minutos, mandado pelo frontend em toda
  requisição autenticada via header `Authorization: Bearer <token>`.
- **Refresh token**: vida de 7 dias, usado só para pedir um novo access
  token sem precisar logar de novo.
- Ambos carregam o id do usuário (claim `sub`, sempre como string — o
  PyJWT exige isso) e um `tipo_token` (`"access"` ou `"refresh"`), para
  que um refresh token não possa ser usado como access token.
- `usuarios/auth.py` expõe:
  - `gerar_tokens(usuario)` → `{'access': ..., 'refresh': ...}`
  - `decodificar_token(token, tipo_esperado)` → valida assinatura,
    validade e tipo; levanta `jwt.PyJWTError` se algo estiver errado.
  - `JWTAuthentication` — a authentication class do DRF que lê o header
    `Authorization`, decodifica o access token e busca o `Usuario`
    correspondente (só usuários com `ativo=True`). Anexa
    `usuario.is_authenticated = True` em runtime, já que `Usuario` não
    tem esse atributo por padrão (não é um model de auth do Django).
    Implementa também `authenticate_header()` retornando `'Bearer'` — sem
    isso, o DRF converte qualquer falha de autenticação em **403** em vez
    de **401** (ver `rest_framework.views.exception_handler`), e o
    interceptor de refresh automático do frontend só reage a 401. Foi um
    bug real encontrado durante os testes (ver known-issues.md).

## Confirmação de email (`backend/usuarios/emails.py`)

Cadastro por email/senha (`POST /api/cadastro/`) não deixa a conta
utilizável na hora: `Usuario.email_confirmado` nasce `False`, e o `login`
recusa usuários com esse campo `False` — mesmo com senha certa —
retornando uma mensagem pedindo pra confirmar o email primeiro.

- `usuarios/auth.py::gerar_token_confirmacao_email(usuario)` — gera um
  token JWT com `tipo_token='confirmar_email'` e validade de 48h (mesmo
  mecanismo do access/refresh token, tipo diferente pra não ser aceito em
  nenhum outro lugar).
- `usuarios/emails.py::enviar_email_confirmacao(usuario)` — monta o link
  (`{FRONTEND_URL}/confirmar-email?token=...`) e manda por
  `django.core.mail.send_mail`. Chamado em `cadastrar()` logo depois de
  criar o usuário.
- `POST /api/confirmar-email/` (pública) — recebe `{'token': '...'}`,
  decodifica, e marca `email_confirmado=True` no usuário correspondente.
  Token expirado ou inválido retorna mensagem específica.
- `POST /api/reenviar-confirmacao/` (pública) — recebe `{'email': '...'}`
  e reenvia o link se existir uma conta pendente com esse email. Sempre
  responde a mesma mensagem de sucesso genérica, exista ou não esse email
  cadastrado — evita virar um jeito de descobrir quais emails têm conta
  no sistema.
- Usuários criados **antes** dessa feature existir foram marcados como
  confirmados numa migration de dados
  (`usuarios/migrations/0004_confirmar_email_usuarios_existentes.py`),
  pra não bloquear contas que já funcionavam normalmente.

## Login com Google (`backend/usuarios/auth_google.py`)

Fluxo "Entrar com Google": o frontend usa o script oficial do Google
(Google Identity Services, carregado em `frontend/public/index.html`)
pra abrir o popup de login e recebe de volta um **ID token** — um JWT
assinado pelo Google provando quem é o dono daquele email. O frontend
manda esse token pro backend em `POST /api/login-google/
{'credential': '<id_token>'}`.

- `verificar_id_token(token_google)` — usa a biblioteca oficial
  `google-auth` (`google.oauth2.id_token.verify_oauth2_token`) pra
  conferir a assinatura contra as chaves públicas do Google e o
  `audience` (precisa bater com `settings.GOOGLE_CLIENT_ID` — um token
  válido emitido pra outro Client ID é rejeitado). Levanta
  `GoogleTokenInvalido` se algo não bater.
- `obter_ou_criar_usuario_google(payload)` — busca `Usuario` por
  `google_id`; se não achar, tenta casar por `emailUsu` (vincula a conta
  existente em vez de duplicar); se ainda assim não existir, cria uma
  conta nova com `email_confirmado=True` direto (o Google já validou o
  email) e `senUsu` = hash de uma string aleatória de 32 chars (nunca
  vai bater com nenhuma senha real — contas Google não têm senha nossa).
  Retorna `(usuario, criado)`.
- `views.py::login_google` monta a resposta com o mesmo formato do login
  normal (`_resposta_login`, compartilhado pelos dois), e registra no
  log de auditoria quando é uma conta nova.
- Esse fluxo é bem diferente do JWT customizado em `auth.py`: aquele é um
  token que a gente assina pra representar sessão; este é um token que o
  **Google** assina pra provar dono de email — dois JWTs com propósitos
  diferentes, verificados de formas diferentes.

## Redefinição de senha — "esqueci minha senha" (`backend/usuarios/emails.py`)

Fluxo em dois passos, mesmo padrão da confirmação de email:

- `usuarios/auth.py::gerar_token_redefinicao_senha(usuario)` — token JWT
  com `tipo_token='redefinir_senha'`, validade de **1 hora** (mais curta
  que a confirmação de cadastro — um link que dá poder de trocar senha
  merece uma janela de risco menor caso o email seja interceptado).
- `usuarios/emails.py::enviar_email_redefinicao_senha(usuario)` — monta o
  link (`{FRONTEND_URL}/redefinir-senha?token=...`) e envia.
- `POST /api/esqueci-senha/` (pública) — recebe `{'email': '...'}`,
  dispara o email se existir conta ativa com esse email. Resposta
  genérica idêntica sempre, mesmo padrão anti-enumeração de
  `reenviar_confirmacao`.
- `POST /api/redefinir-senha/` (pública) — recebe
  `{'token': '...', 'nova_senha': '...'}`. Valida a força da nova senha
  com `_erro_forca_senha()` (mesmas 5 regras do cadastro, extraídas pra
  uma função só — reaproveitada nos dois lugares em vez de duplicar os
  regexes), decodifica o token, e troca `usuario.senUsu` via
  `make_password(nova_senha)`.
- **O token não é de uso único** — continua válido até expirar (1h),
  mesmo depois de já ter sido usado pra redefinir a senha uma vez. Não
  há uma lista de tokens "já usados" (arquitetura stateless, mesma dos
  outros tokens JWT do projeto) — ver known-issues.md.
- Contas 100% Google (sem senha nossa) também recebem o email se pedirem
  redefinição pelo email delas — a troca só afeta `senUsu`, que nessas
  contas já era um hash aleatório inutilizável; tecnicamente "ativa" uma
  senha utilizável nelas, mas isso não está exposto/incentivado no
  frontend (o botão de login por senha continua funcionando pra elas se
  isso acontecer, é um efeito colateral aceitável, não um fluxo pensado).

## Permissões (`backend/usuarios/permissions.py`)

Regras de negócio reutilizáveis em qualquer view/app futuro (ex: catálogo
de peças):

- `EhAdministrador` — libera só para `tipoUsu == 'adm'`.
- `PodeGerenciarPecas` — libera para administradores (sempre) ou para
  funcionários com `pode_gerenciar_pecas = True` (campo do model, só um
  admin pode alterar). Clientes nunca passam.

## Rotas

`backend/core/urls.py`:
```python
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
    path('api/', include('catalogo.urls')),
    path('api/', include('auditoria.urls')),
]
# + static(MEDIA_URL, ...) quando DEBUG=True, para servir as imagens de peça
```

`backend/usuarios/urls.py`:
| Método | Path | View | Auth | Propósito |
|---|---|---|---|---|
| GET | `/api/usuarios/` | `listar_usuarios` | Requer token | Lista todos os usuários (id, nome, email, tipo, ativo, pode_gerenciar_pecas) |
| POST | `/api/login/` | `login` | Pública | Autentica por e-mail + senha, retorna tokens (recusa se `email_confirmado=False`) |
| POST | `/api/login-google/` | `login_google` | Pública | Verifica o ID token do Google, loga ou cadastra na hora |
| POST | `/api/cadastro/` | `cadastrar` | Pública | Cadastra novo usuário e envia email de confirmação |
| POST | `/api/confirmar-email/` | `confirmar_email` | Pública | Marca `email_confirmado=True` a partir do token do link |
| POST | `/api/reenviar-confirmacao/` | `reenviar_confirmacao` | Pública | Reenvia o link de confirmação |
| POST | `/api/esqueci-senha/` | `esqueci_senha` | Pública | Envia o link de redefinição de senha |
| POST | `/api/redefinir-senha/` | `redefinir_senha` | Pública | Troca a senha a partir do token do link |
| POST | `/api/token/refresh/` | `token_refresh` | Pública | Troca refresh token por um novo access token |
| PATCH | `/api/usuarios/<id>/permissao-pecas/` | `alterar_permissao_pecas` | Só admin | Concede/revoga `pode_gerenciar_pecas` de um funcionário |

`backend/catalogo/urls.py` (gerado por `DefaultRouter`, um `ModelViewSet` por
recurso — ver seção Catálogo abaixo):
| Método | Path | Auth | Propósito |
|---|---|---|---|
| GET | `/api/categorias/`, `/api/fornecedores/`, `/api/pecas/` | Requer token | Lista |
| POST | idem | `PodeGerenciarPecas` | Cria |
| GET | `.../<id>/` | Requer token | Detalhe |
| PUT/PATCH | `.../<id>/` | `PodeGerenciarPecas` | Edita |
| DELETE | `.../<id>/` | `PodeGerenciarPecas` | Exclui |

`admin.py` não registra `Usuario` no Django admin.

## Model — `backend/usuarios/models.py`

```python
class Usuario(models.Model):
    TIPO_USUARIO = (
        ('cliente', 'Cliente'),
        ('funcionario', 'Funcionario'),
        ('adm', 'Administrador'),
    )

    idUsu = models.AutoField(primary_key=True)
    nomUsu = models.CharField(max_length=45, blank=False)
    emailUsu = models.EmailField(max_length=45, unique=True)
    senUsu = models.CharField(max_length=255)
    telUsu = models.CharField(max_length=20)
    tipoUsu = models.CharField(max_length=20, choices=TIPO_USUARIO, default='cliente')
    ativo = models.BooleanField(default=True)
    pode_gerenciar_pecas = models.BooleanField(default=False)
    email_confirmado = models.BooleanField(default=False)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'usuarios'
        managed = True
```

Pontos importantes:
- **`managed = True`** (antes era `False`) — o Django agora controla o
  schema desta tabela via migrations reais:
  - `0001_initial` — aplicada com `--fake` sobre a tabela já existente
    (nenhuma coluna foi criada/alterada; só passou a ser rastreada).
  - `0002_usuario_pode_gerenciar_pecas` — aplicada de verdade, criou a
    coluna nova no MySQL.
  - `0003_usuario_email_confirmado_usuario_google_id` — criou as duas
    colunas novas de autenticação por email/Google.
  - `0004_confirmar_email_usuarios_existentes` — migration de dados
    (`RunPython`), marca `email_confirmado=True` em todos os usuários que
    já existiam antes dessa feature, pra não bloquear contas que já
    funcionavam.
- **`pode_gerenciar_pecas`**: usado pela permission `PodeGerenciarPecas`
  para liberar funcionários a gerenciar o catálogo de peças quando um
  admin autoriza. Admins sempre podem, independente deste valor.
- **`email_confirmado`**: cadastro por email/senha nasce com isso `False`
  e fica bloqueado de logar até clicar no link do email (ver seção
  "Confirmação de email" abaixo). Contas via Google já nascem `True`.
- **`google_id`**: preenchido só em contas criadas/vinculadas via "Entrar
  com Google" (ver "Login com Google" abaixo). `null=True` pois a
  maioria das contas (email/senha) não tem esse valor.
- Único model do projeto, sem relações (FK) com outras entidades (por
  enquanto — o catálogo de peças vai introduzir as próximas).
- `tipoUsu` aceita `cliente` / `funcionario` / `adm` (default `cliente`).
- Senha (`senUsu`) é hasheada com `make_password`/`check_password` do
  próprio Django (PBKDF2 por padrão). Contas Google recebem um hash de
  string aleatória em vez de senha real (ver "Login com Google").

## Views — `backend/usuarios/views.py`

### `GET /api/usuarios/` → `listar_usuarios`
Retorna a lista de **todos** os usuários (bug do `return` dentro do loop
foi corrigido). Requer autenticação (token válido no header).

### `POST /api/login/` → `login` (pública)
- Lê `email`, `senha` de `request.data`.
- Busca `Usuario.objects.get(emailUsu=email, ativo=True)`.
- Recusa se `email_confirmado=False` (mensagem pedindo pra confirmar).
- Verifica senha com `check_password`.
- Sucesso: monta a resposta via `_resposta_login(usuario)` (compartilhada
  com `login_google`):
  ```json
  {
    "success": true,
    "usuario": {"id": 1, "nome": "...", "email": "...", "tipo": "adm", "pode_gerenciar_pecas": false},
    "tokens": {"access": "...", "refresh": "..."}
  }
  ```
- Senha errada / usuário não encontrado: `{'success': False, 'message': ...}`,
  sem tokens.

### `POST /api/login-google/` → `login_google` (pública)
Ver seção "Login com Google" acima para o fluxo completo. Recebe
`{'credential': '<id_token_do_google>'}`, verifica, e responde no mesmo
formato de `login`.

### `POST /api/token/refresh/` → `token_refresh` (pública)
- Recebe `{'refresh': '<token>'}`.
- Valida o refresh token (assinatura, validade, `tipo_token == 'refresh'`).
- Sucesso: retorna `{'success': True, 'tokens': {access, refresh}}` — novo
  par de tokens (renova os dois, não só o access).
- Token expirado/inválido: `{'success': False, 'message': ...}`.

### `POST /api/cadastro/` → `cadastrar` (pública)
Mesmas validações de antes (nome/email/senha/telefone obrigatórios, e-mail
único e com formato válido, senha forte, telefone BR com 11 dígitos).
Continua pública, pois é assim que alguém vira usuário do sistema. Agora
também envia o email de confirmação (`enviar_email_confirmacao`) depois
de criar o usuário — a conta fica salva no banco, mas bloqueada de logar
até confirmar (ver "Confirmação de email" acima).

### `POST /api/confirmar-email/` → `confirmar_email` (pública)
Ver seção "Confirmação de email" acima.

### `POST /api/reenviar-confirmacao/` → `reenviar_confirmacao` (pública)
Ver seção "Confirmação de email" acima.

### `POST /api/esqueci-senha/` → `esqueci_senha` (pública)
Ver seção "Redefinição de senha" acima.

### `POST /api/redefinir-senha/` → `redefinir_senha` (pública)
Ver seção "Redefinição de senha" acima.

### `PATCH /api/usuarios/<id>/permissao-pecas/` → `alterar_permissao_pecas` (só admin)
Recebe `{'pode_gerenciar_pecas': true|false}`. Só aceita para usuários do
tipo `funcionario` (não faz sentido em `cliente` nem `adm`, que já pode por
definição). Usa a permission `EhAdministrador`.

**Todas as respostas de negócio (login/cadastro/refresh) são HTTP 200** —
o campo `success` no corpo é o que distingue erro de sucesso. Já as
respostas de autenticação/permissão (token ausente, inválido, sem
permissão) usam os status HTTP padrão do DRF (401 para problema de
autenticação, 403 para autenticado mas sem permissão), geradas
automaticamente pelo framework antes mesmo da view rodar.

## Catálogo de peças (`backend/catalogo/`)

3 models ligados por FK, todos herdando de `EntidadeCatalogo` (classe
abstrata) para os campos de auditoria/soft delete em comum:

```python
class EntidadeCatalogo(models.Model):
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    excluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class Categoria(EntidadeCatalogo):
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField()  # obrigatória


class Fornecedor(EntidadeCatalogo):
    nome = models.CharField(max_length=150)
    contato = models.CharField(max_length=100, blank=True)
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)


class Peca(EntidadeCatalogo):
    NIVEL_PRIORIDADE = (('alta', 'Alta'), ('media', 'Média'), ('baixa', 'Baixa'))

    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=150)
    descricao = models.TextField()
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    quantidade_estoque = models.PositiveIntegerField(default=0)
    quantidade_minima = models.PositiveIntegerField(default=0)
    nivel_prioridade = models.CharField(max_length=10, choices=NIVEL_PRIORIDADE, default='media')
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='pecas')
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.PROTECT, related_name='pecas')
    imagem = models.ImageField(upload_to='pecas/')
```

Pontos importantes:
- **Todos os campos de `Peca` são obrigatórios**, incluindo `categoria`,
  `fornecedor` e `imagem` — é um catálogo pensado pra o cliente visualizar,
  uma peça incompleta não cumpre esse propósito. `categoria`/`fornecedor`
  usam `on_delete=PROTECT` (não `SET_NULL`, já que agora são obrigatórios).
- **Soft delete**: `ativo`/`criado_em`/`atualizado_em`/`excluido_em` vêm
  de `EntidadeCatalogo`. "Excluir" pela API nunca apaga a linha — ver
  seção Views abaixo.
- **`quantidade_minima`/`nivel_prioridade`** vieram de uma tabela
  `produtos` que existia solta no banco desde antes do Django gerenciar o
  schema (nunca teve model correspondente, media o mesmo propósito de
  `Peca` com nomes de coluna diferentes: `qtdMin`, `nvlProd`). Essa
  tabela — e as que dependiam dela (`carrinho`, `itemcarrinho`, `pedido`,
  `itempedido`, todas com só 1 linha de teste, sem feature real por trás)
  — foi removida via migration `catalogo/migrations/0003_remover_tabelas_orfas.py`
  (um `RunSQL` com `DROP TABLE IF EXISTS`, em ordem segura por causa das
  foreign keys entre elas).

**Serializers** (`catalogo/serializers.py`): `ModelSerializer` padrão para
cada model, com `ativo`/`criado_em`/`atualizado_em`/`excluido_em` como
`read_only_fields` (só o soft delete via `DELETE` os altera, não dá pra
setar direto num `POST`/`PATCH`). `PecaSerializer` inclui
`categoria_nome`/`fornecedor_nome` como campos só-leitura (via
`source='categoria.nome'`), pra a listagem no frontend não precisar
cruzar IDs com outra chamada. `FornecedorSerializer.validate_telefone`
normaliza qualquer valor sem nenhum dígito (string vazia, ou lixo de
máscara de UI tipo `"("`) para `''`, e só rejeita quando existe telefone
parcial (entre 1 e 9 dígitos — abaixo do mínimo de 10 com DDD). O
`validate()` do serializer exige telefone OU e-mail preenchido (o campo
`contato`, sozinho, não é uma forma real de contatar o fornecedor).

**Views** (`catalogo/views.py`): um `ModelViewSet` por recurso
(`CategoriaViewSet`, `FornecedorViewSet`, `PecaViewSet`), todos herdando de
uma base `_CatalogoViewSet` que centraliza:

- **Permissão**: `list`/`retrieve` só exigem `IsAuthenticated`;
  criar/editar/excluir exigem `PodeGerenciarPecas` (admin sempre,
  funcionário só se `pode_gerenciar_pecas=True`). Checada a cada
  requisição direto no banco — revogar tem efeito imediato, sem precisar
  o usuário deslogar.
- **`get_queryset()`** filtra `ativo=True` — registros soft-deletados
  somem de toda listagem/detalhe automaticamente, sem precisar repetir o
  filtro em cada view.
- **`perform_destroy()`** não chama `instance.delete()` — em vez disso
  marca `ativo=False`, preenche `excluido_em=timezone.now()` e salva.
  Soft delete de verdade: o registro nunca some do banco, só das
  listagens. (O `on_delete=PROTECT` do model continua como rede de
  segurança para o caso raro de um `DELETE` de verdade acontecer por
  outro caminho, tipo shell/admin.)
- **`perform_create`/`perform_update`/`perform_destroy`** geram uma
  entrada em `auditoria.LogAtividade` (ver seção Auditoria abaixo).

`PecaViewSet` usa `parser_classes = [MultiPartParser, FormParser]` para
aceitar o upload de imagem junto dos outros campos (`multipart/form-data`).

**Rotas**: `catalogo/urls.py` usa `DefaultRouter` do DRF, que gera sozinho
as 5 rotas padrão (list/create/retrieve/update/destroy) para cada
ViewSet registrado — evita escrever isso na mão 3 vezes.

## Auditoria (`backend/auditoria/`)

App pequeno, só um model:

```python
class LogAtividade(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='logs_atividade')
    acao = models.CharField(max_length=10, choices=[('criar', 'Criar'), ('editar', 'Editar'), ('excluir', 'Excluir')])
    modelo = models.CharField(max_length=50)      # 'Peca', 'Categoria', 'Fornecedor', 'Usuario'
    objeto_id = models.CharField(max_length=50, blank=True)
    descricao = models.CharField(max_length=255, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
```

`usuario` usa `on_delete=SET_NULL`: se a conta do autor for excluída
depois, o registro do que ele fez continua existindo (o log em si é o
que importa preservar).

`auditoria/models.py::registrar(usuario, acao, modelo, objeto_id, descricao)`
é o helper chamado de dentro das views para gravar uma entrada — usado em:
- `catalogo/views.py::_CatalogoViewSet` (criar/editar/excluir peça,
  categoria ou fornecedor).
- `usuarios/views.py::cadastrar` (autocadastro de usuário).
- `usuarios/views.py::alterar_permissao_pecas` (admin concedendo/revogando
  `pode_gerenciar_pecas` de um funcionário).

**Consulta**: `GET /api/logs/` (`LogAtividadeViewSet`, só leitura) — restrito
a `EhAdministrador`. Ainda não tem tela própria no frontend; hoje é só
consultável via API (ex: Postman/curl) ou diretamente no banco
(`log_atividades`).

## Setup local

- MySQL rodando localmente, database `tcc`.
- Copiar `backend/.env.example` para `backend/.env` e preencher com as
  credenciais reais (o `.env` não é versionado). `EMAIL_HOST_USER`/
  `EMAIL_HOST_PASSWORD`/`GOOGLE_CLIENT_ID`/`STRIPE_SECRET_KEY` podem
  ficar vazios pra desenvolver sem email real, login Google ou checkout
  configurados (ver seções acima) — nada quebra, só essas features
  específicas ficam degradadas (email cai no console, login-google e
  checkout recusam com mensagem clara). Chaves do Stripe: criar conta em
  dashboard.stripe.com, pegar `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`
  em modo **teste** (nunca as de produção pra isso).
- `pip install -r backend/requirements.txt`.
- `python manage.py migrate` (aplica migrations pendentes; a tabela
  `usuarios` já existente não é recriada, só ganha colunas novas quando
  houver).
- Backend servido em `127.0.0.1:8000` (é o baseURL hardcoded no frontend).
- **Reiniciar o processo do backend depois de editar `.env`** —
  `python-decouple` só lê o arquivo na inicialização; o autoreload do
  `runserver` reage a mudanças em `.py`, não em `.env`.
- **Cuidado com processos `runserver` órfãos no Windows.** Matar só o PID
  que está ouvindo a porta 8000 (`Get-NetTCPConnection -LocalPort 8000`)
  às vezes deixa processos-filho do autoreloader do Django rodando soltos
  em background, ainda com o `.env` antigo carregado em memória — mesmo
  depois de "reiniciar", requisições podem continuar sendo respondidas
  por um processo zumbi com credenciais desatualizadas. Se algo que
  deveria ter mudado com uma edição de `.env` parecer não ter efeito
  (ex: credencial de email nova ainda dando erro de autenticação), rode
  `Get-Process python | Where-Object { $_.Path -like "*ProjetoTcc_v1*" }`
  e mate **todos**, não só o que está na porta, antes de subir de novo.
- **Senha de app do Gmail exige 2-Step Verification permanentemente
  ativa.** Se o usuário desativar a verificação em duas etapas depois de
  gerar a senha de app, o Google revoga todas as senhas de app na hora —
  os próximos envios falham com `535 5.7.8 BadCredentials` mesmo com a
  senha "certa". Manter 2FA ligado é obrigatório, não só no momento de
  gerar a senha.

## Vitrine pública (`catalogo` — endpoints sem login)

Além do CRUD protegido (`/api/pecas/` etc., ver acima), `catalogo` expõe
dois endpoints `AllowAny` para a página inicial pública funcionar sem
autenticação:

- `GET /api/loja/pecas/` — lista peças `ativo=True`, serializadas por
  `PecaPublicaSerializer` (`catalogo/serializers.py`): só `id`, `codigo`,
  `nome`, `descricao`, `preco`, `categoria_nome`, `imagem`, `disponivel`
  (`SerializerMethodField`, `quantidade_estoque > 0`). Deliberadamente
  omite campos internos (`quantidade_minima`, `nivel_prioridade`,
  timestamps) que não são assunto do cliente final.
- `GET /api/loja/pecas/<id>/` — detalhe de uma peça (404 se inativa).

Ambas usam `context={'request': request}` no serializer para que
`imagem` volte como URL absoluta (`http://127.0.0.1:8000/media/...`), não
relativa — necessário porque o frontend roda em outra origem (porta 3000).

## App `pedidos` — carrinho e pedidos

App novo (`INSTALLED_APPS` em `core/settings.py`, incluído em
`core/urls.py` via `path('api/', include('pedidos.urls'))`), responsável
pelo carrinho de compras e pelo histórico de pedidos do cliente.

### Models (`pedidos/models.py`)

- `Carrinho` — `OneToOneField(Usuario)`: um carrinho por usuário, criado
  sob demanda (`get_or_create`) na primeira vez que o cliente adiciona algo.
- `ItemCarrinho` — `ForeignKey(Carrinho)` + `ForeignKey(Peca)` +
  `quantidade`; `unique_together = ('carrinho', 'peca')` para que
  adicionar a mesma peça duas vezes some quantidade em vez de duplicar linha.
- `Pedido` — `usuario` (`SET_NULL`, para não perder o histórico se a
  conta for excluída no futuro), `status` (`concluido`/`cancelado`),
  `total`, `criado_em`, `stripe_session_id` (`unique=True, null=True`) —
  guarda o id da sessão do Stripe Checkout que originou o pedido; é o que
  garante idempotência se o cliente recarregar a página de sucesso (ver
  Checkout abaixo).
- `ItemPedido` — **snapshot**: guarda `peca_nome` e `preco_unitario` como
  cópia no momento da compra (além da FK `peca`, `SET_NULL`), pra que
  editar o preço/nome de uma peça depois não altere retroativamente o
  que o cliente já comprou.
- `Encomenda` — pedido de encomenda de peça sem estoque (RF07/RF08, ver
  seção "Encomendas" abaixo).

### Views (`pedidos/views.py`)

- `GET /api/carrinho/` — carrinho do usuário logado (`ver_carrinho`).
- `POST /api/carrinho/itens/` (`{peca_id, quantidade}`) — adiciona/soma
  item, validando contra `Peca.quantidade_estoque`.
- `PATCH`/`DELETE /api/carrinho/itens/<id_item>/` — uma única view
  `item_carrinho` tratando os dois métodos (`@api_view(['PATCH', 'DELETE'])`),
  já que uma URL só pode apontar pra uma view no Django.
- `GET /api/pedidos/` — `listar_pedidos`, histórico do usuário logado
  (`prefetch_related('itens')`).

A criação do `Pedido` + `ItemPedido` (decrementa estoque, esvazia
carrinho, snapshot de preço/nome, log de auditoria) foi extraída pra
`_criar_pedido_do_carrinho(usuario, stripe_session_id=None,
status=Pedido.STATUS_CONCLUIDO)` — usada por `confirmar_pagamento`
(compra, abaixo) e por `reservar_carrinho` (reserva, RF06, ver seção
"Reserva" abaixo). Não faz `select_for_update()` — ver known-issues.md
sobre concorrência.

Todos os serializers de carrinho (`CarrinhoSerializer`) precisam de
`context={'request': request}` pelo mesmo motivo da vitrine pública
(URL absoluta de imagem).

### Configurações do sistema (`ConfiguracaoSistema`)

Model "singleton" (uma linha só, `ConfiguracaoSistema.obter()` faz
`get_or_create(pk=1)`) pra ligar/desligar funcionalidades sem precisar
mexer em código. Hoje só `reserva_habilitada` (default `True`), mas o
modelo já está pronto pra outros toggles futuros.

- `GET /api/configuracoes/` — qualquer usuário logado consulta (o
  frontend usa isso pra decidir se mostra o botão "Reservar").
- `PATCH /api/configuracoes/ {'reserva_habilitada': bool}` — só admin
  (`EhAdministrador`), gera entrada em `auditoria.LogAtividade`.
- `reservar_carrinho` confere `ConfiguracaoSistema.obter().reserva_habilitada`
  antes de criar a reserva — a checagem é no backend, não só escondida no
  frontend, então desligar de verdade bloqueia a API (não dá pra
  contornar chamando `POST /api/carrinho/reservar/` direto).

### Checkout — Stripe (pagamento simulado)

`POST /api/carrinho/finalizar/` foi substituído por um checkout real via
**Stripe Checkout** (página hospedada pelo próprio Stripe) — em modo
teste, então nenhum valor de verdade circula, mas o fluxo é o mesmo de
produção. Duas chaves no `.env` (`STRIPE_SECRET_KEY`/
`STRIPE_PUBLISHABLE_KEY`, pegas em dashboard.stripe.com em modo teste);
sem `STRIPE_SECRET_KEY`, os endpoints abaixo recusam com mensagem clara
em vez de erro genérico (mesmo padrão do `GOOGLE_CLIENT_ID`).

- `POST /api/carrinho/checkout/` (`criar_sessao_checkout`) — valida que o
  carrinho não está vazio e que há estoque suficiente (só pra dar
  feedback rápido antes de sair da aplicação), depois cria uma
  `stripe.checkout.Session` (`mode='payment'`) com um line item por item
  do carrinho (preço em centavos — `Decimal * 100` convertido pra `int`,
  Stripe não trabalha com float pra dinheiro). `success_url` aponta pra
  `{FRONTEND_URL}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`
  (o Stripe substitui esse placeholder pelo id real antes de redirecionar
  o navegador) e `cancel_url` volta pro carrinho. `metadata.usuario_id`
  grava quem iniciou o checkout, conferido depois na confirmação.
  Retorna `{'success': True, 'url': sessao.url}` — o frontend faz
  `window.location.href = url` (não precisa de biblioteca Stripe no
  frontend pra esse fluxo, só o redirect).
- `POST /api/carrinho/confirmar-pagamento/` (`confirmar_pagamento`) —
  chamado pela página de retorno (`PagamentoSucesso.jsx`) com o
  `session_id` da URL. **Nunca confia no navegador ter chegado nessa
  URL** — busca a sessão de verdade na API do Stripe
  (`stripe.checkout.Session.retrieve`), confere que
  `metadata.usuario_id` bate com `request.user` e que
  `payment_status == 'paid'`, só então chama
  `_criar_pedido_do_carrinho(usuario, stripe_session_id=session_id)`.
  **Idempotente**: se o `Pedido` já existe pra aquele `session_id`
  (cliente atualizou a página de sucesso), devolve ele direto em vez de
  tentar descontar estoque de novo — garantido pelo `unique=True` do
  campo.

Não há webhook do Stripe configurado (`stripe listen`/endpoint
`/webhooks/stripe/`) — a confirmação depende do navegador do cliente
chegar na `success_url` depois do pagamento. Aceitável pro escopo do TCC
(ver known-issues.md), mas significa que um pagamento aprovado sem o
cliente voltar pro site (fechou a aba antes do redirect) não gera
`Pedido` — o dinheiro (simulado) fica "só no Stripe".

### Reserva (RF06)

`Pedido.status` ganhou o valor `reservado`, além de `concluido`/
`cancelado`. Decisão de escopo confirmada com o usuário: **sem prazo de
expiração automática** — a reserva fica ativa até alguém agir sobre ela
(cliente não tem como cancelar a própria reserva hoje, só a equipe).

- `POST /api/carrinho/reservar/` (`reservar_carrinho`) — mesmas
  validações de estoque de um checkout normal, mas chama
  `_criar_pedido_do_carrinho(usuario, status=Pedido.STATUS_RESERVADO)`
  direto, sem passar pelo Stripe (não há cobrança nesse momento — o
  pagamento acontece depois, presencialmente, na retirada).
- `GET /api/reservas/` (`listar_reservas`, `PodeGerenciarPecas`) —
  reservas ativas de **todos** os clientes (diferente de
  `listar_pedidos`, que é sempre filtrado pelo usuário logado).
- `PATCH /api/reservas/<id>/cancelar/` (`cancelar_reserva`,
  `PodeGerenciarPecas`) — devolve a quantidade de cada `ItemPedido` ao
  estoque da respectiva `Peca` e marca o `Pedido` como `cancelado`. É a
  única forma de liberar uma reserva, já que não há expiração automática.

`PedidoSerializer` ganhou `usuario_nome` (só usado por `listar_reservas`
— o histórico do próprio cliente já sabe de quem é o pedido).

### Encomendas (RF07/RF08)

- `POST /api/encomendas/` (`criar_encomenda`) — cliente pede uma peça com
  `quantidade_estoque == 0` (recusa se houver estoque — nesse caso o
  fluxo é comprar direto). Nasce sempre `pendente`.
- `GET /api/encomendas/minhas/` (`minhas_encomendas`) — status das
  próprias encomendas do cliente logado.
- `GET /api/encomendas/pendentes/` (`listar_encomendas`, `PodeGerenciarPecas`)
  — fila de validação da equipe.
- `PATCH /api/encomendas/<id>/validar/` (`validar_encomenda`,
  `PodeGerenciarPecas`) — aprova ou recusa. **Aprovar soma a quantidade
  encomendada ao estoque da peça** (representa "a peça foi providenciada"),
  pra que o cliente consiga comprá-la de verdade em seguida pelo
  carrinho/checkout normal. Ambas as ações (criar/validar) geram entrada
  em `auditoria.LogAtividade`.
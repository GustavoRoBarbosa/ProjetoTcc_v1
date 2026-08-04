import re

import jwt
from auditoria.models import LogAtividade, registrar
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .auth import decodificar_token, gerar_tokens
from .auth_google import GoogleTokenInvalido, obter_ou_criar_usuario_google, verificar_id_token
from .emails import enviar_email_confirmacao, enviar_email_redefinicao_senha
from .models import Usuario
from .permissions import EhAdministrador


def _erro_forca_senha(senha):
    """Mesmas regras usadas no cadastro (nome/cadastrar) e na redefinição
    de senha (redefinir_senha) — centralizado aqui pra não duplicar os 5
    regexes nos dois lugares. Devolve a mensagem de erro, ou None se a
    senha passar em todas as regras.
    """
    if len(senha) < 8:
        return 'A senha deve possuir pelo menos 8 caracteres'
    if not re.search(r'[A-Z]', senha):
        return 'A senha deve possuir uma letra maiúscula'
    if not re.search(r'[a-z]', senha):
        return 'A senha deve possuir uma letra minúscula'
    if not re.search(r'[0-9]', senha):
        return 'A senha deve possuir um número'
    if not re.search(r'[\W_]', senha):
        return 'A senha deve possuir um caractere especial'
    return None


@api_view(['GET'])
# Agora que existe autenticação de verdade (JWT), esta view passa a exigir
# um usuário logado — o padrão global em settings.REST_FRAMEWORK já é
# IsAuthenticated, então basta não sobrescrever com AllowAny aqui.
def listar_usuarios(request):

    usuarios = Usuario.objects.all()

    dados = []

    for usuario in usuarios:
        dados.append({
            'id': usuario.idUsu,
            'nome': usuario.nomUsu,
            'email': usuario.emailUsu,
            'tipo': usuario.tipoUsu,
            'ativo': usuario.ativo,
            'pode_gerenciar_pecas': usuario.pode_gerenciar_pecas
        })

    return Response(dados)


def _resposta_login(usuario):
    """Monta a resposta padrão de "login bem-sucedido" — usada tanto pelo
    login por senha quanto pelo login com Google, pra manter os dois
    devolvendo exatamente o mesmo formato pro frontend.
    """
    tokens = gerar_tokens(usuario)

    return Response({
        'success': True,
        'usuario': {
            'id': usuario.idUsu,
            'nome': usuario.nomUsu,
            'email': usuario.emailUsu,
            'tipo': usuario.tipoUsu,
            'pode_gerenciar_pecas': usuario.pode_gerenciar_pecas
        },
        'tokens': tokens
    })


@api_view(['POST'])
@permission_classes([AllowAny])  # login é o próprio ponto de entrada: precisa ficar público
def login(request):

    email = request.data.get('email')
    senha = request.data.get('senha')

    try:
        usuario = Usuario.objects.get(emailUsu=email, ativo=True)

        if not usuario.email_confirmado:
            return Response({
                'success': False,
                'message': 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.'
            })

        if check_password(senha, usuario.senUsu):
            return _resposta_login(usuario)

        return Response({
            'success': False,
            'message': 'Senha invalida'
        })
    except Usuario.DoesNotExist:

        return Response({
            'success': False,
            'message': 'Usuario não encontrado'
        })


@api_view(['POST'])
@permission_classes([AllowAny])  # quem chama está tentando logar — ainda não tem sessão nossa
def login_google(request):
    """Recebe o ID token que o Google Identity Services devolveu no
    frontend, confere a assinatura com o Google, e loga (ou cadastra na
    hora) o usuário correspondente.
    """

    token_google = request.data.get('credential')

    if not token_google:
        return Response({
            'success': False,
            'message': 'Token do Google não informado'
        })

    try:
        payload = verificar_id_token(token_google)
    except GoogleTokenInvalido as erro:
        return Response({
            'success': False,
            'message': str(erro)
        })

    usuario, criado = obter_ou_criar_usuario_google(payload)

    if not usuario.ativo:
        return Response({
            'success': False,
            'message': 'Esta conta está desativada'
        })

    if criado:
        registrar(
            usuario=usuario,
            acao=LogAtividade.ACAO_CRIAR,
            modelo='Usuario',
            objeto_id=usuario.idUsu,
            descricao=f'Cadastro via Google de {usuario.nomUsu}',
        )

    return _resposta_login(usuario)


@api_view(['POST'])
@permission_classes([AllowAny])  # quem chama ainda não tem um access token válido (por isso está pedindo um novo)
def token_refresh(request):
    """Troca um refresh token válido por um novo access token.

    O frontend chama isso quando um request autenticado falha por token
    expirado, evitando forçar o usuário a logar de novo a cada 30 min
    (vida útil do access token).
    """

    refresh_token = request.data.get('refresh')

    if not refresh_token:
        return Response({
            'success': False,
            'message': 'Refresh token não informado'
        })

    try:
        payload = decodificar_token(refresh_token, tipo_esperado='refresh')
        usuario = Usuario.objects.get(idUsu=payload['sub'], ativo=True)
    except jwt.ExpiredSignatureError:
        return Response({
            'success': False,
            'message': 'Sessão expirada, faça login novamente'
        })
    except (jwt.PyJWTError, Usuario.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Refresh token inválido'
        })

    novos_tokens = gerar_tokens(usuario)

    return Response({
        'success': True,
        'tokens': novos_tokens
    })


@api_view(['POST'])
@permission_classes([AllowAny])  # cadastro precisa ficar público: é assim que alguém vira usuário
def cadastrar(request):

    nome = request.data.get('nome')
    email = request.data.get('email')
    senha = request.data.get('senha')
    telefone = request.data.get('telefone')



    if not nome or nome.strip() == '':

        return Response({
            'success': False,
            'message': 'O nome é obrigatório'
        })

    if not email or email.strip() == '':

        return Response({
            'success': False,
            'message': 'O email é obrigatório'
        })

    if not senha or senha.strip() == '':

        return Response({
            'success': False,
            'message': 'A senha é obrigatória'
        })

    if not telefone or telefone.strip() == '':

        return Response({
            'success': False,
            'message': 'O telefone é obrigatório'
        })

    if Usuario.objects.filter(emailUsu=email).exists():

        return Response({
            'success': False,
            'message': 'Email já cadastrado'
        })


    regex_email = r'^[\w\.-]+@[\w\.-]+\.\w+$'

    if not re.match(regex_email, email):

        return Response({
            'success': False,
            'message': 'Email inválido'
        })

    erro_senha = _erro_forca_senha(senha)
    if erro_senha:
        return Response({
            'success': False,
            'message': erro_senha
        })

    telefone = re.sub(r'\D', '', telefone)

    if len(telefone) != 11:

        return Response({
            'success': False,
            'message': 'Telefone inválido'
        })

    telefone_formatado = f'({telefone[:2]}) {telefone[2:7]}-{telefone[7:]}'

    usuario = Usuario.objects.create(
        nomUsu=nome,
        emailUsu=email,
        senUsu=make_password(senha),
        telUsu=telefone_formatado
    )

    registrar(
        usuario=usuario,
        acao=LogAtividade.ACAO_CRIAR,
        modelo='Usuario',
        objeto_id=usuario.idUsu,
        descricao=f'Autocadastro de {usuario.nomUsu}',
    )

    # A conta já existe no banco, mas email_confirmado nasce False
    # (default do model) — login fica bloqueado até o link ser clicado.
    enviar_email_confirmacao(usuario)

    return Response({
        'success': True,
        'message': 'Cadastro quase completo! Enviamos um link de confirmação para o seu email.'
    })


@api_view(['PATCH'])
@permission_classes([EhAdministrador])  # só admin concede/revoga essa permissão
def alterar_permissao_pecas(request, id_usuario):
    """Admin concede ou revoga de um funcionário a permissão de gerenciar
    o catálogo de peças (ver usuarios/permissions.py::PodeGerenciarPecas).

    Não faz sentido mexer nesse campo em clientes ou em outros
    administradores (adm já pode gerenciar peças por definição), então a
    view recusa esses casos também.
    """

    pode_gerenciar = request.data.get('pode_gerenciar_pecas')

    if not isinstance(pode_gerenciar, bool):
        return Response({
            'success': False,
            'message': 'Informe pode_gerenciar_pecas como true ou false'
        })

    try:
        usuario = Usuario.objects.get(idUsu=id_usuario)
    except Usuario.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Usuário não encontrado'
        })

    if usuario.tipoUsu != 'funcionario':
        return Response({
            'success': False,
            'message': 'Essa permissão só se aplica a usuários do tipo funcionário'
        })

    usuario.pode_gerenciar_pecas = pode_gerenciar
    usuario.save()

    registrar(
        usuario=request.user,
        acao=LogAtividade.ACAO_EDITAR,
        modelo='Usuario',
        objeto_id=usuario.idUsu,
        descricao=(
            f'{"Concedeu" if pode_gerenciar else "Revogou"} permissão de gerenciar '
            f'peças para {usuario.nomUsu}'
        ),
    )

    return Response({
        'success': True,
        'usuario': {
            'id': usuario.idUsu,
            'nome': usuario.nomUsu,
            'pode_gerenciar_pecas': usuario.pode_gerenciar_pecas
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])  # quem chama ainda não está logado — é assim que a conta vira utilizável
def confirmar_email(request):
    """Clicado a partir do link mandado por enviar_email_confirmacao().

    Recebe o token no corpo (o frontend lê da query string ?token=... e
    repassa aqui) em vez de aceitar como parâmetro de URL do Django,
    porque quem "processa" o link é a página React (ConfirmarEmail.jsx),
    não o backend diretamente.
    """

    token = request.data.get('token')

    if not token:
        return Response({
            'success': False,
            'message': 'Token não informado'
        })

    try:
        payload = decodificar_token(token, tipo_esperado='confirmar_email')
        usuario = Usuario.objects.get(idUsu=payload['sub'])
    except jwt.ExpiredSignatureError:
        return Response({
            'success': False,
            'message': 'Este link expirou. Peça um novo em "Reenviar confirmação".'
        })
    except (jwt.PyJWTError, Usuario.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Link de confirmação inválido'
        })

    if usuario.email_confirmado:
        return Response({
            'success': True,
            'message': 'Este email já estava confirmado.'
        })

    usuario.email_confirmado = True
    usuario.save(update_fields=['email_confirmado'])

    registrar(
        usuario=usuario,
        acao=LogAtividade.ACAO_EDITAR,
        modelo='Usuario',
        objeto_id=usuario.idUsu,
        descricao='Confirmou o email do cadastro',
    )

    return Response({
        'success': True,
        'message': 'Email confirmado! Você já pode entrar.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])  # quem pede ainda não confirmou o email — não tem como estar autenticado
def reenviar_confirmacao(request):
    """Para quando o link expirou (48h) ou o email de confirmação se
    perdeu. Sempre responde a mesma mensagem de sucesso, exista ou não
    esse email cadastrado — não é um jeito de descobrir se um email tem
    conta no sistema (mesmo cuidado que sites maiores tomam aqui).
    """

    email = request.data.get('email')

    try:
        usuario = Usuario.objects.get(emailUsu=email, ativo=True, email_confirmado=False)
        enviar_email_confirmacao(usuario)
    except Usuario.DoesNotExist:
        pass

    return Response({
        'success': True,
        'message': 'Se esse email tiver um cadastro pendente de confirmação, reenviamos o link.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])  # quem esqueceu a senha não tem como estar autenticado
def esqueci_senha(request):
    """Primeiro passo do "esqueci minha senha": recebe o email, manda o
    link de redefinição se existir uma conta com senha (contas Google
    puras não têm senha nossa pra redefinir — ver auth_google.py).

    Mesma resposta genérica de reenviar_confirmacao(), pelo mesmo motivo:
    não vira um jeito de descobrir quais emails têm conta no sistema.
    """

    email = request.data.get('email')

    try:
        usuario = Usuario.objects.get(emailUsu=email, ativo=True)
        enviar_email_redefinicao_senha(usuario)
    except Usuario.DoesNotExist:
        pass

    return Response({
        'success': True,
        'message': 'Se esse email tiver uma conta, enviamos um link para redefinir a senha.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])  # quem chama está tentando recuperar acesso — por definição não está logado
def redefinir_senha(request):
    """Segundo passo: recebe o token do link + a nova senha, valida os
    dois, e troca senUsu.
    """

    token = request.data.get('token')
    nova_senha = request.data.get('nova_senha')

    if not token:
        return Response({
            'success': False,
            'message': 'Token não informado'
        })

    if not nova_senha:
        return Response({
            'success': False,
            'message': 'Informe a nova senha'
        })

    erro_senha = _erro_forca_senha(nova_senha)
    if erro_senha:
        return Response({
            'success': False,
            'message': erro_senha
        })

    try:
        payload = decodificar_token(token, tipo_esperado='redefinir_senha')
        usuario = Usuario.objects.get(idUsu=payload['sub'])
    except jwt.ExpiredSignatureError:
        return Response({
            'success': False,
            'message': 'Este link expirou. Peça um novo em "Esqueci minha senha".'
        })
    except (jwt.PyJWTError, Usuario.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Link de redefinição inválido'
        })

    usuario.senUsu = make_password(nova_senha)
    usuario.save(update_fields=['senUsu'])

    registrar(
        usuario=usuario,
        acao=LogAtividade.ACAO_EDITAR,
        modelo='Usuario',
        objeto_id=usuario.idUsu,
        descricao='Redefiniu a senha via "esqueci minha senha"',
    )

    return Response({
        'success': True,
        'message': 'Senha redefinida! Você já pode entrar com a nova senha.'
    })

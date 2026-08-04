"""Autenticação JWT customizada.

O projeto não usa o model de usuário padrão do Django (auth.User), então
não dá pra usar bibliotecas prontas como o djangorestframework-simplejwt
"do jeito padrão" sem reescrever boa parte do model Usuario. Em vez disso,
implementamos aqui um fluxo de JWT simples e explícito, usando a
biblioteca PyJWT para assinar/verificar os tokens:

- access token: vida curta (ver ACCESS_TOKEN_LIFETIME), enviado pelo
  frontend em toda requisição autenticada, no header
  "Authorization: Bearer <token>".
- refresh token: vida mais longa (ver REFRESH_TOKEN_LIFETIME), usado só
  para pedir um novo access token quando o antigo expira, sem precisar
  pedir email/senha de novo.

Ambos os tokens carregam o id do usuário (claim "sub") e um tipo
("access" ou "refresh") para que um refresh token não possa ser usado
como se fosse um access token por engano (ou por um cliente malicioso).
"""

from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import Usuario

ACCESS_TOKEN_LIFETIME = timedelta(minutes=30)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)
# Prazo generoso pro usuário achar o email e clicar no link sem pressa.
CONFIRMACAO_EMAIL_LIFETIME = timedelta(hours=48)
# Mais curto que a confirmação de cadastro: é um link que dá poder de
# trocar a senha, então prazo mais apertado reduz a janela de risco caso
# o email seja interceptado por alguém.
REDEFINICAO_SENHA_LIFETIME = timedelta(hours=1)


def _criar_token(usuario, tipo, tempo_de_vida):
    agora = datetime.now(timezone.utc)
    payload = {
        'sub': str(usuario.idUsu),  # PyJWT exige que o claim "sub" seja string (RFC 7519)
        'tipo_token': tipo,
        'iat': agora,
        'exp': agora + tempo_de_vida,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def gerar_tokens(usuario):
    """Gera o par (access, refresh) de tokens para um usuário autenticado."""
    return {
        'access': _criar_token(usuario, 'access', ACCESS_TOKEN_LIFETIME),
        'refresh': _criar_token(usuario, 'refresh', REFRESH_TOKEN_LIFETIME),
    }


def gerar_token_confirmacao_email(usuario):
    """Token de uso único (na prática) pro link de confirmação de
    cadastro: `tipo_token='confirmar_email'` impede que esse token seja
    aceito em qualquer outro lugar (ele não é um access nem refresh
    token) mesmo se vazar.
    """
    return _criar_token(usuario, 'confirmar_email', CONFIRMACAO_EMAIL_LIFETIME)


def gerar_token_redefinicao_senha(usuario):
    """Token do link de "esqueci minha senha". `tipo_token='redefinir_senha'`
    garante que esse token só serve pra essa finalidade específica.
    """
    return _criar_token(usuario, 'redefinir_senha', REDEFINICAO_SENHA_LIFETIME)


def decodificar_token(token, tipo_esperado):
    """Valida assinatura, validade e tipo do token; devolve o payload.

    Levanta jwt.PyJWTError (ou subclasses) se o token for inválido,
    expirado ou do tipo errado — quem chama decide como tratar o erro.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    if payload.get('tipo_token') != tipo_esperado:
        raise jwt.InvalidTokenError('Tipo de token inesperado')
    return payload


class JWTAuthentication(BaseAuthentication):
    """Authentication class do DRF que reconhece nosso access token.

    Ligada em REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES (settings.py).
    Todo endpoint que exigir IsAuthenticated passa por aqui primeiro.
    """

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')

        if not header.startswith('Bearer '):
            # Sem header = usuário anônimo; quem decide se isso é permitido
            # é a permission class do endpoint (ex: AllowAny no login/cadastro).
            return None

        token = header.removeprefix('Bearer ').strip()

        try:
            payload = decodificar_token(token, tipo_esperado='access')
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expirado')
        except jwt.PyJWTError:
            raise AuthenticationFailed('Token inválido')

        try:
            usuario = Usuario.objects.get(idUsu=payload['sub'], ativo=True)
        except Usuario.DoesNotExist:
            raise AuthenticationFailed('Usuário não encontrado ou inativo')

        # DRF/permission classes esperam request.user.is_authenticated;
        # Usuario não tem esse atributo por padrão (não é um model do
        # Django auth), então anexamos aqui em tempo de execução.
        usuario.is_authenticated = True

        return (usuario, token)

    def authenticate_header(self, request):
        # Sem isso, o DRF converte qualquer falha de autenticação em 403
        # em vez de 401 (ver rest_framework.views.exception_handler —
        # ele só mantém 401 quando existe um authenticate_header). Como
        # o frontend só tenta renovar o token automaticamente em respostas
        # 401 (ver interceptor em services/api.js), sem isso o access
        # token expirado nunca seria renovado sozinho.
        return 'Bearer'

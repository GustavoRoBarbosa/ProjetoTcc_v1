"""Login com "Entrar com Google".

Fluxo: o frontend usa o script oficial do Google (Google Identity
Services) pra abrir o popup de login do Google e recebe de volta um "ID
token" — um JWT assinado pelo próprio Google, que prova que aquele email
é dono da conta Google que autenticou. O frontend manda esse token pro
nosso backend (POST /api/login-google/), e é aqui que a gente verifica a
assinatura (usando a biblioteca oficial google-auth, que baixa e
confere contra as chaves públicas do Google) antes de confiar em
qualquer dado dele.

Isso é bem diferente do nosso JWT customizado em auth.py: aquele é um
token que A GENTE assina pra representar uma sessão já autenticada;
este é um token que o GOOGLE assina pra provar quem é o dono do email.
"""

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.utils.crypto import get_random_string
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .models import Usuario


class GoogleTokenInvalido(Exception):
    pass


def verificar_id_token(token_google):
    """Confere a assinatura do token com o Google e devolve os dados do
    usuário (email, nome). Levanta GoogleTokenInvalido se algo não bater
    — assinatura errada, token expirado, ou emitido pra outro Client ID
    (audience) que não o nosso.
    """

    if not settings.GOOGLE_CLIENT_ID:
        raise GoogleTokenInvalido(
            'Login com Google não está configurado neste servidor '
            '(GOOGLE_CLIENT_ID ausente no .env).'
        )

    try:
        payload = id_token.verify_oauth2_token(
            token_google, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError as erro:
        raise GoogleTokenInvalido(str(erro))

    return payload


def obter_ou_criar_usuario_google(payload):
    """Acha o Usuario correspondente ao google_id do payload; se não
    existir ainda, cria uma conta nova.

    Um email de conta Google já foi verificado pelo próprio Google, então
    email_confirmado nasce True aqui — diferente do cadastro comum, que
    exige clicar no link (ver views.cadastrar).
    """

    google_id = payload['sub']
    email = payload['email']
    nome = payload.get('name') or email.split('@')[0]

    try:
        return Usuario.objects.get(google_id=google_id), False
    except Usuario.DoesNotExist:
        pass

    # Alguém que já tinha conta por email/senha e agora loga com Google
    # pela primeira vez usando o mesmo email: vincula em vez de duplicar.
    usuario_existente = Usuario.objects.filter(emailUsu=email).first()
    if usuario_existente:
        usuario_existente.google_id = google_id
        usuario_existente.email_confirmado = True
        usuario_existente.save(update_fields=['google_id', 'email_confirmado'])
        return usuario_existente, False

    # senUsu é NOT NULL no model, mas contas Google não têm senha nossa
    # — gera um hash aleatório impossível de adivinhar/derivar; login por
    # senha nunca vai bater com isso (é só um preenchimento válido pro
    # campo obrigatório).
    usuario = Usuario.objects.create(
        nomUsu=nome[:45],
        emailUsu=email,
        senUsu=make_password(get_random_string(32)),
        telUsu='',
        google_id=google_id,
        email_confirmado=True,
    )
    return usuario, True

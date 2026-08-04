"""Envio dos emails transacionais (confirmação de cadastro, redefinição
de senha).

Separado de views.py só pra não misturar "regra HTTP" com "como montar e
mandar o email" — as views chamam essas funções sem precisar saber como
o email é montado.
"""

from django.conf import settings
from django.core.mail import send_mail

from .auth import gerar_token_confirmacao_email, gerar_token_redefinicao_senha


def enviar_email_confirmacao(usuario):
    token = gerar_token_confirmacao_email(usuario)
    link = f'{settings.FRONTEND_URL}/confirmar-email?token={token}'

    assunto = 'Confirme seu cadastro — GRB OFICE'
    corpo = (
        f'Olá, {usuario.nomUsu}!\n\n'
        f'Para ativar sua conta na GRB OFICE, confirme seu email clicando no link abaixo:\n\n'
        f'{link}\n\n'
        f'Esse link expira em 48 horas. Se você não se cadastrou na GRB OFICE, '
        f'pode ignorar este email.'
    )

    send_mail(
        subject=assunto,
        message=corpo,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.emailUsu],
    )


def enviar_email_redefinicao_senha(usuario):
    token = gerar_token_redefinicao_senha(usuario)
    link = f'{settings.FRONTEND_URL}/redefinir-senha?token={token}'

    assunto = 'Redefinição de senha — GRB OFICE'
    corpo = (
        f'Olá, {usuario.nomUsu}!\n\n'
        f'Recebemos um pedido para redefinir a senha da sua conta na GRB OFICE. '
        f'Clique no link abaixo para escolher uma nova senha:\n\n'
        f'{link}\n\n'
        f'Esse link expira em 1 hora. Se você não pediu essa redefinição, '
        f'pode ignorar este email — sua senha continua a mesma.'
    )

    send_mail(
        subject=assunto,
        message=corpo,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[usuario.emailUsu],
    )

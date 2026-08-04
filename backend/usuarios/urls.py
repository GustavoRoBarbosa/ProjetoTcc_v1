from django.urls import path
from .views import (
    listar_usuarios, login, cadastrar, token_refresh, alterar_permissao_pecas,
    confirmar_email, reenviar_confirmacao, login_google,
    esqueci_senha, redefinir_senha,
)

urlpatterns = [
    path('usuarios/', listar_usuarios),
    path('login/', login),
    path('login-google/', login_google),
    path('cadastro/', cadastrar),
    path('token/refresh/', token_refresh),  # troca refresh token por um novo access token
    path('usuarios/<int:id_usuario>/permissao-pecas/', alterar_permissao_pecas),
    path('confirmar-email/', confirmar_email),
    path('reenviar-confirmacao/', reenviar_confirmacao),
    path('esqueci-senha/', esqueci_senha),
    path('redefinir-senha/', redefinir_senha),
]

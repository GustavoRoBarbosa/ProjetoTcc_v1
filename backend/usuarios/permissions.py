"""Regras de "quem pode fazer o quê", reutilizáveis em qualquer view.

Centralizamos aqui porque a regra de negócio ("administrador sempre pode,
funcionário só se autorizado") vai valer tanto para gestão de usuários
quanto, mais pra frente, para o catálogo de peças — evita duplicar a
lógica em cada view/app novo.
"""

from rest_framework.permissions import BasePermission


class EhAdministrador(BasePermission):
    """Libera só para usuários com tipoUsu = 'adm'."""

    message = 'Apenas administradores podem realizar esta ação.'

    def has_permission(self, request, view):
        usuario = request.user
        return bool(
            getattr(usuario, 'is_authenticated', False)
            and usuario.tipoUsu == 'adm'
        )


class PodeGerenciarPecas(BasePermission):
    """Libera para administradores (sempre) ou funcionários com a
    permissão pode_gerenciar_pecas concedida por um administrador.

    Clientes nunca passam por aqui. Usada nas views de
    criar/editar/excluir peça do catálogo (etapa 4 do projeto).
    """

    message = 'Você não tem permissão para gerenciar o catálogo de peças.'

    def has_permission(self, request, view):
        usuario = request.user
        if not getattr(usuario, 'is_authenticated', False):
            return False
        if usuario.tipoUsu == 'adm':
            return True
        return usuario.tipoUsu == 'funcionario' and usuario.pode_gerenciar_pecas

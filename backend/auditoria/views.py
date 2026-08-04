from rest_framework import viewsets

from usuarios.permissions import EhAdministrador

from .models import LogAtividade
from .serializers import LogAtividadeSerializer


class LogAtividadeViewSet(viewsets.ReadOnlyModelViewSet):
    """Só leitura (list/retrieve) — o log é escrito internamente
    (auditoria.models.registrar), nunca via API, e só admin pode
    consultar. É a trilha de auditoria; se qualquer um pudesse editá-la
    pela API, ela deixaria de servir para o que foi criada.
    """

    queryset = LogAtividade.objects.select_related('usuario').all()
    serializer_class = LogAtividadeSerializer
    permission_classes = [EhAdministrador]

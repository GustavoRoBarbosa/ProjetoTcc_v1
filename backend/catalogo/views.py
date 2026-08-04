"""Views do catálogo, feitas como ViewSets do DRF.

Usamos ModelViewSet (em vez de @api_view função por função, como em
usuarios/views.py) porque aqui é CRUD "de livro-texto": listar, ver um,
criar, editar, excluir — sem regras de validação especiais como as do
cadastro de usuário. O ViewSet já gera as 5 operações a partir do
serializer + queryset, evitando repetir esse boilerplate 3 vezes
(categoria, fornecedor, peça).
"""

from auditoria.models import LogAtividade, registrar
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import PodeGerenciarPecas

from .models import Categoria, Fornecedor, Peca
from .serializers import CategoriaSerializer, FornecedorSerializer, PecaSerializer


class _CatalogoViewSet(viewsets.ModelViewSet):
    """Base comum a Categoria/Fornecedor/Peça:
    - qualquer usuário autenticado pode ler; só quem tem permissão de
      gerenciar peças (admin, ou funcionário autorizado) pode
      criar/editar/excluir — ver usuarios/permissions.py::PodeGerenciarPecas.
    - "excluir" é soft delete: marca ativo=False em vez de apagar a linha
      do banco (ver models.py::EntidadeCatalogo). Registros inativos
      somem da listagem porque get_queryset() já filtra ativo=True.
    - toda criação/edição/exclusão gera uma entrada em auditoria.LogAtividade.
    """

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [PodeGerenciarPecas()]

    def get_queryset(self):
        return super().get_queryset().filter(ativo=True)

    def _nome_modelo(self):
        return self.queryset.model.__name__

    def perform_create(self, serializer):
        instancia = serializer.save()
        registrar(
            usuario=self.request.user,
            acao=LogAtividade.ACAO_CRIAR,
            modelo=self._nome_modelo(),
            objeto_id=instancia.pk,
            descricao=str(instancia),
        )

    def perform_update(self, serializer):
        instancia = serializer.save()
        registrar(
            usuario=self.request.user,
            acao=LogAtividade.ACAO_EDITAR,
            modelo=self._nome_modelo(),
            objeto_id=instancia.pk,
            descricao=str(instancia),
        )

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.excluido_em = timezone.now()
        instance.save(update_fields=['ativo', 'excluido_em'])
        registrar(
            usuario=self.request.user,
            acao=LogAtividade.ACAO_EXCLUIR,
            modelo=self._nome_modelo(),
            objeto_id=instance.pk,
            descricao=str(instance),
        )


class CategoriaViewSet(_CatalogoViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class FornecedorViewSet(_CatalogoViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer


class PecaViewSet(_CatalogoViewSet):
    queryset = Peca.objects.select_related('categoria', 'fornecedor').all()
    serializer_class = PecaSerializer
    # MultiPartParser é o que permite receber o upload de imagem junto
    # com os outros campos do formulário (multipart/form-data).
    parser_classes = [MultiPartParser, FormParser]

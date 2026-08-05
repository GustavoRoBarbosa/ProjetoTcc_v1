from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaViewSet, FornecedorViewSet, PecaViewSet,
    detalhe_peca_publica, listar_pecas_publicas,
)

# DefaultRouter gera sozinho as rotas padrão de um ViewSet:
# GET/POST /pecas/, GET/PUT/PATCH/DELETE /pecas/<id>/ — mesma coisa para
# categorias e fornecedores. Evita escrever isso 3 vezes na mão.
router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')
router.register('fornecedores', FornecedorViewSet, basename='fornecedor')
router.register('pecas', PecaViewSet, basename='peca')

urlpatterns = router.urls + [
    # Vitrine pública, sem login — ver views.py
    path('loja/pecas/', listar_pecas_publicas),
    path('loja/pecas/<int:id_peca>/', detalhe_peca_publica),
]

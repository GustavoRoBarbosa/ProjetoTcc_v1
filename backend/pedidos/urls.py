from django.urls import path

from .views import adicionar_item, finalizar_pedido, item_carrinho, listar_pedidos, ver_carrinho

urlpatterns = [
    path('carrinho/', ver_carrinho),
    path('carrinho/itens/', adicionar_item),
    path('carrinho/itens/<int:id_item>/', item_carrinho),  # PATCH (quantidade) ou DELETE
    path('carrinho/finalizar/', finalizar_pedido),
    path('pedidos/', listar_pedidos),
]

from django.urls import path

from .views import (
    adicionar_item,
    cancelar_reserva,
    configuracoes,
    confirmar_pagamento,
    criar_encomenda,
    criar_sessao_checkout,
    item_carrinho,
    listar_encomendas,
    listar_pedidos,
    listar_reservas,
    minhas_encomendas,
    reservar_carrinho,
    validar_encomenda,
    ver_carrinho,
)

urlpatterns = [
    path('configuracoes/', configuracoes),  # GET qualquer logado, PATCH só admin
    path('carrinho/', ver_carrinho),
    path('carrinho/itens/', adicionar_item),
    path('carrinho/itens/<int:id_item>/', item_carrinho),  # PATCH (quantidade) ou DELETE
    path('carrinho/checkout/', criar_sessao_checkout),  # POST cria a sessão do Stripe Checkout
    path('carrinho/confirmar-pagamento/', confirmar_pagamento),  # POST confirma e finaliza o pedido
    path('carrinho/reservar/', reservar_carrinho),  # POST reserva os itens do carrinho (RF06)
    path('pedidos/', listar_pedidos),
    path('reservas/', listar_reservas),  # GET equipe vê as reservas ativas
    path('reservas/<int:id_pedido>/cancelar/', cancelar_reserva),  # PATCH equipe cancela e devolve ao estoque
    path('encomendas/', criar_encomenda),  # POST cliente cria
    path('encomendas/minhas/', minhas_encomendas),  # GET cliente vê status das próprias
    path('encomendas/pendentes/', listar_encomendas),  # GET equipe vê a fila
    path('encomendas/<int:id_encomenda>/validar/', validar_encomenda),  # PATCH equipe aprova/recusa
]

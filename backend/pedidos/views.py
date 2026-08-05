"""Carrinho de compras e pedidos.

Todo endpoint aqui exige login (IsAuthenticated é o padrão global do
projeto — ver settings.REST_FRAMEWORK) porque um carrinho só existe
vinculado a um usuário (ver models.py::Carrinho). Um visitante sem conta
que tenta "comprar" na vitrine é mandado pro login antes de chegar aqui
(ver frontend/src/pages/LojaProduto.jsx).
"""

from auditoria.models import LogAtividade, registrar
from catalogo.models import Peca
from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Carrinho, ItemCarrinho, ItemPedido, Pedido
from .serializers import CarrinhoSerializer, PedidoSerializer


def _obter_carrinho(usuario):
    carrinho, _ = Carrinho.objects.get_or_create(usuario=usuario)
    return carrinho


@api_view(['GET'])
def ver_carrinho(request):
    carrinho = _obter_carrinho(request.user)
    return Response(CarrinhoSerializer(carrinho, context={'request': request}).data)


@api_view(['POST'])
def adicionar_item(request):
    """Recebe {'peca_id': ..., 'quantidade': ...}. Se a peça já está no
    carrinho, soma na quantidade existente em vez de duplicar linha
    (garantido pelo unique_together do model + get_or_create aqui).
    """

    peca_id = request.data.get('peca_id')
    quantidade = int(request.data.get('quantidade', 1))

    if quantidade < 1:
        return Response({'success': False, 'message': 'Quantidade inválida'})

    try:
        peca = Peca.objects.get(pk=peca_id, ativo=True)
    except Peca.DoesNotExist:
        return Response({'success': False, 'message': 'Peça não encontrada'})

    carrinho = _obter_carrinho(request.user)
    item, criado = ItemCarrinho.objects.get_or_create(
        carrinho=carrinho, peca=peca, defaults={'quantidade': quantidade}
    )
    if not criado:
        item.quantidade += quantidade

    if item.quantidade > peca.quantidade_estoque:
        return Response({
            'success': False,
            'message': f'Só temos {peca.quantidade_estoque} unidade(s) de "{peca.nome}" em estoque'
        })

    item.save()

    return Response({'success': True, 'carrinho': CarrinhoSerializer(carrinho, context={'request': request}).data})


@api_view(['PATCH', 'DELETE'])
def item_carrinho(request, id_item):
    """Uma linha do carrinho: PATCH muda a quantidade (0 ou negativa
    remove o item — evita precisar de dois endpoints diferentes só pra
    "diminuir até sumir"), DELETE remove direto. Mesma rota pros dois
    métodos porque os dois agem sobre "este item específico".
    """

    try:
        item = ItemCarrinho.objects.get(pk=id_item, carrinho__usuario=request.user)
    except ItemCarrinho.DoesNotExist:
        return Response({'success': False, 'message': 'Item não encontrado no seu carrinho'})

    if request.method == 'DELETE':
        item.delete()
    else:
        quantidade = int(request.data.get('quantidade', 0))

        if quantidade <= 0:
            item.delete()
        else:
            if quantidade > item.peca.quantidade_estoque:
                return Response({
                    'success': False,
                    'message': f'Só temos {item.peca.quantidade_estoque} unidade(s) em estoque'
                })
            item.quantidade = quantidade
            item.save()

    carrinho = _obter_carrinho(request.user)
    return Response({'success': True, 'carrinho': CarrinhoSerializer(carrinho, context={'request': request}).data})


@api_view(['POST'])
def finalizar_pedido(request):
    """Fecha o carrinho: cria o Pedido + ItemPedido (com o "retrato" do
    preço/nome de cada peça no momento da compra — ver
    models.py::ItemPedido), abate do estoque, e esvazia o carrinho.

    Tudo dentro de uma transação: se alguma peça não tiver mais estoque
    suficiente (pode ter mudado desde que foi posta no carrinho), a
    operação inteira é desfeita — não faz sentido finalizar "só metade"
    de um pedido.
    """

    carrinho = _obter_carrinho(request.user)
    itens = list(carrinho.itens.select_related('peca').all())

    if not itens:
        return Response({'success': False, 'message': 'Seu carrinho está vazio'})

    for item in itens:
        if item.quantidade > item.peca.quantidade_estoque:
            return Response({
                'success': False,
                'message': f'"{item.peca.nome}" não tem mais estoque suficiente '
                           f'(disponível: {item.peca.quantidade_estoque})'
            })

    with transaction.atomic():
        total = sum((item.peca.preco * item.quantidade for item in itens), 0)
        pedido = Pedido.objects.create(usuario=request.user, total=total)

        for item in itens:
            ItemPedido.objects.create(
                pedido=pedido,
                peca=item.peca,
                peca_nome=item.peca.nome,
                preco_unitario=item.peca.preco,
                quantidade=item.quantidade,
            )
            item.peca.quantidade_estoque -= item.quantidade
            item.peca.save(update_fields=['quantidade_estoque'])

        carrinho.itens.all().delete()

    registrar(
        usuario=request.user,
        acao=LogAtividade.ACAO_CRIAR,
        modelo='Pedido',
        objeto_id=pedido.pk,
        descricao=f'Finalizou pedido #{pedido.pk} — R$ {total}',
    )

    return Response({'success': True, 'pedido': PedidoSerializer(pedido).data})


@api_view(['GET'])
def listar_pedidos(request):
    """Histórico de compras do usuário logado — alimenta
    frontend/src/pages/HistoricoCompras.jsx.
    """
    pedidos = Pedido.objects.filter(usuario=request.user).prefetch_related('itens')
    return Response(PedidoSerializer(pedidos, many=True).data)

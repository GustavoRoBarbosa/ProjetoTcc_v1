from rest_framework import serializers

from .models import Carrinho, ItemCarrinho, ItemPedido, Pedido


class ItemCarrinhoSerializer(serializers.ModelSerializer):
    peca_nome = serializers.CharField(source='peca.nome', read_only=True)
    peca_imagem = serializers.ImageField(source='peca.imagem', read_only=True)
    preco_unitario = serializers.DecimalField(source='peca.preco', max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemCarrinho
        fields = ['id', 'peca', 'peca_nome', 'peca_imagem', 'preco_unitario', 'quantidade', 'subtotal']

    def get_subtotal(self, item):
        return item.peca.preco * item.quantidade


class CarrinhoSerializer(serializers.ModelSerializer):
    itens = ItemCarrinhoSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Carrinho
        fields = ['id', 'itens', 'total']

    def get_total(self, carrinho):
        return sum((item.peca.preco * item.quantidade for item in carrinho.itens.all()), 0)


class ItemPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPedido
        fields = ['id', 'peca', 'peca_nome', 'preco_unitario', 'quantidade']


class PedidoSerializer(serializers.ModelSerializer):
    itens = ItemPedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = ['id', 'status', 'total', 'criado_em', 'itens']

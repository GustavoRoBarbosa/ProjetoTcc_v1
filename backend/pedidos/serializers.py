from rest_framework import serializers

from .models import Carrinho, ConfiguracaoSistema, Encomenda, ItemCarrinho, ItemPedido, Pedido


class ConfiguracaoSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = ['reserva_habilitada']


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
    # Só usado pela tela de reservas da equipe (listar_reservas) — o
    # histórico do próprio cliente (listar_pedidos) já sabe de quem é.
    usuario_nome = serializers.CharField(source='usuario.nomUsu', read_only=True, default=None)

    class Meta:
        model = Pedido
        fields = ['id', 'status', 'total', 'criado_em', 'itens', 'usuario_nome']


class EncomendaSerializer(serializers.ModelSerializer):
    peca_nome = serializers.CharField(source='peca.nome', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nomUsu', read_only=True)
    respondido_por_nome = serializers.CharField(source='respondido_por.nomUsu', read_only=True, default=None)

    class Meta:
        model = Encomenda
        fields = [
            'id', 'peca', 'peca_nome', 'cliente_nome', 'quantidade', 'status',
            'criado_em', 'respondido_em', 'respondido_por_nome',
        ]
        read_only_fields = ['status', 'criado_em', 'respondido_em']

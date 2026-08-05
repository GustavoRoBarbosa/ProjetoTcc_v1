from django.db import models

from catalogo.models import Peca
from usuarios.models import Usuario


class Carrinho(models.Model):
    """Um carrinho por usuário — criado na hora (get_or_create) quando ele
    adiciona o primeiro item, não no cadastro. `OneToOneField` porque não
    faz sentido um usuário ter dois carrinhos abertos ao mesmo tempo.
    """

    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='carrinho')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carrinhos'

    def __str__(self):
        return f'Carrinho de {self.usuario.nomUsu}'


class ItemCarrinho(models.Model):
    """Uma linha do carrinho: peça + quantidade. `unique_together` evita
    duas linhas pra mesma peça no mesmo carrinho — adicionar de novo uma
    peça já no carrinho soma na quantidade existente em vez de duplicar
    (ver pedidos/views.py::adicionar_item).
    """

    carrinho = models.ForeignKey(Carrinho, on_delete=models.CASCADE, related_name='itens')
    peca = models.ForeignKey(Peca, on_delete=models.CASCADE)
    quantidade = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'itens_carrinho'
        unique_together = ('carrinho', 'peca')

    def __str__(self):
        return f'{self.quantidade}x {self.peca.nome}'


class Pedido(models.Model):
    """Um pedido finalizado — nasce quando o carrinho é "fechado"
    (ver views.py::finalizar_pedido). Não existe pagamento de verdade
    integrado (sem gateway), então todo pedido criado já nasce como se
    tivesse sido pago; `status` existe pra já deixar o modelo pronto pra
    esse fluxo mudar no futuro sem precisar alterar o schema de novo.
    """

    STATUS_CONCLUIDO = 'concluido'
    STATUS_CANCELADO = 'cancelado'
    STATUS = (
        (STATUS_CONCLUIDO, 'Concluído'),
        (STATUS_CANCELADO, 'Cancelado'),
    )

    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='pedidos')
    status = models.CharField(max_length=20, choices=STATUS, default=STATUS_CONCLUIDO)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pedidos'
        ordering = ['-criado_em']

    def __str__(self):
        return f'Pedido #{self.pk} — {self.usuario.nomUsu if self.usuario else "(usuário removido)"}'


class ItemPedido(models.Model):
    """Uma linha de um pedido já finalizado.

    `peca_nome`/`preco_unitario` são um "retrato" da peça no momento da
    compra — não lê mais o preço/nome atual da Peca. Sem isso, se o
    preço de uma peça mudar depois (ou a peça for editada/excluída), o
    histórico de compras do cliente mudaria retroativamente junto, o que
    não faz sentido: o cliente pagou o preço de quando comprou.
    """

    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='itens')
    peca = models.ForeignKey(Peca, on_delete=models.SET_NULL, null=True)
    peca_nome = models.CharField(max_length=150)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    quantidade = models.PositiveIntegerField()

    class Meta:
        db_table = 'itens_pedido'

    def __str__(self):
        return f'{self.quantidade}x {self.peca_nome}'

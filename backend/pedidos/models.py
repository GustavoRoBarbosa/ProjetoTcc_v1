from django.db import models

from catalogo.models import Peca
from usuarios.models import Usuario


class ConfiguracaoSistema(models.Model):
    """Configurações do sistema que um admin pode ligar/desligar sem
    precisar mexer em código — hoje só a Reserva (RF06), mas o modelo já
    fica pronto pra outros toggles futuros. É um "singleton": sempre
    existe (no máximo) uma linha, acessada via `ConfiguracaoSistema.obter()`
    em vez de uma query direta — não precisa se preocupar com a tabela
    estar vazia na primeira vez que o sistema roda.
    """

    reserva_habilitada = models.BooleanField(default=True)

    class Meta:
        db_table = 'configuracao_sistema'

    def __str__(self):
        return 'Configurações do sistema'

    @classmethod
    def obter(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


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
    # Preenchido só quando o item veio do botão "Comprar agora" de uma
    # encomenda aprovada (ver HistoricoCompras.jsx) — é o que permite
    # marcar a Encomenda como "concluída" quando o pagamento é confirmado
    # (ver views.py::_criar_pedido_do_carrinho), em vez de ela ficar presa
    # em "aprovada" pra sempre depois de comprada.
    encomenda = models.ForeignKey(
        'Encomenda', on_delete=models.SET_NULL, null=True, blank=True, related_name='itens_carrinho'
    )

    class Meta:
        db_table = 'itens_carrinho'
        unique_together = ('carrinho', 'peca')

    def __str__(self):
        return f'{self.quantidade}x {self.peca.nome}'


class Pedido(models.Model):
    """Um pedido — nasce **concluído** quando o pagamento do carrinho é
    confirmado pelo Stripe Checkout (ver views.py::confirmar_pagamento),
    ou nasce **reservado** quando o cliente separa uma peça em estoque
    sem pagar ainda (RF06, ver views.py::reservar_carrinho) — pagamento
    e retirada acontecem depois, presencialmente. O pagamento simulado
    (chaves de teste do Stripe, sem dinheiro de verdade circulando — ver
    known-issues.md) só existe pro fluxo de compra, não pro de reserva.
    """

    STATUS_CONCLUIDO = 'concluido'
    STATUS_CANCELADO = 'cancelado'
    STATUS_RESERVADO = 'reservado'
    STATUS = (
        (STATUS_CONCLUIDO, 'Concluído'),
        (STATUS_CANCELADO, 'Cancelado'),
        (STATUS_RESERVADO, 'Reservado'),
    )

    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='pedidos')
    status = models.CharField(max_length=20, choices=STATUS, default=STATUS_CONCLUIDO)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    criado_em = models.DateTimeField(auto_now_add=True)
    stripe_session_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

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
    # Rastro de qual encomenda esse item concluiu (se veio de "Comprar
    # agora" numa encomenda aprovada) — sobrevive mesmo depois do
    # ItemCarrinho original ser apagado ao esvaziar o carrinho.
    encomenda = models.ForeignKey(
        'Encomenda', on_delete=models.SET_NULL, null=True, blank=True, related_name='itens_pedido'
    )

    class Meta:
        db_table = 'itens_pedido'

    def __str__(self):
        return f'{self.quantidade}x {self.peca_nome}'


class Encomenda(models.Model):
    """Pedido de encomenda de uma peça sem estoque (RF07).

    Diferente de comprar/reservar: encomenda só faz sentido quando
    `peca.quantidade_estoque == 0` (ver views.py::criar_encomenda) — se
    houvesse estoque, o cliente compraria direto. Precisa ser validada
    por um funcionário antes de ser confirmada (RF08), por isso nasce
    sempre `pendente` e só um funcionário/admin altera esse status.
    """

    STATUS_PENDENTE = 'pendente'
    STATUS_APROVADA = 'aprovada'
    STATUS_RECUSADA = 'recusada'
    STATUS_CONCLUIDA = 'concluida'
    STATUS = (
        (STATUS_PENDENTE, 'Pendente'),
        (STATUS_APROVADA, 'Aprovada'),
        (STATUS_RECUSADA, 'Recusada'),
        (STATUS_CONCLUIDA, 'Concluída'),
    )

    cliente = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='encomendas')
    peca = models.ForeignKey(Peca, on_delete=models.CASCADE, related_name='encomendas')
    quantidade = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=10, choices=STATUS, default=STATUS_PENDENTE)
    criado_em = models.DateTimeField(auto_now_add=True)
    respondido_em = models.DateTimeField(null=True, blank=True)
    respondido_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='encomendas_respondidas'
    )

    class Meta:
        db_table = 'encomendas'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.quantidade}x {self.peca.nome} — {self.cliente.nomUsu} ({self.status})'

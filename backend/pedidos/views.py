"""Carrinho de compras e pedidos.

Todo endpoint aqui exige login (IsAuthenticated é o padrão global do
projeto — ver settings.REST_FRAMEWORK) porque um carrinho só existe
vinculado a um usuário (ver models.py::Carrinho). Um visitante sem conta
que tenta "comprar" na vitrine é mandado pro login antes de chegar aqui
(ver frontend/src/pages/LojaProduto.jsx).
"""

import logging

import stripe
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

from auditoria.models import LogAtividade, registrar
from catalogo.models import Peca
from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from usuarios.permissions import EhAdministrador, PodeGerenciarPecas

from .models import Carrinho, ConfiguracaoSistema, Encomenda, ItemCarrinho, ItemPedido, Pedido
from .serializers import CarrinhoSerializer, ConfiguracaoSistemaSerializer, EncomendaSerializer, PedidoSerializer


def _obter_carrinho(usuario):
    carrinho, _ = Carrinho.objects.get_or_create(usuario=usuario)
    return carrinho


@api_view(['GET'])
def ver_carrinho(request):
    carrinho = _obter_carrinho(request.user)
    return Response(CarrinhoSerializer(carrinho, context={'request': request}).data)


@api_view(['POST'])
def adicionar_item(request):
    """Recebe {'peca_id': ..., 'quantidade': ..., 'encomenda_id': ...}
    (`encomenda_id` é opcional). Se a peça já está no carrinho, soma na
    quantidade existente em vez de duplicar linha (garantido pelo
    unique_together do model + get_or_create aqui).
    """

    peca_id = request.data.get('peca_id')
    quantidade = int(request.data.get('quantidade', 1))
    encomenda_id = request.data.get('encomenda_id')

    if quantidade < 1:
        return Response({'success': False, 'message': 'Quantidade inválida'})

    try:
        peca = Peca.objects.get(pk=peca_id, ativo=True)
    except Peca.DoesNotExist:
        return Response({'success': False, 'message': 'Peça não encontrada'})

    # Vem do botão "Comprar agora" de uma encomenda já aprovada (ver
    # HistoricoCompras.jsx) — guardamos o vínculo no item do carrinho pra
    # poder marcar a encomenda como "concluída" quando o pagamento for
    # confirmado (ver _criar_pedido_do_carrinho). Só aceita encomenda do
    # próprio usuário e já aprovada — não dá pra "concluir" uma pendente.
    encomenda = None
    if encomenda_id:
        try:
            encomenda = Encomenda.objects.get(
                pk=encomenda_id, cliente=request.user, status=Encomenda.STATUS_APROVADA
            )
        except Encomenda.DoesNotExist:
            return Response({'success': False, 'message': 'Encomenda não encontrada ou não está aprovada'})

    carrinho = _obter_carrinho(request.user)
    item, criado = ItemCarrinho.objects.get_or_create(
        carrinho=carrinho, peca=peca, defaults={'quantidade': quantidade, 'encomenda': encomenda}
    )
    if not criado:
        item.quantidade += quantidade
        if encomenda:
            item.encomenda = encomenda

    if item.quantidade > peca.quantidade_estoque and not encomenda:
        # Pediu mais do que existe em estoque — em vez de simplesmente
        # recusar, compra o que der (se houver) e encomenda o restante
        # automaticamente (RF07), pra o cliente não precisar repetir a
        # operação manualmente em duas telas diferentes. Não se aplica ao
        # fluxo "Comprar agora" de uma encomenda já aprovada (`encomenda`
        # preenchido) — ali a quantidade já foi validada na aprovação.
        excedente = item.quantidade - peca.quantidade_estoque
        item.quantidade = peca.quantidade_estoque

        if item.quantidade == 0 and criado:
            item.delete()
        else:
            item.save()

        nova_encomenda = Encomenda.objects.create(cliente=request.user, peca=peca, quantidade=excedente)
        registrar(
            usuario=request.user,
            acao=LogAtividade.ACAO_CRIAR,
            modelo='Encomenda',
            objeto_id=nova_encomenda.pk,
            descricao=f'Encomendou {excedente}x "{peca.nome}" (excedente automático do carrinho)',
        )

        if item.quantidade > 0:
            mensagem = (
                f'{item.quantidade} unidade(s) de "{peca.nome}" adicionada(s) ao carrinho e '
                f'{excedente} unidade(s) encomendada(s) (aguardando aprovação da equipe).'
            )
        else:
            mensagem = (
                f'"{peca.nome}" está sem estoque — encomendamos {excedente} unidade(s) '
                f'(aguardando aprovação da equipe).'
            )

        return Response({
            'success': True,
            'carrinho': CarrinhoSerializer(carrinho, context={'request': request}).data,
            'encomenda_criada': EncomendaSerializer(nova_encomenda).data,
            'message': mensagem,
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


def _criar_pedido_do_carrinho(usuario, stripe_session_id=None, status=Pedido.STATUS_CONCLUIDO):
    """Fecha o carrinho: cria o Pedido + ItemPedido (com o "retrato" do
    preço/nome de cada peça no momento da compra — ver
    models.py::ItemPedido), abate do estoque, e esvazia o carrinho.

    Tudo dentro de uma transação: se alguma peça não tiver mais estoque
    suficiente (pode ter mudado desde que foi posta no carrinho), a
    operação inteira é desfeita — não faz sentido finalizar "só metade"
    de um pedido. Compartilhado por:
    - `confirmar_pagamento` (compra via Stripe Checkout) — `status` fica
      no default `concluido` e `stripe_session_id` vem preenchido (o
      `unique=True` do campo é o que garante que a mesma sessão paga não
      gera dois pedidos se o cliente recarregar a página de sucesso).
    - `reservar_carrinho` (RF06) — `status='reservado'`,
      `stripe_session_id=None` (reserva não passa pelo Stripe; o
      pagamento acontece depois, presencialmente).

    Retorna (pedido, erro) — só um dos dois é preenchido.
    """

    carrinho = _obter_carrinho(usuario)
    itens = list(carrinho.itens.select_related('peca', 'encomenda').all())

    if not itens:
        return None, 'Seu carrinho está vazio'

    for item in itens:
        if item.quantidade > item.peca.quantidade_estoque:
            return None, (
                f'"{item.peca.nome}" não tem mais estoque suficiente '
                f'(disponível: {item.peca.quantidade_estoque})'
            )

    with transaction.atomic():
        total = sum((item.peca.preco * item.quantidade for item in itens), 0)
        pedido = Pedido.objects.create(
            usuario=usuario, total=total, status=status, stripe_session_id=stripe_session_id
        )

        for item in itens:
            ItemPedido.objects.create(
                pedido=pedido,
                peca=item.peca,
                peca_nome=item.peca.nome,
                preco_unitario=item.peca.preco,
                quantidade=item.quantidade,
                encomenda=item.encomenda,
            )
            item.peca.quantidade_estoque -= item.quantidade
            item.peca.save(update_fields=['quantidade_estoque'])

            # Item veio do botão "Comprar agora" de uma encomenda aprovada
            # (ver adicionar_item) — agora que o pagamento foi confirmado,
            # a encomenda deixa de ficar "presa" em aprovada pra sempre.
            if item.encomenda and item.encomenda.status == Encomenda.STATUS_APROVADA:
                item.encomenda.status = Encomenda.STATUS_CONCLUIDA
                item.encomenda.save(update_fields=['status'])

        carrinho.itens.all().delete()

    verbo = 'Reservou' if status == Pedido.STATUS_RESERVADO else 'Finalizou'
    registrar(
        usuario=usuario,
        acao=LogAtividade.ACAO_CRIAR,
        modelo='Pedido',
        objeto_id=pedido.pk,
        descricao=f'{verbo} pedido #{pedido.pk} — R$ {total}',
    )

    return pedido, None


@api_view(['POST'])
def criar_sessao_checkout(request):
    """Cria uma sessão do Stripe Checkout (página hospedada pelo próprio
    Stripe) pros itens do carrinho, e devolve a URL pra onde o frontend
    deve redirecionar o navegador. O pagamento em si é simulado — usamos
    as chaves de teste do Stripe (ver settings.STRIPE_SECRET_KEY e
    known-issues.md) — mas o fluxo de checkout é o mesmo de produção.

    Não decrementa estoque nem cria o Pedido aqui — isso só acontece
    depois do Stripe confirmar o pagamento (ver confirmar_pagamento
    abaixo). Validamos o estoque aqui só pra dar feedback rápido antes
    de mandar o cliente pro Stripe.
    """

    if not settings.STRIPE_SECRET_KEY:
        return Response({
            'success': False,
            'message': 'Pagamento indisponível: STRIPE_SECRET_KEY não configurada no servidor.',
        })

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

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        sessao = stripe.checkout.Session.create(
            mode='payment',
            payment_method_types=['card'],
            customer_email=request.user.emailUsu,
            line_items=[
                {
                    'price_data': {
                        'currency': 'brl',
                        'product_data': {'name': item.peca.nome},
                        # Stripe trabalha em centavos — Decimal * 100 e
                        # int() evita erro de arredondamento de float.
                        'unit_amount': int(item.peca.preco * 100),
                    },
                    'quantity': item.quantidade,
                }
                for item in itens
            ],
            success_url=f'{settings.FRONTEND_URL}/pagamento-sucesso?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{settings.FRONTEND_URL}/carrinho',
            metadata={'usuario_id': request.user.pk},
        )
    except stripe.StripeError as error:
        return Response({'success': False, 'message': f'Erro ao iniciar pagamento: {error}'})

    return Response({'success': True, 'url': sessao.url})


@api_view(['POST'])
def confirmar_pagamento(request):
    """Chamado pela página de sucesso do checkout (ver
    frontend/src/pages/PagamentoSucesso.jsx) com o `session_id` que o
    Stripe devolveu na URL de retorno. Busca a sessão direto na API do
    Stripe (nunca confia em dado vindo só da URL do navegador) e só
    finaliza o pedido se o Stripe confirmar `payment_status == 'paid'`.

    Idempotente: se o cliente atualizar a página de sucesso, a segunda
    chamada encontra o Pedido já criado (stripe_session_id é único) e
    devolve ele em vez de tentar cobrar/descontar estoque de novo.
    """

    if not settings.STRIPE_SECRET_KEY:
        return Response({'success': False, 'message': 'Pagamento indisponível: Stripe não configurado.'})

    session_id = request.data.get('session_id')
    if not session_id:
        return Response({'success': False, 'message': 'session_id ausente'})

    # Qualquer coisa inesperada aqui (timeout de rede até o Stripe,
    # atributo faltando numa resposta diferente do esperado etc.) virava
    # um 500 cru — o axios do frontend trata isso como falha genérica
    # ("erro ao confirmar com o servidor") sem detalhe nenhum. Logamos o
    # traceback completo (aparece no terminal do runserver) e devolvemos
    # uma mensagem amigável em vez de deixar vazar um erro 500 sem contexto.
    try:
        pedido_existente = Pedido.objects.filter(stripe_session_id=session_id).first()
        if pedido_existente:
            return Response({'success': True, 'pedido': PedidoSerializer(pedido_existente).data})

        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            sessao = stripe.checkout.Session.retrieve(session_id)
        except stripe.StripeError as error:
            return Response({'success': False, 'message': f'Sessão de pagamento inválida: {error}'})

        # A partir do stripe-python 15.x, `StripeObject` (incluindo
        # `.metadata`) não é mais um dict de verdade — chamar .get() nele
        # direto quebra com AttributeError. `.to_dict()` converte pra um
        # dict Python normal antes de consultar a chave.
        metadata = sessao.metadata.to_dict() if sessao.metadata else {}
        if str(metadata.get('usuario_id')) != str(request.user.pk):
            return Response({'success': False, 'message': 'Esta sessão de pagamento não pertence a este usuário.'})

        if sessao.payment_status != 'paid':
            return Response({'success': False, 'message': 'Pagamento ainda não confirmado pelo Stripe.'})

        try:
            pedido, erro = _criar_pedido_do_carrinho(request.user, stripe_session_id=session_id)
        except IntegrityError:
            # Duas chamadas pra este endpoint quase ao mesmo tempo pro
            # mesmo session_id (ex: o useEffect de PagamentoSucesso.jsx
            # disparando duas vezes em StrictMode) — a primeira já criou
            # o Pedido, e o `unique=True` de stripe_session_id barrou esta
            # segunda tentativa de criar de novo. Não é um erro de
            # verdade: só buscamos o pedido que a outra chamada acabou de
            # criar e devolvemos ele, em vez de propagar a exceção.
            pedido = Pedido.objects.filter(stripe_session_id=session_id).first()
            erro = None if pedido else 'Erro ao registrar o pedido (tente atualizar a página).'

        if erro:
            return Response({'success': False, 'message': erro})

        return Response({'success': True, 'pedido': PedidoSerializer(pedido).data})
    except Exception:
        logger.exception('Erro inesperado ao confirmar pagamento (session_id=%s)', session_id)
        return Response({
            'success': False,
            'message': 'Erro inesperado ao confirmar o pagamento. Veja o terminal do backend para detalhes.',
        })


@api_view(['GET'])
def listar_pedidos(request):
    """Histórico de compras do usuário logado — alimenta
    frontend/src/pages/HistoricoCompras.jsx.
    """
    pedidos = Pedido.objects.filter(usuario=request.user).prefetch_related('itens')
    return Response(PedidoSerializer(pedidos, many=True).data)


@api_view(['GET', 'PATCH'])
def configuracoes(request):
    """GET: qualquer usuário logado consulta as configurações do sistema
    (hoje só `reserva_habilitada`) — o frontend usa isso pra decidir se
    mostra o botão "Reservar" no carrinho. PATCH: só admin altera (ver
    `EhAdministrador`), pra poder ligar/desligar a feature a qualquer
    momento sem precisar mexer em código.
    """

    config = ConfiguracaoSistema.obter()

    if request.method == 'GET':
        return Response(ConfiguracaoSistemaSerializer(config).data)

    if not EhAdministrador().has_permission(request, None):
        return Response(
            {'success': False, 'message': 'Apenas administradores podem alterar as configurações.'},
            status=403,
        )

    if 'reserva_habilitada' in request.data:
        config.reserva_habilitada = bool(request.data['reserva_habilitada'])
        config.save(update_fields=['reserva_habilitada'])

        registrar(
            usuario=request.user,
            acao=LogAtividade.ACAO_EDITAR,
            modelo='ConfiguracaoSistema',
            objeto_id=config.pk,
            descricao=f'{"Ativou" if config.reserva_habilitada else "Desativou"} a funcionalidade de reserva',
        )

    return Response({'success': True, **ConfiguracaoSistemaSerializer(config).data})


@api_view(['POST'])
def reservar_carrinho(request):
    """Reserva os itens do carrinho (RF06) em vez de comprá-los — separa
    a peça em estoque pro cliente sem pagar agora (retirada e pagamento
    acontecem depois, presencialmente). Sem prazo de expiração (decisão
    de escopo do TCC — ver known-issues.md); só um funcionário/admin
    cancela manualmente pra liberar o estoque de novo (ver
    cancelar_reserva abaixo).

    Um admin pode desligar essa funcionalidade inteira a qualquer momento
    (`PATCH /api/configuracoes/ {'reserva_habilitada': false}`) — checado
    aqui, não só escondido no frontend, pra não dar pra contornar
    chamando a API direto.

    Mesmas validações de estoque de um checkout normal — reutiliza
    `_criar_pedido_do_carrinho`, só troca o `status` final.
    """

    if not ConfiguracaoSistema.obter().reserva_habilitada:
        return Response({'success': False, 'message': 'A reserva está desativada no momento.'})

    pedido, erro = _criar_pedido_do_carrinho(request.user, status=Pedido.STATUS_RESERVADO)
    if erro:
        return Response({'success': False, 'message': erro})

    return Response({'success': True, 'pedido': PedidoSerializer(pedido).data})


@api_view(['GET'])
@permission_classes([PodeGerenciarPecas])
def listar_reservas(request):
    """Reservas ativas de todos os clientes (RF06) — pra equipe conseguir
    ver o que está separado e cancelar manualmente se precisar liberar o
    estoque (não há prazo de expiração automática).
    """
    reservas = Pedido.objects.filter(status=Pedido.STATUS_RESERVADO).select_related('usuario').prefetch_related('itens')
    return Response(PedidoSerializer(reservas, many=True).data)


@api_view(['PATCH'])
@permission_classes([PodeGerenciarPecas])
def cancelar_reserva(request, id_pedido):
    """Cancela uma reserva (RF06) e devolve a quantidade reservada de
    cada item ao estoque — a única forma de liberar uma reserva sem
    prazo automático de expiração.
    """

    try:
        pedido = Pedido.objects.get(pk=id_pedido, status=Pedido.STATUS_RESERVADO)
    except Pedido.DoesNotExist:
        return Response({'success': False, 'message': 'Reserva não encontrada ou já finalizada/cancelada'})

    with transaction.atomic():
        for item in pedido.itens.select_related('peca').all():
            if item.peca:
                item.peca.quantidade_estoque += item.quantidade
                item.peca.save(update_fields=['quantidade_estoque'])

        pedido.status = Pedido.STATUS_CANCELADO
        pedido.save(update_fields=['status'])

    registrar(
        usuario=request.user,
        acao=LogAtividade.ACAO_EDITAR,
        modelo='Pedido',
        objeto_id=pedido.pk,
        descricao=f'Cancelou reserva #{pedido.pk} e devolveu os itens ao estoque',
    )

    return Response({'success': True, 'pedido': PedidoSerializer(pedido).data})


@api_view(['POST'])
def criar_encomenda(request):
    """Cliente pede uma peça sem estoque (RF07). Só faz sentido encomendar
    quando `quantidade_estoque == 0` — se houvesse estoque, o fluxo certo
    é comprar direto (ver Loja/LojaProduto.jsx).
    """

    peca_id = request.data.get('peca_id')
    quantidade = int(request.data.get('quantidade', 1))

    if quantidade < 1:
        return Response({'success': False, 'message': 'Quantidade inválida'})

    try:
        peca = Peca.objects.get(pk=peca_id, ativo=True)
    except Peca.DoesNotExist:
        return Response({'success': False, 'message': 'Peça não encontrada'})

    if peca.quantidade_estoque > 0:
        return Response({
            'success': False,
            'message': 'Esta peça está disponível em estoque — compre direto em vez de encomendar.',
        })

    encomenda = Encomenda.objects.create(cliente=request.user, peca=peca, quantidade=quantidade)

    registrar(
        usuario=request.user,
        acao=LogAtividade.ACAO_CRIAR,
        modelo='Encomenda',
        objeto_id=encomenda.pk,
        descricao=f'Encomendou {quantidade}x "{peca.nome}"',
    )

    return Response({'success': True, 'encomenda': EncomendaSerializer(encomenda).data})


@api_view(['GET'])
def minhas_encomendas(request):
    """Status das encomendas do cliente logado — alimenta
    frontend/src/pages/HistoricoCompras.jsx.
    """
    encomendas = Encomenda.objects.filter(cliente=request.user).select_related('peca', 'respondido_por')
    return Response(EncomendaSerializer(encomendas, many=True).data)


@api_view(['GET'])
@permission_classes([PodeGerenciarPecas])
def listar_encomendas(request):
    """Fila de validação da equipe (RF08) — por padrão só as pendentes,
    pra não misturar com o histórico já resolvido na mesma tela.
    """
    encomendas = Encomenda.objects.filter(status=Encomenda.STATUS_PENDENTE).select_related('peca', 'cliente')
    return Response(EncomendaSerializer(encomendas, many=True).data)


@api_view(['PATCH'])
@permission_classes([PodeGerenciarPecas])
def validar_encomenda(request, id_encomenda):
    """Aprova ou recusa uma encomenda pendente. Recebe
    {'status': 'aprovada' | 'recusada'}.
    """

    try:
        encomenda = Encomenda.objects.get(pk=id_encomenda, status=Encomenda.STATUS_PENDENTE)
    except Encomenda.DoesNotExist:
        return Response({'success': False, 'message': 'Encomenda não encontrada ou já validada'})

    novo_status = request.data.get('status')
    if novo_status not in (Encomenda.STATUS_APROVADA, Encomenda.STATUS_RECUSADA):
        return Response({'success': False, 'message': 'Status inválido'})

    encomenda.status = novo_status
    encomenda.respondido_em = timezone.now()
    encomenda.respondido_por = request.user

    if novo_status == Encomenda.STATUS_APROVADA:
        # Aprovar representa "a peça foi providenciada/chegou" — soma a
        # quantidade encomendada ao estoque pra que o cliente consiga de
        # fato comprá-la em seguida (ver frontend/src/pages/HistoricoCompras.jsx,
        # botão "Comprar agora").
        encomenda.peca.quantidade_estoque += encomenda.quantidade
        encomenda.peca.save(update_fields=['quantidade_estoque'])

    encomenda.save()

    registrar(
        usuario=request.user,
        acao=LogAtividade.ACAO_EDITAR,
        modelo='Encomenda',
        objeto_id=encomenda.pk,
        descricao=f'{"Aprovou" if novo_status == Encomenda.STATUS_APROVADA else "Recusou"} '
                  f'encomenda #{encomenda.pk} ({encomenda.peca.nome})',
    )

    return Response({'success': True, 'encomenda': EncomendaSerializer(encomenda).data})

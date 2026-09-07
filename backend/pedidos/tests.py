from django.test import TestCase
from .models import Pedido, ItemPedido

class ItemPedidoModelTest(TestCase):
    
    def test_str_retorna_quantidade_e_nome_da_peca(self):
        pedido = Pedido.objects.create(total = 150)
        item = ItemPedido.objects.create(
            pedido = pedido,
            peca_nome = "Pastilha de freio",
            preco_unitario = 50,
            quantidade = 3
        )
        
        resultado = str(item)
        
        self.assertEqual(resultado, "3x Pastilha de freio")


class PedidoModelTest(TestCase):
    
    def test_status_padrao_e_concluido(self):
        pedido = Pedido.objects.create(total = 100)
        
        self.assertEqual(pedido.status, Pedido.STATUS_CONCLUIDO)
        
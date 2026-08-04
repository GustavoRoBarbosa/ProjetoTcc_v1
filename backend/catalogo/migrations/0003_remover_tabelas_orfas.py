"""Remove tabelas que existiam no MySQL desde antes do Django gerenciar o
schema, sem nenhum model correspondente: 'produtos' (duplicava o papel de
'pecas' — mesma ideia, colunas diferentes) e a cadeia de carrinho/pedido
que dependia dela ('carrinho', 'itemcarrinho', 'pedido', 'itempedido').

Continham só dados de teste (1 linha em produtos, 1 em pedido) — não é
uma feature em uso. Se/quando um carrinho de compras for desenhado de
verdade, ele nasce integrado ao model Peca atual, não a essas tabelas
legadas.

Ordem do DROP importa por causa das foreign keys: as tabelas "filhas"
(itemcarrinho, itempedido) têm que sair antes das "pais" (carrinho,
pedido, produtos).
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0002_alter_categoria_descricao_alter_peca_categoria_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                'DROP TABLE IF EXISTS itemcarrinho;',
                'DROP TABLE IF EXISTS itempedido;',
                'DROP TABLE IF EXISTS carrinho;',
                'DROP TABLE IF EXISTS pedido;',
                'DROP TABLE IF EXISTS produtos;',
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

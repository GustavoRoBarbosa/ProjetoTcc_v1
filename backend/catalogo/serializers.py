"""Serializers do DRF: convertem os models em JSON (e vice-versa) e
validam os dados recebidos antes de salvar no banco.

Usamos ModelSerializer porque os 3 models são simples (sem regra de
negócio complexa como as validações de senha/telefone do cadastro de
usuário) — o DRF já cobre validação de campo obrigatório, unique, tipo
de dado etc. a partir da própria definição do model.
"""

import re

from rest_framework import serializers

from .models import Categoria, Fornecedor, Peca


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'descricao', 'ativo', 'criado_em', 'atualizado_em', 'excluido_em']
        # 'ativo'/'excluido_em' só são alterados indiretamente (soft
        # delete via DELETE — ver catalogo/views.py), não é algo que o
        # formulário de criar/editar categoria deveria poder setar direto.
        read_only_fields = ['ativo', 'criado_em', 'atualizado_em', 'excluido_em']


class FornecedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fornecedor
        fields = ['id', 'nome', 'contato', 'telefone', 'email', 'ativo', 'criado_em', 'atualizado_em', 'excluido_em']
        read_only_fields = ['ativo', 'criado_em', 'atualizado_em', 'excluido_em']

    def validate_telefone(self, valor):
        # Um telefone de verdade (com ou sem DDD/0800) tem no mínimo 10
        # dígitos. Só reclamamos quando existe ALGUM dígito mas incompleto
        # — um valor sem nenhum dígito (string vazia, ou lixo tipo "(" que
        # uma máscara de UI pode deixar sobrando) é tratado como "campo
        # não preenchido", não como erro, e normalizado para ''.
        digitos = re.sub(r'\D', '', valor)

        if not digitos:
            return ''

        if len(digitos) < 10:
            raise serializers.ValidationError(
                'Telefone incompleto — informe ao menos 10 dígitos (com DDD).'
            )

        return valor

    def validate(self, dados):
        # "contato" é só o nome da pessoa de referência — sozinho não dá
        # nenhum jeito de efetivamente falar com o fornecedor. Por isso a
        # exigência real é telefone OU e-mail (contato continua opcional
        # nos dois casos). Em PATCH parcial, cai no valor já salvo no
        # banco (self.instance) para os campos que não vieram na requisição.
        def valor(campo):
            if campo in dados:
                return dados[campo]
            if self.instance is not None:
                return getattr(self.instance, campo)
            return ''

        if not (valor('telefone') or valor('email')):
            raise serializers.ValidationError(
                'Informe ao menos um telefone ou e-mail para contato.'
            )

        return dados


class PecaSerializer(serializers.ModelSerializer):
    # Campos só de leitura, pra facilitar a exibição na listagem sem o
    # frontend precisar cruzar o id da categoria/fornecedor com outra
    # requisição.
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True, default=None)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True, default=None)

    class Meta:
        model = Peca
        fields = [
            'id', 'codigo', 'nome', 'descricao', 'preco', 'quantidade_estoque',
            'quantidade_minima', 'nivel_prioridade',
            'categoria', 'categoria_nome', 'fornecedor', 'fornecedor_nome',
            'imagem', 'ativo', 'criado_em', 'atualizado_em', 'excluido_em',
        ]
        read_only_fields = ['ativo', 'criado_em', 'atualizado_em', 'excluido_em']


class PecaPublicaSerializer(serializers.ModelSerializer):
    """Versão enxuta de PecaSerializer pra vitrine pública (sem login).

    Só os campos que fazem sentido um visitante ver numa loja — nada de
    quantidade_minima/nivel_prioridade (informação interna de reposição
    de estoque, não é da conta do cliente) nem dos timestamps de
    auditoria. `disponivel` substitui o número exato de estoque por um
    booleano — não é da conta do cliente saber que "sobrou 1 unidade
    exatamente", só se dá pra comprar ou não.
    """

    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True, default=None)
    disponivel = serializers.SerializerMethodField()

    class Meta:
        model = Peca
        fields = ['id', 'codigo', 'nome', 'descricao', 'preco', 'categoria_nome', 'imagem', 'disponivel']

    def get_disponivel(self, peca):
        return peca.quantidade_estoque > 0

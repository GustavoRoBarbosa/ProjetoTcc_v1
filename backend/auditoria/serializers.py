from rest_framework import serializers

from .models import LogAtividade


class LogAtividadeSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.nomUsu', read_only=True, default='(usuário removido)')

    class Meta:
        model = LogAtividade
        fields = ['id', 'usuario', 'usuario_nome', 'acao', 'modelo', 'objeto_id', 'descricao', 'criado_em']

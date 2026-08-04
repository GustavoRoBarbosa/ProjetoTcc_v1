from django.db import models

from usuarios.models import Usuario


class LogAtividade(models.Model):
    """Trilha de auditoria: quem fez o quê e quando.

    Existe para que, se algo indevido acontecer no catálogo ou nas
    contas de usuário (uma peça apagada sem motivo, uma permissão
    concedida indevidamente), dê pra rastrear a origem — quem estava
    logado, em que momento, e qual ação exata foi executada.

    usuario usa on_delete=SET_NULL: mesmo que a conta do autor seja
    excluída depois, o registro do que ele fez continua existindo (o
    log em si é o que importa preservar, não o vínculo).
    """

    ACAO_CRIAR = 'criar'
    ACAO_EDITAR = 'editar'
    ACAO_EXCLUIR = 'excluir'
    ACOES = (
        (ACAO_CRIAR, 'Criar'),
        (ACAO_EDITAR, 'Editar'),
        (ACAO_EXCLUIR, 'Excluir'),
    )

    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name='logs_atividade'
    )
    acao = models.CharField(max_length=10, choices=ACOES)
    modelo = models.CharField(max_length=50, help_text='Ex: Peca, Categoria, Fornecedor, Usuario')
    objeto_id = models.CharField(max_length=50, blank=True)
    descricao = models.CharField(max_length=255, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'log_atividades'
        ordering = ['-criado_em']

    def __str__(self):
        quem = self.usuario.nomUsu if self.usuario else '(usuário removido)'
        return f'{self.criado_em:%d/%m/%Y %H:%M} — {quem} {self.acao} {self.modelo} #{self.objeto_id}'


def registrar(usuario, acao, modelo, objeto_id='', descricao=''):
    """Helper simples pra não repetir `LogAtividade.objects.create(...)`
    em cada view que precisa logar uma ação. Usado em catalogo/views.py
    e usuarios/views.py.
    """
    LogAtividade.objects.create(
        usuario=usuario,
        acao=acao,
        modelo=modelo,
        objeto_id=str(objeto_id),
        descricao=descricao,
    )

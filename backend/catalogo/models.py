from django.db import models


class EntidadeCatalogo(models.Model):
    """Campos comuns a Categoria/Fornecedor/Peça: quando excluídos pela
    tela, não somem do banco de verdade (soft delete) — só ficam
    marcados como inativos e somem das listagens (ver
    catalogo/views.py::_CatalogoViewSet). Isso preserva o histórico (e
    o vínculo com peças antigas) mesmo depois de "excluído", e evita
    perder dado por engano.
    """

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    # Preenchido só no momento em que ativo vira False (ver
    # catalogo/views.py::_CatalogoViewSet.perform_destroy). Diferente de
    # atualizado_em (que muda a cada edição qualquer), este campo marca
    # especificamente quando o registro foi "excluído" pela tela.
    excluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class Categoria(EntidadeCatalogo):
    """Agrupa peças por tipo (ex: motor, elétrica, suspensão).

    descricao é obrigatória: só o nome ("Motor") é vago demais pra saber
    que tipo de peça entra ali — a descrição é o que orienta quem for
    classificar uma peça nova nessa categoria.
    """

    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField()

    class Meta:
        db_table = 'categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Fornecedor(EntidadeCatalogo):
    """Empresa/pessoa de quem a peça é comprada.

    contato/telefone/email continuam opcionais campo a campo (nem toda
    empresa tem os três), mas o serializer (catalogo/serializers.py)
    exige que telefone ou email esteja preenchido — sem isso não tem
    como entrar em contato com o fornecedor.
    """

    nome = models.CharField(max_length=150)
    contato = models.CharField(max_length=100, blank=True)
    telefone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    class Meta:
        db_table = 'fornecedores'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Peca(EntidadeCatalogo):
    """Item do catálogo gerenciado pela oficina.

    Todos os campos são obrigatórios, incluindo categoria, fornecedor e
    imagem: é um catálogo pensado para o cliente visualizar, então uma
    peça incompleta (sem foto, sem saber de que categoria/fornecedor é)
    não cumpre esse objetivo.

    categoria/fornecedor usam on_delete=PROTECT (não SET_NULL): como
    agora são obrigatórios, não dá pra simplesmente desvincular a peça se
    a categoria/fornecedor for excluído — o Django bloqueia a exclusão
    enquanto existir peça vinculada, forçando reatribuir ou excluir as
    peças primeiro. Na prática hoje a "exclusão" pela tela é soft delete,
    então esse bloqueio só entra em cena se algo tentar um DELETE de
    verdade (ex: direto no banco/admin).

    quantidade_minima/nivel_prioridade nasceram de uma tabela "produtos"
    que existia solta no banco (schema anterior, nunca modelada no
    Django) com o mesmo propósito de "pecas" — as colunas úteis de lá
    foram incorporadas aqui e a tabela antiga foi removida
    (ver migration 0003_remover_tabelas_orfas).
    """

    NIVEL_PRIORIDADE = (
        ('alta', 'Alta'),
        ('media', 'Média'),
        ('baixa', 'Baixa'),
    )

    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=150)
    descricao = models.TextField()
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    quantidade_estoque = models.PositiveIntegerField(default=0)
    quantidade_minima = models.PositiveIntegerField(
        default=0,
        help_text='Abaixo deste valor, a peça é candidata a reposição.'
    )
    nivel_prioridade = models.CharField(max_length=10, choices=NIVEL_PRIORIDADE, default='media')
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='pecas')
    fornecedor = models.ForeignKey(Fornecedor, on_delete=models.PROTECT, related_name='pecas')
    imagem = models.ImageField(upload_to='pecas/')

    class Meta:
        db_table = 'pecas'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.codigo} - {self.nome}'

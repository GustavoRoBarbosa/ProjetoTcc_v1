from django.db import models


class Usuario(models.Model):
    """Representa uma pessoa cadastrada no sistema.

    Não usamos o model de usuário padrão do Django (auth.User) porque o
    banco já existia com esse formato de tabela antes da decisão de usar
    autenticação JWT customizada — ver backend/usuarios/auth.py para o
    fluxo de login/token que trabalha em cima deste model.
    """

    TIPO_USUARIO = (
        ('cliente', 'Cliente'),
        ('funcionario', 'Funcionario'),
        ('adm', 'Administrador'),
    )

    idUsu = models.AutoField(primary_key=True)
    nomUsu = models.CharField(max_length=45, blank=False)
    emailUsu = models.EmailField(max_length=45, unique=True)
    senUsu = models.CharField(max_length=255)  # senha já hasheada (make_password), nunca texto puro
    telUsu = models.CharField(max_length=20)
    tipoUsu = models.CharField(max_length=20, choices=TIPO_USUARIO, default='cliente')
    ativo = models.BooleanField(default=True)  # usuário inativo não consegue logar (ver views.login)

    # Cadastro por email/senha só fica utilizável depois de confirmar o
    # link mandado por email (ver views.cadastrar/confirmar_email). Contas
    # criadas via "Entrar com Google" já nascem com isso True — o Google
    # já validou o email antes de nos entregar o token (ver auth_google.py).
    email_confirmado = models.BooleanField(default=False)

    # Preenchido só quando a conta nasce via "Entrar com Google"
    # (ver usuarios/auth_google.py). Serve tanto pra saber que a conta é
    # Google (senUsu é um hash aleatório inutilizável, não uma senha real
    # que o usuário escolheu) quanto pra reconhecer o mesmo usuário do
    # Google numa próxima vez que ele logar.
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    # Permissão extra e independente do "tipo": um funcionário só pode
    # criar/editar/excluir peças do catálogo se um administrador marcar
    # este campo como True. Administradores sempre podem gerenciar peças,
    # não importa o valor daqui (a regra fica centralizada em
    # backend/usuarios/permissions.py).
    pode_gerenciar_pecas = models.BooleanField(default=False)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'usuarios'
        managed = True

    def __str__(self):
        return self.nomUsu

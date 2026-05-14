from django.db import models

class Usuario(models.Model):
    TIPO_USUARIO = (
        ('cliente', 'Cliente'),
        ('funcionario', 'Funcionario'),
        ('adm', 'Administrador'),
    )

    idUsu = models.AutoField(primary_key=True)
    nomUsu = models.CharField(max_length=45)
    emailUsu = models.EmailField(max_length=45, unique=True)
    senUsu = models.CharField(max_length=20)
    telUsu = models.CharField(max_length=20)
    tipoUsu = models.CharField(max_length=20, choices=TIPO_USUARIO)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField()
    atualizado_em = models.DateTimeField()

    class Meta:
        db_table = 'usuarios'

    def __str__(self):
        return self.nomUsu

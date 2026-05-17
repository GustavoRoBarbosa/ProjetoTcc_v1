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
    tipoUsu = models.CharField(max_length=20, choices=TIPO_USUARIO, default='cliente')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'usuarios'
        managed = False

    def __str__(self):
        return self.nomUsu

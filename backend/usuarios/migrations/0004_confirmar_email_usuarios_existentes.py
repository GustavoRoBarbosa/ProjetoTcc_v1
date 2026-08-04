"""Marca como confirmados todos os usuários criados antes da exigência de
confirmação de email existir. Sem isso, contas que já funcionavam
normalmente ficariam bloqueadas de logar do nada, já que
email_confirmado nasce False por padrão no novo campo.
"""

from django.db import migrations


def confirmar_usuarios_existentes(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.update(email_confirmado=True)


def reverter(apps, schema_editor):
    # Não faz sentido "desconfirmar" no rollback — isso bloquearia contas
    # que o usuário já vinha usando normalmente antes desta feature.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_usuario_email_confirmado_usuario_google_id'),
    ]

    operations = [
        migrations.RunPython(confirmar_usuarios_existentes, reverter),
    ]

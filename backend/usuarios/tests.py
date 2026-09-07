from django.test import TestCase
from rest_framework.test import APIClient

from .views import _erro_forca_senha
from .models import Usuario


class ForcaSenhaTestCase(TestCase):
    """Testes unitários da regra de força de senha usada em cadastro e
    redefinição de senha (ver usuarios/views.py:_erro_forca_senha).

    Requisitos:
      - mínimo 8 caracteres
      - pelo menos 1 letra maiúscula
      - pelo menos 1 número
      - pelo menos 1 caractere especial
    """

    # --- senhas válidas ---------------------------------------------

    def test_senha_valida_nao_gera_erro(self):
        self.assertIsNone(_erro_forca_senha('Senha123!'))

    def test_senha_valida_no_limite_de_8_caracteres(self):
        self.assertIsNone(_erro_forca_senha('Abc123!@'))

    # --- comprimento mínimo -------------------------------------------

    def test_senha_com_menos_de_8_caracteres_e_invalida(self):
        erro = _erro_forca_senha('Ab1!')
        self.assertEqual(erro, 'A senha deve possuir pelo menos 8 caracteres')

    def test_senha_vazia_e_invalida(self):
        erro = _erro_forca_senha('')
        self.assertEqual(erro, 'A senha deve possuir pelo menos 8 caracteres')

    # --- letra maiúscula -------------------------------------------------

    def test_senha_sem_letra_maiuscula_e_invalida(self):
        erro = _erro_forca_senha('senha123!')
        self.assertEqual(erro, 'A senha deve possuir uma letra maiúscula')

    # --- letra minúscula -------------------------------------------------

    def test_senha_sem_letra_minuscula_e_invalida(self):
        erro = _erro_forca_senha('SENHA123!')
        self.assertEqual(erro, 'A senha deve possuir uma letra minúscula')

    # --- número ----------------------------------------------------------

    def test_senha_sem_numero_e_invalida(self):
        erro = _erro_forca_senha('Senhaforte!')
        self.assertEqual(erro, 'A senha deve possuir um número')

    # --- caractere especial ----------------------------------------------

    def test_senha_sem_caractere_especial_e_invalida(self):
        erro = _erro_forca_senha('Senha1234')
        self.assertEqual(erro, 'A senha deve possuir um caractere especial')

    # --- prioridade das validações (ordem em que os regexes são checados) --

    def test_primeiro_erro_encontrado_e_o_retornado(self):
        # curta, sem maiúscula, sem número e sem especial: deve acusar
        # primeiro o comprimento mínimo, não os outros problemas.
        erro = _erro_forca_senha('abc')
        self.assertEqual(erro, 'A senha deve possuir pelo menos 8 caracteres')


class CadastroSenhaAPITestCase(TestCase):
    """Testes de integração via endpoint /cadastro/, garantindo que a
    API realmente aplica _erro_forca_senha e não cria o usuário quando a
    senha é fraca.
    """

    def setUp(self):
        self.client = APIClient()
        self.dados_base = {
            'nome': 'Usuario Teste',
            'email': 'teste@example.com',
            'telefone': '11999999999',
        }

    def test_cadastro_com_senha_fraca_nao_cria_usuario(self):
        payload = {**self.dados_base, 'senha': 'fraca'}
        response = self.client.post('/api/cadastro/', payload)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['success'])
        self.assertFalse(Usuario.objects.filter(emailUsu=self.dados_base['email']).exists())

    def test_cadastro_com_senha_forte_cria_usuario(self):
        payload = {**self.dados_base, 'senha': 'SenhaForte1!'}
        response = self.client.post('/api/cadastro/', payload)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertTrue(Usuario.objects.filter(emailUsu=self.dados_base['email']).exists())

    def test_cadastro_sem_numero_na_senha_retorna_mensagem_especifica(self):
        payload = {**self.dados_base, 'senha': 'SenhaForte!'}
        response = self.client.post('/api/cadastro/', payload)

        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['message'], 'A senha deve possuir um número')

    def test_cadastro_sem_caractere_especial_retorna_mensagem_especifica(self):
        payload = {**self.dados_base, 'senha': 'SenhaForte1'}
        response = self.client.post('/api/cadastro/', payload)

        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['message'], 'A senha deve possuir um caractere especial')

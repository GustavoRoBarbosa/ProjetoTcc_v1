from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password, check_password
import re
from .models import Usuario


@api_view(['GET'])
def listar_usuarios(request):

    usuarios = Usuario.objects.all()

    dados = []

    for usuario in usuarios:
        dados.append({
            'id': usuario.idUsu,
            'nome': usuario.nomUsu,
            'email': usuario.emailUsu,
            'tipo': usuario.tipoUsu
        })
        
        return Response (dados)


@api_view(['POST'])
def login(request):

    email = request.data.get('email')
    senha = request.data.get('senha')

    try:
        usuario = Usuario.objects.get(emailUsu=email, ativo = True)

        if check_password(senha, usuario.senUsu):
            return Response({
                'success': True,
                'usuario': {
                    'id': usuario.idUsu,
                    'nome': usuario.nomUsu,
                    'email': usuario.emailUsu,
                    'tipo': usuario.tipoUsu
                }
            })
        
        return Response({
            'success': False,
            'message': 'Senha invalida'
        })
    except Usuario.DoesNotExist:

        return Response({
            'success': False,
            'message': 'Usuario não encontrado'
        })
    

@api_view(['POST'])
def cadastrar(request):

    nome = request.data.get('nome')
    email = request.data.get('email')
    senha = request.data.get('senha')
    telefone = request.data.get('telefone')
    
    
    
    if not nome or nome.strip() == '':

        return Response({
            'success': False,
            'message': 'O nome é obrigatório'
        })

    if not email or email.strip() == '':

        return Response({
            'success': False,
            'message': 'O email é obrigatório'
        })

    if not senha or senha.strip() == '':

        return Response({
            'success': False,
            'message': 'A senha é obrigatória'
        })

    if not telefone or telefone.strip() == '':

        return Response({
            'success': False,
            'message': 'O telefone é obrigatório'
        })

    if Usuario.objects.filter(emailUsu=email).exists():

        return Response({
            'success': False,
            'message': 'Email já cadastrado'
        })
        
        
    regex_email = r'^[\w\.-]+@[\w\.-]+\.\w+$'

    if not re.match(regex_email, email):

        return Response({
            'success': False,
            'message': 'Email inválido'
        })
    
    if len(senha) < 8:

        return Response({
            'success': False,
            'message': 'A senha deve possuir pelo menos 8 caracteres'
        })

    if not re.search(r'[A-Z]', senha):

        return Response({
            'success': False,
            'message': 'A senha deve possuir uma letra maiúscula'
        })

    if not re.search(r'[a-z]', senha):

        return Response({
            'success': False,
            'message': 'A senha deve possuir uma letra minúscula'
        })

    if not re.search(r'[0-9]', senha):

        return Response({
            'success': False,
            'message': 'A senha deve possuir um número'
        })

    if not re.search(r'[\W_]', senha):

        return Response({
            'success': False,
            'message': 'A senha deve possuir um caractere especial'
        })
        
    telefone = re.sub(r'\D', '', telefone)
    
    if len(telefone) != 11:

        return Response({
            'success': False,
            'message': 'Telefone inválido'
        })
    
    telefone_formatado = f'({telefone[:2]}) {telefone[2:7]}-{telefone[7:]}'

    usuario = Usuario.objects.create(
        nomUsu=nome,
        emailUsu=email,
        senUsu=make_password(senha),
        telUsu=telefone_formatado
    )

    return Response({
        'success': True,
        'message': 'Usuário cadastrado com successo'
    })

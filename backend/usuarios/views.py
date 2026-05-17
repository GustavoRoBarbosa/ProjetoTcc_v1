from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
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


@api_view(['POST'])
def login(request):

    email = request.data.get('email')
    senha = request.data.get('senha')

    try:
        usuario = Usuario.objects.get(emailUsu=email)

        if usuario.senUsu == senha:
            return Response({
                'sucess': True,
                'usuario': {
                    'id': usuario.idUsu,
                    'nome': usuario.nomUsu,
                    'email': usuario.emailUsu,
                    'tipo': usuario.tipoUsu
                }
            })
        
        return Response({
            'sucess': False,
            'message': 'Senha invalida'
        })
    except Usuario.DoesNotExist:

        return Response({
            'sucess': False,
            'message': 'Usuario não encontrado'
        })
    

@api_view(['POST'])
def cadastrar(request):

    nome = request.data.get('nome')
    email = request.data.get('email')
    senha = request.data.get('senha')
    telefone = request.data.get('telefone')

    if Usuario.objects.filter(emailUsu=email).exists():

        return Response({
            'success': False,
            'message': 'Email já cadastrado'
        })

    usuario = Usuario.objects.create(
        nomUsu=nome,
        emailUsu=email,
        senUsu=senha,
        telUsu=telefone
    )

    return Response({
        'success': True,
        'message': 'Usuário cadastrado com sucesso'
    })



    return Response(dados)
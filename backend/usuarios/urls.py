from django.urls import path
from .views import listar_usuarios, login, cadastrar

urlpatterns = [
    path('usuarios/', listar_usuarios),
    path('login/', login),
    path('cadastro/', cadastrar),
    
]

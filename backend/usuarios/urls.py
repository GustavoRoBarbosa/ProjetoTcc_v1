from django.urls import path
from .views import listar_usuarios, login

urlpatterns = [
    path('usuarios/', listar_usuarios),
    path('login/', login),
    
]

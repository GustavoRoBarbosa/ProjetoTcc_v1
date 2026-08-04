from rest_framework.routers import DefaultRouter

from .views import LogAtividadeViewSet

router = DefaultRouter()
router.register('logs', LogAtividadeViewSet, basename='log-atividade')

urlpatterns = router.urls

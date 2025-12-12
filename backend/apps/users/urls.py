from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BankerManagementViewSet, ClientManagementViewSet

router = DefaultRouter()
router.register(r'bankers', BankerManagementViewSet, basename='banker')
router.register(r'clients', ClientManagementViewSet, basename='client')

urlpatterns = [
    path('', include(router.urls)),
]

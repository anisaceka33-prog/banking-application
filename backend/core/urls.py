from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('apps.auth.urls')), 
    path('api/users/', include('apps.users.urls')),  
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/cards/', include('apps.cards.urls')),
    path('api/transactions/', include('apps.transactions.urls')), 
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

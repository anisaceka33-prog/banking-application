from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.core.cache import cache
from django.db.models import Q
import logging
from .models import User, UserRole
from .serializers import ( UserSerializer,BankerCreateSerializer,ClientCreateSerializer,UserUpdateSerializer,)
from .permissions import CanManageBankers, CanManageClients

logger = logging.getLogger('banking')

BANKER_LIST_CACHE_KEY = 'banker_list'
CLIENT_LIST_CACHE_KEY = 'client_list'
CACHE_TTL = 60 * 15


class BaseUserManagementViewSet(viewsets.ModelViewSet):
    """Base viewset with common functionality for user management"""

    cache_key_prefix = None  # Must be set in subclasses
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def list(self, request, *args, **kwargs):
        page_num = request.query_params.get('page', '1')
        search = request.query_params.get('search', '')
        cache_key = f'{self.cache_key_prefix}_{page_num}_{search}'
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            logger.debug(f'Returning cached {self.cache_key_prefix} list (page {page_num}, search: {search})')
            return Response(cached_data)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            cache.set(cache_key, response.data, CACHE_TTL)
            logger.debug(f'Cached {self.cache_key_prefix} list (page {page_num}, search: {search})')
            return response

        serializer = self.get_serializer(queryset, many=True)
        cache.set(cache_key, serializer.data, CACHE_TTL)
        logger.debug(f'Cached {self.cache_key_prefix} list (no pagination)')
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save()
        cache.delete_pattern(f'{self.cache_key_prefix}*')
        logger.info(f'{self.get_user_role()} created by {self.request.user.email} - cache cleared')

    def perform_update(self, serializer):
        serializer.save()
        cache.delete_pattern(f'{self.cache_key_prefix}*')
        logger.info(f'{self.get_user_role()} {serializer.instance.email} updated by {self.request.user.email} - cache cleared')

    def get_user_role(self):
        """Return user role name for logging - must be implemented in subclasses"""
        raise NotImplementedError("Subclasses must implement get_user_role()") 


@extend_schema_view(
    list=extend_schema(description='List all bankers (Admin)'),
    create=extend_schema(description='Create a new banker (Admin)'),
    retrieve=extend_schema(description='Get banker details (Admin)'),
    partial_update=extend_schema(description='Update banker (Admin)'),
    destroy=extend_schema(description='Delete banker (Admin)'),
)
class BankerManagementViewSet(BaseUserManagementViewSet):

    permission_classes = [IsAuthenticated, CanManageBankers]
    serializer_class = UserSerializer
    cache_key_prefix = BANKER_LIST_CACHE_KEY

    def get_queryset(self):
        return User.objects.filter(role=UserRole.BANKER).order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return BankerCreateSerializer
        if self.action == 'partial_update':
            return UserUpdateSerializer
        return UserSerializer

    def get_user_role(self):
        return 'Banker'

    def perform_destroy(self, instance):
        email = instance.email

        if instance.approved_accounts.exists():
            approved_count = instance.approved_accounts.count()
            raise ValidationError({
                'detail': f'Cannot delete banker '
                         f'Please deactivate'
            })

        if hasattr(instance, 'approved_cards') and instance.approved_cards.exists():
            cards_count = instance.approved_cards.count()
            raise ValidationError({
                'detail': f'Cannot delete banker '
                         f'Please deactivate '
            })

        instance.delete()
        cache.delete_pattern(f'{BANKER_LIST_CACHE_KEY}*')
        logger.info(f'Banker {email} deleted by {self.request.user.email} - cache cleared')


@extend_schema_view(
    list=extend_schema(description='List all clients (Banker)'),
    create=extend_schema(description='Create a new client (Banker)'),
    retrieve=extend_schema(description='Get client details'),
    partial_update=extend_schema(description='Update client'),
    destroy=extend_schema(description='Delete client'),
)
class ClientManagementViewSet(BaseUserManagementViewSet):

    permission_classes = [IsAuthenticated, CanManageClients]
    serializer_class = UserSerializer
    cache_key_prefix = CLIENT_LIST_CACHE_KEY

    def get_queryset(self):
        queryset = User.objects.filter(role=UserRole.CLIENT).order_by('-created_at')

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return ClientCreateSerializer
        if self.action == 'partial_update':
            return UserUpdateSerializer
        return UserSerializer

    def get_user_role(self):
        return 'Client'

    def perform_destroy(self, instance):
        email = instance.email

        if instance.bank_accounts.exists():
            accounts_count = instance.bank_accounts.count()
            raise ValidationError({
                'detail': f'Cannot delete client '
                         f'Please set is_active to false.'
            })

        if hasattr(instance, 'cards') and instance.cards.exists():
            cards_count = instance.cards.count()
            raise ValidationError({
                'detail': f'Cannot delete client. '
                         f'Please set is_active to false.'
            })

        instance.delete()
        cache.delete_pattern(f'{CLIENT_LIST_CACHE_KEY}*')
        logger.info(f'Client {email} deleted by {self.request.user.email} - cache cleared')

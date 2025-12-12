from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
import logging
from apps.cards.models import Card
from apps.accounts.models import ApplicationStatus
from .serializers import (
    CardSerializer,
    CardCreateSerializer,
    CardApprovalSerializer,
)
from .permissions import IsBankerOrOwner, CanApproveApplications
from apps.users.models import UserRole

logger = logging.getLogger('banking')


@extend_schema_view(
    list=extend_schema(
        description='List cards with  filters',
        parameters=[
            OpenApiParameter('status', type=str, description='Filter by status (PENDING, APPROVED, REJECTED)'),
            OpenApiParameter('account_id', type=str, description='Filter by account ID'),
        ]
    ),
    create=extend_schema(description='Apply for a new debit card (Client only)'),
    retrieve=extend_schema(description='Get card details'),
    partial_update=extend_schema(description='Update card status (Banker only)'),
)
class CardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBankerOrOwner]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        user = self.request.user
        queryset = Card.objects.select_related('client', 'bank_account', 'approved_by')

        if user.role == UserRole.BANKER:
            pass 
        elif user.role == UserRole.CLIENT:
            queryset = queryset.filter(client=user)
        else:
            return Card.objects.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(bank_account_id=account_id)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CardCreateSerializer
        if self.action in ['update', 'partial_update']:
            return CardApprovalSerializer
        return CardSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanApproveApplications()]
        return super().get_permissions()

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        card = serializer.save()
        return Response(CardSerializer(card).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        card = self.get_object()

        if card.status != ApplicationStatus.PENDING:
            return Response(
                {'detail': 'Application is not pending.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(card, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        reason = serializer.validated_data.get('rejection_reason', '')

        with transaction.atomic():
            if new_status == ApplicationStatus.APPROVED:
                card.approve(banker=request.user)
                logger.info(f'Card {card.masked_number} approved by {request.user.email}')
            elif new_status == ApplicationStatus.REJECTED:
                card.reject(reason=reason)
                logger.info(f'Card {card.masked_number} rejected by {request.user.email}: {reason}')

            card.save()

        return Response(CardSerializer(card).data)

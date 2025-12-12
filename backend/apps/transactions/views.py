from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
import logging

from apps.transactions.models import Transaction
from .serializers import (
    TransactionSerializer,
    TransactionCreateSerializer,
)
from .permissions import CanCreateTransaction, CanViewTransactions
from apps.users.models import UserRole

logger = logging.getLogger('banking')


class TransactionThrottle(ScopedRateThrottle):
    scope = 'transaction'


@extend_schema_view(
    list=extend_schema(
        description='List transactions filtered by role',
        parameters=[
            OpenApiParameter('account_id', type=str, description='Filter by account ID'),
            OpenApiParameter('type', type=str, description='Filter by transaction type'),
        ]
    ),
    create=extend_schema(description='Create a new transaction (Client only)'),
    retrieve=extend_schema(description='Get transaction details'),
)
class TransactionViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated, CanViewTransactions]
    http_method_names = ['get', 'post']

    def get_throttles(self):
        if self.action == 'create':
            return [TransactionThrottle()]
        return []

    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.select_related('bank_account', 'bank_account__client')

        if user.role == UserRole.BANKER:
            pass 
        elif user.role == UserRole.CLIENT:
            queryset = queryset.filter(bank_account__client=user)
        else:
            return Transaction.objects.none()

        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(bank_account_id=account_id)

        trx_type = self.request.query_params.get('type')
        if trx_type:
            queryset = queryset.filter(transaction_type=trx_type)

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return TransactionCreateSerializer
        return TransactionSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), CanCreateTransaction()]
        return super().get_permissions()

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            trx = serializer.save()
            logger.info(
                f'Transaction created: {trx.id} - '
                f'amount= {trx.amount}'
            )
            return Response(
                TransactionSerializer(trx).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Transaction failed {str(e)}')
            raise

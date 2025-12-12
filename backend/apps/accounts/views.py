from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import Http404
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
import logging
from .models import BankAccount, ApplicationStatus
from .serializers import BankAccountSerializer,BankAccountCreateSerializer,BankAccountApprovalSerializer,DepositSerializer
from .permissions import IsBankerOrOwner, CanApproveApplications, CanCreateAccount
from apps.users.models import UserRole
from apps.transactions.models import Transaction, TransactionType
from django.db.models import Q

logger = logging.getLogger('banking')


@extend_schema_view(
    list=extend_schema(
        description='List bank accounts with filters',
        parameters=[
            OpenApiParameter('status', type=str, description='Filter by status (PENDING, APPROVED, REJECTED)'),
            OpenApiParameter('client_id', type=int, description='Filter by client ID (Banker)'),
        ]
    ),
    create=extend_schema(description='Apply for a new bank account (Client)'),
    retrieve=extend_schema(description='Get bank account details'),
    partial_update=extend_schema(description='Update account status (Banker)'),
)
class BankAccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBankerOrOwner]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        user = self.request.user
        queryset = BankAccount.objects.select_related('client', 'approved_by')

        if user.role == UserRole.CLIENT:
            queryset = queryset.filter(client=user)

        elif user.role != UserRole.BANKER:
            return BankAccount.objects.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        if user.role == UserRole.BANKER:
            client_id = self.request.query_params.get('client_id')
            if client_id:
                queryset = queryset.filter(client_id=client_id)

            search = self.request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(client__first_name__icontains=search) |
                    Q(client__last_name__icontains=search) |
                    Q(client__email__icontains=search)
                )

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return BankAccountCreateSerializer
        if self.action in ['update', 'partial_update']:
            return BankAccountApprovalSerializer
        return BankAccountSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), CanCreateAccount()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanApproveApplications()]
        return super().get_permissions()

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save()
        return Response(BankAccountSerializer(account).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        account = self.get_object()

        if account.status != ApplicationStatus.PENDING:
            return Response(
                {'detail': 'This application has already been processed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(account, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        reason = serializer.validated_data.get('rejection_reason', '')

        with transaction.atomic():
            if new_status == ApplicationStatus.APPROVED:
                account.approve(banker=request.user)
                logger.info(f'Bank account {account.iban} approved by {request.user.email}')
            elif new_status == ApplicationStatus.REJECTED:
                account.reject(reason=reason)
                logger.info(f'Bank account {account.iban} rejected by {request.user.email}: {reason}')

            account.save()

        return Response(BankAccountSerializer(account).data)

    @extend_schema(
        request=DepositSerializer,
        responses={200: BankAccountSerializer},
        description='Add balance to an account (Banker)'
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveApplications])
    def deposit(self, request, pk=None):
        try:
            account = self.get_object()
        except Http404:
                return Response(
                    {'detail': f'Account withe ID {pk} was not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        if account.status != ApplicationStatus.APPROVED:
            return Response(
                {'detail': 'Deposit is allowed only to approved accounts'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        description = serializer.validated_data.get('description', 'Deposit by banker')

        with transaction.atomic():
            account.balance += amount
            account.save()

            Transaction.objects.create(
                bank_account=account,
                transaction_type=TransactionType.CREDIT,
                amount=amount,
                currency=account.currency,
                description=description,
                balance_after=account.balance
            )

            logger.info(
                f'Deposit {amount} {account.currency} to {account.iban} by {request.user.email}'
            )

        return Response(BankAccountSerializer(account).data)

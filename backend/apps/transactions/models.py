import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from auditlog.registry import auditlog
from auditlog.models import AuditlogHistoryField

from apps.accounts.models import Currency


class TransactionType(models.TextChoices):
    DEBIT = 'DEBIT', 'Debit'
    CREDIT = 'CREDIT', 'Credit'


class Transaction(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bank_account = models.ForeignKey(
        'accounts.BankAccount',
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TransactionType.choices
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal(0.01))]
    )
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.EUR
    )
    description = models.CharField(max_length=255)
    reference_iban = models.CharField(max_length=34, blank=True)
    balance_after = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal(0.00)
    )
    related_transaction = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_transactions'
    )
    idempotency_key = models.CharField(max_length=64, unique=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    history = AuditlogHistoryField()

    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['bank_account', '-created_at']),
            models.Index(fields=['idempotency_key']),
        ]

    def __str__(self):
        sign = '-' if self.transaction_type == TransactionType.DEBIT else '+'
        return f'{sign}{self.amount} {self.currency} - {self.bank_account.iban}'


auditlog.register(Transaction)

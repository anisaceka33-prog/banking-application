import uuid
import random
import string
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django_fsm import FSMField, transition
from auditlog.registry import auditlog
from auditlog.models import AuditlogHistoryField


class ApplicationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'


class Currency(models.TextChoices):
    EUR = 'EUR', 'Euro'


def generate_iban():
    return "AL" + "".join(random.choices(string.digits, k=20))


def generate_card_number():
    return ''.join(random.choices(string.digits, k=16))


class BankAccount(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bank_accounts'
    )
    iban = models.CharField(max_length=34, unique=True, default=generate_iban)
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.EUR
    )
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal(0.00),
        validators=[MinValueValidator(Decimal(0.00))]
    )
    status = FSMField(
        default=ApplicationStatus.PENDING,
        choices=ApplicationStatus.choices
    )
    rejection_reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_accounts'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = AuditlogHistoryField()

    class Meta:
        db_table = 'bank_accounts'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.iban} - {self.client.email}'

    @property
    def is_active(self) -> bool:
        return self.status == ApplicationStatus.APPROVED

    @property
    def has_linked_card(self) -> bool:
        return self.cards.filter(status=ApplicationStatus.APPROVED).exists()

    @transition(field=status, source=ApplicationStatus.PENDING, target=ApplicationStatus.APPROVED)
    def approve(self, banker):
        self.approved_by = banker
        self.rejection_reason = ''

    @transition(field=status, source=ApplicationStatus.PENDING, target=ApplicationStatus.REJECTED)
    def reject(self, reason: str):
        self.rejection_reason = reason


auditlog.register(BankAccount)


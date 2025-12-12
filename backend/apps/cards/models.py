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

from apps.accounts.models import BankAccount, ApplicationStatus


class CardType(models.TextChoices):
    DEBIT = 'DEBIT', 'Debit Card'


def generate_card_number():
    return ''.join(random.choices(string.digits, k=16))


class Card(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cards'
    )
    bank_account = models.ForeignKey(
        'accounts.BankAccount',
        on_delete=models.CASCADE,
        related_name='cards'
    )
    card_type = models.CharField(
        max_length=10,
        choices=CardType.choices,
        default=CardType.DEBIT
    )
    card_number = models.CharField(max_length=16, unique=True, default=generate_card_number)
    monthly_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
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
        related_name='approved_cards'
    )
    expiry_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = AuditlogHistoryField()

    class Meta:
        db_table = 'cards'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['bank_account'],
                condition=models.Q(status=ApplicationStatus.APPROVED),
                name='unique_active_card_per_account'
            )
        ]

    def __str__(self):
        return f'{self.card_type} - {self.card_number[-4:]} ({self.client.email})'

    @property
    def masked_number(self) -> str:
        return f'**** **** **** {self.card_number[-4:]}'

    @transition(field=status, source=ApplicationStatus.PENDING, target=ApplicationStatus.APPROVED)
    def approve(self, banker):
        self.approved_by = banker
        self.rejection_reason = ''
        self.expiry_date = date.today() + relativedelta(years=4)

    @transition(field=status, source=ApplicationStatus.PENDING, target=ApplicationStatus.REJECTED)
    def reject(self, reason: str):
        self.rejection_reason = reason


auditlog.register(Card)

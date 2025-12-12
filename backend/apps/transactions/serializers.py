from rest_framework import serializers
from decimal import Decimal
from django.db import transaction
import hashlib
import re

from apps.transactions.models import Transaction, TransactionType
from apps.accounts.models import BankAccount, ApplicationStatus, Currency


class TransactionSerializer(serializers.ModelSerializer):

    account_iban = serializers.CharField(source='bank_account.iban', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'bank_account', 'account_iban', 'transaction_type',
            'amount', 'currency', 'description', 'reference_iban',
            'balance_after', 'created_at'
        ]
        read_only_fields = fields


class TransactionCreateSerializer(serializers.Serializer):

    source_account = serializers.UUIDField()
    target_iban = serializers.CharField(max_length=34)
    amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        min_value=Decimal(0.01)
    )
    description = serializers.CharField(max_length=255, required=False, default='Transfer')
    idempotency_key = serializers.CharField(max_length=64, required=True)

    def validate_target_iban(self, value):
        value = value.replace(' ', '').upper()

        if not re.match(r'^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$', value):
            raise serializers.ValidationError('Invalid IBAN format.')

        return value


    def validate_idempotency_key(self, value):
        if len(value) < 16:
            raise serializers.ValidationError(
                'Idempotency key must be at least 16 characters.'
            )

        existing = Transaction.objects.filter(idempotency_key=value).first()
        if existing:
            raise serializers.ValidationError(
                'Transaction with this idempotency key already processed.',
                code='duplicate_transaction'
            )

        return value

    def validate(self, attrs):
        user = self.context['request'].user

        try:
            source_account = BankAccount.objects.get(
                id=attrs['source_account'],
                client=user
            )
        except BankAccount.DoesNotExist:
            raise serializers.ValidationError({
                'source_account': 'Account not found'
            })

        if source_account.status != ApplicationStatus.APPROVED:
            raise serializers.ValidationError({
                'source_account': 'Source account is not active.'
            })

        if not source_account.has_linked_card:
            raise serializers.ValidationError({
                'source_account': 'Source account must have an active debit card linked.'
            })

        if source_account.balance < attrs['amount']:
            raise serializers.ValidationError({
                'amount': f'Insufficient balance, Only €{source_account.balance}left'
            })

        if source_account.iban == attrs['target_iban']:
            raise serializers.ValidationError({
                'target_iban': 'Cannot transfer to the same account.'
            })

        target_account = BankAccount.objects.filter(
            iban=attrs['target_iban'],
            status=ApplicationStatus.APPROVED
        ).first()

        attrs['_source_account_id'] = source_account.id
        attrs['_target_account_id'] = target_account.id if target_account else None

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        source_account_id = validated_data['_source_account_id']
        target_account_id = validated_data.get('_target_account_id')
        amount = validated_data['amount']
        description = validated_data.get('description', 'Transfer')
        target_iban = validated_data['target_iban']
        idempotency_key = validated_data['idempotency_key']
        source = BankAccount.objects.select_for_update().get(id=source_account_id)

        if source.balance < amount:
            raise serializers.ValidationError({
                'amount': 'Insufficient balance (concurrent modification detected).'
            })

        source.balance -= amount
        source.save()

        debit_tx = Transaction.objects.create(
            bank_account=source,
            transaction_type=TransactionType.DEBIT,
            amount=amount,
            currency=Currency.EUR,
            description=f'{description} to {target_iban}',
            reference_iban=target_iban,
            balance_after=source.balance,
            idempotency_key=idempotency_key
        )

        if target_account_id:
            target = BankAccount.objects.select_for_update().get(id=target_account_id)
            target.balance += amount
            target.save()

            credit_idempotency = hashlib.sha256(
                f'{idempotency_key}_credit'.encode()
            ).hexdigest()[:64]

            credit_tx = Transaction.objects.create(
                bank_account=target,
                transaction_type=TransactionType.CREDIT,
                amount=amount,
                currency=Currency.EUR,
                description=f'{description} from {source.iban}',
                reference_iban=source.iban,
                balance_after=target.balance,
                idempotency_key=credit_idempotency,
                related_transaction=debit_tx
            )

            debit_tx.related_transaction = credit_tx
            debit_tx.save(update_fields=['related_transaction'])

        return debit_tx


class TransactionHistorySerializer(serializers.Serializer):

    account_id = serializers.UUIDField(required=False)
    transaction_type = serializers.ChoiceField(
        choices=TransactionType.choices,
        required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    min_amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        required=False
    )
    max_amount = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        required=False
    )

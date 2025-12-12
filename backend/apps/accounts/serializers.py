from rest_framework import serializers
from decimal import Decimal
from .models import BankAccount, ApplicationStatus, Currency
from apps.users.models import UserRole


class BankAccountSerializer(serializers.ModelSerializer):

    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    has_linked_card = serializers.BooleanField(read_only=True)

    class Meta:
        model = BankAccount
        fields = [
            'id', 'client', 'client_name', 'client_email', 'iban',
            'currency', 'balance', 'status', 'rejection_reason',
            'has_linked_card', 'approved_by', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'iban', 'balance', 'status', 'rejection_reason',
            'approved_by', 'created_at', 'updated_at'
        ]


class BankAccountCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = BankAccount
        fields = ['currency']

    def validate_currency(self, value):
        if value != Currency.EUR:
            raise serializers.ValidationError('Only EUR is used.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user

        pending_count = BankAccount.objects.filter(
            client=user,
            status=ApplicationStatus.PENDING
        ).count()

        if pending_count >= 1:
            raise serializers.ValidationError("You have a pending application.")
        return attrs

    def create(self, validated_data):
        validated_data['client'] = self.context['request'].user
        return super().create(validated_data)


class BankAccountApprovalSerializer(serializers.Serializer):

    status = serializers.ChoiceField(choices=ApplicationStatus.choices)
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        if attrs['status'] == ApplicationStatus.REJECTED and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required.'
            })
        return attrs


class DepositSerializer(serializers.Serializer):

    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal(0.01))
    description = serializers.CharField(max_length=255, required=False, default='Deposit by banker')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Must be > than zero')
        return value

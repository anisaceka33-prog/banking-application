from rest_framework import serializers
from decimal import Decimal

from apps.cards.models import Card, CardType
from apps.accounts.models import ApplicationStatus


class CardSerializer(serializers.ModelSerializer):

    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    account_iban = serializers.CharField(source='bank_account.iban', read_only=True)
    masked_number = serializers.CharField(read_only=True)

    class Meta:
        model = Card
        fields = [
            'id', 'client', 'client_name', 'client_email', 'bank_account',
            'account_iban', 'card_type', 'card_number', 'masked_number',
            'monthly_salary', 'status', 'rejection_reason', 'expiry_date',
            'approved_by', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'card_number', 'status', 'rejection_reason', 'expiry_date',
            'approved_by', 'created_at', 'updated_at'
        ]


class CardCreateSerializer(serializers.ModelSerializer):

    MINIMUM_SALARY = Decimal(500.00)

    class Meta:
        model = Card
        fields = ['bank_account', 'monthly_salary']

    def validate_bank_account(self, value):
        user = self.context['request'].user

        if value.client != user:
            raise serializers.ValidationError(
                'You cant apply for cards different than your account'
            )

        if value.status != ApplicationStatus.APPROVED:
            raise serializers.ValidationError(
                'The selected bank account should be approved.'
            )

        if value.cards.filter(status=ApplicationStatus.APPROVED).exists():
            raise serializers.ValidationError(
                'This account already has an active card linked to it.'
            )

        if value.cards.filter(status=ApplicationStatus.PENDING).exists():
            raise serializers.ValidationError(
                'There is already a pending card application for this account.'
            )

        return value

    def validate_monthly_salary(self, value):
        if value <= Decimal(0):
            raise serializers.ValidationError('Monthly salary must be positive.')

        return value

    def validate(self, attrs):
        if attrs['monthly_salary'] < self.MINIMUM_SALARY:
            attrs['_auto_reject'] = True
            attrs['_rejection_reason'] = (
                f'Monthly salary must be at least €{self.MINIMUM_SALARY}. '
                f'Your declared salary: €{attrs["monthly_salary"]}'
            )
        return attrs

    def create(self, validated_data):
        auto_reject = validated_data.pop('_auto_reject', False)
        rejection_reason = validated_data.pop('_rejection_reason', '')
        validated_data['client'] = self.context['request'].user
        validated_data['card_type'] = CardType.DEBIT

        card = Card(
            bank_account=validated_data['bank_account'],
            monthly_salary=validated_data['monthly_salary'],
            card_type=validated_data['card_type'],
            client=validated_data['client']
        )
        if auto_reject:
            card.status = ApplicationStatus.REJECTED
            card.rejection_reason = rejection_reason

        card.save()
        return card


class CardApprovalSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ApplicationStatus.choices)
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        if attrs['status'] == ApplicationStatus.REJECTED and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required'
            })
        return attrs

from django.contrib import admin
from .models import BankAccount
from apps.cards.models import Card
from apps.transactions.models import Transaction


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['iban', 'client', 'balance', 'currency', 'status', 'created_at']
    search_fields = ['iban', 'client__email']
    list_filter = ['status', 'currency']


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ['masked_number', 'client', 'bank_account', 'status', 'created_at']
    search_fields = ['card_number', 'client__email', 'bank_account__iban']
    list_filter = ['status', 'card_type']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'bank_account', 'transaction_type', 'amount', 'currency', 'created_at']
    search_fields = ['id', 'bank_account__iban']
    list_filter = ['transaction_type', 'currency']

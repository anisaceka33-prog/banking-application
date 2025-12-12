import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import BankAccount, ApplicationStatus
from apps.cards.models import Card
from apps.transactions.models import Transaction, TransactionType
from apps.users.models import User, UserRole
import uuid

# region Authentication
@pytest.mark.django_db
class TestAuthentication:

    def test_login_success(self, client):
        user = User.objects.create_user(
            email='test@bank.al',
            password='TestPass123.',
            role=UserRole.CLIENT
        )

        url = reverse('token_obtain_pair')
        response = client.post(url, {
            'email': 'test@bank.al',
            'password': 'TestPass123.'
        })

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data


@pytest.mark.django_db
class TestUserManagement:

    def test_admin_can_create_banker(self, authenticated_admin):
        url = reverse('banker-list')
        response = authenticated_admin.post(url, {
            'email': 'banker@bank.al',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'Banker',
            'phone_number': '+1234567890'
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email='banker@bank.al', role=UserRole.BANKER).exists()

    def test_banker_can_create_client(self, authenticated_banker):
        url = reverse('client-list')
        response = authenticated_banker.post(url, {
            'email': 'client@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'Client',
            'phone_number': '+1234567890',
            'address': '123'
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email='client@test.com', role=UserRole.CLIENT).exists()

    def test_banker_cannot_create_banker(self, authenticated_banker):
        url = reverse('banker-list')
        response = authenticated_banker.post(url, {
            'email': 'banker2@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'Banker'
        })

        assert response.status_code == status.HTTP_403_FORBIDDEN
# endregion

#region Bank Account Management
@pytest.mark.django_db
class TestBankAccounts:

    def test_client_can_apply_for_account(self, authenticated_client):
        url = reverse('account-list')
        response = authenticated_client.post(url, {
            'currency': 'EUR'
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == ApplicationStatus.PENDING
        assert Decimal(response.data['balance']) == Decimal(0.00)

    def test_banker_can_approve_account(self, authenticated_banker, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.PENDING
        )

        url = reverse('account-detail', args=[account.id])
        response = authenticated_banker.patch(url, {
            'status': 'APPROVED'
        })

        assert response.status_code == status.HTTP_200_OK
        account.refresh_from_db()
        assert account.status == ApplicationStatus.APPROVED
        assert account.approved_by == banker_user

    def test_banker_can_reject_account(self, authenticated_banker, client_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.PENDING
        )

        url = reverse('account-detail', args=[account.id])
        response = authenticated_banker.patch(url, {
            'status': 'REJECTED',
            'rejection_reason': 'Incomplete documentation'
        })

        assert response.status_code == status.HTTP_200_OK
        account.refresh_from_db()
        assert account.status == ApplicationStatus.REJECTED
        assert account.rejection_reason == 'Incomplete documentation'

    def test_cannot_reprocess_already_processed_account(self, authenticated_banker, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('account-detail', args=[account.id])
        response = authenticated_banker.patch(url, {
            'status': 'REJECTED'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_client_can_only_view_own_accounts(self, authenticated_client, client_user):
        own_account = BankAccount.objects.create(client=client_user)

        other_user = User.objects.create_user(
            email='other@test.com',
            password='TestPass123!',
            role=UserRole.CLIENT
        )
        other_account = BankAccount.objects.create(client=other_user)

        url = reverse('account-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        account_ids = [acc['id'] for acc in response.data['results']]
        assert str(own_account.id) in account_ids
        assert str(other_account.id) not in account_ids
# endregion

#region Deposits
@pytest.mark.django_db
class TestDeposits:

    def test_banker_can_deposit_to_approved_account(self, authenticated_banker, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            balance=Decimal(0.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('account-deposit', args=[account.id])
        response = authenticated_banker.post(url, {
            'amount': 500.00,
            'description': 'Initial deposit'
        })

        assert response.status_code == status.HTTP_200_OK
        account.refresh_from_db()
        assert account.balance == Decimal(500.00)

        transaction = Transaction.objects.filter(bank_account=account).first()
        assert transaction is not None
        assert transaction.transaction_type == TransactionType.CREDIT
        assert transaction.amount == Decimal(500.00)

    def test_cannot_deposit_to_pending_account(self, authenticated_banker, client_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.PENDING
        )

        url = reverse('account-deposit', args=[account.id])
        response = authenticated_banker.post(url, {
            'amount': 500.00
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_client_cannot_make_deposit(self, authenticated_client, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('account-deposit', args=[account.id])
        response = authenticated_client.post(url, {
            'amount': 500.00
        })

        assert response.status_code == status.HTTP_403_FORBIDDEN

#endregion

#region Card Management
@pytest.mark.django_db
class TestCards:

    def test_client_can_apply_for_card(self, authenticated_client, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('card-list')
        response = authenticated_client.post(url, {
            'bank_account': str(account.id),
            'monthly_salary': 2000.00
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == ApplicationStatus.PENDING

    def test_banker_can_approve_card(self, authenticated_banker, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        card = Card.objects.create(
            client=client_user,
            bank_account=account,
            monthly_salary=Decimal(2000.00),
            status=ApplicationStatus.PENDING
        )

        url = reverse('card-detail', args=[card.id])
        response = authenticated_banker.patch(url, {
            'status': 'APPROVED'
        })

        assert response.status_code == status.HTTP_200_OK
        card.refresh_from_db()
        assert card.status == ApplicationStatus.APPROVED
        assert card.expiry_date is not None

    def test_banker_can_reject_card(self, authenticated_banker, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        card = Card.objects.create(
            client=client_user,
            bank_account=account,
            monthly_salary=Decimal(2000.00),
            status=ApplicationStatus.PENDING
        )

        url = reverse('card-detail', args=[card.id])
        response = authenticated_banker.patch(url, {
            'status': 'REJECTED',
            'rejection_reason': 'Insufficient income'
        })

        assert response.status_code == status.HTTP_200_OK
        card.refresh_from_db()
        assert card.status == ApplicationStatus.REJECTED

    def test_low_salary_auto_rejection(self, authenticated_client, client_user, banker_user):
        account = BankAccount.objects.create(
            client=client_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('card-list')
        response = authenticated_client.post(url, {
            'bank_account': str(account.id),
            'monthly_salary': 400.00
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == ApplicationStatus.REJECTED
        assert 'Monthly salary must be at least' in response.data['rejection_reason']

#endregion

#region Transactions & Transfers
@pytest.mark.django_db
class TestTransactions:

    def test_successful_transfer_between_accounts(self, authenticated_client, client_user, banker_user):
        source_account = BankAccount.objects.create(
            client=client_user,
            balance=Decimal(1000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        Card.objects.create(
            client=client_user,
            bank_account=source_account,
            monthly_salary=Decimal(2000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        target_client = User.objects.create_user(
            email='target@test.com',
            password='TestPass123!',
            role=UserRole.CLIENT
        )
        target_account = BankAccount.objects.create(
            client=target_client,
            balance=Decimal(0.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('transaction-list')
        response = authenticated_client.post(url, {
            'source_account': str(source_account.id),
            'target_iban': target_account.iban,
            'amount': 250.00,
            'description': 'Test transfer',
            'idempotency_key': str(uuid.uuid4())
        })

        assert response.status_code == status.HTTP_201_CREATED

        source_account.refresh_from_db()
        target_account.refresh_from_db()
        assert source_account.balance == Decimal(750.00)
        assert target_account.balance == Decimal(250.00)

    def test_transfer_without_active_card_fails(self, authenticated_client, client_user, banker_user):
        source_account = BankAccount.objects.create(
            client=client_user,
            balance=Decimal(1000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        target_client = User.objects.create_user(
            email='target@test.com',
            password='TestPass123!',
            role=UserRole.CLIENT
        )
        target_account = BankAccount.objects.create(
            client=target_client,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('transaction-list')
        response = authenticated_client.post(url, {
            'source_account': str(source_account.id),
            'target_iban': target_account.iban,
            'amount': 250.00,
            'idempotency_key': str(uuid.uuid4())
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_insufficient_balance_rejection(self, authenticated_client, client_user, banker_user):
        source_account = BankAccount.objects.create(
            client=client_user,
            balance=Decimal(100.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        Card.objects.create(
            client=client_user,
            bank_account=source_account,
            monthly_salary=Decimal(2000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        target_client = User.objects.create_user(
            email='target@test.com',
            password='TestPass123!',
            role=UserRole.CLIENT
        )
        target_account = BankAccount.objects.create(
            client=target_client,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        url = reverse('transaction-list')
        response = authenticated_client.post(url, {
            'source_account': str(source_account.id),
            'target_iban': target_account.iban,
            'amount': '500.00',
            'idempotency_key': str(uuid.uuid4())
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_transaction_prevention(self, authenticated_client, client_user, banker_user):
        source_account = BankAccount.objects.create(
            client=client_user,
            balance=Decimal(1000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        Card.objects.create(
            client=client_user,
            bank_account=source_account,
            monthly_salary=Decimal(2000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        target_client = User.objects.create_user(
            email='target@test.com',
            password='TestPass123!',
            role=UserRole.CLIENT
        )
        target_account = BankAccount.objects.create(
            client=target_client,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )

        idempotency_key = str(uuid.uuid4())
        url = reverse('transaction-list')

        response1 = authenticated_client.post(url, {
            'source_account': str(source_account.id),
            'target_iban': target_account.iban,
            'amount': '250.00',
            'idempotency_key': idempotency_key
        })
        assert response1.status_code == status.HTTP_201_CREATED

        response2 = authenticated_client.post(url, {
            'source_account': str(source_account.id),
            'target_iban': target_account.iban,
            'amount': '250.00',
            'idempotency_key': idempotency_key  
        })
        assert response2.status_code == status.HTTP_400_BAD_REQUEST

    def test_client_can_only_view_own_transactions(self, authenticated_client, client_user, banker_user):
        own_account = BankAccount.objects.create(
            client=client_user,
            balance=Decimal(1000.00),
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        Transaction.objects.create(
            bank_account=own_account,
            transaction_type=TransactionType.CREDIT,
            amount=Decimal(1000.00),
            currency='EUR',
            description='Deposit',
            balance_after=Decimal(1000.00)
        )

        other_user = User.objects.create_user(
            email='other@test.com',
            password='TestPass123!',
            role=UserRole.CLIENT
        )
        other_account = BankAccount.objects.create(
            client=other_user,
            status=ApplicationStatus.APPROVED,
            approved_by=banker_user
        )
        Transaction.objects.create(
            bank_account=other_account,
            transaction_type=TransactionType.CREDIT,
            amount=Decimal(500.00),
            currency='EUR',
            description='Other deposit',
            balance_after=Decimal(500.00)
        )

        url = reverse('transaction-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['description'] == 'Deposit'
#endregion

#region Integration Tests
@pytest.mark.django_db
class TestCompleteWorkflows:
    def test_complete_banking_journey(self, authenticated_banker, authenticated_admin):
        banker_url = reverse('banker-list')
        banker_response = authenticated_admin.post(banker_url, {
            'email': 'newbanker@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'New',
            'last_name': 'Banker',
            'phone_number': '+1234567890'
        })
        assert banker_response.status_code == status.HTTP_201_CREATED

        client_url = reverse('client-list')
        client_response = authenticated_banker.post(client_url, {
            'email': 'newclient@test.com',
            'password': 'ClientPass123!',
            'password_confirm': 'ClientPass123!',
            'first_name': 'New',
            'last_name': 'Client',
            'phone_number': '+9876543210',
            'address': '123'
        })
        assert client_response.status_code == status.HTTP_201_CREATED
        client = User.objects.get(email='newclient@test.com')

        from rest_framework.test import APIClient
        client_api = APIClient()
        client_api.force_authenticate(user=client)

        account_url = reverse('account-list')
        account_response = client_api.post(account_url, {'currency': 'EUR'})
        assert account_response.status_code == status.HTTP_201_CREATED
        account_id = account_response.data['id']

        approval_url = reverse('account-detail', args=[account_id])
        approval_response = authenticated_banker.patch(approval_url, {'status': 'APPROVED'})
        assert approval_response.status_code == status.HTTP_200_OK

        deposit_url = reverse('account-deposit', args=[account_id])
        deposit_response = authenticated_banker.post(deposit_url, {
            'amount': 5000.00,
            'description': 'Welcome bonus'
        })
        assert deposit_response.status_code == status.HTTP_200_OK

        card_url = reverse('card-list')
        card_response = client_api.post(card_url, {
            'bank_account': account_id,
            'monthly_salary': 3000.00
        })
        assert card_response.status_code == status.HTTP_201_CREATED
        card_id = card_response.data['id']

        card_approval_url = reverse('card-detail', args=[card_id])
        card_approval_response = authenticated_banker.patch(card_approval_url, {'status': 'APPROVED'})
        assert card_approval_response.status_code == status.HTTP_200_OK

        account = BankAccount.objects.get(id=account_id)
        assert account.balance == Decimal(5000.00)
        assert account.status == ApplicationStatus.APPROVED

        card = Card.objects.get(id=card_id)
        assert card.status == ApplicationStatus.APPROVED
        assert card.expiry_date is not None
#endregion
import pytest
from rest_framework.test import APIClient
from apps.users.models import User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin@test.com',
        password='TestPass123!',
        first_name='Admin',
        last_name='User',
        role=UserRole.ADMIN
    )


@pytest.fixture
def banker_user(db):
    return User.objects.create_user(
        email='banker@test.com',
        password='TestPass123!',
        first_name='Banker',
        last_name='User',
        role=UserRole.BANKER
    )


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email='client@test.com',
        password='TestPass123!',
        first_name='Client',
        last_name='User',
        role=UserRole.CLIENT
    )


@pytest.fixture
def authenticated_admin(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def authenticated_banker(banker_user):
    client = APIClient()
    client.force_authenticate(user=banker_user)
    return client


@pytest.fixture
def authenticated_client(client_user):
    client = APIClient()
    client.force_authenticate(user=client_user)
    return client

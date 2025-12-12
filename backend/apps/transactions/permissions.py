from rest_framework import permissions
from apps.users.models import UserRole


class CanCreateTransaction(permissions.BasePermission):

    message = 'Only clients can initiate transactions.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.CLIENT
        )


class CanViewTransactions(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.BANKER, UserRole.CLIENT]

    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.BANKER:
            return True

        return obj.bank_account.client == request.user

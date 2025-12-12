from rest_framework import permissions
from apps.users.models import UserRole


class IsBankerOrOwner(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.BANKER, UserRole.CLIENT]

    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.BANKER:
            return True

        if hasattr(obj, 'client'):
            return obj.client == request.user

        return False


class CanApproveApplications(permissions.BasePermission):

    message = 'Only bankers can approve or reject applications'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.BANKER
        )


class CanCreateAccount(permissions.BasePermission):

    message = 'Only clients can apply for bank accounts'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.CLIENT
        )

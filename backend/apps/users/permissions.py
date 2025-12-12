from rest_framework import permissions
from .models import UserRole


class IsAdmin(permissions.BasePermission):

    message = 'Only administrators can do this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class IsBanker(permissions.BasePermission):

    message = 'Only bankers can do this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.BANKER
        )


class IsClient(permissions.BasePermission):

    message = 'Only clients can do this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.CLIENT
        )


class IsAdminOrBanker(permissions.BasePermission):

    message = 'Only administrators or bankers can do this action.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.ADMIN, UserRole.BANKER]
        )


class IsBankerOrReadOnlyClient(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == UserRole.BANKER:
            return True

        if request.user.role == UserRole.CLIENT:
            return request.method in permissions.SAFE_METHODS

        return False


class IsOwnerOrBanker(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.BANKER:
            return True

        if hasattr(obj, 'client'):
            return obj.client == request.user

        if hasattr(obj, 'user'):
            return obj.user == request.user

        return False


class CanManageBankers(permissions.BasePermission):

    message = 'Only administrators can manage banker accounts.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class CanManageClients(permissions.BasePermission):

    message = 'Only bankers can manage client accounts.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.BANKER
        )

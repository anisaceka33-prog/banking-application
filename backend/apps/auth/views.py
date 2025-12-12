from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
import logging
from apps.users.models import User
from apps.users.serializers import UserSerializer
from .serializers import CustomTokenObtainPairSerializer

logger = logging.getLogger('banking')

class CustomTokenObtainPairView(TokenObtainPairView):

    serializer_class = CustomTokenObtainPairSerializer

class LogoutView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated]

    @extend_schema(
        description='Logout user and add to blacklist the refresh token',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'refresh': {'type': 'string', 'description': 'Refresh token to blacklist'}
                },
                'required': ['refresh']
            }
        },
        responses={
            200: {'description': 'Logged out and token blacklisted'},
            400: {'description': 'Invalid or missing refresh token'}
        }
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            logger.info(f'User {request.user.email} logged out successfully')
            return Response(
                {'detail': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f'Logout error for user {request.user.email}: {str(e)}')
            return Response(
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )

class CurrentUserView(generics.RetrieveAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

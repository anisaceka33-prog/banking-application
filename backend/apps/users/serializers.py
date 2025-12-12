from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from .models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone_number', 'address', 'date_of_birth',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

def validate_name(value, field_label):
    if not value:
        raise serializers.ValidationError(f"{field_label} is required.")

    cleaned = value.strip()

    if not re.match(r'^[a-zA-Z\s\-\']+$', cleaned):
        raise serializers.ValidationError(
            f"{field_label} can only contain letters."
        )

    return cleaned.title()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name',
            'phone_number', 'address', 'date_of_birth'
        ]

    def validate_email(self, value):
        email = value.lower().strip()

        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            raise serializers.ValidationError("You email address is not correct")

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")

        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))

        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain one uppercase letter")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain one lowercase letter")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain one digit")
        if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', value):
            raise serializers.ValidationError("Password must contain one special character")

        return value

    def validate_phone_number(self, value):
        if value:
            cleaned = re.sub(r'[\s\-\+]', '', value)
            if not re.match(r'^\+?[0-9]{10,15}$', value):
                raise serializers.ValidationError("Enter a valid phone number (10/15 digits).")
        return value

    def validate_first_name(self, value):
        return validate_name(value, "First name")

    def validate_last_name(self, value):
        return validate_name(value, "Last name")

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class BankerCreateSerializer(UserCreateSerializer):
    def create(self, validated_data):
        validated_data["role"] = UserRole.BANKER

        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        return super().create(validated_data)


class ClientCreateSerializer(UserCreateSerializer):
    def create(self, validated_data):
        validated_data["role"] = UserRole.CLIENT

        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        return super().create(validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone_number',
            'address', 'date_of_birth', 'is_active'
        ]

    def validate_email(self, value):
        if value:
            email = value.lower().strip()
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, email):
                raise serializers.ValidationError("Enter a valid email address")

            # Check if email is already taken by another user
            if User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
                raise serializers.ValidationError("A user with this email already exists.")

            return email
        return value

    def validate(self, attrs):
        request = self.context.get("request")

        if request and request.user == self.instance:
            if attrs.get("is_active") is False:
                raise serializers.ValidationError({
                    "is_active": "You cannot deactivate your own account."
                })

        return attrs

    def validate_first_name(self, value):
        if value:
            return validate_name(value, "First name")
        return value

    def validate_last_name(self, value):
        if value:
            return validate_name(value, "Last name")
        return value

    def validate_phone_number(self, value):
        if value:
            cleaned = re.sub(r'[\s\-\+]', '', value)
            if not re.match(r'^\+?[0-9]{10,15}$', value):
                raise serializers.ValidationError("Enter a valid phone number (10–15 digits).")
        return value

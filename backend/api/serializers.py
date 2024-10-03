# backend/api/serializers.py

from rest_framework import serializers
from .models import User, Exercise, WorkoutPlan, WorkoutLog, ExerciseLog, WorkoutSession
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.hashers import make_password

UserModel = get_user_model()

class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = '__all__'

class WorkoutPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutPlan
        fields = ['id', 'user', 'plan_data', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class WorkoutLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutLog
        fields = '__all__'

class ExerciseLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseLog
        fields = '__all__'

class WorkoutSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSession
        fields = ['id', 'user', 'date']
        read_only_fields = ['id', 'user', 'date']

class UserSerializer(serializers.ModelSerializer):
    # Ensure 'username' is unique and read-only
    username = serializers.CharField(
        required=True,
        validators=[UniqueValidator(queryset=UserModel.objects.all())]
    )
    # Make 'email' optional but unique if provided
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        validators=[UniqueValidator(queryset=UserModel.objects.all())]
    )
    # Handle password fields
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    sex = serializers.CharField(required=True)
    # Explicitly define first and last name
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    # Ensure 'strength_goals' and 'equipment' are treated as strings
    strength_goals = serializers.CharField(required=True)
    equipment = serializers.CharField(required=True)
    additional_goals = serializers.CharField(allow_blank=True, required=False)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = UserModel
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'sex',
            'password', 'confirm_password', 'age', 'weight', 'height',
            'fitness_level', 'strength_goals', 'additional_goals',
            'equipment', 'workout_time', 'workout_days', 'profile_picture',
            'profile_picture_url',
        ]
        read_only_fields = ['id']

    def validate(self, data):
        """
        Check that the two password entries match if they are provided.
        """
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        if password or confirm_password:
            if password != confirm_password:
                raise serializers.ValidationError({"password": "Passwords must match."})
        return data


    def validate_email(self, value):
        # Allow email to be optional
        if value == '':
            return None
        return value

    def create(self, validated_data):
        # Remove confirm_password from validated_data as it's not needed for user creation
        validated_data.pop('confirm_password', None)

        # Optionally, clean 'strength_goals' and 'equipment' by stripping extra whitespace
        strength_goals = validated_data.get('strength_goals', '')
        if isinstance(strength_goals, str):
            validated_data['strength_goals'] = strength_goals.strip()

        equipment = validated_data.get('equipment', '')
        if isinstance(equipment, str):
            validated_data['equipment'] = equipment.strip()

        # Hash the password if provided
        password = validated_data.pop('password', None)
        if password:
            validated_data['password'] = make_password(password)

        try:
            user = User.objects.create(**validated_data)
            return user
        except IntegrityError:
            raise serializers.ValidationError({"detail": "A user with this username or email already exists."})


    def update(self, instance, validated_data):
        # Remove 'confirm_password' from the data
        validated_data.pop('confirm_password', None)
        # Extract 'password' if provided
        password = validated_data.pop('password', None)
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # Update password if provided
        if password:
            instance.set_password(password)
        instance.save()
        return instance
    
    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return None

class UserRegistrationSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    sex = serializers.ChoiceField(choices=User.SEX_CHOICES, required=True)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'confirm_password', 'first_name',
            'last_name', 'email', 'age', 'weight', 'height',
            'fitness_level', 'strength_goals', 'additional_goals',
            'equipment', 'workout_time', 'workout_days', 'sex'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return attrs

    def create(self, validated_data):
        # Log the validated data
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Validated data in create method: {validated_data}")
        
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # This hashes the password
        user.save()
        return user

# backend/api/serializers.py

from rest_framework import serializers
from .models import (
    User, Exercise, WorkoutPlan, WorkoutLog, ExerciseLog,
    WorkoutSession, TrainingSession,
    StrengthGoal, Equipment, YouTubeVideo
)
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from datetime import timedelta

UserModel = get_user_model()


class StrengthGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrengthGoal
        fields = ['id', 'name']


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    # Ensure 'username' is unique
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
    # Nested serializers
    strength_goals = StrengthGoalSerializer(many=True, read_only=True)
    equipment = EquipmentSerializer(many=True, read_only=True)
    additional_goals = serializers.CharField(allow_blank=True, required=False)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    profile_picture_url = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()

    class Meta:
        model = UserModel
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'sex',
            'password', 'confirm_password', 'age', 'weight', 'height',
            'fitness_level', 'strength_goals', 'additional_goals',
            'equipment', 'workout_time', 'workout_days', 'profile_picture',
            'profile_picture_url', 'member_since',
        ]
        read_only_fields = ['id']

    def get_member_since(self, obj):
        """
        Returns the date the user joined in a formatted string.
        """
        return obj.date_joined.strftime("%B %d, %Y") if obj.date_joined else None

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


class ExerciseSerializer(serializers.ModelSerializer):
    video_id = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = ['id', 'name', 'description', 'video_url', 'videoId', 'video_id']
        extra_kwargs = {
            'description': {'required': False, 'allow_null': True},
            'video_url': {'required': False, 'allow_null': True},
            'videoId': {'required': False, 'allow_null': True},
        }

    def get_video_id(self, obj):
        return obj.get_cached_video_id()


class NestedExerciseSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=True)
    setsReps = serializers.CharField(required=False, allow_blank=True)
    equipment = serializers.CharField(required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    videoId = serializers.CharField(required=False, allow_blank=True)
    description = serializers.DictField(required=False, allow_null=True)
    video_url = serializers.URLField(required=False, allow_null=True)


class WorkoutPlanSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    workoutDays = serializers.SerializerMethodField()
    additionalTips = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutPlan
        fields = ['id', 'user', 'workoutDays', 'additionalTips', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def get_workoutDays(self, obj):
        """
        Extracts 'workoutDays' from the 'plan_data' JSONField.
        Returns a list of workout days with exercises.
        """
        workout_days_data = obj.plan_data.get('workoutDays', [])
        serialized_workout_days = []
        for day in workout_days_data:
            exercises = day.get('exercises', [])
            serialized_exercises = NestedExerciseSerializer(exercises, many=True).data
            serialized_day = {
                'day': day.get('day', ''),
                'duration': day.get('duration', ''),
                'exercises': serialized_exercises
            }
            serialized_workout_days.append(serialized_day)
        return serialized_workout_days

    def get_additionalTips(self, obj):
        """
        Extracts 'additionalTips' from the 'plan_data' JSONField.
        Returns a list of tips.
        """
        return obj.plan_data.get('additionalTips', [])


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


class UserRegistrationSerializer(serializers.ModelSerializer):
    strength_goals = serializers.PrimaryKeyRelatedField(
        many=True, queryset=StrengthGoal.objects.all()
    )
    equipment = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Equipment.objects.all()
    )
    confirm_password = serializers.CharField(write_only=True)
    sex = serializers.ChoiceField(choices=UserModel.SEX_CHOICES, required=True)

    class Meta:
        model = UserModel
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
        strength_goals = validated_data.pop('strength_goals', [])
        equipment = validated_data.pop('equipment', [])
        password = validated_data.pop('password')
        validated_data.pop('confirm_password')

        user = UserModel(**validated_data)
        user.set_password(password)
        user.save()

        user.strength_goals.set(strength_goals)
        user.equipment.set(equipment)

        return user


class TrainingSessionSerializer(serializers.ModelSerializer):
    workout_plan = WorkoutPlanSerializer(read_only=True)
    workout_plan_id = serializers.PrimaryKeyRelatedField(
        queryset=WorkoutPlan.objects.all(),
        source='workout_plan',
        write_only=True,
        required=False
    )
    emoji_feedback = serializers.ChoiceField(
        choices=TrainingSession.EMOJI_FEEDBACK_CHOICES, 
        required=False
    )

    class Meta:
        model = TrainingSession
        fields = [
            'id',
            'user',
            'date',
            'workout_plan',
            'workout_plan_id',
            'session_name',
            'week_number',
            'emoji_feedback',
            'comments'
        ]
        read_only_fields = ['user', 'created_at']

    def validate(self, data):
        request = self.context.get('request')
        user = request.user  # Get the user from the request context
        session_name = data.get('session_name')
        date = data.get('date')

        if not session_name:
            raise serializers.ValidationError({'session_name': 'This field is required.'})
        if not date:
            raise serializers.ValidationError({'date': 'This field is required.'})

        # Check for existing session on the same day
        if TrainingSession.objects.filter(user=user, session_name=session_name, date=date).exists():
            raise serializers.ValidationError('You have already logged this session for today.')

        # Check for existing session in the same week
        start_of_week = date - timedelta(days=date.weekday())  # Monday
        end_of_week = start_of_week + timedelta(days=6)  # Sunday

        if TrainingSession.objects.filter(
            user=user,
            session_name=session_name,
            date__range=(start_of_week, end_of_week)
        ).exists():
            raise serializers.ValidationError('You have already logged this session for this week.')

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user
        validated_data['user'] = user  # Assign the user to validated_data
        return super().create(validated_data)


class YouTubeVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = YouTubeVideo
        fields = '__all__'

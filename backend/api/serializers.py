# api/serializers.py
from rest_framework import serializers
from .models import User, Exercise, WorkoutPlan, WorkoutLog, ExerciseLog, UserProfile
from django.contrib.auth import get_user_model

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

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'name',
            'age',
            'weight',
            'height',
            'fitness_level',
            'strength_goals',
            'additional_goals',
            'equipment',
            'workout_time',
            'workout_days',
        ]

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    userprofile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['username', 'password', 'confirm_password', 'userprofile']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('userprofile')
        validated_data.pop('confirm_password')  # Remove confirm_password since it's not a field on User
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, **profile_data)
        return user


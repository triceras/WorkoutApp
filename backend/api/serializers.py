# backend/api/serializers.py

from rest_framework import serializers
from .models import (
    User, Exercise, WorkoutPlan, WorkoutLog, ExerciseLog,
    WorkoutSession, TrainingSession, TrainingSessionExercise,
    StrengthGoal, Equipment, YouTubeVideo
)
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from datetime import timedelta

UserModel = get_user_model()

class NullableIntegerField(serializers.IntegerField):
    def to_internal_value(self, data):
        if data in ('', None):
            return None
        return super().to_internal_value(data)


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
        fields = ['id', 'name', 'description', 'video_url', 'videoId', 'video_id', 'exercise_type']
        extra_kwargs = {
            'description': {'required': False, 'allow_null': True},
            'video_url': {'required': False, 'allow_null': True},
            'videoId': {'required': False, 'allow_null': True},
            'exercise_type': {'required': False},
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
        fields = [
            'id',
            'user',
            'workoutDays',
            'additionalTips',
            'created_at',
        ]
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
                'type': day.get('type', 'workout'),  # Default to 'workout' if not specified
                'workout_type': day.get('workout_type', ''),  # Added this line
                'duration': day.get('duration', '') if day.get('type', 'workout') == 'workout' else '',
                'exercises': serialized_exercises if day.get('type', 'workout') == 'workout' else [],
                'notes': day.get('notes', '') if day.get('type', 'workout') == 'rest' else '',
            }
            serialized_workout_days.append(serialized_day)
        return serialized_workout_days

    def get_additionalTips(self, obj):
        """
        Extracts 'additionalTips' from the 'plan_data' JSONField.
        Returns a list of tips.
        """
        return obj.plan_data.get('additionalTips', [])
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Capitalize 'workout_type' if necessary
        if 'workout_type' in representation and representation['workout_type']:
            representation['workout_type'] = representation['workout_type'].capitalize()
        return representation

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
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        validators=[UniqueValidator(queryset=UserModel.objects.all())]
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

    def validate_email(self, value):
        # Allow email to be optional
        if value == '':
            return None
        return value


class TrainingSessionExerciseSerializer(serializers.ModelSerializer):
    """
    Serializer for TrainingSessionExercise model.
    Handles the intermediary relationship between TrainingSession and Exercise.
    """
    exercise_id = serializers.PrimaryKeyRelatedField(
        queryset=Exercise.objects.all(),
        source='exercise',
        write_only=True,
        required=True,
        help_text="Primary key of the Exercise."
    )
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)
    weight = serializers.FloatField(allow_null=True, required=False)
    
    # Aerobic-specific fields
    duration = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Duration of the aerobic exercise in minutes."
    )
    calories_burned = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Calories burned during the aerobic exercise."
    )
    average_heart_rate = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Average heart rate during the aerobic exercise."
    )
    max_heart_rate = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Maximum heart rate achieved during the aerobic exercise."
    )
    intensity = serializers.ChoiceField(
        choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('High', 'High')],
        required=False,
        allow_null=True,
        help_text="Intensity level of the aerobic exercise."
    )

    class Meta:
        model = TrainingSessionExercise
        fields = [
            'id', 'exercise_id', 'exercise_name', 'sets', 'reps', 'weight',
            'duration', 'calories_burned', 'average_heart_rate', 'max_heart_rate', 'intensity'
        ]

    def validate(self, data):
        exercise = data.get('exercise')
        if exercise and exercise.exercise_type == 'aerobic':
            required_fields = ['duration', 'calories_burned', 'average_heart_rate', 'max_heart_rate', 'intensity']
            for field in required_fields:
                if field not in data or data[field] in [None, '']:
                    raise serializers.ValidationError({field: f"{field.replace('_', ' ').capitalize()} is required for aerobic exercises."})
        return data

    def validate_sets(self, value):
        if value < 1:
            raise serializers.ValidationError("Sets must be at least 1.")
        return value

    def validate_reps(self, value):
        if value < 1:
            raise serializers.ValidationError("Reps must be at least 1.")
        return value

    def validate_weight(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Weight cannot be negative.")
        return value


class TrainingSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for TrainingSession model.
    Handles conditional fields based on workout_type.
    """
    workout_plan = WorkoutPlanSerializer(read_only=True)
    workout_plan_id = serializers.PrimaryKeyRelatedField(
        queryset=WorkoutPlan.objects.none(),  # Initialized in __init__
        source='workout_plan',
        write_only=True,
        required=True,
        help_text="Primary key of the associated WorkoutPlan."
    )
    emoji_feedback = serializers.ChoiceField(
        choices=TrainingSession.EMOJI_FEEDBACK_CHOICES, 
        required=False
    )
    exercises = TrainingSessionExerciseSerializer(
        source='training_session_exercises',
        many=True,
        required=False,
        help_text="List of exercises for this training session."
    )
    calories_burned = NullableIntegerField(allow_null=True, required=False)
    heart_rate_pre = NullableIntegerField(allow_null=True, required=False)
    heart_rate_post = NullableIntegerField(allow_null=True, required=False)
    intensity = serializers.CharField(
        max_length=50, 
        allow_blank=True, 
        allow_null=True, 
        required=False,
        help_text="Intensity level of the workout (e.g., Low, Moderate, High). Required for aerobic workouts."
    )
    time = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        help_text="Duration of the aerobic workout in minutes."
    )
    average_heart_rate = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        help_text="Average heart rate during the aerobic workout."
    )
    max_heart_rate = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        help_text="Maximum heart rate reached during the aerobic workout."
    )
    source = serializers.CharField(write_only=True, required=True)

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
            'workout_type',  # Added workout_type to fields
            'emoji_feedback',
            'comments',
            'duration',
            'calories_burned',
            'heart_rate_pre',
            'heart_rate_post',
            'time',
            'average_heart_rate',
            'max_heart_rate',
            'intensity',
            'exercises',
            'source',
        ]
        read_only_fields = ['user', 'created_at', 'week_number', 'workout_plan']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context['request'].user
        self.fields['workout_plan_id'].queryset = WorkoutPlan.objects.filter(user=user)

    def validate(self, data):
        """
        Perform conditional validations based on workout_type.
        """
        workout_type = data.get('workout_type')
        aerobic_workouts = ['Cardio', 'Endurance', 'Speed', 'Agility', 'Plyometric', 'Core']

        errors = {}

        if workout_type in aerobic_workouts:
            # Aerobic workouts require specific fields
            required_fields = ['time', 'average_heart_rate', 'max_heart_rate', 'intensity']
            for field in required_fields:
                if field not in data or data[field] in [None, '']:
                    errors[field] = f"{field.replace('_', ' ').capitalize()} is required for aerobic workouts."

            # Additional validations
            average_hr = data.get('average_heart_rate')
            max_hr = data.get('max_heart_rate')

            if average_hr and max_hr and average_hr > max_hr:
                errors['average_heart_rate'] = "Average heart rate cannot exceed max heart rate."

            # Validate intensity choices if intensity has predefined choices
            valid_intensities = ['Low', 'Moderate', 'High']
            intensity = data.get('intensity')
            if intensity and intensity not in valid_intensities:
                errors['intensity'] = f"Intensity must be one of {valid_intensities}."

        else:
            # Non-aerobic workouts should not include aerobic-specific fields
            forbidden_fields = ['time', 'average_heart_rate', 'max_heart_rate', 'intensity']
            for field in forbidden_fields:
                if field in data and data[field] not in [None, '']:
                    errors[field] = f"{field.replace('_', ' ').capitalize()} should not be provided for non-aerobic workouts."

        if errors:
            raise serializers.ValidationError(errors)

        return data

    def create(self, validated_data, **kwargs):
        user = kwargs.get('user', self.context['request'].user)
        exercises_data = validated_data.pop('exercises', [])
        source = validated_data.pop('source', None)  # Handle 'source' if needed

        # Remove 'user' from validated_data if it exists
        validated_data.pop('user', None)

        training_session = TrainingSession.objects.create(user=user, **validated_data)

        for exercise_data in exercises_data:
            TrainingSessionExercise.objects.create(
                training_session=training_session,
                exercise=exercise_data['exercise'],
                sets=exercise_data['sets'],
                reps=exercise_data['reps'],
                weight=exercise_data.get('weight'),
                duration=exercise_data.get('duration'),
                calories_burned=exercise_data.get('calories_burned'),
                average_heart_rate=exercise_data.get('average_heart_rate'),
                max_heart_rate=exercise_data.get('max_heart_rate'),
                intensity=exercise_data.get('intensity'),
            )

        return training_session


    def update(self, instance, validated_data):
        """
        Update a TrainingSession instance and its related TrainingSessionExercise instances.
        """
        exercises_data = validated_data.pop('exercises', None)
        source = validated_data.pop('source', None)  # Handle 'source' if needed

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if exercises_data is not None:
            # Clear existing exercises
            instance.training_session_exercises.all().delete()
            # Add new exercises
            for exercise_data in exercises_data:
                TrainingSessionExercise.objects.create(
                    training_session=instance,
                    exercise=exercise_data['exercise'],
                    sets=exercise_data['sets'],
                    reps=exercise_data['reps'],
                    weight=exercise_data.get('weight'),
                    duration=exercise_data.get('duration'),
                    calories_burned=exercise_data.get('calories_burned'),
                    average_heart_rate=exercise_data.get('average_heart_rate'),
                    max_heart_rate=exercise_data.get('max_heart_rate'),
                    intensity=exercise_data.get('intensity'),
                )

        return instance


class YouTubeVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = YouTubeVideo
        fields = '__all__'

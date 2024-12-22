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
import json
import logging

logger = logging.getLogger(__name__)

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
    instructions = serializers.JSONField(required=False)
    sets = serializers.IntegerField(required=False)
    reps = serializers.IntegerField(required=False)
    weight = serializers.FloatField(required=False)
    rest_time = serializers.IntegerField(required=False)
    duration = serializers.CharField(required=False)
    intensity = serializers.CharField(required=False)
    exercise_type = serializers.CharField(required=False)
    tracking_type = serializers.CharField(required=False)
    video_id = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = ['id', 'name', 'description', 'instructions', 'sets', 'reps', 
                 'weight', 'rest_time', 'duration', 'intensity', 'exercise_type', 
                 'tracking_type', 'muscle_group', 'video_id',
                 'thumbnail_url', 'video_url']

    def get_video_id(self, obj):
        if hasattr(obj, 'videoId') and obj.videoId:
            return obj.videoId
        elif hasattr(obj, 'video_url') and obj.video_url:
            try:
                return obj.extract_youtube_id(obj.video_url)
            except:
                return None
        return None

    def get_thumbnail_url(self, obj):
        video_id = self.get_video_id(obj)
        if video_id:
            return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure instructions is properly parsed from JSON if stored as string
        if isinstance(data.get('instructions'), str):
            try:
                data['instructions'] = json.loads(data['instructions'])
            except (json.JSONDecodeError, TypeError):
                data['instructions'] = {'steps': [data.get('instructions', '')]}
        return data


class NestedExerciseSerializer(ExerciseSerializer):
    class Meta(ExerciseSerializer.Meta):
        fields = ExerciseSerializer.Meta.fields


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
        try:
            plan_data = obj.plan_data
            if isinstance(plan_data, str):
                plan_data = json.loads(plan_data)
            
            workout_days_data = plan_data.get('workoutDays', [])
            serialized_workout_days = []
            
            for day in workout_days_data:
                exercises = day.get('exercises', [])
                serialized_exercises = []
                
                for exercise in exercises:
                    # Get or create Exercise instance to access video methods
                    exercise_obj = Exercise.objects.filter(name__iexact=exercise.get('name', '')).first()
                    
                    # Process instructions
                    instructions = exercise.get('instructions', {})
                    if isinstance(instructions, str):
                        try:
                            instructions = json.loads(instructions)
                        except json.JSONDecodeError:
                            instructions = {'steps': [instructions]}
                    
                    # Format instructions properly
                    formatted_instructions = {
                        'setup': instructions.get('setup', ''),
                        'execution': instructions.get('execution', []),
                        'form_tips': instructions.get('form_tips', [])
                    }
                    
                    processed_exercise = {
                        'name': exercise.get('name', ''),
                        'exercise_type': exercise.get('exercise_type', exercise.get('type', 'strength')),
                        'tracking_type': exercise.get('tracking_type', 'reps_based'),
                        'sets': exercise.get('sets', 3),
                        'reps': exercise.get('reps', 10),
                        'weight': exercise.get('weight', 0),
                        'rest_time': exercise.get('rest_time', 60),
                        'duration': exercise.get('duration', '30 minutes'),
                        'intensity': exercise.get('intensity', 'moderate'),
                        'instructions': formatted_instructions,
                        'muscle_group': exercise.get('muscle_group', '')
                    }
                    
                    # Add video information if exercise exists in database
                    if exercise_obj:
                        video_id = None
                        if hasattr(exercise_obj, 'videoId') and exercise_obj.videoId:
                            video_id = exercise_obj.videoId
                        elif hasattr(exercise_obj, 'video_url') and exercise_obj.video_url:
                            try:
                                video_id = exercise_obj.extract_youtube_id(exercise_obj.video_url)
                            except:
                                pass
                        
                        if video_id:
                            processed_exercise.update({
                                'video_id': video_id,
                                'video_url': exercise_obj.video_url,
                                'thumbnail_url': f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                            })
                    
                    serialized_exercises.append(processed_exercise)
                
                day_type = day.get('type', 'workout')
                serialized_day = {
                    'day': day.get('day', ''),
                    'type': day_type,
                    'workout_type': day.get('workout_type', ''),
                    'duration': day.get('duration', '') if day_type in ['workout', 'active_recovery'] else '',
                    'exercises': serialized_exercises if day_type in ['workout', 'active_recovery'] else [],
                    'notes': day.get('notes', '') if day_type == 'rest' else '',
                }
                serialized_workout_days.append(serialized_day)
                
            return serialized_workout_days
        except Exception as e:
            logger.error(f"Error processing workout days: {str(e)}")
            return []

    def get_additionalTips(self, obj):
        """
        Extracts 'additionalTips' from the 'plan_data' JSONField.
        Returns a list of tips.
        """
        try:
            plan_data = obj.plan_data
            if isinstance(plan_data, str):
                plan_data = json.loads(plan_data)
            return plan_data.get('additionalTips', [])
        except Exception as e:
            logger.error(f"Error processing additional tips: {str(e)}")
            return []


class WorkoutLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutLog
        fields = '__all__'


class ExerciseLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseLog
        fields = ['exercise', 'sets', 'reps', 'weight', 'duration', 'intensity']

    INTENSITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'), 
        ('high', 'High')
    ]

    duration = serializers.IntegerField(required=False, allow_null=True)
    intensity = serializers.ChoiceField(choices=INTENSITY_CHOICES, required=False, allow_null=True)


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
    """Serializer for TrainingSessionExercise model.
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
    exercise_type = serializers.CharField(source='exercise.exercise_type', read_only=True) # Add this line
    tracking_type = serializers.CharField(source='exercise.tracking_type', read_only=True) # Add this line
    
    # Fields for strength exercises
    sets = serializers.IntegerField(required=False, allow_null=True)
    reps = serializers.IntegerField(required=False, allow_null=True)
    weight = serializers.FloatField(required=False, allow_null=True)
    
    # Fields for cardio exercises
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
            'id', 'exercise_id', 'exercise_name', 'exercise_type', 'tracking_type',
            'sets', 'reps', 'weight',
            'duration', 'calories_burned', 'average_heart_rate', 'max_heart_rate', 'intensity'
        ]

    def validate(self, data):
        """
        Validate the exercise data based on exercise type.
        """
        exercise = data.get('exercise')
        if not exercise:
            raise serializers.ValidationError("Exercise is required")

        exercise_type = exercise.exercise_type.lower()
        
        # For time-based exercises
        if exercise_type in ['cardio', 'recovery', 'flexibility', 'stretching'] or data.get('tracking_type') == 'time_based':
            # Remove strength-specific fields
            data.pop('sets', None)
            data.pop('reps', None)
            data.pop('weight', None)
            
            # Handle duration field
            duration = data.get('duration')
            if duration:
                if isinstance(duration, str):
                    # Extract numeric value from string (e.g., "30 minutes" -> 30)
                    import re
                    match = re.search(r'\d+', duration)
                    if match:
                        data['duration'] = int(match.group())
                    else:
                        raise serializers.ValidationError({'duration': 'Invalid duration format'})
                elif isinstance(duration, (int, float)):
                    data['duration'] = int(duration)
                else:
                    raise serializers.ValidationError({'duration': 'Duration must be a number or string'})
            
            # Set default intensity if not provided
            if not data.get('intensity'):
                data['intensity'] = 'Moderate'
                
        # For strength exercises
        elif exercise_type == 'strength':
            # Remove cardio-specific fields
            data.pop('duration', None)
            data.pop('intensity', None)
            data.pop('average_heart_rate', None)
            data.pop('max_heart_rate', None)
            data.pop('calories_burned', None)
            
            # Validate required strength fields
            if not data.get('sets'):
                data['sets'] = 1
            if not data.get('reps'):
                data['reps'] = 1

        return data

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
        source='session_exercises',
        many=True,
        required=False,
        help_text="List of exercises for this training session."
    )
    calories_burned = NullableIntegerField(allow_null=True, required=False)
    heart_rate_pre = NullableIntegerField(allow_null=True, required=False)
    heart_rate_post = NullableIntegerField(allow_null=True, required=False)
    comments = serializers.CharField(allow_blank=True, required=False)
    intensity = serializers.ChoiceField(
        choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('High', 'High')],
        allow_null=True,
        required=False,
        help_text="Overall intensity level of the workout"
    )
    time = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        help_text="Duration of the workout in minutes."
    )
    average_heart_rate = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        help_text="Average heart rate during the workout."
    )
    max_heart_rate = serializers.IntegerField(
        required=False, 
        allow_null=True, 
        help_text="Maximum heart rate reached during the workout."
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
            'workout_type',
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
        Validate the training session data.
        """
        workout_type = data.get('workout_type', '').lower()
        
        # For cardio/endurance workouts
        if workout_type in ['cardio', 'endurance']:
            # Ensure time/duration is provided
            if not data.get('time'):
                raise serializers.ValidationError({'time': 'Duration is required for cardio workouts'})
            
            # Set default intensity if not provided
            if not data.get('intensity'):
                data['intensity'] = 'Moderate'
            else:
                # Ensure intensity is properly capitalized
                data['intensity'] = data['intensity'].capitalize()
            
            # Remove any strength-specific fields
            data.pop('sets', None)
            data.pop('reps', None)
            data.pop('weight', None)
        
        # For strength workouts
        elif workout_type == 'strength':
            # Remove cardio-specific fields
            data.pop('time', None)
            data.pop('intensity', None)
            data.pop('average_heart_rate', None)
            data.pop('max_heart_rate', None)

        return data

    def create(self, validated_data):
        exercises_data = validated_data.pop('session_exercises', [])  # Changed source to session_exercises
        # Remove source field as it's not part of the model
        validated_data.pop('source', None)

        # Set the comments field from validated_data
        comments = validated_data.pop('comments', '')  # Get comments or default to empty string
        training_session = TrainingSession.objects.create(comments=comments, **validated_data)

        for exercise_data in exercises_data:
            exercise = exercise_data.pop('exercise')
            TrainingSessionExercise.objects.create(
                training_session=training_session,
                exercise=exercise,
                **exercise_data
            )

        return training_session


class YouTubeVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = YouTubeVideo
        fields = '__all__'

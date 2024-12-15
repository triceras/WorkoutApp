# backend/api/views.py

from rest_framework import viewsets, permissions, status, generics, filters, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Avg, Count
from django.core.cache import cache
from django.conf import settings
from .models import (
    Exercise,
    WorkoutPlan,
    WorkoutLog,
    ExerciseLog,
    WorkoutSession,
    TrainingSession,
    TrainingSessionExercise,
    StrengthGoal,
    Equipment,
    YouTubeVideo
)
from .tasks import process_feedback_submission_task, generate_workout_plan_task, process_negative_feedback
from .helpers import get_video_data_by_id
from .services.analysis import calculate_progression_metrics
from .serializers import (
    ExerciseSerializer,
    WorkoutPlanSerializer,
    WorkoutLogSerializer,
    ExerciseLogSerializer,
    WorkoutSessionSerializer,
    UserSerializer,
    UserRegistrationSerializer,
    TrainingSessionSerializer,
    StrengthGoalSerializer,
    EquipmentSerializer,
    YouTubeVideoSerializer,
)
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def by_exercise_name(self, request):
        exercise_name = request.query_params.get('exercise_name')
        if exercise_name:
            videos = self.queryset.filter(exercise_name__icontains=exercise_name)
            serializer = self.get_serializer(videos, many=True)
            return Response(serializer.data)
        else:
            return Response({'error': 'exercise_name parameter is required.'}, status=400)
        
    def perform_create(self, serializer):
        # Set default exercise type if not provided
        if not serializer.validated_data.get('exercise_type'):
            serializer.validated_data['exercise_type'] = 'strength'
        serializer.save()


class YouTubeVideoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A simple ViewSet for viewing YouTube videos.
    """
    queryset = YouTubeVideo.objects.all()
    serializer_class = YouTubeVideoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['exercise_name', 'title']


class WorkoutPlanViewSet(viewsets.ModelViewSet):
    queryset = WorkoutPlan.objects.all()
    serializer_class = WorkoutPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutPlan.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Retrieve the current workout plan for the authenticated user.
        If no workout plan exists, initiate the generation of a new one.
        """
        try:
            workout_plan = WorkoutPlan.objects.get(user=request.user)
            serializer = WorkoutPlanSerializer(workout_plan, context={'request': request})
            logger.info(f"Retrieved workout plan for user: {request.user.username}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        except WorkoutPlan.DoesNotExist:
            logger.info(
                "No workout plan found for user: %s. Initiating generation.",
                request.user.username
            )
            # Trigger the Celery task to generate the workout plan
            generate_workout_plan_task.delay(request.user.id)
            return Response(
                {"message": "Your workout plan is being generated. Please check back shortly."},
                status=status.HTTP_202_ACCEPTED
            )

    def create(self, request, *args, **kwargs):
        user = request.user
        plan_data = request.data.get('plan_data', '')

        if not plan_data:
            return Response(
                {'detail': 'No plan data provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            workout_plan, created = WorkoutPlan.objects.update_or_create(
                user=user,
                defaults={'plan_data': plan_data}
            )
            serializer = WorkoutPlanSerializer(workout_plan, context={'request': request})
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(serializer.data, status=status_code)
        except IntegrityError as e:
            logger.error(f'IntegrityError creating/updating workout plan for user {user.username}: {str(e)}', exc_info=True)
            return Response(
                {'detail': 'A workout plan already exists for this user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f'Error creating/updating workout plan for user {user.username}: {str(e)}', exc_info=True)
            return Response(
                {'detail': 'An error occurred while creating/updating the workout plan.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)  # Reuse create logic for update


class WorkoutLogViewSet(viewsets.ModelViewSet):
    queryset = WorkoutLog.objects.all()
    serializer_class = WorkoutLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutLog.objects.filter(user=self.request.user)


class WorkoutSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A simple ViewSet for viewing workout sessions.
    """
    queryset = WorkoutSession.objects.all()
    serializer_class = WorkoutSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutSession.objects.filter(user=self.request.user)


class ExerciseLogViewSet(viewsets.ModelViewSet):
    queryset = ExerciseLog.objects.all()
    serializer_class = ExerciseLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExerciseLog.objects.filter(workout_log__user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user, context={'request': request})  # Updated line
    logger.info(f"Retrieved user data for {request.user.username}: {serializer.data}")
    return Response(serializer.data)


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        logger.info(f"Received login data: {request.data}")
        serializer = self.serializer_class(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
            logger.info(f"User {user.username} logged in successfully. Token: {token.key}")
            return Response({
                'token': token.key,
                'user': user_data
            })
        else:
            # Log the specific validation errors
            logger.warning(f"Login validation failed for data {request.data}. Errors: {serializer.errors}")
            # Log the attempted username to check if it exists
            username = request.data.get('username')
            if username:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user_exists = User.objects.filter(username=username).exists()
                logger.info(f"Username '{username}' exists in database: {user_exists}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_workout_plan_status(request):
    try:
        workout_plan = WorkoutPlan.objects.get(user=request.user)
        return Response({
            'status': 'completed',
            'plan_data': workout_plan.plan_data
        }, status=status.HTTP_200_OK)
    except WorkoutPlan.DoesNotExist:
        return Response({
            'status': 'pending',
            'message': 'Your workout plan is being generated. Please wait.'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching workout plan for user {request.user.username}: {e}", exc_info=True)
        return Response({
            'status': 'error',
            'message': 'An error occurred while fetching your workout plan.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])  # Changed from 'POST' to 'GET'
@permission_classes([IsAuthenticated])
def verify_token(request):
    user = request.user
    serializer = UserSerializer(user, context={'request': request})
    return Response({'token_valid': True, 'user': serializer.data}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    try:
        request.user.auth_token.delete()
        logger.info(f"User {request.user.username} logged out.")
    except Exception as e:
        logger.error(f"Error during logout for user {request.user.username}: {str(e)}", exc_info=True)
        return Response({'detail': 'Error during logout.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_video_details(request):
    video_id = request.GET.get('video_id')
    if not video_id:
        return Response({'error': 'video_id parameter is required.'}, status=400)
    
    video_data = get_video_data_by_id(video_id)
    if video_data:
        source = 'cache' if 'cached_at' in video_data else 'api'
        return Response({'source': source, 'data': video_data}, status=200)
    
    return Response({'error': 'Video not found or could not be fetched.'}, status=404)


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                # Generate token using DRF's Token model
                token, created = Token.objects.get_or_create(user=user)
                logger.info(f"Token created for user: {user.username}")

                # Enqueue the workout plan generation task
                generate_workout_plan_task.delay(user.id)
                logger.info(f"Invoking generate_workout_plan_task for user ID: {user.id}")

                return Response({
                    "token": token.key,
                    "user": UserSerializer(user, context={'request': request}).data,
                    "message": "Registration successful. Your workout plan is being generated. Please wait."
                }, status=status.HTTP_201_CREATED)
            except IntegrityError as e:
                logger.error(f"IntegrityError during registration for user {request.data.get('username')}: {str(e)}", exc_info=True)
                return Response({"error": "A user with this information already exists."}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Unexpected error during registration: {str(e)}", exc_info=True)
                return Response({"error": "An unexpected error occurred during registration."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        logger.warning(f"Registration failed for data {request.data}. Errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Restrict queryset to the authenticated user
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        Retrieve or update the authenticated user's profile.
        GET: Retrieve user data.
        PATCH: Update user data.
        """
        if request.method == 'GET':
            serializer = self.get_serializer(request.user, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)


class TrainingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing training sessions."""
    serializer_class = TrainingSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get queryset filtered by user."""
        queryset = TrainingSession.objects.filter(user=self.request.user)
        
        # Get query parameters
        date_str = self.request.query_params.get('date', None)
        workout_type = self.request.query_params.get('workout_type', None)
        
        if date_str:
            try:
                # Convert date string to datetime with time set to start of day
                date = timezone.datetime.strptime(date_str, '%Y-%m-%d')
                date = timezone.make_aware(date)  # Make timezone-aware
                next_day = date + timezone.timedelta(days=1)
                queryset = queryset.filter(date__gte=date, date__lt=next_day)
            except ValueError:
                raise serializers.ValidationError({'date': 'Invalid date format. Use YYYY-MM-DD'})
        
        if workout_type:
            queryset = queryset.filter(workout_type=workout_type)
        
        return queryset.order_by('-date')

    def perform_create(self, serializer):
        """Create a new training session."""
        try:
            # Set the user before saving
            serializer.save(user=self.request.user)
        except Exception as e:
            logger.error(f"Error creating training session: {str(e)}", exc_info=True)
            raise serializers.ValidationError(f"Failed to create training session: {str(e)}")

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Get all completed training sessions."""
        sessions = self.get_queryset().filter(source='completed')
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_training_session(request):
    """
    Log a training session with feedback.
    """
    try:
        data = request.data.copy()
        data['user'] = request.user.id
        data['source'] = 'completed'  # Set source to 'completed'
        
        serializer = TrainingSessionSerializer(data=data)
        if serializer.is_valid():
            session = serializer.save()
            
            # Check if feedback is negative and needs processing
            emoji_feedback = data.get('emoji_feedback')
            if emoji_feedback is not None and emoji_feedback <= 2:  # 0, 1, or 2 are negative ratings
                # Trigger the feedback processing task
                process_negative_feedback.delay(session.id)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class StrengthGoalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StrengthGoal.objects.all()
    serializer_class = StrengthGoalSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class EquipmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class UserProgressionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get progression metrics for the user."""
        try:
            logger.info(f"Fetching progression metrics for user {request.user.id}")
            
            # Get all completed training sessions for the user with related exercises
            training_sessions = TrainingSession.objects.filter(
                user=request.user,
                source='completed'  # Only include completed sessions
            ).order_by('-date').select_related('user').prefetch_related(
                'trainingsessionexercise_set',
                'trainingsessionexercise_set__exercise'
            )
            
            total_sessions = training_sessions.count()
            logger.info(f"Found {total_sessions} total training sessions")

            if total_sessions == 0:
                logger.info("No training sessions found, returning empty metrics")
                return Response({
                    'total_sessions': 0,
                    'recent_sessions': 0,
                    'older_sessions': 0,
                    'workout_types': {'recent': {}, 'previous': {}},
                    'strength_progress': {},
                    'cardio_progress': {},
                    'total_duration': 0,
                    'avg_duration': 0,
                    'total_calories': 0,
                    'sessions': []
                })

            # Calculate time periods
            today = timezone.now().date()
            thirty_days_ago = today - timezone.timedelta(days=30)
            ninety_days_ago = today - timezone.timedelta(days=90)

            # Get recent sessions (last 30 days)
            recent_sessions = list(training_sessions.filter(date__gte=thirty_days_ago))
            logger.info(f"Found {len(recent_sessions)} recent sessions")
            
            # Get older sessions (30-90 days ago)
            older_sessions = list(training_sessions.filter(
                date__lt=thirty_days_ago,
                date__gte=ninety_days_ago
            ))
            logger.info(f"Found {len(older_sessions)} older sessions")

            # Calculate metrics
            try:
                metrics = calculate_progression_metrics(
                    recent_sessions,
                    older_sessions,
                    request.user
                )
                logger.info("Successfully calculated progression metrics")
                return Response(metrics)
            except Exception as calc_error:
                logger.error(f"Error calculating metrics: {str(calc_error)}", exc_info=True)
                return Response(
                    {"error": "Failed to calculate progression metrics", "detail": str(calc_error)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            logger.error(f"Error in progression view: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch progression data", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CheckUsernameView(APIView):
    authentication_classes = []  # Allow unauthenticated access
    permission_classes = []

    def get(self, request):
        username = request.query_params.get('username', None)
        if username:
            if User.objects.filter(username=username).exists():
                return Response({'available': False}, status=status.HTTP_200_OK)
            else:
                return Response({'available': True}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Username not provided.'}, status=status.HTTP_400_BAD_REQUEST)


class CheckEmailView(APIView):
    authentication_classes = []  # Allow unauthenticated access
    permission_classes = []

    def get(self, request):
        email = request.query_params.get('email', None)
        if email:
            exists = User.objects.filter(email=email).exists()
            return Response({"available": not exists})
        return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)


class RegistrationOptionsView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            strength_goals = StrengthGoal.objects.all()
            equipment = Equipment.objects.all()
            
            return Response({
                "strength_goals": StrengthGoalSerializer(strength_goals, many=True).data,
                "equipment": EquipmentSerializer(equipment, many=True).data,
                "sex_choices": [{"value": choice[0], "label": choice[1]} for choice in User.SEX_CHOICES],
                "fitness_levels": [
                    {"value": "beginner", "label": "Beginner"},
                    {"value": "intermediate", "label": "Intermediate"},
                    {"value": "advanced", "label": "Advanced"}
                ],
                "workout_time_options": [
                    {"value": "30", "label": "30 minutes"},
                    {"value": "45", "label": "45 minutes"},
                    {"value": "60", "label": "60 minutes"},
                    {"value": "90", "label": "90 minutes"}
                ],
                "workout_days_options": [
                    {"value": "2", "label": "2 days per week"},
                    {"value": "3", "label": "3 days per week"},
                    {"value": "4", "label": "4 days per week"},
                    {"value": "5", "label": "5 days per week"}
                ]
            })
        except Exception as e:
            logger.error(f"Error fetching registration options: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch registration options"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

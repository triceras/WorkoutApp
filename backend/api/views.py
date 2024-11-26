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
from .models import Exercise, WorkoutPlan, WorkoutLog, ExerciseLog, WorkoutSession, User, TrainingSession, StrengthGoal, Equipment, YouTubeVideo
from .tasks import process_feedback_submission_task, generate_workout_plan_task
from .helpers import get_video_data_by_id
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

import logging
from django.utils import timezone




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
            workout_plan = WorkoutPlan.objects.filter(user=request.user).latest('created_at')
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
        except Exception as e:
            logger.error(f'Error creating/updating workout plan: {str(e)}', exc_info=True)
            return Response(
                {'detail': 'An error occurred while creating/updating the workout plan.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
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
        except Exception as e:
            logger.error(f'Error updating workout plan: {str(e)}', exc_info=True)
            return Response(
                {'detail': 'An error occurred while updating the workout plan.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            logger.info(f"User {user.username} logged in. Token: {token.key}")
            return Response({'token': token.key})
        else:
            logger.warning(f"Login failed. Errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_workout_plan_status(request):
    try:
        workout_plan = WorkoutPlan.objects.filter(user=request.user).latest('created_at')
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
                logger.error(f"IntegrityError during registration: {str(e)}", exc_info=True)
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        logger.warning(f"Registration failed. Errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
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
    queryset = TrainingSession.objects.all()
    serializer_class = TrainingSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TrainingSession.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Extract 'source' from request data
        source = request.data.get('source', '').lower()
        if not source:
            logger.warning(
                f"Training session creation failed: 'source' not provided by user {request.user.username}."
            )
            return Response(
                {'source': 'Source identifier is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate 'source' value
        if source not in ['dashboard', 'profile']:
            logger.warning(
                f"Training session creation failed: Invalid 'source' '{source}' by user {request.user.username}."
            )
            return Response(
                {'source': "Invalid source. Must be either 'dashboard' or 'profile'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Initialize serializer with data and context
        serializer = self.get_serializer(data=request.data, context={'request': request})
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            logger.error("Serializer validation failed: %s", e.detail, exc_info=True)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        # Extract the 'date' field from validated data
        session_date = serializer.validated_data.get('date')
        if not session_date:
            logger.warning(
                f"Training session creation failed: 'date' not provided by user {request.user.username}."
            )
            return Response(
                {'date': 'Date is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.now().date()

        # Perform date validation based on source
        if source == 'dashboard':
            if session_date != today:
                logger.warning(
                    f"Training session creation failed: Dashboard session date '{session_date}' is not today '{today}' for user {request.user.username}."
                )
                return Response(
                    {'date': "For Dashboard submissions, the date must be today's date."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif source == 'profile':
            one_week_ago = today - timedelta(days=7)
            if not (one_week_ago <= session_date <= today):
                logger.warning(
                    f"Training session creation failed: Profile session date '{session_date}' is not within the past week for user {request.user.username}."
                )
                return Response(
                    {'date': "For Profile submissions, the date must be within the past week up to today."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Save the training session
        training_session = serializer.save(user=request.user)
        logger.info(
            f"Training session created for user {request.user.username}: Session ID {training_session.id}"
        )

        # Implement the decision logic
        emoji_feedback = training_session.emoji_feedback
        comments = training_session.comments.strip() if training_session.comments else ''

        # Map emoji feedback values to labels
        EMOJI_LABELS = {
            0: 'Terrible',
            1: 'Very Bad',
            2: 'Bad',
            3: 'Okay',
            4: 'Good',
            5: 'Awesome',
        }

        emoji_label = EMOJI_LABELS.get(emoji_feedback)
        should_process_with_ai = False

        if emoji_label in ['Okay', 'Good', 'Awesome']:
            if comments and self._contains_modification_request(comments):
                # User wants modifications despite positive feedback
                should_process_with_ai = True
        elif emoji_label in ['Terrible', 'Very Bad', 'Bad']:
            if comments:
                # User provided negative feedback with comments
                should_process_with_ai = True

        if should_process_with_ai:
            # Trigger the Celery task to process feedback
            process_feedback_submission_task.delay(training_session.id)
            message = 'Feedback received. Your workout plan may be updated shortly.'
            logger.info(f"Processing feedback with AI for training session {training_session.id}")
        else:
            # Just store the feedback without modifying the workout plan
            message = 'Feedback received.'
            logger.info(f"No AI processing needed for training session {training_session.id}")

        # Prepare response data
        response_data = {
            'message': message,
            'training_session': self.get_serializer(training_session, context={'request': request}).data
        }

        headers = self.get_success_headers(serializer.data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def _contains_modification_request(self, comments):
        # Simple keyword-based check to see if the comments contain modification requests
        modification_keywords = [
            'add', 'remove', 'change', 'modify', 'increase', 'decrease',
            'swap', 'replace', 'adjust', 'intensity', 'difficulty', 'hard', 'easy'
        ]
        comments_lower = comments.lower()
        return any(keyword in comments_lower for keyword in modification_keywords)

class StrengthGoalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StrengthGoal.objects.all()
    serializer_class = StrengthGoalSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class EquipmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class UserProgressionView(APIView):
    permission_classes = [IsAuthenticated]  # Ensure the user is authenticated

    def get(self, request):
        user = request.user

        # Serialize user data
        user_serializer = UserSerializer(user, context={'request': request})

        # Retrieve the user's workout plan
        try:
            workout_plan = WorkoutPlan.objects.get(user=user)
            workout_plan_serializer = WorkoutPlanSerializer(workout_plan, context={'request': request})
        except WorkoutPlan.DoesNotExist:
            workout_plan_serializer = None

        # Retrieve the user's training sessions
        training_sessions = TrainingSession.objects.filter(user=user).order_by('-date')
        training_sessions_serializer = TrainingSessionSerializer(
            training_sessions,
            many=True,
            context={'request': request}
        )

        # Compile the progression data
        progression_data = {
            "user": user_serializer.data,
            "workout_plan": workout_plan_serializer.data if workout_plan_serializer else {},
            "training_sessions": training_sessions_serializer.data,
        }

        return Response(progression_data, status=status.HTTP_200_OK)

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
            if User.objects.filter(email=email).exists():
                return Response({'available': False}, status=status.HTTP_200_OK)
            else:
                return Response({'available': True}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Email not provided.'}, status=status.HTTP_400_BAD_REQUEST)

# api/views.py

from rest_framework import viewsets, permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Avg, Count
from .models import Exercise, WorkoutPlan, WorkoutLog, ExerciseLog, WorkoutSession, User, TrainingSession, StrengthGoal, Equipment
from .tasks import process_feedback_submission_task


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
    EquipmentSerializer
)
import logging
from .tasks import generate_workout_plan_task 

logger = logging.getLogger(__name__)
User = get_user_model()

class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        try:
            workout_plan = WorkoutPlan.objects.get(user=request.user)
            serializer = WorkoutPlanSerializer(workout_plan)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except WorkoutPlan.DoesNotExist:
            print(f"No workout plan found for user: {request.user.username}. Initiating generation.")
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
            serializer = WorkoutPlanSerializer(workout_plan)
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
            serializer = WorkoutPlanSerializer(workout_plan)
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
    # serializer = UserSerializer(request.user)
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

# @api_view(['POST'])
# @permission_classes([AllowAny])
# def register_user(request):
#     # ... registration logic ...
#     # Removed SessionFeedback related code
#     pass

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

@api_view(['GET'])  # Changed from 'POST' to 'GET'
@permission_classes([IsAuthenticated])
def verify_token(request):
    user = request.user
    return Response({'token_valid': True, 'user': UserSerializer(user).data}, status=status.HTTP_200_OK)

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
@permission_classes([permissions.IsAuthenticated])
def user_progression(request):
    user = request.user
    total_sessions = TrainingSession.objects.filter(user=user).count()
    average_feedback = TrainingSession.objects.filter(user=user).aggregate(Avg('emoji_feedback'))['emoji_feedback__avg']
    feedback_count = TrainingSession.objects.filter(user=user, emoji_feedback__isnull=False).count()

    # Additional progression metrics can be calculated here

    progression_data = {
        'total_sessions': total_sessions,
        'average_feedback': average_feedback,
        'feedback_count': feedback_count,
        # Include other metrics as needed
    }

    return Response(progression_data)

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
                    "user": UserSerializer(user).data,
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
            serializer = self.get_serializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
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
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            training_session = serializer.save(user=self.request.user)
            logger.info(f"Training session created for user {self.request.user.username}: Session ID {training_session.id}")

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

            # Determine whether to process feedback with AI
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
                'training_session': self.get_serializer(training_session).data
            }

            headers = self.get_success_headers(serializer.data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
        else:
            logger.warning(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    permission_classes = [permissions.IsAuthenticated]  # Ensure the user is authenticated

    def get(self, request):
        user = request.user

        # Retrieve the user's workout plan
        try:
            workout_plan = WorkoutPlan.objects.get(user=user)
            workout_plan_serializer = WorkoutPlanSerializer(workout_plan)
        except WorkoutPlan.DoesNotExist:
            return Response({"error": "Workout plan not found."}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve the user's training sessions
        training_sessions = TrainingSession.objects.filter(user=user).order_by('-date')
        training_sessions_serializer = TrainingSessionSerializer(training_sessions, many=True)

        # Compile the progression data
        progression_data = {
            "workout_plan": workout_plan_serializer.data,
            "training_sessions": training_sessions_serializer.data,
        }

        return Response(progression_data, status=status.HTTP_200_OK)

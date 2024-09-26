# api/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from .services import generate_workout_plan

from .models import Exercise, WorkoutPlan, WorkoutLog
from .serializers import (
    ExerciseSerializer,
    WorkoutPlanSerializer,
    WorkoutLogSerializer,
    UserSerializer,
)
from .services import generate_workout_plan  # Import the AI integration function

import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class ExerciseViewSet(viewsets.ModelViewSet):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.AllowAny]


class WorkoutPlanViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutPlan.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            user = request.user
            user_data = {
                'age': user.age,
                'weight': user.weight,
                'height': user.height,
                'fitness_level': user.fitness_level,
                'strength_goals': user.strength_goals,
                'equipment': user.equipment,
                'workout_time': user.workout_time,
                'workout_days': user.workout_days,
                # Include other necessary fields
            }

            workout_plan = generate_workout_plan(user_data)

            if not workout_plan:
                logger.error('Failed to generate workout plan.')
                return Response(
                    {'detail': 'Failed to generate workout plan.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            plan = WorkoutPlan.objects.create(user=user, plan_data=workout_plan)
            serializer = self.get_serializer(plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Error creating workout plan: {str(e)}')
            return Response(
                {'detail': 'An error occurred while creating the workout plan.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WorkoutLogViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    try:
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f'Error fetching user data: {str(e)}')
        return Response(
            {'detail': 'An error occurred while fetching user data.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.serializer_class(
                data=request.data, context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key})
        except Exception as e:
            logger.error(f'Login error: {str(e)}')
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_400_BAD_REQUEST,
            )

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Create a token for the new user
        token, created = Token.objects.get_or_create(user=user)
        return Response({'message': 'User registered successfully.', 'token': token.key}, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workout_plan(request):
    user = request.user
    try:
        # Ensure the user has an associated UserProfile
        if not hasattr(user, 'userprofile'):
            return Response({'error': 'UserProfile does not exist for this user.'}, status=400)

        # Generate the workout plan by passing the user object
        workout_plan = generate_workout_plan(user)

        if workout_plan:
            return Response({'workout_plan': workout_plan}, status=200)
        else:
            return Response({'error': 'Could not generate workout plan.'}, status=500)
    except Exception as e:
        print(f"Error generating workout plan: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    return Response({'message': 'Token is valid.'}, status=200)

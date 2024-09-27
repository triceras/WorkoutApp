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
        user = request.user
        try:
            # Check if a workout plan already exists
            workout_plan = WorkoutPlan.objects.filter(user=user).first()
            if workout_plan:
                serializer = self.get_serializer(workout_plan)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # Ensure the user has an associated UserProfile
                if not hasattr(user, 'userprofile'):
                    return Response(
                        {'detail': 'UserProfile does not exist for this user.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Generate the workout plan
                plan_data = generate_workout_plan(user)
                if not plan_data:
                    logger.error('Failed to generate workout plan.')
                    return Response(
                        {'detail': 'Failed to generate workout plan.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                workout_plan = WorkoutPlan.objects.create(user=user, plan_data=plan_data)
                serializer = WorkoutPlanSerializer(workout_plan)
                #serializer = self.get_serializer(workout_plan)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Error creating workout plan: {str(e)}', exc_info=True)
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
        # Check if a workout plan already exists for the user
        workout_plan = WorkoutPlan.objects.filter(user=user).first()
        if workout_plan:
            # Return the existing workout plan
            serializer = WorkoutPlanSerializer(workout_plan)
            return Response(serializer.data, status=200)
        else:
            # Ensure the user has an associated UserProfile
            if not hasattr(user, 'userprofile'):
                return Response({'error': 'UserProfile does not exist for this user.'}, status=400)

            # Generate the workout plan by passing the user object
            plan_data = generate_workout_plan(user)
            if plan_data:
                # Save the new workout plan
                workout_plan = WorkoutPlan.objects.create(user=user, plan_data=plan_data)
                serializer = WorkoutPlanSerializer(workout_plan)
                return Response(serializer.data, status=201)
            else:
                logger.error('Failed to generate workout plan.')
                return Response({'error': 'Could not generate workout plan.'}, status=500)

    except Exception as e:
        logger.error(f"Error in get_workout_plan: {str(e)}", exc_info=True)
        return Response({'error': 'An error occurred while retrieving the workout plan.'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_workout_plan(request):
    try:
        user = request.user  # The authenticated user
        workout_plan = generate_workout_plan(user)
        if workout_plan:
            return Response({'workout_plan': workout_plan}, status=200)
        else:
            return Response({'error': 'Could not generate workout plan.'}, status=500)
    except Exception as e:
        print(f"Error creating workout plan: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    return Response({'message': 'Token is valid.'}, status=200)

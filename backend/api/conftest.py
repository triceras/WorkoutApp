import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import WorkoutPlan, TrainingSession

User = get_user_model()

@pytest.fixture
def test_user():
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def test_workout_plan(test_user):
    return WorkoutPlan.objects.create(
        user=test_user,
        plan_data={
            'workoutDays': [
                {
                    'day': 'Day 1',
                    'type': 'workout',
                    'workout_type': 'Strength',
                    'exercises': [
                        {'name': 'Bench Press', 'sets': 3, 'reps': '8-10'},
                        {'name': 'Squats', 'sets': 3, 'reps': '8-10'}
                    ]
                }
            ]
        }
    )

@pytest.fixture
def test_training_session(test_user, test_workout_plan):
    return TrainingSession.objects.create(
        user=test_user,
        workout_type='Strength',
        date=timezone.now(),
        workout_plan=test_workout_plan
    )

@pytest.fixture
def sample_exercises():
    return [
        {
            'name': 'Bench Press',
            'sets': 3,
            'reps': 10,
            'weight': 135
        },
        {
            'name': 'Squats',
            'sets': 3,
            'reps': 10,
            'weight': 225
        }
    ]

@pytest.fixture
def mock_replicate_response():
    return "AI analysis: Great workout! Your form is improving and the exercise selection is well-balanced."

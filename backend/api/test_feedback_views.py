from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from api.models import TrainingSession, WorkoutPlan
from api.services import ReplicateServiceUnavailable, ReplicateRateLimitExceeded
import uuid

User = get_user_model()

class TrainingSessionViewTests(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test workout plan with UUID
        self.workout_plan = WorkoutPlan.objects.create(
            user=self.user,
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
        
        # URL for creating training sessions
        self.url = reverse('trainingsession-list')
        
        # Sample valid training session data
        self.valid_session_data = {
            'workout_type': 'Strength',
            'exercises': [
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
            ],
            'feedback_rating': 4,
            'feedback_notes': 'Great workout!',
            'workout_plan': str(self.workout_plan.id)  # Convert UUID to string
        }

    @patch('api.services.analyze_workout_feedback')
    def test_create_training_session_success(self, mock_analyze):
        """Test successful creation of training session with feedback"""
        # Mock successful feedback analysis
        mock_analyze.return_value = {
            'analysis': 'Good workout!',
            'recommendations': {'next_workout': 'Keep it up!'}
        }
        
        response = self.client.post(self.url, self.valid_session_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TrainingSession.objects.exists())
        self.assertIn('feedback_analysis', response.data)

    @patch('api.services.analyze_workout_feedback')
    def test_create_session_service_unavailable(self, mock_analyze):
        """Test handling of service unavailable error"""
        # Mock service unavailable
        mock_analyze.side_effect = ReplicateServiceUnavailable("Service unavailable")
        
        response = self.client.post(self.url, self.valid_session_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TrainingSession.objects.exists())
        self.assertIn('Analysis service temporarily unavailable', response.data['feedback_analysis'])

    @patch('api.services.analyze_workout_feedback')
    def test_create_session_rate_limit(self, mock_analyze):
        """Test handling of rate limit exceeded"""
        # Mock rate limit exceeded
        mock_analyze.side_effect = ReplicateRateLimitExceeded("Rate limit exceeded")
        
        response = self.client.post(self.url, self.valid_session_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TrainingSession.objects.exists())
        self.assertIn('Rate limit exceeded', response.data['feedback_analysis'])

    def test_create_session_invalid_data(self):
        """Test creation with invalid data"""
        # Remove required field
        invalid_data = self.valid_session_data.copy()
        del invalid_data['workout_type']
        
        response = self.client.post(self.url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_session_with_feedback(self):
        """Test creation with feedback processing"""
        response = self.client.post(self.url, {
            **self.valid_session_data,
            'feedback_rating': 5,
            'feedback_notes': 'Excellent workout! Personal best on squats.'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = TrainingSession.objects.first()
        self.assertEqual(session.emoji_feedback, 5)
        self.assertIn('feedback_analysis', response.data)

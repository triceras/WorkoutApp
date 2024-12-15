import pytest
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from unittest.mock import patch, MagicMock
from api.models import TrainingSession, WorkoutPlan
from api.services import (
    analyze_workout_feedback,
    get_cached_analysis,
    cache_analysis_result,
    check_rate_limit,
    get_performance_summary,
    get_feedback_specific_prompt,
    save_successful_workout_pattern,
    ReplicateServiceUnavailable,
    ReplicateRateLimitExceeded,
)
import json
import uuid

User = get_user_model()

class FeedbackAnalysisTests(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test workout plan
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
        
        # Create test training session
        self.training_session = TrainingSession.objects.create(
            user=self.user,
            workout_type='Strength',
            date=timezone.now(),
            workout_plan=self.workout_plan
        )
        
        # Clear cache before each test
        cache.clear()

    def test_caching_functions(self):
        """Test caching of analysis results"""
        # Test cache_analysis_result
        test_result = {'analysis': 'Test analysis', 'success': True}
        cache_analysis_result(self.training_session.id, test_result)
        
        # Test get_cached_analysis
        cached = get_cached_analysis(
            self.training_session.id,
            feedback_rating=4,
            feedback_notes='Great workout',
            workout_type='Strength',
            exercises=[{'name': 'Bench Press'}]
        )
        
        self.assertEqual(cached, test_result)

    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        # Should allow first 10 requests
        for i in range(10):
            self.assertTrue(check_rate_limit(self.user.id))
        
        # Should block 11th request
        self.assertFalse(check_rate_limit(self.user.id))

    @patch('api.services.Client')
    def test_analyze_workout_feedback_success(self, mock_client):
        """Test successful feedback analysis"""
        # Mock Replicate API response
        mock_client.return_value.run.return_value = "AI analysis response"
        
        exercises = [
            {'name': 'Bench Press', 'sets': 3, 'reps': 10},
            {'name': 'Squats', 'sets': 3, 'reps': 10}
        ]
        
        result = analyze_workout_feedback(
            self.training_session.id,
            feedback_rating=4,
            feedback_notes='Great workout!',
            workout_type='Strength',
            exercises=exercises
        )
        
        self.assertTrue(result['success'])
        self.assertIn('analysis', result)

    @patch('api.services.Client')
    def test_analyze_workout_feedback_service_unavailable(self, mock_client):
        """Test handling of service unavailability"""
        mock_client.return_value.run.side_effect = Exception("Service unavailable")
        
        with self.assertRaises(ReplicateServiceUnavailable):
            analyze_workout_feedback(
                self.training_session.id,
                feedback_rating=4,
                feedback_notes='Great workout!',
                workout_type='Strength',
                exercises=[{'name': 'Bench Press'}]
            )

    def test_performance_summary(self):
        """Test performance summary generation"""
        summary = get_performance_summary(self.user.id, self.workout_plan.id)
        self.assertIsInstance(summary, dict)
        self.assertIn('total_sessions', summary)
        self.assertIn('average_rating', summary)

    def test_save_successful_pattern(self):
        """Test saving successful workout patterns"""
        exercises = [
            {'name': 'Bench Press', 'sets': 3, 'reps': 10},
            {'name': 'Squats', 'sets': 3, 'reps': 10}
        ]
        
        save_successful_workout_pattern(
            self.user.id,
            self.workout_plan.id,
            'Strength',
            exercises
        )
        
        # Verify pattern is saved in cache
        cache_key = f"successful_pattern_{self.user.id}_{self.workout_plan.id}"
        pattern = cache.get(cache_key)
        self.assertIsNotNone(pattern)
        self.assertEqual(pattern['workout_type'], 'Strength')

    def tearDown(self):
        # Clean up after tests
        cache.clear()

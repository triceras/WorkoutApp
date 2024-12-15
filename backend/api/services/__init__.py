"""
Services package for the API.
"""

from .workout_plan import generate_workout_plan
from .profile import generate_profile_picture, generate_profile_picture_async
from .analysis import calculate_progression_metrics

__all__ = [
    'generate_workout_plan',
    'generate_profile_picture',
    'generate_profile_picture_async',
    'calculate_progression_metrics'
]

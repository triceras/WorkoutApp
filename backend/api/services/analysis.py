"""
Services for analyzing user workout data and calculating progression metrics.
"""

import logging
from collections import defaultdict
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

def calculate_progression_metrics(recent_sessions, older_sessions, user):
    """
    Calculate progression metrics comparing recent vs older sessions.
    
    Args:
        recent_sessions (list): List of TrainingSession objects from the last 30 days
        older_sessions (list): List of TrainingSession objects from 30-90 days ago
        user: User object
        
    Returns:
        dict: Dictionary containing various progression metrics
    """
    try:
        # Initialize metrics structure
        metrics = {
            'total_sessions': len(recent_sessions) + len(older_sessions),
            'recent_sessions': len(recent_sessions),
            'older_sessions': len(older_sessions),
            'workout_types': {
                'recent': defaultdict(int),
                'previous': defaultdict(int)
            },
            'strength_progress': defaultdict(lambda: {
                'recent_max': 0,
                'previous_max': 0,
                'recent_volume': 0,
                'previous_volume': 0,
                'recent_sessions': 0,
                'previous_sessions': 0
            }),
            'cardio_progress': defaultdict(lambda: {
                'recent_duration': 0,
                'previous_duration': 0,
                'recent_intensity': 0,
                'previous_intensity': 0,
                'recent_sessions': 0,
                'previous_sessions': 0
            }),
            'total_duration': 0,
            'avg_duration': 0,
            'total_calories': 0,
            'sessions': []
        }

        # Process all sessions
        for session in recent_sessions + older_sessions:
            is_recent = session in recent_sessions
            period = 'recent' if is_recent else 'previous'
            
            # Add to workout types count
            if session.workout_type:
                metrics['workout_types'][period][session.workout_type] += 1
            
            # Add to total metrics
            if session.duration:
                metrics['total_duration'] += session.duration
            if session.calories_burned:
                metrics['total_calories'] += session.calories_burned
            
            # Process exercises in session
            for exercise in session.trainingsessionexercise_set.all():
                exercise_key = exercise.exercise.name.lower()
                
                if exercise.exercise.exercise_type == 'strength':
                    # Process strength exercise
                    weight = float(exercise.weight or 0)
                    sets = int(exercise.sets or 0)
                    reps = int(exercise.reps or 0)
                    
                    # Calculate volume (weight * sets * reps)
                    volume = weight * sets * reps
                    progress = metrics['strength_progress'][exercise_key]
                    
                    if is_recent:
                        progress['recent_max'] = max(progress['recent_max'], weight)
                        progress['recent_volume'] += volume
                        progress['recent_sessions'] += 1
                    else:
                        progress['previous_max'] = max(progress['previous_max'], weight)
                        progress['previous_volume'] += volume
                        progress['previous_sessions'] += 1
                
                elif exercise.exercise.exercise_type == 'cardio':
                    # Process cardio exercise
                    duration = float(exercise.duration or 0)
                    intensity = float(exercise.intensity or 0)
                    progress = metrics['cardio_progress'][exercise_key]
                    
                    if is_recent:
                        progress['recent_duration'] += duration
                        progress['recent_intensity'] += intensity
                        progress['recent_sessions'] += 1
                    else:
                        progress['previous_duration'] += duration
                        progress['previous_intensity'] += intensity
                        progress['previous_sessions'] += 1

        # Calculate averages
        if metrics['total_sessions'] > 0:
            metrics['avg_duration'] = metrics['total_duration'] / metrics['total_sessions']

        # Convert defaultdict to regular dict for serialization
        metrics['workout_types'] = dict(metrics['workout_types'])
        metrics['strength_progress'] = dict(metrics['strength_progress'])
        metrics['cardio_progress'] = dict(metrics['cardio_progress'])

        # Add session summaries
        metrics['sessions'] = [
            {
                'id': session.id,
                'date': session.date,
                'workout_type': session.workout_type,
                'duration': session.duration,
                'calories_burned': session.calories_burned,
                'intensity': session.intensity,
                'feedback': session.feedback
            }
            for session in sorted(recent_sessions + older_sessions, key=lambda x: x.date, reverse=True)
        ]

        return metrics

    except Exception as e:
        logger.error(f"Error calculating progression metrics: {str(e)}", exc_info=True)
        raise

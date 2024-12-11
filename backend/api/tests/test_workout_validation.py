import json
from jsonschema import validate, ValidationError
from django.test import SimpleTestCase
from api.services import (
    WORKOUT_PLAN_SCHEMA,
    preprocess_workout_plan,
    validate_workout_plan,
    WorkoutPlanCreationError
)

class TestWorkoutPlanValidation(SimpleTestCase):
    def setUp(self):
        # Valid base workout plan structure
        self.base_workout_plan = {
            "workoutDays": [
                {
                    "day": "Monday",
                    "type": "workout",
                    "workout_type": "flexibility",
                    "duration": "45 minutes",
                    "exercises": [],
                    "notes": "Focus on proper breathing and form"
                }
            ]
        }

    def validate_workout_plan(self, plan):
        """Use the services.validate_workout_plan function"""
        try:
            validate_workout_plan(plan)
            return True
        except WorkoutPlanCreationError as e:
            print(f"Validation error: {e}")
            return False

    def test_valid_flexibility_exercise(self):
        """Test a valid flexibility exercise with all required fields"""
        valid_exercise = {
            "name": "Standing Forward Bend",
            "exercise_type": "flexibility",
            "tracking_type": "time_based",
            "duration": "60 seconds",
            "intensity": "moderate",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": [
                    "Bend forward from the hips",
                    "Let arms hang down towards the floor",
                    "Keep slight bend in knees"
                ],
                "form_tips": [
                    "Hinge at hips",
                    "Keep back straight while bending"
                ],
                "common_mistakes": [
                    "Rounding the back",
                    "Locking the knees"
                ],
                "safety_tips": [
                    "Keep breathing steady",
                    "Don't bounce"
                ],
                "modifications": {
                    "beginner": "Keep knees bent more",
                    "advanced": "Straighten legs more"
                },
                "sensation_guidance": [
                    "Gentle stretch in hamstrings",
                    "Mild tension in lower back"
                ],
                "hold_duration": "30-45 seconds",
                "contraindications": [
                    "Acute lower back pain",
                    "Recent hamstring injury",
                    "Severe sciatica"
                ]
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [valid_exercise]
        self.assertTrue(self.validate_workout_plan(self.base_workout_plan))

    def test_missing_sensation_guidance(self):
        """Test that validation fails when sensation_guidance is missing from a flexibility exercise"""
        invalid_exercise = {
            "name": "Standing Forward Bend",
            "exercise_type": "flexibility",
            "tracking_type": "time_based",
            "duration": "60 seconds",
            "intensity": "moderate",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": ["Bend forward from the hips"],
                "form_tips": ["Keep back straight"],
                "hold_duration": "30-45 seconds",
                "contraindications": ["Acute lower back pain"]
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [invalid_exercise]
        try:
            validate_workout_plan(self.base_workout_plan)
            self.fail("WorkoutPlanCreationError not raised")
        except WorkoutPlanCreationError as e:
            self.assertIn("sensation_guidance", str(e))

    def test_missing_hold_duration(self):
        """Test that validation fails when hold_duration is missing from a flexibility exercise"""
        invalid_exercise = {
            "name": "Standing Forward Bend",
            "exercise_type": "flexibility",
            "tracking_type": "time_based",
            "duration": "60 seconds",
            "intensity": "moderate",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": ["Bend forward from the hips"],
                "form_tips": ["Keep back straight"],
                "sensation_guidance": ["Gentle stretch in hamstrings"],
                "contraindications": ["Acute lower back pain"]
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [invalid_exercise]
        try:
            validate_workout_plan(self.base_workout_plan)
            self.fail("WorkoutPlanCreationError not raised")
        except WorkoutPlanCreationError as e:
            self.assertIn("hold_duration", str(e))

    def test_missing_contraindications(self):
        """Test that validation fails when contraindications is missing from a flexibility exercise"""
        invalid_exercise = {
            "name": "Standing Forward Bend",
            "exercise_type": "flexibility",
            "tracking_type": "time_based",
            "duration": "60 seconds",
            "intensity": "moderate",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": ["Bend forward from the hips"],
                "form_tips": ["Keep back straight"],
                "sensation_guidance": ["Gentle stretch in hamstrings"],
                "hold_duration": "30-45 seconds"
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [invalid_exercise]
        try:
            validate_workout_plan(self.base_workout_plan)
            self.fail("WorkoutPlanCreationError not raised")
        except WorkoutPlanCreationError as e:
            self.assertIn("contraindications", str(e))

    def test_non_flexibility_exercise(self):
        """Test that validation passes when optional fields are missing from non-flexibility exercises"""
        cardio_exercise = {
            "name": "Running",
            "exercise_type": "cardio",
            "tracking_type": "time_based",
            "duration": "30 minutes",
            "intensity": "moderate",
            "instructions": {
                "setup": "Start on treadmill",
                "execution": ["Begin with a light jog", "Increase speed gradually"],
                "form_tips": ["Keep good posture", "Land midfoot"]
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [cardio_exercise]
        self.assertTrue(
            self.validate_workout_plan(self.base_workout_plan),
            "Validation should pass for non-flexibility exercises without optional fields"
        )

    def test_seven_day_plan(self):
        """Test a valid 7-day workout plan with 6 workouts and 1 active recovery day"""
        plan = {
            "workoutDays": [
                {
                    "day": "Monday",
                    "type": "workout",
                    "exercises": [{
                        "name": "Cardio",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "30 minutes",
                        "instructions": {
                            "setup": "Start on treadmill",
                            "execution": ["Walk", "Light jog"],
                            "form_tips": ["Keep good posture", "Land softly"]
                        }
                    }]
                },
                {
                    "day": "Tuesday",
                    "type": "workout",
                    "exercises": [{
                        "name": "Cardio",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "30 minutes",
                        "instructions": {
                            "setup": "Start on treadmill",
                            "execution": ["Walk", "Light jog"],
                            "form_tips": ["Keep good posture", "Land softly"]
                        }
                    }]
                },
                {
                    "day": "Wednesday",
                    "type": "workout",
                    "exercises": [{
                        "name": "Cardio",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "30 minutes",
                        "instructions": {
                            "setup": "Start on treadmill",
                            "execution": ["Walk", "Light jog"],
                            "form_tips": ["Keep good posture", "Land softly"]
                        }
                    }]
                },
                {
                    "day": "Thursday",
                    "type": "workout",
                    "exercises": [{
                        "name": "Cardio",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "30 minutes",
                        "instructions": {
                            "setup": "Start on treadmill",
                            "execution": ["Walk", "Light jog"],
                            "form_tips": ["Keep good posture", "Land softly"]
                        }
                    }]
                },
                {
                    "day": "Friday",
                    "type": "workout",
                    "exercises": [{
                        "name": "Cardio",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "30 minutes",
                        "instructions": {
                            "setup": "Start on treadmill",
                            "execution": ["Walk", "Light jog"],
                            "form_tips": ["Keep good posture", "Land softly"]
                        }
                    }]
                },
                {
                    "day": "Saturday",
                    "type": "workout",
                    "exercises": [{
                        "name": "Cardio",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "30 minutes",
                        "instructions": {
                            "setup": "Start on treadmill",
                            "execution": ["Walk", "Light jog"],
                            "form_tips": ["Keep good posture", "Land softly"]
                        }
                    }]
                },
                {
                    "day": "Sunday",
                    "type": "active_recovery",
                    "exercises": [{
                        "name": "Light Walking",
                        "exercise_type": "cardio",
                        "tracking_type": "time_based",
                        "duration": "20 minutes",
                        "instructions": {
                            "setup": "Find a comfortable space to walk",
                            "execution": ["Walk at a comfortable pace"],
                            "form_tips": ["Maintain good posture", "Breathe naturally"]
                        }
                    }]
                }
            ]
        }
        self.assertTrue(self.validate_workout_plan(plan))

    def test_six_day_plan(self):
        """Test a valid 6-day workout plan with 4 workouts, 1 active recovery, and 2 rest days"""
        plan = {
            "workoutDays": [
                {
                    "day": "Day 1: High Intensity",
                    "type": "workout",
                    "workout_type": "High Intensity",
                    "duration": "60 minutes",
                    "exercises": [],
                    "notes": "Focus on maintaining proper form"
                },
                {
                    "day": "Day 2: Low Intensity",
                    "type": "workout",
                    "workout_type": "Low Intensity",
                    "duration": "45 minutes",
                    "exercises": [],
                    "notes": "Keep intensity low for recovery"
                },
                {
                    "day": "Day 3: Rest",
                    "type": "rest",
                    "workout_type": "Rest",
                    "duration": "0 minutes",
                    "exercises": [],
                    "notes": "Take full rest to recover"
                },
                {
                    "day": "Day 4: High Intensity",
                    "type": "workout",
                    "workout_type": "High Intensity",
                    "duration": "60 minutes",
                    "exercises": [],
                    "notes": "Push yourself while maintaining form"
                },
                {
                    "day": "Day 5: Active Recovery",
                    "type": "active_recovery",
                    "workout_type": "Recovery",
                    "duration": "30 minutes",
                    "exercises": [],
                    "notes": "Light movement for recovery"
                },
                {
                    "day": "Day 6: Low Intensity",
                    "type": "workout",
                    "workout_type": "Low Intensity",
                    "duration": "45 minutes",
                    "exercises": [],
                    "notes": "Keep it light and controlled"
                },
                {
                    "day": "Day 7: Rest",
                    "type": "rest",
                    "workout_type": "Rest",
                    "duration": "0 minutes",
                    "exercises": [],
                    "notes": "Full rest day"
                }
            ]
        }
        self.assertTrue(self.validate_workout_plan(plan))

    def test_five_day_plan(self):
        """Test a valid 5-day workout plan with all workout days and rest days"""
        plan = {
            "workoutDays": [
                {
                    "day": "Day 1: Strength",
                    "type": "workout",
                    "workout_type": "Strength Training",
                    "duration": "60 minutes",
                    "exercises": [],
                    "notes": "Focus on compound movements"
                },
                {
                    "day": "Day 2: Rest",
                    "type": "rest",
                    "workout_type": "Rest",
                    "duration": "0 minutes",
                    "exercises": [],
                    "notes": "Take full rest"
                },
                {
                    "day": "Day 3: Cardio",
                    "type": "workout",
                    "workout_type": "Cardio",
                    "duration": "45 minutes",
                    "exercises": [],
                    "notes": "Maintain steady pace"
                },
                {
                    "day": "Day 4: Rest",
                    "type": "rest",
                    "workout_type": "Rest",
                    "duration": "0 minutes",
                    "exercises": [],
                    "notes": "Rest and recover"
                },
                {
                    "day": "Day 5: Strength",
                    "type": "workout",
                    "workout_type": "Strength Training",
                    "duration": "60 minutes",
                    "exercises": [],
                    "notes": "Focus on proper form"
                },
                {
                    "day": "Day 6: Rest",
                    "type": "rest",
                    "workout_type": "Rest",
                    "duration": "0 minutes",
                    "exercises": [],
                    "notes": "Rest day"
                },
                {
                    "day": "Day 7: Rest",
                    "type": "rest",
                    "workout_type": "Rest",
                    "duration": "0 minutes",
                    "exercises": [],
                    "notes": "Full rest to prepare for next week"
                }
            ]
        }
        self.assertTrue(self.validate_workout_plan(plan))

    def test_conditioning_exercise_mapping(self):
        """Test that conditioning exercises are properly mapped to cardio"""
        from api.services import preprocess_workout_plan
        
        # Test that all conditioning exercises are mapped to cardio
        workout_plan = {
            "workoutDays": [{
                "day": "Monday",
                "type": "workout",
                "exercises": [{
                    "name": "Circuit Training",
                    "exercise_type": "conditioning",
                    "tracking_type": "time_based",
                    "duration": "20 minutes",
                    "instructions": {
                        "setup": "Clear space for movement",
                        "execution": ["Complete circuit exercises"],
                        "form_tips": ["Maintain form"]
                    }
                }]
            }]
        }
        
        processed_plan = preprocess_workout_plan(workout_plan)
        self.assertEqual(
            processed_plan["workoutDays"][0]["exercises"][0]["exercise_type"],
            "cardio",
            "Conditioning exercise should be mapped to cardio"
        )

    def test_ai_model_workout_plan(self):
        """Test that an AI-generated workout plan with conditioning exercises is properly processed"""
        ai_workout_plan = {
            "workoutDays": [
                {
                    "day": "Monday",
                    "type": "workout",
                    "exercises": [
                        {
                            "name": "Circuit Training",
                            "exercise_type": "conditioning",
                            "tracking_type": "time_based",
                            "duration": "30 minutes",
                            "intensity": "moderate to high",
                            "instructions": {
                                "setup": "Set up stations for different exercises",
                                "execution": [
                                    "Perform each exercise for 45 seconds",
                                    "Rest 15 seconds between exercises",
                                    "Complete 3 rounds"
                                ],
                                "form_tips": ["Maintain proper form throughout"]
                            }
                        }
                    ]
                },
                {
                    "day": "Wednesday",
                    "type": "workout",
                    "exercises": [
                        {
                            "name": "Metabolic Conditioning",
                            "exercise_type": "conditioning",
                            "tracking_type": "reps_based",
                            "sets": "5",
                            "reps": "As many as possible",
                            "instructions": {
                                "setup": "Clear space for movement",
                                "execution": ["Complete exercises in sequence"],
                                "form_tips": ["Focus on quality movement"]
                            }
                        }
                    ]
                }
            ]
        }
        
        processed_plan = preprocess_workout_plan(ai_workout_plan)
        
        # All conditioning exercises should be mapped to cardio
        self.assertEqual(
            processed_plan["workoutDays"][0]["exercises"][0]["exercise_type"],
            "cardio",
            "Circuit training should be mapped to cardio"
        )
        
        self.assertEqual(
            processed_plan["workoutDays"][1]["exercises"][0]["exercise_type"],
            "cardio",
            "Metabolic conditioning should be mapped to cardio"
        )
        
        # Validate the processed plan against our schema
        self.assertTrue(
            self.validate_workout_plan(processed_plan),
            "Processed AI workout plan should be valid according to our schema"
        )

    def test_complete_workout_plan(self):
        """Test validation of a complete workout plan with all possible exercise types"""
        complete_plan = {
            "workoutDays": [
                {
                    "day": "Day 1",
                    "type": "workout",
                    "workout_type": "Push Day",
                    "duration": "60 minutes",
                    "exercises": [
                        {
                            "name": "Dumbbell Chest Press",
                            "exercise_type": "strength",
                            "tracking_type": "weight_based",
                            "weight": "20kg",
                            "sets": "3",
                            "reps": "8-12",
                            "rest_time": "90",
                            "instructions": {
                                "setup": "Lie on a flat bench and hold a dumbbell in each hand",
                                "execution": [
                                    "Press the dumbbells upwards, extending your arms fully",
                                    "Lower the dumbbells back to the starting position"
                                ],
                                "form_tips": [
                                    "Keep your core engaged",
                                    "Avoid arching your back"
                                ]
                            }
                        }
                    ]
                },
                {
                    "day": "Day 2",
                    "type": "workout",
                    "workout_type": "Full Body",
                    "duration": "45 minutes",
                    "exercises": [
                        {
                            "name": "Burpees",
                            "exercise_type": "full body",
                            "tracking_type": "time_based",
                            "duration": "30-60 seconds",
                            "instructions": {
                                "setup": "Start in a standing position",
                                "execution": [
                                    "Drop into a squat position",
                                    "Kick feet back into plank"
                                ],
                                "form_tips": [
                                    "Keep core engaged",
                                    "Land softly"
                                ]
                            }
                        }
                    ]
                },
                {
                    "day": "Day 3",
                    "type": "rest",
                    "suggested_activities": [
                        "Light walking",
                        "Stretching"
                    ]
                }
            ],
            "additionalTips": [
                "Stay hydrated",
                "Get enough sleep"
            ]
        }
        
        self.assertTrue(
            self.validate_workout_plan(complete_plan),
            "Validation should pass for a complete workout plan with all exercise types"
        )

    def test_missing_optional_fields(self):
        """Test that validation passes when optional instruction fields are missing"""
        # Use a strength exercise since it doesn't require the flexibility-specific fields
        exercise_with_missing_optional = {
            "name": "Dumbbell Bicep Curl",
            "exercise_type": "strength",
            "tracking_type": "reps_based",
            "sets": "3",
            "reps": "12",
            "intensity": "moderate",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": ["Curl the dumbbells up"],
                "form_tips": ["Keep elbows close to body"]
                # Missing optional fields: common_mistakes, safety_tips, modifications
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [exercise_with_missing_optional]
        self.base_workout_plan["workoutDays"][0]["workout_type"] = "strength"  # Update workout type to match exercise
        self.assertTrue(
            self.validate_workout_plan(self.base_workout_plan),
            "Validation should pass with only required instruction fields"
        )

    def test_all_instruction_fields(self):
        """Test that validation passes with all instruction fields present"""
        exercise_with_all_fields = {
            "name": "Standing Forward Bend",
            "exercise_type": "flexibility",
            "tracking_type": "time_based",
            "duration": "60 seconds",
            "intensity": "moderate",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": [
                    "Bend forward from the hips",
                    "Let arms hang down towards the floor"
                ],
                "form_tips": [
                    "Keep back straight",
                    "Bend from hips not waist"
                ],
                "common_mistakes": [
                    "Rounding the back",
                    "Locking the knees"
                ],
                "safety_tips": [
                    "Keep breathing steady",
                    "Don't bounce"
                ],
                "modifications": {
                    "beginner": "Keep knees bent more",
                    "advanced": "Straighten legs completely"
                },
                "sensation_guidance": [
                    "Gentle stretch in hamstrings",
                    "Mild tension in lower back"
                ],
                "hold_duration": "30-45 seconds",
                "contraindications": [
                    "Acute lower back pain",
                    "Recent hamstring injury"
                ]
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [exercise_with_all_fields]
        self.assertTrue(
            self.validate_workout_plan(self.base_workout_plan),
            "Validation should pass with all instruction fields"
        )

    def test_invalid_instruction_field_types(self):
        """Test that validation fails when instruction fields have wrong types"""
        exercise_with_wrong_types = {
            "name": "Standing Forward Bend",
            "exercise_type": "flexibility",
            "tracking_type": "time_based",
            "duration": "60 seconds",
            "instructions": {
                "setup": "Stand with feet hip-width apart",
                "execution": ["Bend forward"],
                "form_tips": ["Keep straight"],
                # Wrong types for optional fields
                "common_mistakes": "Not an array",  # Should be array
                "safety_tips": 123,  # Should be array
                "modifications": ["Not an object"],  # Should be object
                "sensation_guidance": "Not an array",  # Should be array
                "hold_duration": ["Not a string"],  # Should be string
                "contraindications": "Not an array"  # Should be array
            }
        }
        
        self.base_workout_plan["workoutDays"][0]["exercises"] = [exercise_with_wrong_types]
        try:
            validate_workout_plan(self.base_workout_plan)
            self.fail("WorkoutPlanCreationError not raised")
        except WorkoutPlanCreationError as e:
            self.assertIn("array", str(e))

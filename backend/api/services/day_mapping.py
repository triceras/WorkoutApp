"""Services for mapping workout days to weekday names."""

WEEKDAY_MAPPING = {
    'day1': 'Monday',
    'day2': 'Tuesday',
    'day3': 'Wednesday',
    'day4': 'Thursday',
    'day5': 'Friday',
    'day6': 'Saturday',
    'day7': 'Sunday'
}

def map_days_to_weekdays(workout_plan):
    """
    Maps numeric day keys (day1, day2, etc.) to weekday names (Monday, Tuesday, etc.)
    in the workout plan.
    
    Args:
        workout_plan (dict): The workout plan containing workoutDays
        
    Returns:
        dict: Updated workout plan with weekday names
    """
    if not workout_plan or 'workoutDays' not in workout_plan:
        return workout_plan

    for day in workout_plan['workoutDays']:
        if 'day' in day and day['day'] in WEEKDAY_MAPPING:
            day['day'] = WEEKDAY_MAPPING[day['day']]
    
    return workout_plan

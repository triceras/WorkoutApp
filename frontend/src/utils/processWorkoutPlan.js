export const processWorkoutPlan = (plan) => {
  console.group('Processing Workout Plan');
  console.log('Original Plan:', JSON.stringify(plan, null, 2)); // Detailed logging

  // Validate plan input
  if (!plan) {
    console.warn('Plan is undefined or null');
    console.groupEnd();
    return null;
  }

  if (!plan.workoutDays || plan.workoutDays.length === 0) {
    console.warn('No workout days in the plan');
    console.groupEnd();
    return plan;
  }

  const processedPlan = { ...plan };
  const processedWorkoutDays = [];

  // Map day numbers to weekday numbers (1 = Monday, 7 = Sunday)
  const dayNumberToWeekdayNumber = {
    1: 1, // Day 1 -> Monday
    2: 2, // Day 2 -> Tuesday
    3: 3, // Day 3 -> Wednesday
    4: 4, // Day 4 -> Thursday
    5: 5, // Day 5 -> Friday
    6: 6, // Day 6 -> Saturday
    7: 7, // Day 7 -> Sunday
  };

  // Map weekday numbers to names
  const weekdayNumberToName = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  };

  // Detailed logging for each day
  plan.workoutDays.forEach((day, index) => {
    console.log(`Processing Day ${index + 1}:`, day);
    
    if (!day) {
      console.warn(`Day at index ${index} is undefined or null`);
      return;
    }

    const dayString = day.day || '';
    const dayRegex = /Day\s*(\d+):\s*(.*)/i;
    const match = dayString.match(dayRegex);
    let dayNumber = index + 1; // Default day number (1-7)
    let dayName = dayString;

    if (match) {
      const dayNum = parseInt(match[1], 10);
      const dayDescription = match[2];

      // Map plan day number to weekday number
      const weekdayNumber =
        dayNumberToWeekdayNumber[dayNum] || ((dayNum - 1) % 7) + 1;

      // Get the weekday name
      const weekdayName = weekdayNumberToName[weekdayNumber];

      // Detailed logging for day parsing
      console.log(`Parsed Day: Number=${dayNum}, Description=${dayDescription}`);
      console.log(`Mapped Day: Number=${weekdayNumber}, Name=${weekdayName}`);

      dayNumber = weekdayNumber;
      dayName = `${weekdayName}: ${dayDescription}`;
    }

    // Process exercises
    if (day.exercises) {
      day.exercises = day.exercises.map(exercise => {
        console.log('Processing exercise:', exercise);
        
        // Preserve original exercise properties
        const processedExercise = {
          ...exercise,
          type: day.type,
          workout_type: day.workout_type
        };

        // Only modify tracking type based on exercise type
        if (exercise.exercise_type === 'cardio' || 
            exercise.name?.toLowerCase().includes('jogging') || 
            exercise.name?.toLowerCase().includes('running')) {
          return {
            ...processedExercise,
            tracking_type: 'time_based',
            duration: day.duration || '30 minutes',
            intensity: exercise.intensity || 'low'
          };
        }

        // For strength exercises, ensure proper tracking type
        return {
          ...processedExercise,
          tracking_type: 'weight_based'
        };
      });
    }

    // Determine if it's a workout or rest day
    const isRestDay = day.exercises.length === 0 || day.type === 'rest';

    const processedDay = {
      ...day,
      dayNumber: dayNumber,
      dayName: dayName,
      type: isRestDay ? 'rest' : 'workout',
    };

    console.log('Processed Day:', JSON.stringify(processedDay, null, 2)); // Detailed logging

    processedWorkoutDays.push(processedDay);
  });

  // Sort the days by dayNumber to ensure correct order
  processedPlan.workoutDays = processedWorkoutDays.sort(
    (a, b) => a.dayNumber - b.dayNumber
  );

  console.log('Processed Plan:', JSON.stringify(processedPlan, null, 2));
  console.groupEnd();

  return processedPlan;
};

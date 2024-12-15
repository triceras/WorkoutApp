export const processWorkoutPlan = (plan) => {
  console.group('Processing Workout Plan');
  console.log('Original Plan:', JSON.stringify(plan, null, 2));

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

  const weekdayNumberToName = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  };

  plan.workoutDays.forEach((day, index) => {
    console.log(`Processing Day ${index + 1}:`, day);
    
    if (!day) {
      console.warn(`Day at index ${index} is undefined or null`);
      return;
    }

    // Process day name and number
    const dayString = day.day || '';
    const dayRegex = /Day\s*(\d+):\s*(.*)/i;
    const match = dayString.match(dayRegex);
    let dayNumber = index + 1;
    let dayName = dayString;

    if (match) {
      const dayNum = parseInt(match[1], 10);
      const dayDescription = match[2];
      const weekdayNumber = ((dayNum - 1) % 7) + 1;
      const weekdayName = weekdayNumberToName[weekdayNumber];
      dayNumber = weekdayNumber;
      dayName = `${weekdayName}: ${dayDescription}`;
    }

    // Process exercises while preserving their original data
    const processedExercises = day.exercises?.map(exercise => {
      console.log('Processing exercise:', exercise);
      
      // Create base exercise object with all original properties
      const processedExercise = {
        ...exercise,
        // Only add day-level properties if they don't exist in exercise
        type: exercise.exercise_type || exercise.type || day.type,
        workout_type: exercise.workout_type || day.workout_type
      };

      // Handle tracking type based on exercise type
      if (exercise.exercise_type === 'cardio' || 
          exercise.name?.toLowerCase().includes('cardio') ||
          exercise.name?.toLowerCase().includes('jogging') || 
          exercise.name?.toLowerCase().includes('running')) {
        processedExercise.tracking_type = 'time_based';
        processedExercise.duration = exercise.duration || day.duration || '30 minutes';
        processedExercise.intensity = exercise.intensity || 'moderate';
      } else {
        processedExercise.tracking_type = 'reps_based';
        processedExercise.sets = exercise.sets || 3;
        processedExercise.reps = exercise.reps || 10;
        processedExercise.weight = exercise.weight || 0;
        processedExercise.rest_time = exercise.rest_time || 60;
      }

      // Ensure instructions are properly formatted
      if (typeof processedExercise.instructions === 'string') {
        try {
          processedExercise.instructions = JSON.parse(processedExercise.instructions);
        } catch (e) {
          processedExercise.instructions = {
            steps: [processedExercise.instructions]
          };
        }
      }

      return processedExercise;
    }) || [];

    processedWorkoutDays.push({
      ...day,
      dayNumber,
      dayName,
      exercises: processedExercises,
    });
  });

  processedPlan.workoutDays = processedWorkoutDays;
  console.log('Processed Plan:', JSON.stringify(processedPlan, null, 2));
  console.groupEnd();
  return processedPlan;
};

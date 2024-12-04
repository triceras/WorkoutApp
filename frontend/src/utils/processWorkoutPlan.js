export const processWorkoutPlan = (plan) => {
  console.log('Original Plan:', plan); // Debugging

  if (!plan || !plan.workoutDays || plan.workoutDays.length === 0) {
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

  // Go through each day in workoutDays
  processedPlan.workoutDays.forEach((day, index) => {
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

      dayNumber = weekdayNumber;
      dayName = `${weekdayName}: ${dayDescription}`;
    }

    // Ensure exercises is an array
    let exercises = Array.isArray(day.exercises) ? day.exercises : [];
    if (!Array.isArray(exercises)) {
      console.warn(`Exercises for day at index ${index} is not an array:`, exercises);
      exercises = [];
    }

    // Determine if it's a workout or rest day
    const isRestDay = exercises.length === 0 || day.type === 'rest';

    const processedDay = {
      ...day,
      dayNumber: dayNumber,
      dayName: dayName,
      exercises: exercises,
      type: isRestDay ? 'rest' : 'workout',
    };

    console.log('Processed Day:', processedDay); // Debugging

    processedWorkoutDays.push(processedDay);
  });

  // Sort the days by dayNumber to ensure correct order
  processedPlan.workoutDays = processedWorkoutDays.sort(
    (a, b) => a.dayNumber - b.dayNumber
  );

  console.log('Processed Plan:', processedPlan); // Debugging

  return processedPlan;
};

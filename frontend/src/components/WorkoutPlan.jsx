// src/components/WorkoutPlan.jsx

import React from 'react';
import PropTypes from 'prop-types';
import './WorkoutPlan.css'; // Ensure this path is correct

function WorkoutPlan({ workoutData }) {
  if (!workoutData || Object.keys(workoutData).length === 0) {
    console.error('Invalid plan data:', workoutData);
    return <div className="error-message">No workout days found in the plan.</div>;
  }

  console.log('Received Workout Data:', workoutData); // For debugging

  const { workoutDays, additionalTips } = workoutData;

  /**
   * Utility function to split text into sentences.
   * This simple splitter assumes that sentences end with a period.
   * It trims whitespace and filters out any empty strings.
   * You can enhance this function to handle abbreviations and other edge cases if needed.
   */
  const splitIntoSentences = (text) => {
    return text
      .split('.')
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  };

  return (
    <div className="workout-plan-container">
      <h3>Your Personalized Weekly Workout Plan</h3>
      <p>
        Based on your inputs, we've created a personalized weekly workout plan to help you build muscle. Please find the plan below:
      </p>

      {workoutDays && workoutDays.length > 0 ? (
        workoutDays.map((day, index) => (
          <div className="workout-day" key={index}>
            <div className="day-cell">
              <h4>{day.day}</h4>
              <span className="duration">{day.duration}</span>
            </div>
            <div className="workout-cell">
              {day.exercises && day.exercises.length > 0 ? (
                <div className="exercises-container">
                  {day.exercises.map((exercise, idx) => (
                    <div className="exercise-item" key={idx}>
                      <h5 className="exercise-name">{exercise.name}</h5>
                      {exercise.setsReps && (
                        <div className="exercise-detail">
                          <strong className="label-sets-reps">Sets and Reps:</strong>
                          <span className="detail-text">{exercise.setsReps}</span>
                        </div>
                      )}
                      {exercise.equipment && (
                        <div className="exercise-detail">
                          <strong className="label-equipment">Equipment Required:</strong>
                          <span className="detail-text">{exercise.equipment}</span>
                        </div>
                      )}
                      {exercise.instructions && (
                        <div className="exercise-detail">
                          <strong className="label-instructions">Instructions:</strong>
                          {/* Split instructions into sentences and render each on a new line */}
                          {splitIntoSentences(exercise.instructions).map((sentence, sentenceIdx) => (
                            <p className="instruction-sentence" key={sentenceIdx}>
                              {sentence}.
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No exercises listed for this day.</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="error-message">No workout days found in the plan.</div>
      )}

      {additionalTips && additionalTips.length > 0 && (
        <div className="additional-tips">
          <h4>Additional Tips:</h4>
          <ul>
            {additionalTips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

WorkoutPlan.propTypes = {
  workoutData: PropTypes.shape({
    workoutDays: PropTypes.arrayOf(
      PropTypes.shape({
        day: PropTypes.string.isRequired,
        duration: PropTypes.string.isRequired,
        exercises: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            setsReps: PropTypes.string,
            equipment: PropTypes.string,
            instructions: PropTypes.string,
          })
        ),
      })
    ),
    additionalTips: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export default WorkoutPlan;

// src/components/WorkoutPlan.jsx

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import VideoModal from './VideoModal'; // Ensure the path is correct
import './WorkoutPlan.css'; // Ensure this path is correct

// Utility function to get the YouTube thumbnail URL from videoId
const getYoutubeThumbnailUrl = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/0.jpg`; // Default to the first thumbnail (hqdefault.jpg)
};

function WorkoutPlan({ workoutData, username }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Function to open video modal
  const openVideoModal = (videoId) => {
    setCurrentVideoId(videoId);
    setModalIsOpen(true);
  };

  // Function to close video modal
  const closeVideoModal = () => {
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  if (!workoutData || Object.keys(workoutData).length === 0) {
    console.error('Invalid plan data:', workoutData);
    return <div className="error-message">No workout days found in the plan.</div>;
  }

  const { workoutDays, additionalTips } = workoutData;

  // Utility function to split instructions into sentences
  const splitIntoSentences = (text) => {
    return text
      .split('.')
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  };

  return (
    <div className="workout-plan-container">
      <h3>Your Personalized Weekly Workout Plan{username ? ` for ${username}` : ''}</h3>
      <p>
        Based on your inputs, we've created a personalized weekly workout plan to help you build muscle. Please find the plan below:
      </p>

      {workoutDays && workoutDays.length > 0 ? (
        workoutDays.map((day) => (
          <section className="workout-day" key={day.day}>
            <div className="day-cell">
              <h4>{day.day}</h4>
              <span className="duration">{day.duration}</span>
            </div>
            <div className="workout-cell">
              {day.exercises && day.exercises.length > 0 ? (
                <div className="exercises-container">
                  {day.exercises.map((exercise) => (
                    <article className="exercise-item" key={exercise.name}>
                      <div className="exercise-details">
                        <h5 className="exercise-name">{exercise.name}</h5>
                        
                        {/* Sets and Reps */}
                        {exercise.setsReps && (
                          <div className="exercise-detail sets-reps-detail">
                            <strong className="label-sets-reps">
                              💪 Sets and Reps:
                            </strong>
                            <span className="detail-text">{exercise.setsReps}</span>
                          </div>
                        )}

                        {/* Equipment Required */}
                        {exercise.equipment && (
                          <div className="exercise-detail equipment-detail">
                            <strong className="label-equipment">
                              🏋️ Equipment Required:
                            </strong>
                            <span className="detail-text">{exercise.equipment}</span>
                          </div>
                        )}

                        {/* Instructions */}
                        {exercise.instructions && (
                          <div className="exercise-detail instructions-detail">
                            <strong className="label-instructions">
                              📋 Instructions:
                            </strong>
                            <ul className="instruction-list">
                              {splitIntoSentences(exercise.instructions).map((sentence, sentenceIdx) => (
                                <li className="instruction-item" key={sentenceIdx}>
                                  {sentence}.
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* YouTube Thumbnail */}
                      {exercise.videoId && (
                        <div className="video-thumbnail">
                          <img
                            src={getYoutubeThumbnailUrl(exercise.videoId)}
                            alt={`${exercise.name} video`}
                            className="youtube-thumbnail"
                            onClick={() => openVideoModal(exercise.videoId)} // Open modal on click
                            tabIndex="0" // Make the image focusable
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                openVideoModal(exercise.videoId);
                              }
                            }}
                            loading="lazy" // Enables lazy loading
                          />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p>No exercises listed for this day.</p>
              )}
            </div>
          </section>
        ))
      ) : (
        <div className="error-message">No workout days found in the plan.</div>
      )}

      {additionalTips && additionalTips.length > 0 && (
        <div className="additional-tips">
          <h4>Additional Tips:</h4>
          <ul>
            {additionalTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Video Modal Component */}
      <VideoModal
        isOpen={modalIsOpen}
        onRequestClose={closeVideoModal}
        videoId={currentVideoId}
      />
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
            videoId: PropTypes.string, // Updated field name
          })
        ),
      })
    ),
    additionalTips: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  username: PropTypes.string,
};

export default WorkoutPlan;

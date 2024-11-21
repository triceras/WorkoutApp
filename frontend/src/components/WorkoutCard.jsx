import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardMedia, Typography, ListItem } from '@mui/material';
import { Link } from 'react-router-dom';

const getYoutubeThumbnailUrl = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/0.jpg`;
};

function WorkoutCard({ workouts, userName }) {
  // Debugging: Log the workouts prop to ensure it's an array and contains expected data
  console.log('WorkoutCard received workouts:', workouts);

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return (
      <Typography variant="body1">
        You have no workout scheduled for today.{' '}
        <Link to="/generate-plan">Generate a new plan!</Link>
      </Typography>
    );
  }

  return (
    <Card style={{ marginBottom: '16px' }}>
      <CardContent>
        {/* Greeting Message */}
        <Typography variant="h6">{`Hello ${userName}, here is your workout for today:`}</Typography>

        {/* Exercises List */}
        {workouts.map((exercise, index) => (
          <div key={exercise.id || index} style={{ marginBottom: '20px' }}>
            {/* YouTube Thumbnail */}
            {exercise.videoId && (
              <CardMedia
                component="img"
                height="140"
                image={getYoutubeThumbnailUrl(exercise.videoId)}
                alt={`${exercise.name} video`}
                style={{ marginBottom: '10px', cursor: 'pointer' }}
                onClick={() => window.open(`https://www.youtube.com/watch?v=${exercise.videoId}`, '_blank')}
              />
            )}

            {/* Exercise Details */}
            <Typography variant="h6">{exercise.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>💪 Sets & Reps:</strong> {exercise.setsReps}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>🏋️ Equipment:</strong> {exercise.equipment}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>📋 Instructions:</strong>
            </Typography>
            <ul style={{ marginLeft: '20px' }}>
              {exercise.instructions
                ?.split('.')
                .filter((sentence) => sentence.trim().length > 0)
                .map((sentence, idx) => (
                  <li key={idx}>
                    <Typography variant="body2" color="textSecondary">
                      {sentence.trim()}.
                    </Typography>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

WorkoutCard.propTypes = {
  workouts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string, // Preferably use a unique ID if available
      name: PropTypes.string.isRequired,
      setsReps: PropTypes.string.isRequired,
      equipment: PropTypes.string.isRequired,
      instructions: PropTypes.string,
      videoId: PropTypes.string, // To fetch YouTube thumbnails
    })
  ),
  userName: PropTypes.string.isRequired,
};

export default WorkoutCard;

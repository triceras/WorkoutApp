// src/pages/ExerciseLibrary.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/exercises/')
      .then(response => setExercises(response.data))
      .catch(error => console.error(error));
  }, []);

  return (
    <div>
      <h2>Exercise Library</h2>
      {exercises.map(exercise => (
        <div key={exercise.id}>
          <h3>{exercise.name}</h3>
          <p>{exercise.description}</p>
          {/* Add video or image if available */}
        </div>
      ))}
    </div>
  );
}

export default ExerciseLibrary;

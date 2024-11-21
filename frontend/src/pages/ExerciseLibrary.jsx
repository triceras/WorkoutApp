// src/pages/ExerciseLibrary.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance for consistency

function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await axiosInstance.get('exercises/'); // Corrected endpoint
        setExercises(response.data);
      } catch (error) {
        console.error('Error fetching exercises:', error);
      }
    };

    fetchExercises();
  }, []);

  return (
    <div>
      <h2>Exercise Library</h2>
      {exercises.map((exercise) => (
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

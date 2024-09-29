// src/components/WorkoutPlan.jsx

import React from 'react';
import ReactMarkdown from 'react-markdown';
import './WorkoutPlan.css'; // Ensure this path is correct

function WorkoutPlan({ plan }) {
  /**
   * Parsing the workout plan into days and additional tips.
   * Uses matchAll to capture all day headers and their content.
   */
  const parseWorkoutPlan = (plan) => {
    // Normalize line breaks to '\n'
    const cleanPlan = plan.replace(/\r\n/g, '\n');

    // Define regex to match both training days and rest days, including multiple day numbers
    const dayRegex = /\*\*Day\s+\d+(?:\s+and\s+\d+)*:\s+[^*\n]+?(?:\s*\(\d+\s+minutes\))?\*\*/g;

    // Use matchAll to find all day headers with their indices
    const matches = [...cleanPlan.matchAll(dayRegex)];
    const workoutDays = [];

    matches.forEach((match, index) => {
      const title = match[0].replace(/\*\*/g, '').trim(); 
      const startIndex = match.index + match[0].length;

      // Determine the end index
      const endIndex =
        index < matches.length - 1
          ? matches[index + 1].index
          : cleanPlan.indexOf('**Additional Tips:**') !== -1
          ? cleanPlan.indexOf('**Additional Tips:**')
          : cleanPlan.length;

      const content = cleanPlan.slice(startIndex, endIndex).trim();
      workoutDays.push({ title, content });
    });

    // Extract Additional Tips if present
    const tipsMatch = cleanPlan.match(/\*\*Additional Tips:\*\*(.*)/s);
    let additionalTips = '';
    if (tipsMatch) {
      additionalTips = tipsMatch[1].trim();
    }

    console.log('Parsed Workout Days:', workoutDays);
    console.log('Parsed Additional Tips:', additionalTips);

    return { workoutDays, additionalTips };
  };

  const { workoutDays, additionalTips } = parseWorkoutPlan(plan);

  return (
    <div className="workout-plan-container">
      <h3>Your AI-Generated Workout Plan</h3>
      <p>
        Based on your inputs, I've created a personalized weekly workout plan to help you build muscle. Please find the plan below:
      </p>

      {workoutDays.length > 0 ? (
        workoutDays.map((day, index) => {
          const isRestDay = day.title.toLowerCase().includes('rest day');
          return (
            <div className="workout-day" key={index}>
              <div className="day-cell">
                <h4>{day.title}</h4>
              </div>
              <div className={`workout-cell ${isRestDay ? 'rest-day' : ''}`}>
                {isRestDay ? (
                  <p>Take this day to rest and recover.</p>
                ) : (
                  <ReactMarkdown>{day.content}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="error-message">No days found in the workout plan.</div>
      )}

      {additionalTips && (
        <div className="additional-tips">
          <h4>Additional Tips:</h4>
          <ReactMarkdown>{additionalTips}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default WorkoutPlan;

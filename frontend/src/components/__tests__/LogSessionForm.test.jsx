// frontend/src/components/__tests__/LogSessionForm.test.jsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogSessionForm from '../LogSessionForm';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios'; // Import the mocked axios

// Automatically mock axios
jest.mock('axios');

describe('LogSessionForm Component', () => {
  const mockUser = { id: 1, username: 'testuser' };
  const mockWorkoutPlans = [
    {
      id: 1,
      user: { username: 'testuser' },
      plan_data: {
        workoutDays: [
          { day: 'Monday', duration: '60 minutes', exercises: [] },
          { day: 'Wednesday', duration: '60 minutes', exercises: [] },
        ],
        additionalTips: ['Stay hydrated', 'Warm up before workouts'],
      },
    },
  ];

  const mockOnSessionLogged = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock GET request to fetch workout plan details
    axios.get.mockResolvedValue({
      data: {
        plan_data: {
          workoutDays: [
            { day: 'Monday', duration: '60 minutes', exercises: [] },
            { day: 'Wednesday', duration: '60 minutes', exercises: [] },
          ],
          additionalTips: ['Stay hydrated', 'Warm up before workouts'],
        },
      },
    });
  });

  test('renders form correctly', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <LogSessionForm workoutPlans={mockWorkoutPlans} onSessionLogged={mockOnSessionLogged} />
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Log Training Session/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Workout Plan:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Session:/i)).toBeInTheDocument();
    expect(screen.getByText(/How are you feeling\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comments:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log Session/i })).toBeInTheDocument();

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
    });
  });

  test('submits feedback successfully', async () => {
    // Mock POST request for submitting feedback
    axios.post.mockResolvedValueOnce({
      data: {
        id: 1,
        workout_plan_id: 1,
        date: '2024-10-08',
        session_name: 'Monday',
        emoji_feedback: '😊',
        comments: 'Great workout!',
      },
    });

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <LogSessionForm workoutPlans={mockWorkoutPlans} onSessionLogged={mockOnSessionLogged} />
      </AuthContext.Provider>
    );

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument();
    });

    // Select session
    fireEvent.change(screen.getByLabelText(/Session:/i), { target: { value: 'Monday' } });

    // Select emoji (adjust based on your UI; ensure the button label matches)
    fireEvent.click(screen.getByRole('button', { name: /Good \(😃\)/i }));

    // Enter comments
    fireEvent.change(screen.getByLabelText(/Comments:/i), { target: { value: 'Great workout!' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Log Session/i }));

    // Check loading state
    expect(screen.getByRole('button', { name: /Logging.../i })).toBeDisabled();

    // Wait for success notification
    await waitFor(() => {
      expect(screen.getByText(/Session logged successfully!/i)).toBeInTheDocument();
    });

    // Ensure form fields are reset
    expect(screen.getByLabelText(/Date:/i).value).toBe(new Date().toISOString().split('T')[0]);
    expect(screen.getByLabelText(/Comments:/i).value).toBe('');

    // Ensure callback is called with correct data
    expect(mockOnSessionLogged).toHaveBeenCalledWith({
      id: 1,
      workout_plan_id: 1,
      date: '2024-10-08',
      session_name: 'Monday',
      emoji_feedback: '😊',
      comments: 'Great workout!',
    });
  });

  test('handles submission errors', async () => {
    // Mock POST request to throw an error
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <LogSessionForm workoutPlans={mockWorkoutPlans} onSessionLogged={mockOnSessionLogged} />
      </AuthContext.Provider>
    );

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument();
    });

    // Select session
    fireEvent.change(screen.getByLabelText(/Session:/i), { target: { value: 'Monday' } });

    // Select emoji
    fireEvent.click(screen.getByRole('button', { name: /Good \(😃\)/i }));

    // Enter comments
    fireEvent.change(screen.getByLabelText(/Comments:/i), { target: { value: 'Great workout!' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Log Session/i }));

    // Wait for error notification
    await waitFor(() => {
      expect(screen.getByText(/Failed to log session\. Please try again\./i)).toBeInTheDocument();
    });

    // Ensure the form is not in loading state
    expect(screen.getByRole('button', { name: /Log Session/i })).not.toBeDisabled();
  });

  test('prevents submission without selecting a training session', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <LogSessionForm workoutPlans={mockWorkoutPlans} onSessionLogged={mockOnSessionLogged} />
      </AuthContext.Provider>
    );

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument();
    });

    // Do not select training session
    // Select emoji
    fireEvent.click(screen.getByRole('button', { name: /Good \(😃\)/i }));

    // Enter comments
    fireEvent.change(screen.getByLabelText(/Comments:/i), { target: { value: 'It was okay.' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Log Session/i }));

    // Wait for error notification (assuming backend validates and returns error)
    await waitFor(() => {
      expect(screen.getByText(/Failed to log session\. Please try again\./i)).toBeInTheDocument();
    });

    // Ensure the form is not in loading state
    expect(screen.getByRole('button', { name: /Log Session/i })).not.toBeDisabled();
  });
});

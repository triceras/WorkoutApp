// src/components/RegistrationSteps/Registration.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Formik, Form } from 'formik';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import * as Yup from 'yup';
import axiosInstance from '../../api/axiosInstance';
import './Registration.css';

// Import components
import AccountDetailsForm from './AccountDetailsForm';
import PersonalInfo from './PersonalInfo';
import FitnessLevel from './FitnessLevel';
import Availability from './Availability';
import Equipment from './Equipment';
import FitnessGoals from './FitnessGoals';
import ReviewSubmit from './ReviewSubmit';

// Define steps
const steps = [
  'Account Details',
  'Personal Information',
  'Fitness Level',
  'Availability',
  'Available Equipment',
  'Fitness Goals',
  'Review & Submit',
];

function Registration() {
  const [activeStep, setActiveStep] = useState(0);
  const [formValues, setFormValues] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    sex: '',
    weight: '',
    height: '',
    fitnessLevel: '',
    workoutTime: 30,
    workoutDays: '',
    equipment: [],
    strengthGoals: [],
    additionalGoals: '',
  });

  const [strengthGoalsOptions, setStrengthGoalsOptions] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Import login function

  // Validation schemas for each step
  const validationSchemas = [
    // ... (your validation schemas)
  ];

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [equipmentRes, strengthGoalsRes] = await Promise.all([
          axiosInstance.get('/equipment/'),
          axiosInstance.get('/strength-goals/'),
        ]);
        setEquipmentOptions(equipmentRes.data.results || equipmentRes.data || []);
        setStrengthGoalsOptions(strengthGoalsRes.data.results || strengthGoalsRes.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching options:', error);
        setFetchError('Failed to load registration options.');
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      if (activeStep === steps.length - 1) {
        // Format the data for the backend
        const formattedData = {
          username: values.username,
          password: values.password,
          confirm_password: values.confirmPassword,
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          age: parseInt(values.age),
          weight: parseFloat(values.weight),
          height: parseFloat(values.height),
          fitness_level: values.fitnessLevel,
          strength_goals: values.strengthGoals,
          additional_goals: values.additionalGoals,
          equipment: values.equipment,
          workout_time: parseInt(values.workoutTime),
          workout_days: parseInt(values.workoutDays),
          sex: values.sex,
        };

        console.log('Submitting registration data...');
        const response = await axiosInstance.post('register/', formattedData);
        console.log('Registration response:', response.data);

        if (response.data && response.data.token && response.data.user) {
          // Login with the received token and user data
          await login(response.data.token, response.data.user);
          console.log('Successfully logged in after registration');

          // Navigate to the generating workout page
          navigate('/generating-workout', { replace: true });
        } else {
          throw new Error('Invalid response from server: missing token or user data');
        }
      } else {
        // Move to next step
        setFormValues(values);
        setActiveStep((prevStep) => prevStep + 1);
      }
    } catch (error) {
      console.error('Registration/Login error:', error);

      // Handle validation errors from the backend
      if (error.response && error.response.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach((field) => {
          // Convert snake_case to camelCase for frontend field names
          const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          setFieldError(camelCaseField, errors[field][0]);
        });
      } else {
        // Handle non-validation errors
        setFieldError('general', 'An error occurred during registration. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box className="registration-container">
      <Box className="stepper">
        {steps.map((label, index) => (
          <Box
            key={label}
            className={`step ${activeStep === index ? 'active' : ''} ${activeStep > index ? 'completed' : ''}`}
          >
            {label}
          </Box>
        ))}
      </Box>

      <Formik
        initialValues={formValues}
        validationSchema={validationSchemas[activeStep]}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isValid, isSubmitting }) => (
          <Form>
            {getStepContent(activeStep)}

            {/* Navigation Buttons */}
            <Box display="flex" justifyContent="space-between" marginTop="20px">
              <Button
                variant="contained"
                onClick={handleBack}
                disabled={activeStep === 0 || isSubmitting}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={!isValid || isSubmitting}
              >
                {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </Box>
  );
}

export default Registration;

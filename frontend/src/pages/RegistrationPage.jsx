// src/components/RegistrationSteps/Registration.jsx

import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import * as Yup from 'yup';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';  
import '../components/RegistrationSteps/Registration.css';

// Import components
import AccountDetailsForm from '../components/RegistrationSteps/AccountDetailsForm';
import PersonalInfo from '../components/RegistrationSteps/PersonalInfo';
import FitnessLevel from '../components/RegistrationSteps/FitnessLevel';
import Availability from '../components/RegistrationSteps/Availability';
import Equipment from '../components/RegistrationSteps/Equipment';
import FitnessGoals from '../components/RegistrationSteps/FitnessGoals';
import ReviewSubmit from '../components/RegistrationSteps/ReviewSubmit';

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
  const { login } = useAuth();  

  // Validation schemas for each step
  const validationSchemas = [
    // Step 0: Account Details
    Yup.object({
      username: Yup.string()
        .required('Username is required')
        .min(3, 'Username must be at least 3 characters'),
      password: Yup.string()
        .required('Password is required')
        .min(6, 'Password must be at least 6 characters'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm Password is required'),
    }),
    // Step 1: Personal Information
    Yup.object({
      firstName: Yup.string().required('First Name is required'),
      lastName: Yup.string().required('Last Name is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      age: Yup.number()
        .required('Age is required')
        .min(1, 'Age must be at least 1'),
      sex: Yup.string()
        .oneOf(['Male', 'Female', 'Other', 'Prefer not to say'], 'Invalid selection')
        .required('Sex is required'),
      weight: Yup.number()
        .required('Weight is required')
        .min(1, 'Weight must be at least 1 kg'),
      height: Yup.number()
        .required('Height is required')
        .min(1, 'Height must be at least 1 cm'),
    }),
    // Step 2: Fitness Level
    Yup.object({
      fitnessLevel: Yup.string().required('Fitness Level is required'),
    }),
    // Step 3: Availability
    Yup.object({
      workoutTime: Yup.number()
        .required('Workout Time is required')
        .min(15, 'Minimum workout time is 15 minutes'),
      workoutDays: Yup.number()
        .required('Workout Days is required')
        .min(1, 'At least 1 day per week')
        .max(7, 'Maximum 7 days per week'),
    }),
    // Step 4: Available Equipment
    Yup.object({
      equipment: Yup.array()
        .of(Yup.number())
        .min(1, 'At least one equipment must be selected'),
    }),
    // Step 5: Fitness Goals
    Yup.object({
      strengthGoals: Yup.array()
        .of(Yup.number())
        .min(1, 'Select at least one goal'),
    }),
    // Step 6: Review & Submit
    Yup.object(),
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
          sex: values.sex
        };

        console.log('Sending registration data:', formattedData);
        const response = await axiosInstance.post('register/', formattedData);
        
        if (response.data) {
          console.log('Registration successful:', response.data);
          
          if (!response.data.token || !response.data.user) {
            throw new Error('Invalid response from server: missing token or user data');
          }
          
          // Login with the received token and user data
          await login(response.data.token, response.data.user);
          
          // Navigate to the generating workout page
          navigate('/generating-workout');
        }
      } else {
        // Move to next step
        setFormValues(values);
        setActiveStep((prevStep) => prevStep + 1);
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle validation errors from the backend
      if (error.response && error.response.data) {
        const errors = error.response.data;
        console.log('Backend validation errors:', errors);
        
        if (typeof errors === 'object') {
          Object.keys(errors).forEach(field => {
            let errorMessage = errors[field];
            if (Array.isArray(errorMessage)) {
              errorMessage = errorMessage[0];
            }
            
            // Convert snake_case to camelCase for frontend field names
            const camelCaseField = field.replace(/_([a-z])/g, g => g[1].toUpperCase());
            setFieldError(camelCaseField, errorMessage);
          });
        } else {
          // If errors is not an object, it might be a string message
          setFieldError('general', typeof errors === 'string' ? errors : 'Registration failed. Please check your information.');
        }
      } else if (error.message) {
        setFieldError('general', error.message);
      } else {
        // Handle non-validation errors
        setFieldError('general', 'An error occurred during registration. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <AccountDetailsForm />;
      case 1:
        return <PersonalInfo />;
      case 2:
        return <FitnessLevel />;
      case 3:
        return <Availability />;
      case 4:
        return <Equipment equipmentOptions={equipmentOptions} />;
      case 5:
        return <FitnessGoals strengthGoalsOptions={strengthGoalsOptions} />;
      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" style={{ marginLeft: '10px' }}>
          Loading registration form...
        </Typography>
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Box textAlign="center" mt={5}>
        <Typography variant="h6" color="error">
          {fetchError}
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          style={{ marginTop: '20px' }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box className="registration-container">
      <Box className="registration-stepper">
        <Box className="stepper">
          {steps.map((label, index) => (
            <Box
              key={label}
              className={`step ${activeStep === index ? 'active' : ''}`}
            >
              {label}
            </Box>
          ))}
        </Box>
      </Box>

      <Formik
        initialValues={formValues}
        validationSchema={validationSchemas[activeStep]}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isValid, isSubmitting, values }) => (
          <Form>
            {activeStep === steps.length - 1 ? (
              <ReviewSubmit
                values={values}
                isSubmitting={isSubmitting}
                equipmentOptions={equipmentOptions}
                strengthGoalsOptions={strengthGoalsOptions}
              />
            ) : (
              getStepContent(activeStep)
            )}

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

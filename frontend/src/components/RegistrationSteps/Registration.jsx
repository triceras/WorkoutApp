// src/components/RegistrationSteps/Registration.jsx

import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import {
  Box,
  Button,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
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
  'Equipment & Goals',
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
    // Step 4: Equipment & Goals
    Yup.object({
      equipment: Yup.array()
        .of(Yup.number())
        .min(1, 'At least one equipment must be selected'),
      strengthGoals: Yup.array()
        .of(Yup.number())
        .min(1, 'Select at least one goal'),
    }),
    // Step 5: Review & Submit
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

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      if (activeStep === steps.length - 1) {
        // Prepare data for submission
        const data = {
          ...values,
          strength_goals: values.strengthGoals, // Convert to snake_case for backend
        };
        // Submit the form to the backend
        const response = await axiosInstance.post('register/', data);
        // Handle successful registration
        alert('Registration successful!');
        // Redirect or perform any other action
      } else {
        setFormValues(values);
        setActiveStep((prevStep) => prevStep + 1);
      }
    } catch (error) {
      // Handle errors
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
        return (
          <>
            <Equipment equipmentOptions={equipmentOptions} />
            <FitnessGoals strengthGoalsOptions={strengthGoalsOptions} />
          </>
        );
      case 5:
        return (
          <ReviewSubmit
            values={formValues}
            equipmentOptions={equipmentOptions}
            strengthGoalsOptions={strengthGoalsOptions}
          />
        );
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

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
  const { login } = useContext(AuthContext);

  // Validation schemas for each step
  const validationSchemas = [
    // Account Details
    Yup.object().shape({
      username: Yup.string()
        .min(3, 'Username must be at least 3 characters')
        .required('Username is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password'),
    }),
    // Personal Information
    Yup.object().shape({
      firstName: Yup.string().required('First name is required'),
      lastName: Yup.string().required('Last name is required'),
      email: Yup.string().email('Invalid email format').required('Email is required'),
      age: Yup.number()
        .min(13, 'Must be at least 13 years old')
        .max(120, 'Age must be less than 120')
        .required('Age is required'),
      sex: Yup.string()
        .required('Sex is required')
        .oneOf(['Male', 'Female', 'Other', 'Prefer not to say'], 'Please select a valid option'),
      weight: Yup.number()
        .min(30, 'Weight must be at least 30 kg')
        .max(300, 'Weight must be less than 300 kg')
        .required('Weight is required'),
      height: Yup.number()
        .min(100, 'Height must be at least 100 cm')
        .max(250, 'Height must be less than 250 cm')
        .required('Height is required'),
    }),
    // Fitness Level
    Yup.object().shape({
      fitnessLevel: Yup.string().required('Please select your fitness level'),
    }),
    // Availability
    Yup.object().shape({
      workoutTime: Yup.number().required('Please select your workout time'),
      workoutDays: Yup.number().required('Please select your workout days'),
    }),
    // Available Equipment
    Yup.object().shape({
      equipment: Yup.array().required('Please select your available equipment'),
    }),
    // Fitness Goals
    Yup.object().shape({
      strengthGoals: Yup.array().required('Please select your strength goals'),
      additionalGoals: Yup.string(),
    }),
    // Review & Submit
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
        const formattedData = {
          username: values.username,
          password: values.password,
          confirm_password: values.confirmPassword,
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          age: parseInt(values.age),
          sex: values.sex,
          weight: parseFloat(values.weight),
          height: parseFloat(values.height),
          fitness_level: values.fitnessLevel,
          strength_goals: values.strengthGoals,
          additional_goals: values.additionalGoals,
          equipment: values.equipment,
          workout_time: parseInt(values.workoutTime),
          workout_days: parseInt(values.workoutDays),
        };

        const response = await axiosInstance.post('register/', formattedData);
        
        if (response.data && response.data.token && response.data.user) {
          await login(response.data.token, response.data.user);
          navigate('/generating-workout', { replace: true });
        } else {
          throw new Error('Invalid response from server');
        }
      } else {
        setFormValues(values);
        setActiveStep((prevStep) => prevStep + 1);
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.data) {
        Object.keys(error.response.data).forEach((field) => {
          const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          setFieldError(camelCaseField, error.response.data[field][0]);
        });
      } else {
        setFieldError('general', 'An error occurred during registration. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
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
      case 6:
        return <ReviewSubmit />;
      default:
        return 'Unknown step';
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{fetchError}</Typography>
      </Box>
    );
  }

  return (
    <Box className="registration-container">
      <Box className="stepper">
        {steps.map((label, index) => (
          <Box
            key={label}
            className={`step ${index === activeStep ? 'active' : ''} ${
              index < activeStep ? 'completed' : ''
            }`}
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
        {(formikProps) => (
          <Form>
            <Box className="step-content">
              {getStepContent(activeStep)}
            </Box>
            <Box mt={4} display="flex" justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                type={activeStep === steps.length - 1 ? 'submit' : 'button'}
                onClick={activeStep === steps.length - 1 ? undefined : () => setActiveStep(prevStep => prevStep + 1)}
                disabled={formikProps.isSubmitting || !formikProps.isValid}
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

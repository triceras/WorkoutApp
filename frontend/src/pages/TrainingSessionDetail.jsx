// src/pages/RegistrationPage.jsx

import React, { useState, useContext } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import AccountDetailsForm from '../components/RegistrationSteps/AccountDetailsForm';
import PersonalInfo from '../components/RegistrationSteps/PersonalInfo';
import FitnessGoals from '../components/RegistrationSteps/FitnessGoals';
import FitnessLevel from '../components/RegistrationSteps/FitnessLevel'; // Import FitnessLevel
import Equipment from '../components/RegistrationSteps/Equipment';
import Availability from '../components/RegistrationSteps/Availability';
import ReviewSubmit from '../components/RegistrationSteps/ReviewSubmit';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance for consistent baseURL and interceptors
import { useNavigate } from 'react-router-dom';
import { Typography, Box } from '@mui/material';
import { AuthContext } from '../context/AuthContext';

function RegistrationPage() {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { setAuthToken, setUser } = useContext(AuthContext);

  const initialValues = {
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    sex: '',
    email: '',
    age: '',
    weight: '',
    height: '',
    fitnessLevel: '',
    strengthGoals: [], // Array of IDs
    additionalGoals: '',
    equipment: [],    // Array of IDs
    workoutTime: 30,
    workoutDays: 4,
  };

  const validationSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm Password is required'),
    firstName: Yup.string().required('First Name is required'),
    lastName: Yup.string().required('Last Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    age: Yup.number().required('Age is required').positive().integer(),
    sex: Yup.string().oneOf(['Male', 'Female', 'Other']).required('Sex is required'),
    weight: Yup.number().required('Weight is required').positive(),
    height: Yup.number().required('Height is required').positive(),
    fitnessLevel: Yup.string().required('Fitness Level is required'),
    strengthGoals: Yup.array().min(1, 'Select at least one goal').required('Strength goals are required'),
    equipment: Yup.array().min(1, 'Select at least one equipment').required('Equipment selection is required'),
    workoutTime: Yup.number()
      .required('Workout time is required')
      .min(15, 'Minimum workout time is 15 minutes')
      .max(120, 'Maximum workout time is 120 minutes'),
    workoutDays: Yup.number()
      .required('Workout days per week is required')
      .min(1, 'At least 1 workout day per week')
      .max(7, 'Maximum 7 workout days per week'),
    additionalGoals: Yup.string().notRequired(),
  });

  const handleSubmit = (values, actions) => {
    console.log('handleSubmit called with values:', values); // Debugging log
    const data = {
      username: values.username,
      password: values.password,
      confirm_password: values.confirmPassword,
      first_name: values.firstName,
      last_name: values.lastName,
      sex: values.sex,
      email: values.email,
      age: values.age,
      weight: values.weight,
      height: values.height,
      fitness_level: values.fitnessLevel,
      strength_goals: values.strengthGoals, // Send as array of IDs
      additional_goals: values.additionalGoals,
      equipment: values.equipment,           // Send as array of IDs
      workout_time: values.workoutTime,
      workout_days: values.workoutDays,
    };

    axiosInstance.post('register/', data)
      .then((response) => {
        // Registration successful
        const { token, user } = response.data;

        // Handle successful registration
        localStorage.setItem('authToken', token);
        setAuthToken(token); // Update AuthContext with the new token
        setUser(user);       // Update AuthContext with the new user data

        // Navigate to the "Generating Workout Plan" page
        navigate('/generating-workout');
      })
      .catch((error) => {
        if (error.response) {
          // Handle specific field errors
          setErrors(error.response.data);
          // Set errors in Formik
          actions.setErrors(error.response.data);
        } else if (error.request) {
          // Handle network errors
          setErrors({ general: 'No response from server. Please try again later.' });
          actions.setErrors({ general: 'No response from server. Please try again later.' });
        } else {
          // Handle other errors
          setErrors({ general: 'An unexpected error occurred. Please try again.' });
          actions.setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
      })
      .finally(() => {
        actions.setSubmitting(false);
      });
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {(formikProps) => (
        <Form>
          <Box width="100%" maxWidth="600px" margin="0 auto">
            {/* Display General Errors */}
            {errors.general && (
              <Typography variant="body1" color="error" align="center" gutterBottom>
                {errors.general}
              </Typography>
            )}
            {Object.keys(errors).map((key) => {
              if (key !== 'general') {
                return (
                  <Typography key={key} variant="body2" color="error" gutterBottom>
                    {Array.isArray(errors[key]) ? errors[key].join(' ') : errors[key]}
                  </Typography>
                );
              }
              return null;
            })}

            {/* Display Formik Validation Errors */}
            {Object.keys(formikProps.errors).length > 0 && formikProps.submitCount > 0 && (
              <div style={{ color: 'red', marginBottom: '10px' }}>
                <ul>
                  {Object.entries(formikProps.errors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Render Current Step */}
            {step === 1 && (
              <AccountDetailsForm
                nextStep={nextStep}
                values={formikProps.values}
                errors={formikProps.errors}
                touched={formikProps.touched}
                handleChange={formikProps.handleChange}
                handleBlur={formikProps.handleBlur}
              />
            )}
            {step === 2 && (
              <PersonalInfo
                nextStep={nextStep}
                prevStep={prevStep}
                values={formikProps.values}
                errors={formikProps.errors}
                touched={formikProps.touched}
                handleChange={formikProps.handleChange}
                handleBlur={formikProps.handleBlur}
              />
            )}
            {step === 3 && (
              <FitnessGoals
                nextStep={nextStep}
                prevStep={prevStep}
                values={formikProps.values}
                errors={formikProps.errors}
                touched={formikProps.touched}
                handleChange={formikProps.handleChange}
                handleBlur={formikProps.handleBlur}
              />
            )}
            {step === 4 && (
              <FitnessLevel
                nextStep={nextStep}
                prevStep={prevStep}
                values={formikProps.values}
                errors={formikProps.errors}
                touched={formikProps.touched}
                handleChange={formikProps.handleChange}
                handleBlur={formikProps.handleBlur}
              />
            )}
            {step === 5 && (
              <Equipment
                nextStep={nextStep}
                prevStep={prevStep}
              />
            )}
            {step === 6 && (
              <Availability
                nextStep={nextStep}
                prevStep={prevStep}
                values={formikProps.values}
                errors={formikProps.errors}
                touched={formikProps.touched}
                handleChange={formikProps.handleChange}
                handleBlur={formikProps.handleBlur}
              />
            )}
            {step === 7 && (
              <ReviewSubmit
                prevStep={prevStep}
                values={formikProps.values}
                isSubmitting={formikProps.isSubmitting}
              />
            )}
          </Box>
        </Form>
      )}
    </Formik>
  );
}

export default RegistrationPage;
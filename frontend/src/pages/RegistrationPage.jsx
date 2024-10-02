// src/pages/RegistrationPage.jsx

import React, { useState } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import AccountDetailsForm from '../components/RegistrationSteps/AccountDetailsForm';
import PersonalInfo from '../components/RegistrationSteps/PersonalInfo';
import FitnessGoals from '../components/RegistrationSteps/FitnessGoals';
import Equipment from '../components/RegistrationSteps/Equipment';
import Availability from '../components/RegistrationSteps/Availability';
import ReviewSubmit from '../components/RegistrationSteps/ReviewSubmit';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Typography, Box } from '@mui/material'; // Import Typography and Box for error display

function RegistrationPage() {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({}); // Used to display error messages
  const navigate = useNavigate();

  const initialValues = {
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '', // Added
    lastName: '',  // Added
    email: '',
    age: '',
    weight: '',
    height: '',
    fitnessLevel: '',
    strengthGoals: [],    // Array to be joined into a string
    additionalGoals: '',
    equipment: [],       // Array to be joined into a string
    workoutTime: 30,
    workoutDays: 3,
  };

  const validationSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm Password is required'),
    firstName: Yup.string().required('First Name is required'), // Added
    lastName: Yup.string().required('Last Name is required'),   // Added
    email: Yup.string().email('Invalid email').required('Email is required'),
    age: Yup.number().required('Age is required').positive().integer(),
    weight: Yup.number().required('Weight is required').positive(),
    height: Yup.number().required('Height is required').positive(),
    fitnessLevel: Yup.string().required('Fitness Level is required'),
    strengthGoals: Yup.array().min(1, 'Select at least one goal'),
    equipment: Yup.array().min(1, 'Select at least one equipment'),
    workoutTime: Yup.number()
      .required('Workout time is required')
      .min(15)
      .max(120),
    workoutDays: Yup.number()
      .required('Workout days per week is required')
      .min(1)
      .max(7),
  });

  const handleSubmit = (values) => {
    // Prepare data to send to backend
    const data = {
      username: values.username,
      email: values.email,
      first_name: values.firstName,        // Correct field name
      last_name: values.lastName,          // Correct field name
      password: values.password,
      confirm_password: values.confirmPassword,
      age: values.age,
      weight: values.weight,
      height: values.height,
      fitness_level: values.fitnessLevel,
      strength_goals: values.strengthGoals.join(', '), // Join array into string
      additional_goals: values.additionalGoals,
      equipment: values.equipment.join(', '),           // Join array into string
      workout_time: values.workoutTime,
      workout_days: values.workoutDays,
    };

    axios
      .post('http://localhost:8000/api/register/', data)
      .then((response) => {
        // Registration successful
        localStorage.setItem('authToken', response.data.token);
        // Navigate to the "Generating Workout Plan" page
        navigate('/generating-workout');
      })
      .catch((error) => {
        if (error.response) {
          // The request was made, and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Registration error:', error.response.data);
          setErrors(error.response.data);
          // Display error messages to the user based on error.response.data
        } else if (error.request) {
          // The request was made, but no response was received
          console.error('No response received:', error.request);
          setErrors({ general: 'No response from server. Please try again later.' });
          // Inform the user of network issues
        } else {
          // Something else happened while setting up the request
          console.error('Error:', error.message);
          setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
      });
  };

  const nextStep = () => {
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit} // Ensure handleSubmit is passed here
    >
      {({ values, touched, handleChange, handleBlur, errors }) => (
        <Form>
          <Box width="100%" maxWidth="600px" margin="0 auto">
            {/* Display General Errors */}
            {errors.general && (
              <Typography variant="body1" color="error" align="center" gutterBottom>
                {errors.general}
              </Typography>
            )}
            {/* Display Field-Specific Errors */}
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

            {/* Render the current step component */}
            {step === 1 && (
              <AccountDetailsForm
                nextStep={nextStep}
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
              />
            )}
            {step === 2 && (
              <PersonalInfo
                nextStep={nextStep}
                prevStep={prevStep}
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
              />
            )}
            {step === 3 && (
              <FitnessGoals
                nextStep={nextStep}
                prevStep={prevStep}
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
              />
            )}
            {step === 4 && (
              <Equipment
                nextStep={nextStep}
                prevStep={prevStep}
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
              />
            )}
            {step === 5 && (
              <Availability
                nextStep={nextStep}
                prevStep={prevStep}
                values={values}
                handleChange={handleChange}
                handleBlur={handleBlur}
                touched={touched}
                errors={errors}
              />
            )}
            {step === 6 && (
              <ReviewSubmit
                handleSubmit={handleSubmit}
                prevStep={prevStep}
                values={values}
              />
            )}
          </Box>
        </Form>
      )}
    </Formik>
  );
}

export default RegistrationPage;

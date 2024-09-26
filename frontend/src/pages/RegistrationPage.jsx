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


function RegistrationPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const initialValues = {
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    weight: '',
    height: '',
    fitnessLevel: '',
    strengthGoals: [],
    additionalGoals: '',
    equipment: [],
    workoutTime: 30,
    workoutDays: 3,
  };

  const validationSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm Password is required'),
    name: Yup.string().required('Name is required'),
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
        password: values.password,
        confirm_password: values.confirmPassword,
        userprofile: {
          name: values.name,
          age: values.age,
          weight: values.weight,
          height: values.height,
          fitness_level: values.fitnessLevel,
          strength_goals: values.strengthGoals.join(', '),
          additional_goals: values.additionalGoals,
          equipment: values.equipment.join(', '),
          workout_time: values.workoutTime,
          workout_days: values.workoutDays,
        },
      };  
    delete data.confirmPassword; // Remove confirmPassword from data

    axios
      .post('http://localhost:8000/api/register/', data)
      .then((response) => {
        // Registration successful
        localStorage.setItem('authToken', response.data.token);
        navigate('/'); // Redirect to dashboard or desired page
      })
      .catch((error) => {
        if (error.response) {
            // The request was made, and the server responded with a status code
            console.error('Registration error:', error.response.data);
            // Display error messages to the user based on error.response.data
          } else if (error.request) {
            // The request was made, but no response was received
            console.error('No response received:', error.request);
            // Inform the user of network issues
          } else {
            // Something else happened while setting up the request
            console.error('Error:', error.message);
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
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched }) => (
        <Form>
          {step === 1 && (
            <AccountDetailsForm
              nextStep={nextStep}
              values={values}
              errors={errors}
              touched={touched}
            />
          )}
          {step === 2 && (
            <PersonalInfo
              nextStep={nextStep}
              prevStep={prevStep}
              values={values}
              errors={errors}
              touched={touched}
            />
          )}
          {step === 3 && (
            <FitnessGoals
              nextStep={nextStep}
              prevStep={prevStep}
              values={values}
              errors={errors}
              touched={touched}
            />
          )}
          {step === 4 && (
            <Equipment
              nextStep={nextStep}
              prevStep={prevStep}
              values={values}
              errors={errors}
              touched={touched}
            />
          )}
          {step === 5 && (
            <Availability
              nextStep={nextStep}
              prevStep={prevStep}
              values={values}
              errors={errors}
              touched={touched}
            />
          )}
          {step === 6 && (
            <ReviewSubmit
              handleSubmit={handleSubmit}
              prevStep={prevStep}
              values={values}
            />
          )}
        </Form>
      )}
    </Formik>
  );
}

export default RegistrationPage;

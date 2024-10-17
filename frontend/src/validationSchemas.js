// src/validationSchemas.js

import * as Yup from 'yup';

export const validationSchemas = [
  // Step 0: Personal Information
  Yup.object().shape({
    firstName: Yup.string().required('First Name is required'),
    lastName: Yup.string().required('Last Name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    age: Yup.number()
      .required('Age is required')
      .positive('Age must be positive')
      .integer('Age must be an integer'),
    sex: Yup.string()
      .oneOf(['Male', 'Female', 'Other', 'Prefer not to say'], 'Invalid selection')
      .required('Sex is required'),
  }),
  
  // Step 1: Account Details
  Yup.object().shape({
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
  
  // Step 2: Fitness Level
  Yup.object().shape({
    fitnessLevel: Yup.string().required('Fitness Level is required'),
  }),
  
  // Step 3: Availability
  Yup.object().shape({
    workoutTime: Yup.number()
      .required('Workout Time is required')
      .min(15, 'Minimum workout time is 15 minutes'),
    workoutDays: Yup.number()
      .required('Workout Days is required')
      .min(1, 'At least 1 day per week')
      .max(7, 'Maximum 7 days per week'),
  }),
  
  // Step 4: Equipment & Goals
  Yup.object().shape({
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

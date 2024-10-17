// src/components/RegistrationSteps/Registration.jsx

import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import { FormikDevTools } from 'formik-devtools'; // Correctly import FormikDevTools
import * as Yup from 'yup';
import PersonalInfo from './PersonalInfo';
import AccountDetailsForm from './AccountDetailsForm';
import FitnessLevel from './FitnessLevel';
import Availability from './Availability';
import Equipment from './Equipment';
import FitnessGoals from './FitnessGoals';
import ReviewSubmit from './ReviewSubmit';
import axiosInstance from '../../api/axiosInstance'; // Ensure correct import path
import {
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Typography,
} from '@mui/material';

const steps = [
  'Account Details',       // Step 0
  'Personal Information',  // Step 1
  'Fitness Level',         // Step 2
  'Availability',          // Step 3
  'Equipment & Goals',     // Step 4
  'Review & Submit',       // Step 5
];

function Registration() {
  const [activeStep, setActiveStep] = useState(0); // Start at step 0
  const [formValues, setFormValues] = useState({
    // Account Details
    username: '',
    password: '',
    confirmPassword: '', // camelCase
    // Personal Info
    firstName: '',       
    lastName: '',        
    email: '',
    age: '',
    sex: '',
    // Fitness Level
    fitnessLevel: '',    
    // Availability
    workoutTime: 30,     
    workoutDays: '',     
    // Equipment and Goals
    equipment: [],
    strength_goals: [],  // Use strength_goals to match backend
    // Review
    additionalGoals: '', 
  });

  const [strengthGoalsOptions, setStrengthGoalsOptions] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // State for Cancel Confirmation Dialog
  const [openCancelDialog, setOpenCancelDialog] = useState(false);

  // Fetch strength goals and equipment options from the backend
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [equipmentRes, strengthGoalsRes] = await Promise.all([
          axiosInstance.get('/equipment/'),
          axiosInstance.get('/strength-goals/'),
        ]);

        // Adjust based on actual API response structure
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

  // Define validation schemas for each step using Yup
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
      strength_goals: Yup.array()
        .of(Yup.number())
        .min(1, 'Select at least one goal'),
    }),
    // Step 5: Review & Submit
    Yup.object(),
  ];

  // Function to proceed to the next step
  const handleNext = (values) => {
    console.log('Proceeding to next step with values:', values); // Debug log
    setFormValues(values);  // Capture form values on every step
    setActiveStep((prev) => prev + 1);
  };

  // Function to go back to the previous step
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Function to handle form submission
  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    console.log('Submitting form with values:', values); // Debug log
    if (activeStep < steps.length - 1) {
      // Intermediate step: Proceed to next step
      handleNext(values);
      setSubmitting(false);
    } else {
      // Final step: Submit the form
      try {
        // Make API request to register the user using axiosInstance
        const response = await axiosInstance.post('register/', values);

        // Handle successful registration
        alert(response.data.message);
        // Optionally, redirect to login page
        window.location.href = '/login/';
      } catch (error) {
        console.error('Registration error:', error); // Debug log
        if (error.response && error.response.data) {
          const backendErrors = error.response.data;

          // Initialize an empty object to hold mapped errors
          const mappedErrors = {};

          // Map backend errors to Formik fields
          if (backendErrors.username) {
            mappedErrors.username = backendErrors.username;
          }

          if (backendErrors.email) {
            mappedErrors.email = backendErrors.email;
          }

          if (backendErrors.firstName) {
            mappedErrors.firstName = backendErrors.firstName;
          }

          if (backendErrors.lastName) {
            mappedErrors.lastName = backendErrors.lastName;
          }

          if (backendErrors.password) {
            mappedErrors.password = backendErrors.password;
          }

          if (backendErrors.confirmPassword) {
            mappedErrors.confirmPassword = backendErrors.confirmPassword;
          }

          if (backendErrors.strength_goals) {
            mappedErrors.strength_goals = backendErrors.strength_goals;
          }

          // Handle general or non-field-specific errors
          if (backendErrors.detail) {
            mappedErrors.general = backendErrors.detail;
          }

          if (backendErrors.error) {
            mappedErrors.general = backendErrors.error;
          }

          // Additional specific error handling can be added here

          setErrors(mappedErrors);
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Function to render the content of each step
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
            <FitnessGoals strengthGoalsOptions={strengthGoalsOptions} />
            <Equipment equipmentOptions={equipmentOptions} />
          </>
        );
      case 5:
        return (
          <ReviewSubmit
            values={formValues}  // Ensure the latest formValues are passed
            equipmentOptions={equipmentOptions}
            strengthGoalsOptions={strengthGoalsOptions}
          />
        );
      default:
        return 'Unknown Step';
    }
  };

  // Functions to handle Cancel Confirmation Dialog
  const handleOpenCancelDialog = () => {
    setOpenCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
  };

  const handleConfirmCancel = () => {
    // Reset form and navigate back to the first step
    setActiveStep(0);
    setFormValues({
      // Reset all fields with camelCase
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      email: '',
      age: '',
      sex: '',
      fitnessLevel: '',
      workoutTime: 30,
      workoutDays: '',
      equipment: [],
      strength_goals: [],
      additionalGoals: '',
    });
    setOpenCancelDialog(false);
  };

  // Display loading state while fetching options
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

  // Display error if fetching options failed
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
    <Box width="100%" maxWidth="800px" margin="0 auto" padding="20px">
      {/* Stepper to visualize the registration steps */}
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Formik form management */}
      <Formik
        initialValues={formValues}  // Use formValues here to ensure updates reflect
        validationSchema={validationSchemas[activeStep]}
        onSubmit={handleSubmit}
        enableReinitialize
        validateOnBlur={true}
        validateOnChange={false} // Validate only on blur or submit
      >
        {(formikProps) => (
          <Form>
            {/* Render the appropriate form step */}
            {getStepContent(activeStep)}

            {/* FormikDevTools for debugging */}
            <FormikDevTools />

            {/* Display general errors if any */}
            {formikProps.errors.general && (
              <Box color="red" marginTop="10px">
                {formikProps.errors.general}
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box display="flex" justifyContent="space-between" alignItems="center" marginTop="20px">
              {/* "Cancel" Button */}
              <Button variant="outlined" color="error" onClick={handleOpenCancelDialog}>
                Cancel
              </Button>

              {/* "Back" and "Next" Buttons */}
              <Box>
                {activeStep > 0 && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleBack}
                    style={{ marginRight: '10px' }}
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={formikProps.isSubmitting}
                >
                  {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
                </Button>
              </Box>
            </Box>
          </Form>
        )}
      </Formik>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={openCancelDialog}
        onClose={handleCloseCancelDialog}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">Cancel Registration</DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Are you sure you want to cancel the registration? All your progress will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} color="primary">
            No
          </Button>
          <Button onClick={handleConfirmCancel} color="error" autoFocus>
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Registration;

// src/components/RegistrationSteps/PersonalInfo.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Alert,
  Popper,
  Paper,
  Fade,
  Tooltip,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useFormikContext } from 'formik';
import axiosInstance from '../../api/axiosInstance';
import debounce from 'lodash.debounce';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

function PersonalInfo() {
  const { values, errors, touched, handleChange, handleBlur, setFieldError, setFieldTouched } = useFormikContext();

  return (
    <Box 
      width="100%" 
      maxWidth="600px" 
      margin="0 auto" 
      sx={{
        '& .MuiTextField-root, & .MuiFormControl-root': {
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        '& .MuiOutlinedInput-root': {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
          },
        },
      }}
    >
      <Typography 
        variant="h5" 
        gutterBottom 
        textAlign="center"
        sx={{ 
          mb: 4,
          fontWeight: 600,
          color: 'primary.main',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Personal Information
      </Typography>

      <Box 
        display="grid" 
        gap={3}
        sx={{
          '& .MuiFormControl-root': {
            position: 'relative',
          },
        }}
      >
        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            name="firstName"
            label="First Name"
            value={values.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.firstName && Boolean(errors.firstName)}
            helperText={touched.firstName && errors.firstName}
            required
            inputProps={{
              autoComplete: "given-name"
            }}
            sx={{
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              },
            }}
          />

          <TextField
            fullWidth
            name="lastName"
            label="Last Name"
            value={values.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.lastName && Boolean(errors.lastName)}
            helperText={touched.lastName && errors.lastName}
            required
            inputProps={{
              autoComplete: "family-name"
            }}
            sx={{
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              },
            }}
          />
        </Box>

        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            name="age"
            label="Age"
            type="number"
            value={values.age}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.age && Boolean(errors.age)}
            helperText={touched.age && errors.age}
            required
            inputProps={{
              min: 13,
              max: 120
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Age must be between 13 and 120">
                    <InfoIcon color="action" sx={{ cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              },
            }}
          />

          <FormControl 
            fullWidth 
            required 
            error={touched.sex && Boolean(errors.sex)}
            sx={{
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              },
            }}
          >
            <InputLabel id="sex-label">Sex</InputLabel>
            <Select
              labelId="sex-label"
              name="sex"
              value={values.sex}
              label="Sex"
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
              <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
            </Select>
            {touched.sex && errors.sex && (
              <FormHelperText>{errors.sex}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            name="weight"
            label="Weight (kg)"
            type="number"
            value={values.weight}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.weight && Boolean(errors.weight)}
            helperText={touched.weight && errors.weight}
            required
            inputProps={{
              min: 30,
              max: 300,
              step: 0.1
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Weight must be between 30kg and 300kg">
                    <InfoIcon color="action" sx={{ cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              },
            }}
          />

          <TextField
            fullWidth
            name="height"
            label="Height (cm)"
            type="number"
            value={values.height}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.height && Boolean(errors.height)}
            helperText={touched.height && errors.height}
            required
            inputProps={{
              min: 100,
              max: 250,
              step: 0.1
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Height must be between 100cm and 250cm">
                    <InfoIcon color="action" sx={{ cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default PersonalInfo;

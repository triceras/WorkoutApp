// src/components/RegistrationSteps/Equipment.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormControl,
  FormLabel,
  Button,
  Box,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

function Equipment({ nextStep, prevStep, equipmentOptions }) {
  const { values, errors, touched, setFieldValue } = useFormikContext();

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    const id = parseInt(value, 10);
    if (checked) {
      setFieldValue('equipment', [...values.equipment, id]);
    } else {
      setFieldValue(
        'equipment',
        values.equipment.filter((item) => item !== id)
      );
    }
  };

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <Typography variant="h5" gutterBottom>
        Available Equipment
      </Typography>
      <FormControl
        component="fieldset"
        error={touched.equipment && Boolean(errors.equipment)}
      >
        <FormLabel component="legend">Select Equipment You Have</FormLabel>
        <FormGroup>
          {equipmentOptions.length === 0 ? (
            <Typography>No equipment options available.</Typography>
          ) : (
            equipmentOptions.map((item) => (
              <FormControlLabel
                key={item.id}
                control={
                  <Checkbox
                    name="equipment"
                    value={item.id}
                    checked={values.equipment.includes(item.id)}
                    onChange={handleCheckboxChange}
                  />
                }
                label={item.name}
              />
            ))
          )}
        </FormGroup>
        {touched.equipment && errors.equipment && (
          <Typography variant="body2" color="error">
            {errors.equipment}
          </Typography>
        )}
      </FormControl>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between" marginTop="20px">
        <Button variant="contained" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          disabled={values.equipment.length === 0 || Boolean(errors.equipment)}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
}

Equipment.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
  equipmentOptions: PropTypes.array.isRequired,
};

export default Equipment;

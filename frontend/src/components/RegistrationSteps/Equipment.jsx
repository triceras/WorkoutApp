// src/components/RegistrationSteps/Equipment.jsx

import React from 'react';
import { useFormikContext } from 'formik';
import {
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormControl,
  FormLabel,
  Typography,
  Box,
} from '@mui/material';
import PropTypes from 'prop-types';

function Equipment({ equipmentOptions }) {
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

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = equipmentOptions.map((item) => item.id);
      setFieldValue('equipment', allIds);
    } else {
      setFieldValue('equipment', []);
    }
  };

  return (
    <Box width="100%" maxWidth="600px" margin="0 auto">
      <FormControl
        component="fieldset"
        error={touched.equipment && Boolean(errors.equipment)}
      >
        <FormLabel component="legend">Select Equipment You Have</FormLabel>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={values.equipment.length === equipmentOptions.length}
                onChange={handleSelectAll}
              />
            }
            label="Select All"
          />
          {equipmentOptions.length === 0 ? (
            <Typography>No equipment options available.</Typography>
          ) : (
            equipmentOptions.map((item) => (
              <FormControlLabel
                key={item.id}
                control={
                  <Checkbox
                    checked={values.equipment.includes(item.id)}
                    onChange={handleCheckboxChange}
                    value={item.id}
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
    </Box>
  );
}

Equipment.propTypes = {
  equipmentOptions: PropTypes.array.isRequired,
};

export default Equipment;

// src/components/RegistrationSteps/Equipment.jsx

import React from 'react';
import { FormControlLabel, Checkbox, FormGroup, FormControl, FormLabel, Button } from '@mui/material';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';

function Equipment({ nextStep, prevStep, equipmentOptions }) {
  const { values, errors, touched, setFieldValue } = useFormikContext();

  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    const id = parseInt(value, 10);
    if (checked) {
      setFieldValue('equipment', [...values.equipment, id]);
    } else {
      setFieldValue('equipment', values.equipment.filter((item) => item !== id));
    }
  };

  return (
    <div>
      <FormControl
        component="fieldset"
        margin="normal"
        error={touched.equipment && Boolean(errors.equipment)}
      >
        <FormLabel component="legend">Available Equipment</FormLabel>
        <FormGroup>
          {equipmentOptions.length === 0 ? (
            <p>No equipment options available.</p>
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
          <div style={{ color: 'red', marginTop: '5px' }}>{errors.equipment}</div>
        )}
      </FormControl>

      {/* Navigation Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="contained" onClick={prevStep}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={nextStep}
          style={{ marginLeft: '10px' }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

Equipment.propTypes = {
  nextStep: PropTypes.func.isRequired,
  prevStep: PropTypes.func.isRequired,
  equipmentOptions: PropTypes.array.isRequired,
};

export default Equipment;

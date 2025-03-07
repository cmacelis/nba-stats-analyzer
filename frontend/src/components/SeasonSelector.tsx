import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent 
} from '@mui/material';

interface SeasonSelectorProps {
  value: string;
  onChange: (season: string) => void;
  label?: string;
  disabled?: boolean;
}

const AVAILABLE_SEASONS = [
  '2023-24',
  '2022-23',
  '2021-22',
  '2020-21',
  '2019-20',
  '2018-19',
  '2017-18',
  '2016-17',
  '2015-16'
];

const SeasonSelector: React.FC<SeasonSelectorProps> = ({
  value,
  onChange,
  label = 'Season',
  disabled = false
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <FormControl fullWidth variant="outlined" disabled={disabled}>
      <InputLabel id="season-selector-label">{label}</InputLabel>
      <Select
        labelId="season-selector-label"
        value={value}
        onChange={handleChange}
        label={label}
      >
        {AVAILABLE_SEASONS.map((season) => (
          <MenuItem key={season} value={season}>
            {season}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SeasonSelector; 
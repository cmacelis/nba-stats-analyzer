import { useState } from 'react';

type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

interface ValidationState {
  isValid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: {},
    touched: {}
  });

  const validateField = (name: keyof T, value: T[keyof T]) => {
    const fieldRules = validationRules[name] || [];
    const fieldErrors = fieldRules
      .filter(rule => !rule.validate(value))
      .map(rule => rule.message);

    return fieldErrors;
  };

  const handleChange = (name: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    const fieldErrors = validateField(name, value);
    setValidationState(prev => ({
      ...prev,
      errors: { ...prev.errors, [name]: fieldErrors },
      isValid: Object.values(prev.errors).every(errors => errors.length === 0),
      touched: { ...prev.touched, [name]: true }
    }));
  };

  return {
    values,
    setValues,
    handleChange,
    ...validationState
  };
} 
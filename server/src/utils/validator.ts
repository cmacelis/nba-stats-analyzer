import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  pattern?: RegExp;
  min?: number;
  max?: number;
  enum?: any[];
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

interface ValidationError {
  field: string;
  message: string;
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];
    const params = { ...req.params, ...req.query, ...req.body };

    Object.entries(schema).forEach(([field, rules]) => {
      const value = params[field];

      // Check required
      if (rules.required && !value) {
        errors.push({
          field,
          message: `${field} is required`
        });
        return;
      }

      if (value) {
        // Check type
        if (rules.type && typeof value !== rules.type) {
          errors.push({
            field,
            message: `${field} must be a ${rules.type}`
          });
        }

        // Check pattern
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push({
            field,
            message: `${field} has invalid format`
          });
        }

        // Check min/max for numbers
        if (rules.type === 'number') {
          const numValue = Number(value);
          if (rules.min !== undefined && numValue < rules.min) {
            errors.push({
              field,
              message: `${field} must be at least ${rules.min}`
            });
          }
          if (rules.max !== undefined && numValue > rules.max) {
            errors.push({
              field,
              message: `${field} must be at most ${rules.max}`
            });
          }
        }

        // Check enum values
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: `${field} must be one of: ${rules.enum.join(', ')}`
          });
        }
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
}; 
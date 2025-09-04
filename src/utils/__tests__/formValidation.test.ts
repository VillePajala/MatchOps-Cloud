/**
 * Form Validation Tests - Comprehensive Coverage
 * 
 * Tests for the centralized form validation system including
 * validation rules, schema builders, and utility functions.
 */

import {
  validationRules,
  formSchemas,
  createUniquenessValidator,
  createMatchValidator,
  createAsyncValidator,
  createConditionalValidator,
  createDynamicSchema,
  createPlayerFields,
  mergeValidationRules,
  extractFormErrors,
  formatErrorMessage,
  createFieldErrorMap,
  commonValidation,
} from '../formValidation';
import type { FormValidationRule, FormSchema, FieldValue } from '@/stores/formStore';

// Mock logger
jest.mock('@/utils/logger', () => ({
  default: {
    error: jest.fn(),
  },
}));

// Mock fetch for async validation tests
global.fetch = jest.fn();

describe('Form Validation System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Validation Rules', () => {
    describe('required', () => {
      it('should create required validation rule with default message', () => {
        const rule = validationRules.required();
        
        expect(rule.type).toBe('required');
        expect(rule.message).toBe('This field is required');
      });

      it('should create required validation rule with custom message', () => {
        const customMessage = 'Custom required message';
        const rule = validationRules.required(customMessage);
        
        expect(rule.type).toBe('required');
        expect(rule.message).toBe(customMessage);
      });
    });

    describe('minLength', () => {
      it('should create minLength validation rule with default message', () => {
        const rule = validationRules.minLength(5);
        
        expect(rule.type).toBe('minLength');
        expect(rule.value).toBe(5);
        expect(rule.message).toBe('Must be at least 5 characters');
      });

      it('should create minLength validation rule with custom message', () => {
        const customMessage = 'Too short!';
        const rule = validationRules.minLength(10, customMessage);
        
        expect(rule.type).toBe('minLength');
        expect(rule.value).toBe(10);
        expect(rule.message).toBe(customMessage);
      });
    });

    describe('maxLength', () => {
      it('should create maxLength validation rule with default message', () => {
        const rule = validationRules.maxLength(20);
        
        expect(rule.type).toBe('maxLength');
        expect(rule.value).toBe(20);
        expect(rule.message).toBe('Must be no more than 20 characters');
      });

      it('should create maxLength validation rule with custom message', () => {
        const customMessage = 'Too long!';
        const rule = validationRules.maxLength(15, customMessage);
        
        expect(rule.type).toBe('maxLength');
        expect(rule.value).toBe(15);
        expect(rule.message).toBe(customMessage);
      });
    });

    describe('email', () => {
      it('should create email validation rule', () => {
        const rule = validationRules.email();
        
        expect(rule.type).toBe('pattern');
        expect(rule.value).toBeInstanceOf(RegExp);
        expect(rule.message).toBe('Please enter a valid email address');
      });

      it('should validate correct email patterns', () => {
        const rule = validationRules.email();
        const pattern = rule.value as RegExp;
        
        expect(pattern.test('test@example.com')).toBe(true);
        expect(pattern.test('user.name@domain.co.uk')).toBe(true);
        expect(pattern.test('invalid-email')).toBe(false);
        expect(pattern.test('@domain.com')).toBe(false);
        expect(pattern.test('test@')).toBe(false);
      });
    });

    describe('phoneNumber', () => {
      it('should create phone number validation rule', () => {
        const rule = validationRules.phoneNumber();
        
        expect(rule.type).toBe('pattern');
        expect(rule.value).toBeInstanceOf(RegExp);
        expect(rule.message).toBe('Please enter a valid phone number');
      });

      it('should validate phone number patterns', () => {
        const rule = validationRules.phoneNumber();
        const pattern = rule.value as RegExp;
        
        expect(pattern.test('+1-555-123-4567')).toBe(true);
        expect(pattern.test('555 123 4567')).toBe(true);
        expect(pattern.test('(555) 123-4567')).toBe(true);
        expect(pattern.test('abc-def-ghij')).toBe(false);
      });
    });

    describe('alphanumeric', () => {
      it('should validate alphanumeric characters only', () => {
        const rule = validationRules.alphanumeric();
        const pattern = rule.value as RegExp;
        
        expect(pattern.test('abc123')).toBe(true);
        expect(pattern.test('ABC123')).toBe(true);
        expect(pattern.test('abc-123')).toBe(false);
        expect(pattern.test('abc 123')).toBe(false);
        expect(pattern.test('abc@123')).toBe(false);
      });
    });

    describe('noSpecialChars', () => {
      it('should allow letters, numbers, and spaces only', () => {
        const rule = validationRules.noSpecialChars();
        const pattern = rule.value as RegExp;
        
        expect(pattern.test('abc 123')).toBe(true);
        expect(pattern.test('ABC 123')).toBe(true);
        expect(pattern.test('abc-123')).toBe(false);
        expect(pattern.test('abc@123')).toBe(false);
        expect(pattern.test('abc_123')).toBe(false);
      });
    });
  });

  describe('Soccer-specific Validation Rules', () => {
    describe('teamName', () => {
      it('should return array of validation rules for team name', () => {
        const rules = validationRules.teamName();
        
        expect(Array.isArray(rules)).toBe(true);
        expect(rules).toHaveLength(3);
        expect(rules[0].type).toBe('required');
        expect(rules[1].type).toBe('minLength');
        expect(rules[2].type).toBe('maxLength');
      });
    });

    describe('playerName', () => {
      it('should return array of validation rules for player name', () => {
        const rules = validationRules.playerName();
        
        expect(Array.isArray(rules)).toBe(true);
        expect(rules).toHaveLength(3);
        expect(rules[1].value).toBe(2); // minLength
        expect(rules[2].value).toBe(30); // maxLength
      });
    });

    describe('jerseyNumber', () => {
      it('should validate jersey numbers between 1 and 99', () => {
        const rule = validationRules.jerseyNumber();
        
        expect(rule.type).toBe('custom');
        expect(rule.validator).toBeDefined();

        // Valid numbers
        expect(rule.validator!(1, {})).toBe(true);
        expect(rule.validator!(99, {})).toBe(true);
        expect(rule.validator!(10, {})).toBe(true);

        // Invalid numbers
        expect(rule.validator!(0, {})).toBe(false);
        expect(rule.validator!(100, {})).toBe(false);
        expect(rule.validator!('abc', {})).toBe(false);
        expect(rule.validator!(null, {})).toBe(false);
      });
    });

    describe('gameLocation', () => {
      it('should return array of validation rules for game location', () => {
        const rules = validationRules.gameLocation();
        
        expect(Array.isArray(rules)).toBe(true);
        expect(rules).toHaveLength(2);
        expect(rules[0].type).toBe('minLength');
        expect(rules[1].type).toBe('maxLength');
      });
    });

    describe('gameDuration', () => {
      it('should validate game duration between 10 and 180 minutes', () => {
        const rule = validationRules.gameDuration();
        
        expect(rule.validator!(45, {})).toBe(true);
        expect(rule.validator!(10, {})).toBe(true);
        expect(rule.validator!(180, {})).toBe(true);
        expect(rule.validator!(5, {})).toBe(false);
        expect(rule.validator!(200, {})).toBe(false);
        expect(rule.validator!('abc', {})).toBe(false);
      });
    });
  });

  describe('Date Validation Rules', () => {
    describe('futureDate', () => {
      it('should validate future dates', () => {
        const rule = validationRules.futureDate();
        
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        expect(rule.validator!(futureDate, {})).toBe(true);
        expect(rule.validator!(pastDate, {})).toBe(false);
        expect(rule.validator!(null, {})).toBe(true); // Optional field
        expect(rule.validator!('', {})).toBe(true); // Optional field
      });
    });

    describe('validDate', () => {
      it('should validate date format', () => {
        const rule = validationRules.validDate();
        
        expect(rule.validator!('2025-01-15', {})).toBe(true);
        expect(rule.validator!('2025-12-31', {})).toBe(true);
        expect(rule.validator!('invalid-date', {})).toBe(false);
        expect(rule.validator!('2025-13-32', {})).toBe(false);
        expect(rule.validator!(null, {})).toBe(true); // Optional field
      });
    });
  });

  describe('Custom Validation Rules', () => {
    describe('custom', () => {
      it('should create custom validation rule', () => {
        const validator = (value: FieldValue) => value === 'test';
        const rule = validationRules.custom(validator, 'Must be test');
        
        expect(rule.type).toBe('custom');
        expect(rule.message).toBe('Must be test');
        expect(rule.validator).toBe(validator);
      });
    });

    describe('async', () => {
      it('should create async validation rule', () => {
        const validator = async (value: FieldValue) => value === 'test';
        const rule = validationRules.async(validator, 'Async validation failed');
        
        expect(rule.type).toBe('async');
        expect(rule.message).toBe('Async validation failed');
        expect(rule.validator).toBe(validator);
      });
    });
  });

  describe('Form Schemas', () => {
    describe('gameSettings', () => {
      it('should create complete game settings schema', () => {
        const schema = formSchemas.gameSettings();
        
        expect(schema.formId).toBe('gameSettings');
        expect(schema.fields.teamName).toBeDefined();
        expect(schema.fields.opponentName).toBeDefined();
        expect(schema.fields.gameDate).toBeDefined();
        expect(schema.fields.periods).toBeDefined();
        expect(schema.fields.periodDuration).toBeDefined();
        expect(schema.persistence?.enabled).toBe(true);
        expect(schema.validation?.validateOnChange).toBe(true);
      });

      it('should allow overrides', () => {
        const overrides = {
          formId: 'customGameSettings',
          validation: { validateOnChange: false },
        };
        const schema = formSchemas.gameSettings(overrides);
        
        expect(schema.formId).toBe('customGameSettings');
        expect(schema.validation?.validateOnChange).toBe(false);
      });
    });

    describe('roster', () => {
      it('should create roster schema', () => {
        const schema = formSchemas.roster();
        
        expect(schema.formId).toBe('roster');
        expect(schema.fields.teamName).toBeDefined();
        expect(schema.persistence?.enabled).toBe(true);
      });
    });

    describe('newGameSetup', () => {
      it('should create new game setup schema', () => {
        const schema = formSchemas.newGameSetup();
        
        expect(schema.formId).toBe('newGameSetup');
        expect(schema.fields.setupType).toBeDefined();
        expect(schema.persistence?.enabled).toBe(false);
        expect(schema.validation?.validateOnMount).toBe(true);
      });
    });

    describe('auth', () => {
      it('should create auth schema with no persistence', () => {
        const schema = formSchemas.auth();
        
        expect(schema.formId).toBe('auth');
        expect(schema.fields.email).toBeDefined();
        expect(schema.fields.password).toBeDefined();
        expect(schema.persistence?.enabled).toBe(false);
      });
    });

    describe('settings', () => {
      it('should create settings schema', () => {
        const schema = formSchemas.settings();
        
        expect(schema.formId).toBe('settings');
        expect(schema.fields.language).toBeDefined();
        expect(schema.fields.notifications).toBeDefined();
        expect(schema.persistence?.enabled).toBe(true);
      });
    });
  });

  describe('Advanced Validation Utilities', () => {
    describe('createUniquenessValidator', () => {
      it('should validate uniqueness within collection', () => {
        const collection = [
          { name: 'John' },
          { name: 'Jane' },
          { name: 'Bob' },
        ];
        const validator = createUniquenessValidator(
          collection,
          item => item.name,
          'Name must be unique'
        );
        
        expect(validator.type).toBe('custom');
        expect(validator.message).toBe('Name must be unique');
        
        // Should be valid for new names
        expect(validator.validator!('Alice', {})).toBe(true);
        expect(validator.validator!('', {})).toBe(true); // Empty is not violation
        
        // Should be invalid for existing names (case insensitive)
        expect(validator.validator!('John', {})).toBe(false);
        expect(validator.validator!('john', {})).toBe(false);
        expect(validator.validator!('JANE', {})).toBe(false);
      });
    });

    describe('createMatchValidator', () => {
      it('should validate field matching', () => {
        const validator = createMatchValidator('password', 'Passwords must match');
        
        expect(validator.type).toBe('custom');
        expect(validator.message).toBe('Passwords must match');
        
        const formValues = { password: 'test123', confirmPassword: 'test123' };
        
        expect(validator.validator!('test123', formValues)).toBe(true);
        expect(validator.validator!('different', formValues)).toBe(false);
      });
    });

    describe('createAsyncValidator', () => {
      it('should create async validator that calls API', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockResolvedValue({
          json: () => Promise.resolve({ isValid: true }),
        } as Response);

        const validator = createAsyncValidator('/api/validate', 'Validation failed');
        
        expect(validator.type).toBe('async');
        
        const result = await validator.validator!('test', {});
        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/validate?value=test');
      });

      it('should handle API errors gracefully', async () => {
        const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
        mockFetch.mockRejectedValue(new Error('Network error'));

        const validator = createAsyncValidator('/api/validate', 'Validation failed');
        
        const result = await validator.validator!('test', {});
        expect(result).toBe(false);
      });

      it('should return true for empty values', async () => {
        const validator = createAsyncValidator('/api/validate', 'Validation failed');
        
        const result = await validator.validator!('', {});
        expect(result).toBe(true);
      });
    });

    describe('createConditionalValidator', () => {
      it('should validate conditionally based on form values', async () => {
        const condition = (formValues: Record<string, FieldValue>) => 
          formValues.requireValidation === true;
        
        const rules = [validationRules.required('Field is required when condition is met')];
        
        const validator = createConditionalValidator(condition, rules, 'Conditional validation failed');
        
        expect(validator.type).toBe('custom');
        
        // Should skip validation when condition is false
        const result1 = await validator.validator!('', { requireValidation: false });
        expect(result1).toBe(true);
        
        // Should validate when condition is true
        const result2 = await validator.validator!('', { requireValidation: true });
        expect(result2).toBe(false); // Required field is empty
        
        const result3 = await validator.validator!('value', { requireValidation: true });
        expect(result3).toBe(true); // Required field has value
      });
    });
  });

  describe('Form Schema Utilities', () => {
    describe('createDynamicSchema', () => {
      it('should merge base schema with dynamic fields', () => {
        const baseSchema = formSchemas.gameSettings();
        const dynamicFields = {
          customField1: {
            initialValue: 'test',
            validation: [validationRules.required()],
          },
          customField2: {
            initialValue: 42,
            validation: [],
          },
        };
        
        const dynamicSchema = createDynamicSchema(baseSchema, dynamicFields);
        
        expect(dynamicSchema.formId).toBe(baseSchema.formId);
        expect(dynamicSchema.fields.teamName).toBeDefined(); // Base field
        expect(dynamicSchema.fields.customField1).toBeDefined(); // Dynamic field
        expect(dynamicSchema.fields.customField2).toBeDefined(); // Dynamic field
        expect(dynamicSchema.fields.customField1.initialValue).toBe('test');
      });
    });

    describe('createPlayerFields', () => {
      it('should create player fields for roster forms', () => {
        const playerFields = createPlayerFields(3);
        
        expect(Object.keys(playerFields)).toHaveLength(9); // 3 players × 3 fields each
        expect(playerFields.player_0_name).toBeDefined();
        expect(playerFields.player_0_number).toBeDefined();
        expect(playerFields.player_0_position).toBeDefined();
        expect(playerFields.player_2_name).toBeDefined();
        
        // Check field configuration
        expect(playerFields.player_0_name.initialValue).toBe('');
        expect(playerFields.player_0_name.persist).toBe(true);
        expect(playerFields.player_0_number.initialValue).toBeNull();
      });

      it('should handle zero players', () => {
        const playerFields = createPlayerFields(0);
        expect(Object.keys(playerFields)).toHaveLength(0);
      });
    });

    describe('mergeValidationRules', () => {
      it('should merge single rules and rule arrays', () => {
        const rule1 = validationRules.required();
        const rules2 = [validationRules.minLength(5), validationRules.maxLength(20)];
        const rule3 = validationRules.email();
        
        const merged = mergeValidationRules(rule1, rules2, rule3);
        
        expect(merged).toHaveLength(4);
        expect(merged[0]).toBe(rule1);
        expect(merged[1]).toBe(rules2[0]);
        expect(merged[2]).toBe(rules2[1]);
        expect(merged[3]).toBe(rule3);
      });

      it('should handle empty arrays', () => {
        const merged = mergeValidationRules([], []);
        expect(merged).toHaveLength(0);
      });
    });
  });

  describe('Error Message Utilities', () => {
    describe('extractFormErrors', () => {
      it('should extract non-null error messages', () => {
        const errors = {
          field1: 'Error 1',
          field2: null,
          field3: 'Error 3',
          field4: null,
          field5: 'Error 5',
        };
        
        const extracted = extractFormErrors(errors);
        
        expect(extracted).toEqual(['Error 1', 'Error 3', 'Error 5']);
      });

      it('should handle empty errors object', () => {
        const extracted = extractFormErrors({});
        expect(extracted).toEqual([]);
      });
    });

    describe('formatErrorMessage', () => {
      it('should format error messages properly', () => {
        expect(formatErrorMessage('field', 'error message')).toBe('Error message.');
        expect(formatErrorMessage('field', 'Error message.')).toBe('Error message.');
        expect(formatErrorMessage('field', 'ERROR MESSAGE')).toBe('ERROR MESSAGE.');
        expect(formatErrorMessage('field', null)).toBeNull();
      });
    });

    describe('createFieldErrorMap', () => {
      it('should create field-specific error formatters', () => {
        const fieldLabels = {
          teamName: 'Team Name',
          playerName: 'Player Name',
          email: 'Email Address',
        };
        
        const errorMap = createFieldErrorMap(fieldLabels);
        
        expect(errorMap.teamName('is required')).toBe('Team Name: is required');
        expect(errorMap.playerName('is too short')).toBe('Player Name: is too short');
        expect(errorMap.email('is invalid')).toBe('Email Address: is invalid');
      });
    });
  });

  describe('Common Validation Sets', () => {
    it('should provide pre-configured validation sets', () => {
      expect(Array.isArray(commonValidation.teamName)).toBe(true);
      expect(Array.isArray(commonValidation.playerName)).toBe(true);
      expect(Array.isArray(commonValidation.email)).toBe(true);
      expect(Array.isArray(commonValidation.password)).toBe(true);
      expect(Array.isArray(commonValidation.phoneNumber)).toBe(true);
      expect(Array.isArray(commonValidation.optional)).toBe(true);
      
      expect(commonValidation.teamName).toHaveLength(3);
      expect(commonValidation.email).toHaveLength(2);
      expect(commonValidation.optional).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined and null values in validators', () => {
      const rule = validationRules.jerseyNumber();
      
      expect(rule.validator!(undefined, {})).toBe(false);
      expect(rule.validator!(null, {})).toBe(false);
    });

    it('should handle non-string values in pattern validation', () => {
      const rule = validationRules.email();
      const pattern = rule.value as RegExp;
      
      // These would be handled by the validation engine, but testing pattern directly
      expect(pattern.test(undefined as any)).toBe(false);
      expect(pattern.test(null as any)).toBe(false);
      expect(pattern.test(123 as any)).toBe(false);
    });

    it('should handle malformed date strings', () => {
      const rule = validationRules.validDate();
      
      expect(rule.validator!('not-a-date', {})).toBe(false);
      expect(rule.validator!('2025-99-99', {})).toBe(false);
      // Note: Numbers are converted to valid dates, so this would actually be true
      // Let's test a clearly invalid string format instead
      expect(rule.validator!('invalid/date/format', {})).toBe(false);
    });
  });
});
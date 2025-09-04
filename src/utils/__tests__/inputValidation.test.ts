import {
  ValidationError,
  FIELD_LIMITS,
  validateString,
  validateUUID,
  validateEmail,
  validateNumber,
  validateBoolean,
  validateDate,
  validateAndParseJSON,
  validatePlayerData,
  validateGameEventData,
  sanitizeHtml,
  validateFields
} from '../inputValidation';

describe('inputValidation', () => {
  describe('ValidationError', () => {
    it('should create error with message and field', () => {
      const error = new ValidationError('Test error', 'testField', 'testValue');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.value).toBe('testValue');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('validateString', () => {
    it('should validate valid strings', () => {
      expect(validateString('test', 'field')).toBe('test');
      expect(validateString('  trimmed  ', 'field')).toBe('trimmed');
    });

    it('should handle optional empty strings', () => {
      expect(validateString('', 'field', { required: false })).toBe('');
      expect(validateString(null, 'field', { required: false })).toBe('');
      expect(validateString(undefined, 'field', { required: false })).toBe('');
    });

    it('should throw for non-string values when required', () => {
      expect(() => validateString(123, 'field', { required: true }))
        .toThrow(new ValidationError('field must be a string', 'field', 123));
    });

    it('should throw for empty required fields', () => {
      expect(() => validateString('', 'field', { required: true }))
        .toThrow(new ValidationError('field is required', 'field', ''));
    });

    it('should validate length constraints', () => {
      expect(() => validateString('ab', 'field', { minLength: 3 }))
        .toThrow(new ValidationError('field must be at least 3 characters', 'field', 'ab'));
      
      expect(() => validateString('toolong', 'field', { maxLength: 3 }))
        .toThrow(new ValidationError('field cannot exceed 3 characters', 'field', 'toolong'));
    });

    it('should validate patterns', () => {
      const pattern = /^[a-z]+$/;
      expect(validateString('valid', 'field', { pattern })).toBe('valid');
      
      expect(() => validateString('Invalid123', 'field', { pattern }))
        .toThrow(new ValidationError('field contains invalid characters', 'field', 'Invalid123'));
    });

    it('should prevent XSS attacks', () => {
      const malicious = '<script>alert("xss")</script>';
      expect(() => validateString(malicious, 'field'))
        .toThrow(new ValidationError('field contains forbidden content', 'field', malicious));
    });
  });

  describe('validateUUID', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should validate valid UUIDs', () => {
      expect(validateUUID(validUUID, 'id')).toBe(validUUID);
    });

    it('should handle optional UUIDs', () => {
      expect(validateUUID(null, 'id', false)).toBeNull();
      expect(validateUUID('', 'id', false)).toBeNull();
    });

    it('should throw for invalid UUIDs', () => {
      expect(() => validateUUID('invalid-uuid', 'id'))
        .toThrow(new ValidationError('id must be a valid UUID', 'id', 'invalid-uuid'));
    });
  });

  describe('validateEmail', () => {
    it('should validate valid emails', () => {
      expect(validateEmail('test@example.com', 'email')).toBe('test@example.com');
    });

    it('should handle optional emails', () => {
      expect(validateEmail(null, 'email', false)).toBeNull();
      expect(validateEmail('', 'email', false)).toBeNull();
    });

    it('should throw for invalid emails', () => {
      expect(() => validateEmail('invalid-email', 'email'))
        .toThrow(new ValidationError('email contains invalid characters', 'email', 'invalid-email'));
    });
  });

  describe('validateNumber', () => {
    it('should validate valid numbers', () => {
      expect(validateNumber(42, 'num')).toBe(42);
      expect(validateNumber('42.5', 'num')).toBe(42.5);
    });

    it('should handle optional numbers', () => {
      expect(validateNumber(null, 'num', { required: false })).toBeNull();
      expect(validateNumber('', 'num', { required: false })).toBeNull();
    });

    it('should validate integer constraint', () => {
      expect(validateNumber(42, 'num', { integer: true })).toBe(42);
      
      expect(() => validateNumber(42.5, 'num', { integer: true }))
        .toThrow(new ValidationError('num must be an integer', 'num', 42.5));
    });

    it('should validate min/max constraints', () => {
      expect(() => validateNumber(5, 'num', { min: 10 }))
        .toThrow(new ValidationError('num must be at least 10', 'num', 5));
      
      expect(() => validateNumber(15, 'num', { max: 10 }))
        .toThrow(new ValidationError('num cannot exceed 10', 'num', 15));
    });

    it('should throw for non-numbers', () => {
      expect(() => validateNumber('not-a-number', 'num'))
        .toThrow(new ValidationError('num must be a valid number', 'num', 'not-a-number'));
    });
  });

  describe('validateBoolean', () => {
    it('should validate booleans', () => {
      expect(validateBoolean(true, 'flag')).toBe(true);
      expect(validateBoolean(false, 'flag')).toBe(false);
    });

    it('should handle string representations', () => {
      expect(validateBoolean('true', 'flag')).toBe(true);
      expect(validateBoolean('false', 'flag')).toBe(false);
      expect(validateBoolean('1', 'flag')).toBe(true);
      expect(validateBoolean('0', 'flag')).toBe(false);
    });

    it('should handle optional booleans', () => {
      expect(validateBoolean(null, 'flag', false)).toBeNull();
    });

    it('should throw for invalid values', () => {
      expect(() => validateBoolean('invalid', 'flag'))
        .toThrow(new ValidationError('flag must be a boolean', 'flag', 'invalid'));
    });
  });

  describe('validateDate', () => {
    it('should validate valid dates', () => {
      const dateStr = '2023-01-01';
      const result = validateDate(dateStr, 'date');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2023);
    });

    it('should handle optional dates', () => {
      expect(validateDate(null, 'date', false)).toBeNull();
      expect(validateDate('', 'date', false)).toBeNull();
    });

    it('should throw for invalid dates', () => {
      expect(() => validateDate('invalid-date', 'date'))
        .toThrow(new ValidationError('date must be a valid date', 'date', 'invalid-date'));
    });
  });

  describe('validateAndParseJSON', () => {
    it('should parse valid JSON', () => {
      const json = '{"key": "value"}';
      const result = validateAndParseJSON(json, 'data');
      expect(result).toEqual({ key: 'value' });
    });

    it('should use custom validator', () => {
      const json = '{"name": "test"}';
      const validator = (data: any) => ({ name: data.name.toUpperCase() });
      const result = validateAndParseJSON(json, 'data', validator);
      expect(result).toEqual({ name: 'TEST' });
    });

    it('should throw for invalid JSON', () => {
      expect(() => validateAndParseJSON('invalid-json', 'data'))
        .toThrow(new ValidationError('data must be valid JSON', 'data', 'invalid-json'));
    });

    it('should throw for non-string input', () => {
      expect(() => validateAndParseJSON(123, 'data'))
        .toThrow(new ValidationError('data must be a JSON string', 'data', 123));
    });
  });

  describe('validatePlayerData', () => {
    it('should validate complete player data', () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        nickname: 'JD',
        jerseyNumber: '10',
        notes: 'Great player',
        isGoalie: true,
        receivedFairPlayCard: false
      };
      
      const result = validatePlayerData(data);
      expect(result).toEqual(data);
    });

    it('should validate minimal player data', () => {
      const data = { name: 'Jane Doe' };
      const result = validatePlayerData(data);
      
      expect(result.name).toBe('Jane Doe');
      expect(result.isGoalie).toBe(false);
      expect(result.receivedFairPlayCard).toBe(false);
    });

    it('should throw for invalid data structure', () => {
      expect(() => validatePlayerData(null))
        .toThrow(new ValidationError('Player data must be an object'));
      
      expect(() => validatePlayerData('string'))
        .toThrow(new ValidationError('Player data must be an object'));
    });

    it('should throw for missing required name', () => {
      expect(() => validatePlayerData({}))
        .toThrow(new ValidationError('player name must be a string', 'player name', undefined));
    });
  });

  describe('validateGameEventData', () => {
    it('should validate goal event', () => {
      const data = {
        id: 'event-1',
        type: 'goal',
        time: 120,
        scorerId: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const result = validateGameEventData(data);
      expect(result).toEqual(data);
    });

    it('should throw for goal without scorer', () => {
      const data = {
        id: 'event-1',
        type: 'goal',
        time: 120
      };
      
      expect(() => validateGameEventData(data))
        .toThrow(new ValidationError('Goal events must have a scorer ID', 'scorerId'));
    });

    it('should validate non-goal events', () => {
      const data = {
        id: 'event-1',
        type: 'substitution',
        time: 45
      };
      
      const result = validateGameEventData(data);
      expect(result.id).toBe('event-1');
      expect(result.type).toBe('substitution');
      expect(result.time).toBe(45);
    });

    it('should throw for invalid event type', () => {
      const data = {
        id: 'event-1',
        type: 'invalid-type',
        time: 120
      };
      
      expect(() => validateGameEventData(data))
        .toThrow(/Event type must be one of:/);
    });

    it('should throw for invalid time', () => {
      const data = {
        id: 'event-1',
        type: 'goal',
        time: -10,
        scorerId: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      expect(() => validateGameEventData(data))
        .toThrow(new ValidationError('event time must be at least 0', 'event time', -10));
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      expect(sanitizeHtml(input)).toBe(expected);
    });

    it('should escape all dangerous characters', () => {
      const input = '&<>"\'\/';
      const expected = '&amp;&lt;&gt;&quot;&#x27;&#x2F;';
      expect(sanitizeHtml(input)).toBe(expected);
    });
  });

  describe('validateFields', () => {
    it('should validate all fields successfully', () => {
      const data = { name: 'John', age: 25 };
      const validators = {
        name: (v: unknown) => validateString(v, 'name', { required: true }),
        age: (v: unknown) => validateNumber(v, 'age', { required: true, min: 0 })
      };
      
      const result = validateFields(data, validators);
      expect(result).toEqual({ name: 'John', age: 25 });
    });

    it('should collect all validation errors', () => {
      const data = { name: '', age: -5 };
      const validators = {
        name: (v: unknown) => validateString(v, 'name', { required: true }),
        age: (v: unknown) => validateNumber(v, 'age', { required: true, min: 0 })
      };
      
      expect(() => validateFields(data, validators))
        .toThrow(/Validation failed: name: name is required, age: age must be at least 0/);
    });

    it('should handle non-ValidationError exceptions', () => {
      const data = { test: 'value' };
      const validators = {
        test: () => { throw new Error('Generic error'); }
      };
      
      expect(() => validateFields(data, validators))
        .toThrow(/Validation failed: test: Validation failed/);
    });
  });

  describe('FIELD_LIMITS', () => {
    it('should have all expected limits', () => {
      expect(FIELD_LIMITS.PLAYER_NAME).toBe(100);
      expect(FIELD_LIMITS.TEAM_NAME).toBe(100);
      expect(FIELD_LIMITS.EMAIL).toBe(254);
      expect(FIELD_LIMITS.UUID).toBe(36);
    });
  });
});
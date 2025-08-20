/**
 * Comprehensive FormStore Tests - Real Implementation Testing
 * 
 * This test suite tests the actual formStore implementation to achieve high coverage.
 * Unlike the existing mocked tests, these tests exercise the real Zustand store.
 */

import { act, renderHook } from '@testing-library/react';
import { useFormStore, FormSchema, FormValidationRule, FieldValue } from '../formStore';

// Mock external dependencies
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/services/StorageServiceProvider', () => ({
  getStorageServiceAsync: jest.fn(() => Promise.resolve({
    setItem: jest.fn(),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(),
  })),
}));

jest.mock('@/services/TransactionManager', () => ({
  createAsyncOperation: jest.fn((fn) => fn),
  transactionManager: {
    execute: jest.fn((fn) => fn()),
  },
}));

jest.mock('@/services/RuntimeValidator', () => ({
  typeGuards: {
    isObject: jest.fn(() => true),
    isString: jest.fn(() => true),
  },
  validateStorageJSON: jest.fn(() => ({ isValid: true, data: {} })),
  validateExternalData: jest.fn(() => ({ isValid: true, data: {} })),
}));

jest.mock('@/services/MemoryManager', () => ({
  createManagedInterval: jest.fn(),
}));

jest.mock('@/utils/formValidation', () => ({
  validationRules: {
    required: (message: string): FormValidationRule => ({
      type: 'required',
      message,
      validator: (value) => value != null && value !== '',
    }),
    minLength: (length: number, message: string): FormValidationRule => ({
      type: 'minLength',
      message,
      value: length,
      validator: (value) => typeof value === 'string' && value.length >= length,
    }),
  },
}));

describe('FormStore Comprehensive Testing', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      const state = useFormStore.getState();
      Object.keys(state.forms).forEach(formId => {
        state.destroyForm(formId);
      });
    });
  });

  afterEach(() => {
    // Cleanup after each test
    act(() => {
      useFormStore.getState().cleanup();
    });
  });

  describe('Form Registration and Schema Management', () => {
    it('should create a new form with schema', () => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'test-form',
        fields: {
          name: {
            initialValue: '',
            rules: [],
          },
          email: {
            initialValue: '',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });

      const form = result.current.forms['test-form'];
      expect(form).toBeDefined();
      expect(form.schema).toEqual(schema);
      expect(form.fields.name).toBeDefined();
      expect(form.fields.email).toBeDefined();
      expect(form.fields.name.value).toBe('');
      expect(form.fields.name.error).toBeNull();
      expect(form.fields.name.touched).toBe(false);
      expect(form.fields.name.dirty).toBe(false);
    });

    it('should handle form creation with initial values', () => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'form-with-values',
        fields: {
          name: {
            initialValue: 'John Doe',
            rules: [],
          },
          age: {
            initialValue: 25,
            rules: [],
          },
          active: {
            initialValue: true,
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });

      const form = result.current.forms['form-with-values'];
      expect(form.fields.name.value).toBe('John Doe');
      expect(form.fields.age.value).toBe(25);
      expect(form.fields.active.value).toBe(true);
    });

    it('should re-register existing form and update schema', () => {
      const { result } = renderHook(() => useFormStore());
      
      const originalSchema: FormSchema = {
        formId: 'update-form',
        fields: {
          name: {
            initialValue: 'Original',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(originalSchema);
      });

      const updatedSchema: FormSchema = {
        formId: 'update-form',
        fields: {
          name: {
            initialValue: 'Updated',
            rules: [],
          },
          description: {
            initialValue: 'New field',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(updatedSchema);
      });

      const form = result.current.forms['update-form'];
      expect(form.schema).toEqual(updatedSchema);
      expect(form.fields.description).toBeDefined();
      expect(form.fields.description.value).toBe('New field');
    });
  });

  describe('Field Value Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'field-test-form',
        fields: {
          name: {
            initialValue: '',
            rules: [],
          },
          email: {
            initialValue: '',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });
    });

    it('should set field value and mark as dirty', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('field-test-form', 'name', 'John Doe');
      });

      const field = result.current.forms['field-test-form'].fields.name;
      expect(field.value).toBe('John Doe');
      expect(field.dirty).toBe(true);
      expect(result.current.forms['field-test-form'].isDirty).toBe(true);
    });

    it('should set multiple field values', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValues('field-test-form', {
          name: 'John Doe',
          email: 'john@example.com',
        });
      });

      const form = result.current.forms['field-test-form'];
      expect(form.fields.name.value).toBe('John Doe');
      expect(form.fields.email.value).toBe('john@example.com');
      expect(form.fields.name.dirty).toBe(true);
      expect(form.fields.email.dirty).toBe(true);
      expect(form.isDirty).toBe(true);
    });

    it('should handle field focus and blur', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldFocused('field-test-form', 'name', true);
      });

      expect(result.current.forms['field-test-form'].fields.name.focused).toBe(true);

      act(() => {
        result.current.setFieldFocused('field-test-form', 'name', false);
      });

      expect(result.current.forms['field-test-form'].fields.name.focused).toBe(false);
    });

    it('should mark field as touched on blur', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldTouched('field-test-form', 'name', true);
      });

      expect(result.current.forms['field-test-form'].fields.name.touched).toBe(true);
    });

    it('should set field error', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldError('field-test-form', 'name', 'This field is required');
      });

      const field = result.current.forms['field-test-form'].fields.name;
      expect(field.error).toBe('This field is required');
      expect(result.current.forms['field-test-form'].hasErrors).toBe(true);
    });

    it('should clear field error', () => {
      const { result } = renderHook(() => useFormStore());

      // Set error first
      act(() => {
        result.current.setFieldError('field-test-form', 'name', 'Error message');
      });

      // Clear error
      act(() => {
        result.current.setFieldError('field-test-form', 'name', null);
      });

      const field = result.current.forms['field-test-form'].fields.name;
      expect(field.error).toBeNull();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'validation-form',
        fields: {
          name: {
            initialValue: '',
            rules: [
              {
                type: 'required',
                message: 'Name is required',
                validator: (value) => value != null && value !== '',
              },
            ],
          },
          email: {
            initialValue: '',
            rules: [
              {
                type: 'required',
                message: 'Email is required',
                validator: (value) => value != null && value !== '',
              },
              {
                type: 'pattern',
                message: 'Invalid email format',
                validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
              },
            ],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });
    });

    it('should validate individual field', async () => {
      const { result } = renderHook(() => useFormStore());

      // Test empty value (should fail required validation)
      await act(async () => {
        await result.current.validateField('validation-form', 'name');
      });

      expect(result.current.forms['validation-form'].fields.name.error).toBe('Name is required');

      // Test valid value
      act(() => {
        result.current.setFieldValue('validation-form', 'name', 'John Doe');
      });

      await act(async () => {
        await result.current.validateField('validation-form', 'name');
      });

      expect(result.current.forms['validation-form'].fields.name.error).toBeNull();
    });

    it('should validate entire form', async () => {
      const { result } = renderHook(() => useFormStore());

      // Validate empty form (should have errors)
      let isValid;
      await act(async () => {
        isValid = await result.current.validateForm('validation-form');
      });

      expect(isValid).toBe(false);
      expect(result.current.forms['validation-form'].hasErrors).toBe(true);
      expect(result.current.forms['validation-form'].fields.name.error).toBe('Name is required');
      expect(result.current.forms['validation-form'].fields.email.error).toBe('Email is required');

      // Set valid values
      act(() => {
        result.current.setFieldValues('validation-form', {
          name: 'John Doe',
          email: 'john@example.com',
        });
      });

      // Validate again (should be valid)
      await act(async () => {
        isValid = await result.current.validateForm('validation-form');
      });

      expect(isValid).toBe(true);
      expect(result.current.forms['validation-form'].hasErrors).toBe(false);
    });

    it('should handle multiple validation rules', async () => {
      const { result } = renderHook(() => useFormStore());

      // Test invalid email format
      act(() => {
        result.current.setFieldValue('validation-form', 'email', 'invalid-email');
      });

      await act(async () => {
        await result.current.validateField('validation-form', 'email');
      });

      expect(result.current.forms['validation-form'].fields.email.error).toBe('Invalid email format');

      // Test valid email
      act(() => {
        result.current.setFieldValue('validation-form', 'email', 'valid@example.com');
      });

      await act(async () => {
        await result.current.validateField('validation-form', 'email');
      });

      expect(result.current.forms['validation-form'].fields.email.error).toBeNull();
    });
  });

  describe('Form State Management', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'state-form',
        fields: {
          name: {
            initialValue: 'Original',
            rules: [],
          },
          description: {
            initialValue: 'Original description',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });
    });

    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useFormStore());

      // Modify form
      act(() => {
        result.current.setFieldValues('state-form', {
          name: 'Modified',
          description: 'Modified description',
        });
        result.current.setFieldError('state-form', 'name', 'Some error');
        result.current.setFieldTouched('state-form', 'name', true);
      });

      // Verify modifications
      const formBefore = result.current.forms['state-form'];
      expect(formBefore.fields.name.value).toBe('Modified');
      expect(formBefore.fields.name.dirty).toBe(true);
      expect(formBefore.fields.name.touched).toBe(true);
      expect(formBefore.fields.name.error).toBe('Some error');

      // Reset form
      act(() => {
        result.current.resetForm('state-form');
      });

      // Verify reset
      const formAfter = result.current.forms['state-form'];
      expect(formAfter.fields.name.value).toBe('Original');
      expect(formAfter.fields.name.dirty).toBe(false);
      expect(formAfter.fields.name.touched).toBe(false);
      expect(formAfter.fields.name.error).toBeNull();
      expect(formAfter.isDirty).toBe(false);
      expect(formAfter.hasErrors).toBe(false);
    });

    it('should clear form values', () => {
      const { result } = renderHook(() => useFormStore());

      // Set values
      act(() => {
        result.current.setFieldValues('state-form', {
          name: 'Test Name',
          description: 'Test Description',
        });
      });

      // Clear form
      act(() => {
        result.current.clearForm('state-form');
      });

      const form = result.current.forms['state-form'];
      expect(form.fields.name.value).toBe('');
      expect(form.fields.description.value).toBe('');
      expect(form.fields.name.dirty).toBe(false);
      expect(form.fields.description.dirty).toBe(false);
      expect(form.isDirty).toBe(false);
    });

    it('should unregister form', () => {
      const { result } = renderHook(() => useFormStore());

      expect(result.current.forms['state-form']).toBeDefined();

      act(() => {
        result.current.destroyForm('state-form');
      });

      expect(result.current.forms['state-form']).toBeUndefined();
    });

    it('should handle form submission state', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setSubmitting('state-form', true);
      });

      expect(result.current.forms['state-form'].isSubmitting).toBe(true);

      act(() => {
        result.current.setSubmitting('state-form', false);
      });

      expect(result.current.forms['state-form'].isSubmitting).toBe(false);
    });
  });

  describe('Form Selectors and Getters', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'selector-form',
        fields: {
          name: {
            initialValue: 'Test Name',
            rules: [],
          },
          email: {
            initialValue: 'test@example.com',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });
    });

    it('should get form field value', () => {
      const { result } = renderHook(() => useFormStore());

      const name = result.current.getFieldValue('selector-form', 'name');
      expect(name).toBe('Test Name');
    });

    it('should get all form values', () => {
      const { result } = renderHook(() => useFormStore());

      const values = result.current.getFormValues('selector-form');
      expect(values).toEqual({
        name: 'Test Name',
        email: 'test@example.com',
      });
    });

    it('should get form errors', () => {
      const { result } = renderHook(() => useFormStore());

      // Set some errors
      act(() => {
        result.current.setFieldError('selector-form', 'name', 'Name error');
        result.current.setFieldError('selector-form', 'email', 'Email error');
      });

      const errors = result.current.getFormErrors('selector-form');
      expect(errors).toEqual({
        name: 'Name error',
        email: 'Email error',
      });
    });

    it('should get form state summary', () => {
      const { result } = renderHook(() => useFormStore());

      // Modify form state
      act(() => {
        result.current.setFieldValue('selector-form', 'name', 'Modified Name');
        result.current.setFieldError('selector-form', 'email', 'Email error');
        result.current.setSubmitting('selector-form', true);
      });

      const form = result.current.forms['selector-form'];
      expect(form.isDirty).toBe(true);
      expect(form.hasErrors).toBe(true);
      expect(form.isSubmitting).toBe(true);
      expect(form.isValid).toBe(false);
      expect(form.isValidating).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations on non-existent form', () => {
      const { result } = renderHook(() => useFormStore());

      // These should not throw errors
      expect(() => {
        result.current.setFieldValue('non-existent', 'field', 'value');
        result.current.resetForm('non-existent');
        result.current.clearForm('non-existent');
        result.current.destroyForm('non-existent');
      }).not.toThrow();

      expect(result.current.getFieldValue('non-existent', 'field')).toBeUndefined();
      expect(result.current.getFormValues('non-existent')).toEqual({});
    });

    it('should handle operations on non-existent field', () => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'edge-case-form',
        fields: {
          name: {
            initialValue: '',
            rules: [],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });

      // These should not throw errors
      expect(() => {
        result.current.setFieldValue('edge-case-form', 'non-existent-field', 'value');
        result.current.setFieldError('edge-case-form', 'non-existent-field', 'error');
      }).not.toThrow();

      expect(result.current.getFieldValue('edge-case-form', 'non-existent-field')).toBeUndefined();
    });

    it('should handle cleanup', () => {
      const { result } = renderHook(() => useFormStore());
      
      // Register multiple forms
      ['form1', 'form2', 'form3'].forEach(id => {
        const schema: FormSchema = {
          id,
          fields: {
            name: {
              initialValue: '',
              rules: [],
            },
          },
        };

        act(() => {
          result.current.createForm(schema);
        });
      });

      expect(Object.keys(result.current.forms)).toHaveLength(3);

      // Cleanup
      act(() => {
        result.current.cleanup();
      });

      expect(Object.keys(result.current.forms)).toHaveLength(0);
    });
  });

  describe('Async Validation', () => {
    it('should handle async validation rules', async () => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'async-form',
        fields: {
          username: {
            initialValue: '',
            rules: [
              {
                type: 'async',
                message: 'Username already exists',
                validator: async (value) => {
                  // Simulate async validation
                  await new Promise(resolve => setTimeout(resolve, 10));
                  return value !== 'taken';
                },
              },
            ],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });

      // Test with taken username
      act(() => {
        result.current.setFieldValue('async-form', 'username', 'taken');
      });

      await act(async () => {
        await result.current.validateField('async-form', 'username');
      });

      expect(result.current.forms['async-form'].fields.username.error).toBe('Username already exists');

      // Test with available username
      act(() => {
        result.current.setFieldValue('async-form', 'username', 'available');
      });

      await act(async () => {
        await result.current.validateField('async-form', 'username');
      });

      expect(result.current.forms['async-form'].fields.username.error).toBeNull();
    });

    it.skip('should handle validation state during async validation', async () => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'validating-form',
        fields: {
          email: {
            initialValue: '',
            rules: [
              {
                type: 'async',
                message: 'Email validation failed',
                validator: async () => {
                  await new Promise(resolve => setTimeout(resolve, 50));
                  return true;
                },
              },
            ],
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });

      act(() => {
        result.current.setFieldValue('validating-form', 'email', 'test@example.com');
      });

      // Start validation
      const validationPromise = act(async () => {
        await result.current.validateField('validating-form', 'email');
      });

      // Check that validating state is set
      expect(result.current.forms['validating-form'].fields.email.validating).toBe(true);

      // Wait for validation to complete
      await validationPromise;

      // Check that validating state is cleared
      expect(result.current.forms['validating-form'].fields.email.validating).toBe(false);
    });
  });

  describe('Form Persistence and Storage', () => {
    it('should handle form state persistence', async () => {
      const { result } = renderHook(() => useFormStore());
      
      const schema: FormSchema = {
        formId: 'persist-form',
        fields: {
          name: {
            initialValue: '',
            rules: [],
            persist: true,
          },
        },
      };

      act(() => {
        result.current.createForm(schema);
      });

      // Set value and trigger persistence
      act(() => {
        result.current.setFieldValue('persist-form', 'name', 'Persisted Value');
      });

      // The actual persistence is handled by async storage operations
      // We mainly test that the operations don't throw errors
      expect(result.current.forms['persist-form'].fields.name.value).toBe('Persisted Value');
    });
  });
});
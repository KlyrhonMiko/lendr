import { describe, expect, it } from 'vitest';
import { sanitizePin, validatePinChangeInput } from './validation';

describe('borrower PIN validation', () => {
  it('sanitizes non-digits and limits to 6 characters', () => {
    expect(sanitizePin('a1b2c3d4e5f6g7')).toBe('123456');
  });

  it('rejects current pin when not exactly 6 digits', () => {
    expect(
      validatePinChangeInput({
        currentPin: '12345',
        newPin: '123456',
        confirmPin: '123456',
      })
    ).toBe('Current PIN must be exactly 6 digits');
  });

  it('rejects new pin when not exactly 6 digits', () => {
    expect(
      validatePinChangeInput({
        currentPin: '111111',
        newPin: '12345a',
        confirmPin: '12345a',
      })
    ).toBe('New PIN must be exactly 6 digits');
  });

  it('rejects mismatched confirmation', () => {
    expect(
      validatePinChangeInput({
        currentPin: '111111',
        newPin: '222222',
        confirmPin: '222223',
      })
    ).toBe('New PIN and confirmation PIN do not match');
  });

  it('rejects reusing the current pin', () => {
    expect(
      validatePinChangeInput({
        currentPin: '333333',
        newPin: '333333',
        confirmPin: '333333',
      })
    ).toBe('New PIN must be different from current PIN');
  });

  it('accepts a valid pin change payload', () => {
    expect(
      validatePinChangeInput({
        currentPin: '123456',
        newPin: '654321',
        confirmPin: '654321',
      })
    ).toBeNull();
  });
});

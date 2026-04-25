import { describe, expect, it } from 'vitest';

import {
  isBorrowerRole,
  isTwoFactorChallengeResponse,
} from './authFlow';

describe('borrow auth flow guards', () => {
  it('accepts borrower role names used by kiosk flow', () => {
    expect(isBorrowerRole('borrower')).toBe(true);
    expect(isBorrowerRole('BRWR')).toBe(true);
    expect(isBorrowerRole(' borrower ')).toBe(true);
  });

  it('rejects non-borrower or missing roles', () => {
    expect(isBorrowerRole('admin')).toBe(false);
    expect(isBorrowerRole('staff')).toBe(false);
    expect(isBorrowerRole('')).toBe(false);
    expect(isBorrowerRole(null)).toBe(false);
  });

  it('detects two-factor challenge login responses', () => {
    const response = {
      two_factor_required: true,
      challenge_token: 'challenge-1',
      challenge_expires_at: '2026-04-15T12:00:00Z',
      method: 'totp',
    };

    expect(isTwoFactorChallengeResponse(response)).toBe(true);
  });

  it('does not treat token login responses as two-factor challenges', () => {
    const response = {
      access_token: 'token-1',
      token_type: 'bearer',
    };

    expect(isTwoFactorChallengeResponse(response)).toBe(false);
  });
});
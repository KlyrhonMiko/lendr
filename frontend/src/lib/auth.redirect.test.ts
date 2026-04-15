import { describe, expect, it } from 'vitest';
import { auth } from './auth';

describe('auth redirect paths', () => {
  it('routes borrower role to borrowers history', () => {
    expect(auth.getRedirectPath('borrower')).toBe('/borrowers/history');
  });
});

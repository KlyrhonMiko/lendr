import { describe, expect, it } from 'vitest';

import { auth } from './auth';

describe('auth.getRedirectPath', () => {
  it('routes borrower role to borrower history page', () => {
    expect(auth.getRedirectPath('borrower')).toBe('/borrower/history');
  });

  it('routes brwr short code role to borrower history page', () => {
    expect(auth.getRedirectPath('brwr')).toBe('/borrower/history');
  });

  it('keeps admin routing unchanged', () => {
    expect(auth.getRedirectPath('admin')).toBe('/admin/dashboard');
  });
});

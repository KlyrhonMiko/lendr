import type { LoginResponse, TwoFactorChallengeResponse } from '@/lib/api';

export const BORROW_KIOSK_ROLE_ERROR =
  'Only borrower accounts can use this kiosk. Please sign in with a borrower account.';

export const BORROW_KIOSK_TWO_FACTOR_ERROR =
  'This kiosk does not support two-factor sign-in. Please use the standard login page.';

export function isBorrowerRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }

  const normalizedRole = role.trim().toLowerCase();
  return normalizedRole === 'borrower' || normalizedRole === 'brwr';
}

export function isTwoFactorChallengeResponse(
  response: LoginResponse,
): response is TwoFactorChallengeResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'two_factor_required' in response &&
    response.two_factor_required === true
  );
}
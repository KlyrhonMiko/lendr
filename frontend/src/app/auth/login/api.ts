import {
  api,
  FirstLoginPasswordChangeRequiredResponse,
  FirstLoginRotatePasswordPayload,
  LoginResponse,
  TwoFactorChallengeResponse,
} from '@/lib/api';

interface LoginCredentials {
  username: string;
  password: string;
}

export const loginApi = {
  login: async (credentials: LoginCredentials) => {
    return api.login(credentials);
  },

  isTwoFactorChallenge: (response: LoginResponse): response is TwoFactorChallengeResponse => {
    return 'two_factor_required' in response && response.two_factor_required === true;
  },

  isPasswordChangeRequired: (
    response: LoginResponse,
  ): response is FirstLoginPasswordChangeRequiredResponse => {
    return (
      'auth_state' in response &&
      response.auth_state === 'password_change_required' &&
      'password_change_required' in response &&
      response.password_change_required === true
    );
  },

  getRotationEndpoint: (response: FirstLoginPasswordChangeRequiredResponse): string => {
    if (response.rotation_endpoint?.trim()) {
      return response.rotation_endpoint;
    }
    return '/auth/first-login/rotate-password';
  },

  verifyLoginTwoFactor: async (challenge_token: string, code: string) => {
    return api.verifyLoginTwoFactor(challenge_token, code);
  },

  rotateFirstLoginPassword: async (
    payload: FirstLoginRotatePasswordPayload,
    endpoint?: string,
  ) => {
    return api.rotateFirstLoginPassword(payload, endpoint);
  },
};

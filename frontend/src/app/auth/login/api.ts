import {
  api,
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

  verifyLoginTwoFactor: async (challenge_token: string, code: string) => {
    return api.verifyLoginTwoFactor(challenge_token, code);
  },

  initiateTwoFactorEnrollment: async () => {
    return api.initiateTwoFactorEnrollment();
  },

  verifyTwoFactorEnrollment: async (code: string) => {
    return api.verifyTwoFactorEnrollment(code);
  },

  rotateBootstrapPassword: async (payload: {
    username: string;
    current_password: string;
    new_password: string;
  }) => {
    return api.rotateBootstrapPassword(payload);
  },
};

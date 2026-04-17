import type { User } from '../api';

export type UserConfirmAction = {
  type: 'delete' | 'restore' | 'reset_2fa';
  user: User;
};

export type UserCredentialRevealSource =
  | 'create'
  | 'secondary_password'
  | 'reset_login_password';

export interface UserCredentialReveal {
  source: UserCredentialRevealSource;
  userId: string;
  userName: string;
  oneTimeLoginPassword?: string;
  secondaryPassword?: string;
  rotatedAt?: string | null;
}


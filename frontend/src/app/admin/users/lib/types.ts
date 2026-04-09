import type { User } from '../api';

export type UserConfirmAction = {
  type: 'delete' | 'restore' | 'reset_2fa';
  user: User;
};


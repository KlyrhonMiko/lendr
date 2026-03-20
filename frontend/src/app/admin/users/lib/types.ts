import type { User } from '../api';

export type UserConfirmAction = {
  type: 'delete' | 'restore';
  user: User;
};


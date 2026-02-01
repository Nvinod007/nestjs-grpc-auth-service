import { ReturnableUser, UserForToken } from './types';

export const returnableUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
} as const;

export const userWithPasswordSelect = {
  ...returnableUserSelect,
  password: true,
} as const;

export function toUserForToken(user: ReturnableUser): UserForToken {
  return {
    id: user.id,
    email: user.email,
  };
}

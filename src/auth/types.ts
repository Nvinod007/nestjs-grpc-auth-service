import { Prisma } from '@prisma/client';

export type ReturnableUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    role: true;
    isActive: true;
  };
}>;

export type UserForToken = Pick<ReturnableUser, 'id' | 'email'>;

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: ReturnableUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: ReturnableUser;
  accessToken: string;
  refreshToken: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: ReturnableUser;
  message: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  user?: ReturnableUser;
  message: string;
}

export interface GetUsersResponse {
  users: ReturnableUser[];
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  user?: ReturnableUser;
}

export type DeleteUserResponse = {
  success: boolean;
  message: string;
};

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  resetToken: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

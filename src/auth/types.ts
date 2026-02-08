import { Prisma, Role } from '@prisma/client';

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

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: ReturnableUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: ReturnableUser;
  accessToken: string;
  refreshToken: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: ReturnableUser;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface UserRequest {
  id: string;
}

export interface UserResponse {
  user?: ReturnableUser;
  message: string;
}

export type GetUsersRequest = Record<string, never>;

export interface GetUsersResponse {
  users: ReturnableUser[];
}

export interface UpdateUserRequest {
  id: string;
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  user?: ReturnableUser;
}

export type DeleteUserRequest = {
  id: string;
};

export type DeleteUserResponse = {
  success: boolean;
  message: string;
};

export interface RequestPasswordResetRequest {
  email: string;
}

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  resetToken: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type DeleteUserRequest,
  DeleteUserResponse,
  type LoginRequest,
  LoginResponse,
  type RefreshTokenRequest,
  RefreshTokenResponse,
  type RegisterRequest,
  RegisterResponse,
  type UpdateUserRequest,
  UpdateUserResponse,
  type UserRequest,
  UserResponse,
  type VerifyTokenRequest,
  VerifyTokenResponse,
} from './types';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'VerifyToken')
  async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    return this.authService.verifyToken(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(data);
  }

  @GrpcMethod('AuthService', 'GetUser')
  async getUser(data: UserRequest): Promise<UserResponse> {
    return this.authService.getUser(data);
  }

  @GrpcMethod('AuthService', 'UpdateUser')
  async updateUser(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.authService.updateUser(data);
  }

  @GrpcMethod('AuthService', 'DeleteUser')
  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    return this.authService.deleteUser(data);
  }
}

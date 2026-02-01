import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type LoginRequest,
  LoginResponse,
  type RefreshTokenRequest,
  RefreshTokenResponse,
  type RegisterRequest,
  RegisterResponse,
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
}

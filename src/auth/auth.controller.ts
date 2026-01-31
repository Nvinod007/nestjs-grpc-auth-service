import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GrpcMethod } from '@nestjs/microservices';
import {
  type LoginResponse,
  type LoginRequest,
  type RegisterRequest,
  type RegisterResponse,
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
}

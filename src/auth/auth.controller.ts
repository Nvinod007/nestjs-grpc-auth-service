import { Controller, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GrpcMethod } from '@nestjs/microservices';
import { GrpcValidationPipe } from './pipes/grpc-validation.pipe';
import {
  DeleteUserResponse,
  LoginResponse,
  RefreshTokenResponse,
  RegisterResponse,
  ChangePasswordResponse,
  RequestPasswordResetResponse,
  ResetPasswordResponse,
  UpdateUserResponse,
  UserResponse,
  GetUsersResponse,
  VerifyTokenResponse,
} from './types';
import {
  RegisterRequestDto,
  LoginRequestDto,
  VerifyTokenRequestDto,
  RefreshTokenRequestDto,
  UserRequestDto,
  GetUsersRequestDto,
  UpdateUserRequestDto,
  DeleteUserRequestDto,
  RequestPasswordResetRequestDto,
  ResetPasswordRequestDto,
  ChangePasswordRequestDto,
} from './dto';

@Controller()
@UsePipes(new GrpcValidationPipe())
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequestDto): Promise<RegisterResponse> {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequestDto): Promise<LoginResponse> {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'VerifyToken')
  async verifyToken(data: VerifyTokenRequestDto): Promise<VerifyTokenResponse> {
    return this.authService.verifyToken(data);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  async refreshToken(
    data: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(data);
  }

  @GrpcMethod('AuthService', 'GetUser')
  async getUser(data: UserRequestDto): Promise<UserResponse> {
    return this.authService.getUser(data);
  }

  @GrpcMethod('AuthService', 'GetUsers')
  async getUsers(_data: GetUsersRequestDto): Promise<GetUsersResponse> {
    const users = await this.authService.getUsers();
    return { users };
  }

  @GrpcMethod('AuthService', 'UpdateUser')
  async updateUser(data: UpdateUserRequestDto): Promise<UpdateUserResponse> {
    return this.authService.updateUser(data);
  }

  @GrpcMethod('AuthService', 'DeleteUser')
  async deleteUser(data: DeleteUserRequestDto): Promise<DeleteUserResponse> {
    return this.authService.deleteUser(data);
  }

  @GrpcMethod('AuthService', 'RequestPasswordReset')
  async requestPasswordReset(
    data: RequestPasswordResetRequestDto,
  ): Promise<RequestPasswordResetResponse> {
    return this.authService.requestPasswordReset(data);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  async resetPassword(
    data: ResetPasswordRequestDto,
  ): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(data);
  }

  @GrpcMethod('AuthService', 'ChangePassword')
  async changePassword(
    data: ChangePasswordRequestDto,
  ): Promise<ChangePasswordResponse> {
    return this.authService.changePassword(data);
  }
}

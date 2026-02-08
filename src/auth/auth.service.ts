import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteUserRequest,
  DeleteUserResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ReturnableUser,
  UpdateUserRequest,
  UpdateUserResponse,
  UserForToken,
  UserRequest,
  UserResponse,
  VerifyTokenRequest,
  VerifyTokenResponse,
} from './types';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  removeUndefined,
  returnableUserSelect,
  toUserForToken,
  userWithPasswordSelect,
} from './auth.helpers';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    this.logger.log(`Register attempt for email: ${data.email}`);
    const { email, password, name } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    // If user exists and is active, return error
    if (existingUser?.isActive) {
      this.logger.warn(`Registration failed: User already exists - ${email}`);
      return {
        success: false,
        message: 'User already exists',
        accessToken: '',
        refreshToken: '',
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let returnableUser: ReturnableUser;

    // If user exists but is soft-deleted, reactivate them
    if (existingUser && !existingUser.isActive) {
      this.logger.log(`Reactivating soft-deleted user: ${email}`);
      returnableUser = await this.prisma.user.update({
        where: {
          email,
        },
        data: {
          password: hashedPassword,
          name: name ?? existingUser.name,
          isActive: true,
        },
        select: returnableUserSelect,
      });
    } else {
      // New user - create fresh
      this.logger.log(`Creating new user: ${email}`);
      returnableUser = await this.prisma.user.create({
        data: {
          email,
          name: name ?? '',
          password: hashedPassword,
          role: 'USER',
          isActive: true,
        },
        select: returnableUserSelect,
      });
    }

    const tokens = this.generateTokens(returnableUser);
    this.logger.log(
      `User registered successfully: ${returnableUser.id} - ${email}`,
    );
    return {
      success: true,
      message: 'User registered successfully',
      user: returnableUser,
      ...tokens,
    };
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    this.logger.log(`Login attempt for email: ${data.email}`);
    const { email, password } = data;
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: userWithPasswordSelect,
    });
    if (!user?.id) {
      this.logger.warn(`Login failed: User not found - ${email}`);
      return {
        success: false,
        message: 'User not found',
        accessToken: '',
        refreshToken: '',
      };
    }

    // Check if user is soft-deleted
    if (!user.isActive) {
      this.logger.warn(`Login failed: User account deactivated - ${email}`);
      return {
        success: false,
        message: 'User account is deactivated',
        accessToken: '',
        refreshToken: '',
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${email}`);
      return {
        success: false,
        message: 'Invalid password',
        accessToken: '',
        refreshToken: '',
      };
    }

    const returnableUser: ReturnableUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };

    const tokens = this.generateTokens(returnableUser);
    this.logger.log(`Login successful: ${user.id} - ${email}`);
    return {
      success: true,
      message: 'Login successful',
      user: returnableUser,
      ...tokens,
    };
  }

  async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    this.logger.log('Token verification attempt');
    try {
      const decoded: any = await this.jwtService.verifyAsync(data.token);
      if (!decoded?.email) {
        this.logger.warn('Token verification failed: Invalid token format');
        throw new Error('Invalid token');
      }
      const user = await this.prisma.user.findUnique({
        where: {
          email: decoded.email,
        },
        select: returnableUserSelect,
      });
      if (!user?.id) {
        this.logger.warn(
          `Token verification failed: User not found - ${decoded.email}`,
        );
        throw new Error('User not found');
      }

      if (!user.isActive) {
        this.logger.warn(
          `Token verification failed: User deactivated - ${user.id}`,
        );
        return {
          valid: false,
          user: undefined,
          message: 'User account is deactivated',
        };
      }

      this.logger.log(
        `Token verified successfully: ${user.id} - ${user.email}`,
      );
      return {
        valid: true,
        user,
        message: 'Token verified successfully',
      };
    } catch (error) {
      this.logger.error('Token verification error', error);
      return {
        valid: false,
        user: undefined,
        message: 'Invalid token',
      };
    }
  }

  // TODO: implement refresh token invalidation while supporting multi device logins.
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    this.logger.log('Token refresh attempt');
    try {
      const decoded: any = await this.jwtService.verifyAsync(data.refreshToken);
      if (!decoded?.email) {
        this.logger.warn('Token refresh failed: Invalid refresh token format');
        throw new Error('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: {
          email: decoded.email,
        },
        select: returnableUserSelect,
      });
      if (!user?.id) {
        this.logger.warn(
          `Token refresh failed: User not found - ${decoded.email}`,
        );
        throw new Error('User not found');
      }

      // Check if user is soft-deleted (inactive)
      if (!user.isActive) {
        this.logger.warn(`Token refresh failed: User deactivated - ${user.id}`);
        return {
          success: false,
          message: 'User account is deactivated',
          accessToken: '',
          refreshToken: '',
        };
      }

      const tokens = this.generateTokens(user);
      this.logger.log(
        `Token refreshed successfully: ${user.id} - ${user.email}`,
      );
      return {
        success: true,
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Token refresh error', error);
      return {
        success: false,
        message: 'Invalid refresh token',
        accessToken: '',
        refreshToken: '',
      };
    }
  }

  async getUsers(): Promise<ReturnableUser[]> {
    this.logger.log('Fetching all active users');
    const users = await this.prisma.user.findMany({
      select: returnableUserSelect,
      where: {
        isActive: true,
      },
    });

    this.logger.log(`Fetched ${users.length} active users`);
    return users;
  }

  async getUser(data: UserRequest): Promise<UserResponse> {
    this.logger.log(`GetUser request for ID: ${data.id}`);
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.id,
      },
      select: returnableUserSelect,
    });

    if (!user?.id) {
      this.logger.warn(`GetUser failed: User not found - ${data.id}`);
      return {
        user: undefined,
        message: 'User not found',
      };
    }

    // Check if user is soft-deleted (inactive)
    if (!user.isActive) {
      this.logger.warn(`GetUser failed: User inactive - ${data.id}`);
      return {
        user: undefined,
        message: 'User is inactive or deleted',
      };
    }

    this.logger.log(`User fetched successfully: ${data.id} - ${user.email}`);
    return {
      user,
      message: 'User fetched successfully',
    };
  }

  async updateUser(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    this.logger.log(`UpdateUser request for ID: ${data.id}`);
    const validationError = await this.validateUpdateRequest(data);
    if (validationError) {
      return validationError;
    }

    const updateData = this.buildUpdateData(data);
    if (Object.keys(updateData).length === 0) {
      this.logger.warn(`UpdateUser failed: No fields to update - ${data.id}`);
      return {
        success: false,
        user: undefined,
        message: 'No fields to update',
      };
    }

    return this.performUpdate(data.id, updateData);
  }

  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    this.logger.log(`DeleteUser request for ID: ${data.id}`);
    try {
      // Soft delete: set isActive to false and record deletion time
      await this.prisma.user.update({
        where: {
          id: data.id,
        },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`User soft-deleted successfully: ${data.id}`);
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      this.logger.error(`DeleteUser failed for ID: ${data.id}`, error);
      return {
        success: false,
        message: 'Delete failed',
      };
    }
  }

  private async validateUpdateRequest(
    data: UpdateUserRequest,
  ): Promise<UpdateUserResponse | null> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.id },
    });

    if (!existingUser) {
      this.logger.warn(
        `UpdateUser validation failed: User not found - ${data.id}`,
      );
      return {
        success: false,
        user: undefined,
        message: 'User not found',
      };
    }

    if (data.email && data.email !== existingUser.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailOwner && emailOwner.id !== data.id) {
        this.logger.warn(
          `UpdateUser validation failed: Email already exists - ${data.email}`,
        );
        return {
          success: false,
          user: undefined,
          message: 'Email already exists',
        };
      }
    }

    return null;
  }

  private buildUpdateData(data: UpdateUserRequest) {
    const roleValue = this.convertRoleEnum(data.role);
    return removeUndefined({
      name: data.name,
      email: data.email,
      role: roleValue,
      isActive: data.isActive,
    });
  }

  private convertRoleEnum(role: unknown): 'USER' | 'ADMIN' | undefined {
    if (role === undefined) {
      return undefined;
    }
    const roleNum = role as unknown as number;
    return roleNum === 1 ? ('ADMIN' as const) : ('USER' as const);
  }

  private async performUpdate(
    userId: string,
    updateData: Record<string, unknown>,
  ): Promise<UpdateUserResponse> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: returnableUserSelect,
      });

      this.logger.log(`User updated successfully: ${userId}`);
      return {
        success: true,
        user,
        message: 'User updated successfully',
      };
    } catch (error) {
      return this.handleUpdateError(error, userId);
    }
  }

  private handleUpdateError(
    error: unknown,
    userId: string,
  ): UpdateUserResponse {
    this.logger.error(`UpdateUser error for ID: ${userId}`, error);

    let errorMessage = 'Update failed';
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'Email already exists';
      } else if (error.message.includes('Record to update not found')) {
        errorMessage = 'User not found';
      } else {
        errorMessage = `Update failed: ${error.message}`;
      }
    }

    return {
      success: false,
      user: undefined,
      message: errorMessage,
    };
  }

  private generateTokens(user: ReturnableUser) {
    const userForToken = toUserForToken(user);
    return {
      accessToken: this.generateAccessToken(userForToken),
      refreshToken: this.generateRefreshToken(userForToken),
    };
  }

  private generateAccessToken(user: UserForToken): string {
    return this.jwtService.sign({
      userId: user.id ?? '',
      email: user.email ?? '',
    });
  }

  private generateRefreshToken(user: UserForToken): string {
    return this.jwtService.sign(
      { userId: user.id ?? '', email: user.email ?? '' },
      { expiresIn: '30d' },
    );
  }

  async requestPasswordReset(
    data: RequestPasswordResetRequest,
  ): Promise<RequestPasswordResetResponse> {
    this.logger.log(`Password reset request for email: ${data.email}`);
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    // Don't reveal if user exists (security best practice)
    if (!user?.isActive) {
      this.logger.log(
        `Password reset request handled (user not found or inactive): ${data.email}`,
      );
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        resetToken: '',
      };
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = this.jwtService.sign(
      { userId: user.id, email: user.email, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    // Store token and expiry in database
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    this.logger.log(
      `Password reset token generated: ${user.id} - ${user.email}`,
    );
    // In production, send email with reset link instead of returning token
    return {
      success: true,
      message: 'Password reset token generated',
      resetToken, // Remove this in production - send via email instead
    };
  }

  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    this.logger.log('Password reset attempt with token');
    try {
      // Verify the reset token
      const decoded: any = await this.jwtService.verifyAsync(data.resetToken);

      if (!decoded?.userId || decoded?.type !== 'password-reset') {
        this.logger.warn('Password reset failed: Invalid reset token format');
        return {
          success: false,
          message: 'Invalid reset token',
        };
      }

      // Find user and verify token matches stored token
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (
        !user?.resetToken ||
        user?.resetToken !== data.resetToken ||
        !user?.resetTokenExpiry ||
        user?.resetTokenExpiry < new Date()
      ) {
        this.logger.warn(
          `Password reset failed: Invalid or expired token - ${decoded.userId}`,
        );
        return {
          success: false,
          message: 'Invalid or expired reset token',
        };
      }

      // Check if user is active
      if (!user.isActive) {
        this.logger.warn(
          `Password reset failed: User deactivated - ${user.id}`,
        );
        return {
          success: false,
          message: 'User account is deactivated',
        };
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);

      // Update password and clear reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      this.logger.log(
        `Password reset successfully: ${user.id} - ${user.email}`,
      );
      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      this.logger.error('Password reset error', error);
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    }
  }

  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    this.logger.log(`ChangePassword request for user ID: ${data.userId}`);
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: userWithPasswordSelect,
    });

    if (!user?.id) {
      this.logger.warn(
        `ChangePassword failed: User not found - ${data.userId}`,
      );
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Check if user is active
    if (!user.isActive) {
      this.logger.warn(
        `ChangePassword failed: User deactivated - ${data.userId}`,
      );
      return {
        success: false,
        message: 'User account is deactivated',
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn(
        `ChangePassword failed: Invalid current password - ${data.userId}`,
      );
      return {
        success: false,
        message: 'Current password is incorrect',
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    this.logger.log(
      `Password changed successfully: ${user.id} - ${user.email}`,
    );
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}

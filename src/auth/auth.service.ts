import { Injectable } from '@nestjs/common';
import {
  DeleteUserRequest,
  DeleteUserResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, name } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    // If user exists and is active, return error
    if (existingUser?.isActive) {
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
    return {
      success: true,
      message: 'User registered successfully',
      user: returnableUser,
      ...tokens,
    };
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, password } = data;
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: userWithPasswordSelect,
    });
    if (!user?.id) {
      return {
        success: false,
        message: 'User not found',
        accessToken: '',
        refreshToken: '',
      };
    }

    // Check if user is soft-deleted
    if (!user.isActive) {
      return {
        success: false,
        message: 'User account is deactivated',
        accessToken: '',
        refreshToken: '',
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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
    return {
      success: true,
      message: 'Login successful',
      user: returnableUser,
      ...tokens,
    };
  }

  async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    try {
      const decoded: any = await this.jwtService.verifyAsync(data.token);
      if (!decoded?.email) {
        throw new Error('Invalid token');
      }
      const user = await this.prisma.user.findUnique({
        where: {
          email: decoded.email,
        },
        select: returnableUserSelect,
      });
      if (!user?.id) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        return {
          valid: false,
          user: undefined,
          message: 'User account is deactivated',
        };
      }

      return {
        valid: true,
        user,
        message: 'Token verified successfully',
      };
    } catch (error) {
      console.error(error);
      return {
        valid: false,
        user: undefined,
        message: 'Invalid token',
      };
    }
  }

  // TODO: implement refresh token invalidation while supporting multi device logins.
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const decoded: any = await this.jwtService.verifyAsync(data.refreshToken);
      if (!decoded?.email) {
        throw new Error('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: {
          email: decoded.email,
        },
        select: returnableUserSelect,
      });
      if (!user?.id) {
        throw new Error('User not found');
      }

      // Check if user is soft-deleted (inactive)
      if (!user.isActive) {
        return {
          success: false,
          message: 'User account is deactivated',
          accessToken: '',
          refreshToken: '',
        };
      }

      const tokens = this.generateTokens(user);
      return {
        success: true,
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: 'Invalid refresh token',
        accessToken: '',
        refreshToken: '',
      };
    }
  }

  async getUsers(): Promise<UserResponse[]> {
    const users = await this.prisma.user.findMany({
      select: returnableUserSelect,
      where: {
        isActive: true,
      },
    });

    const responses: UserResponse[] = users.map((user) => ({
      user,
      message: 'User fetched successfully',
    }));

    return responses;
  }

  async getUser(data: UserRequest): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.id,
      },
      select: returnableUserSelect,
    });

    if (!user?.id) {
      return {
        user: undefined,
        message: 'User not found',
      };
    }

    // Check if user is soft-deleted (inactive)
    if (!user.isActive) {
      return {
        user: undefined,
        message: 'User is inactive or deleted',
      };
    }

    return {
      user,
      message: 'User fetched successfully',
    };
  }

  async updateUser(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    const validationError = await this.validateUpdateRequest(data);
    if (validationError) {
      return validationError;
    }

    const updateData = this.buildUpdateData(data);
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        user: undefined,
        message: 'No fields to update',
      };
    }

    return this.performUpdate(data.id, updateData);
  }

  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
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

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error(error);
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

      return {
        success: true,
        user,
        message: 'User updated successfully',
      };
    } catch (error) {
      return this.handleUpdateError(error);
    }
  }

  private handleUpdateError(error: unknown): UpdateUserResponse {
    console.error('UpdateUser error:', error);

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
}

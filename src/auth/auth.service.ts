import { Injectable } from '@nestjs/common';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ReturnableUser,
  UserForToken,
  VerifyTokenRequest,
  VerifyTokenResponse,
} from './types';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import {
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

  private generateTokens(user: ReturnableUser) {
    const userForToken = toUserForToken(user);
    return {
      accessToken: this.generateAccessToken(userForToken),
      refreshToken: this.generateRefreshToken(userForToken),
    };
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, name } = data;

    const isUserExists = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isUserExists) {
      return {
        success: false,
        message: 'User already exists',
        accessToken: '',
        refreshToken: '',
      };
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const returnableUser: ReturnableUser = await this.prisma.user.create({
      data: {
        email,
        name: name ?? '',
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      },
      select: returnableUserSelect,
    });

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
}

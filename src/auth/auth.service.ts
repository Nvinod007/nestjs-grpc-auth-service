import { Injectable } from '@nestjs/common';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  VerifyTokenRequest,
  VerifyTokenResponse,
} from './types';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}
  private readonly users = new Map<string, User>();
  private readonly passwords = new Map<string, string>();
  private userIdCounter = 1;

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, name } = data;

    if (this.users.has(email)) {
      return {
        success: false,
        message: 'User already exists',
        accessToken: '',
        refreshToken: '',
      };
    }
    const userId = this.userIdCounter++;
    const user: User = {
      id: userId.toString(),
      email,
      name: name ?? '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      this.passwords.set(email, hashedPassword);
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: 'Failed to register user',
        accessToken: '',
        refreshToken: '',
      };
    }
    this.users.set(email, user);

    return {
      success: true,
      message: 'User registered successfully',
      user,
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, password } = data;
    const user = this.users.get(email);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        accessToken: '',
        refreshToken: '',
      };
    }
    const hashedPassword = this.passwords.get(email);
    if (!hashedPassword) {
      return {
        success: false,
        message: 'User not found',
        accessToken: '',
        refreshToken: '',
      };
    }
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid password',
        accessToken: '',
        refreshToken: '',
      };
    }
    return {
      success: true,
      message: 'Login successful',
      user,
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign({ userId: user.id, email: user.email });
  }

  private generateRefreshToken(user: User): string {
    return this.jwtService.sign(
      { userId: user.id, email: user.email },
      { expiresIn: '30d' },
    );
  }

  async verifyToken(data: VerifyTokenRequest): Promise<VerifyTokenResponse> {
    try {
      const decoded: any = await this.jwtService.verifyAsync(data.token);
      if (!decoded || !decoded?.email) {
        throw new Error('Invalid token');
      }
      const user = this.users.get(decoded.email);
      if (!user) {
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
      if (!decoded || !decoded?.email) {
        throw new Error('Invalid refresh token');
      }
      const user = this.users.get(decoded?.email);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: this.generateAccessToken(user),
        refreshToken: this.generateRefreshToken(user),
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

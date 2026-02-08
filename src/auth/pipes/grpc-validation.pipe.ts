import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
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
} from '../dto';

@Injectable()
export class GrpcValidationPipe implements PipeTransform<unknown> {
  // Map gRPC method names to their corresponding DTO classes
  private readonly methodToDtoMap: Map<string, new () => unknown> = new Map([
    ['Register', RegisterRequestDto],
    ['Login', LoginRequestDto],
    ['VerifyToken', VerifyTokenRequestDto],
    ['RefreshToken', RefreshTokenRequestDto],
    ['GetUser', UserRequestDto],
    ['GetUsers', GetUsersRequestDto],
    ['UpdateUser', UpdateUserRequestDto],
    ['DeleteUser', DeleteUserRequestDto],
    ['RequestPasswordReset', RequestPasswordResetRequestDto],
    ['ResetPassword', ResetPasswordRequestDto],
    ['ChangePassword', ChangePasswordRequestDto],
  ]);

  // Map controller method names to gRPC method names
  private readonly handlerNameToMethodMap: Record<string, string> = {
    register: 'Register',
    login: 'Login',
    verifyToken: 'VerifyToken',
    refreshToken: 'RefreshToken',
    getUser: 'GetUser',
    getUsers: 'GetUsers',
    updateUser: 'UpdateUser',
    deleteUser: 'DeleteUser',
    requestPasswordReset: 'RequestPasswordReset',
    resetPassword: 'ResetPassword',
    changePassword: 'ChangePassword',
  };

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    // For gRPC handlers, metatype is undefined, so we need to get it from the method name
    let dtoClass = metadata.metatype;

    // If metatype is not available (common in gRPC), try to get it from the stack trace
    if (!dtoClass || !this.toValidate(dtoClass)) {
      const methodName = this.getMethodNameFromStack();
      if (methodName) {
        dtoClass = this.methodToDtoMap.get(methodName);
      }
    }

    // If still no DTO class found, skip validation
    if (!dtoClass || !this.toValidate(dtoClass)) {
      return value;
    }

    const object = plainToInstance(dtoClass, value as Record<string, unknown>);
    const errors = await validate(object, {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Automatically transform payloads to DTO instance
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
    });

    if (errors.length > 0) {
      const errorMessages = this.formatErrors(errors);
      throw new RpcException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return object;
  }

  private getMethodNameFromStack(): string | undefined {
    // Parse stack trace to find the controller method name
    // This is a workaround since metatype is not available for gRPC handlers
    try {
      const stack = new Error().stack;
      if (!stack) return undefined;

      const stackLines = stack.split('\n');
      // Look for the controller method in the stack trace
      for (const line of stackLines) {
        for (const [handlerName, methodName] of Object.entries(
          this.handlerNameToMethodMap,
        )) {
          // Match method name in stack trace (e.g., "at AuthController.register")
          if (line.includes(handlerName) && line.includes('auth.controller')) {
            return methodName;
          }
        }
      }
    } catch {
      // Fallback if stack trace parsing fails
    }
    return undefined;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((message) => {
          messages.push(message);
        });
      }
      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedMessages = this.formatErrors(error.children);
        messages.push(...nestedMessages);
      }
    });
    return messages;
  }
}

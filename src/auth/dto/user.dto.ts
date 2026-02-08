import {
  IsString,
  IsUUID,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UserRequestDto {
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  id: string;
}

export class GetUsersRequestDto {
  // Empty request - no validation needed
}

export class UpdateUserRequestDto {
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  id: string;

  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be either USER or ADMIN' })
  role?: Role;

  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

export class DeleteUserRequestDto {
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  id: string;
}

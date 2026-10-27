import { IsEmail, IsString, IsEnum, MinLength, IsOptional, Matches, IsBoolean } from 'class-validator';
import { UserRole, Department } from '@prisma/client';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    // @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    //     message: 'Password must contain uppercase, lowercase, and number/special character',
    // })
    password: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    organizationId?: string;

    @IsEnum(Department)
    @IsOptional()
    department?: Department;

    @IsString()
    @IsOptional()
    reportsToId?: string;

    @IsString()
    @IsOptional()
    designation?: string;

    @IsString()
    @IsOptional()
    vendorId?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    isEmailVerified?: boolean;
}

import { IsEmail, IsString, IsEnum, MinLength, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must contain uppercase, lowercase, and number/special character',
    })
    password: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;
}

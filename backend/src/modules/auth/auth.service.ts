import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

    async validateUser(email: string, password: string): Promise<any> {
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`[AUTH] Validating user: ${normalizedEmail}`);
        const user = await this.usersService.findByEmail(normalizedEmail);
        if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        console.log(`[AUTH] Password valid: ${isPasswordValid}`);
        if (!isPasswordValid) {
            return null;
        }

        if (!user.isActive) {
            console.log(`[AUTH] User is inactive: ${email}`);
            throw new UnauthorizedException('User account is inactive');
        }

        const { passwordHash, refreshToken, ...result } = user;
        return result;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update last login
        await this.usersService.updateLastLogin(user.id);

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            department: user.department,
            vendorId: user.vendorId
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                organizationId: user.organizationId,
                department: user.department,
                vendorId: user.vendorId
            },
        };
    }

    async register(registerDto: RegisterDto) {
        const user = await this.usersService.create(registerDto);

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                organizationId: user.organizationId,
                department: user.department
            },
        };
    }

    async validateToken(payload: any) {
        const user = await this.usersService.findOne(payload.sub);
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid token');
        }
        console.log(`ValidateToken: UserOrg=${user.organizationId}, PayloadOrg=${payload.organizationId}`);
        return {
            ...user,
            organizationId: payload.organizationId,
            vendorId: payload.vendorId,
            department: payload.department
        };
    }
}

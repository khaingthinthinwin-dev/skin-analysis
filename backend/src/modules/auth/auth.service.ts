import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateAdminDto, AdminRole } from './dto/create-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async register(registerDto: RegisterDto, license?: Express.Multer.File) {
    const { email, password, name, role = 'buyer' } = registerDto;

    // Check if user exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user
    const user = await this.usersService.create({
      email,
      name,
      passwordHash,
      roleCode: role,
    });

    // If merchant, create a Merchant record with license info
    if (role === 'merchant') {
      const licenseUrl = license
        ? this.saveLicenseFile(license, email)
        : 'pending_upload';
      await this.prisma.merchant.create({
        data: {
          userId: user.id,
          shopName: name,
          businessLicenseUrl: licenseUrl,
          licenseStatus: 'pending',
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.roleCode,
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.roleCode,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.roleCode,
    );

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.roleCode,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
      }>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.redis.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Find and validate refresh token in database
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Revoke old refresh token
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // Get user
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.roleCode,
      );

      // Store new refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, accessToken: string) {
    // Blacklist access token
    try {
      const payload = this.jwtService.verify<{ exp: number }>(accessToken);
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.blacklistToken(accessToken, ttl);
      }
    } catch {
      // Token might already be expired, continue with logout
    }

    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  async verifyToken(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const result: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.roleCode,
      avatarUrl: user.avatarUrl,
      merchantId: null,
      licenseStatus: null,
      licenseUrl: null,
    };

    if (user.roleCode === 'merchant') {
      const merchant = await this.prisma.merchant.findFirst({
        where: { userId: user.id },
        select: {
          id: true,
          businessLicenseUrl: true,
          licenseStatus: true,
        },
      });
      if (merchant) {
        result.merchantId = merchant.id;
        result.licenseUrl = merchant.businessLicenseUrl;
        result.licenseStatus = merchant.licenseStatus;
      }
    }

    return result;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Check rate limit
    const rateLimitKey = `rate:auth:forgot-password:${email}`;
    const isAllowed = await this.redis.checkRateLimit(rateLimitKey, 3, 3600);
    if (!isAllowed) {
      throw new UnauthorizedException('Too many requests. Please try again later.');
    }

    // Find user by email
    const user = await this.usersService.findByEmail(email);

    // Always return same response regardless of email existence (prevent email enumeration)
    const successMessage = {
      message: "If an account exists with that email, you'll receive a password reset link shortly.",
    };

    if (!user) {
      // Return same response even if user doesn't exist
      return successMessage;
    }

    // Invalidate all previous unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Set 24-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store hashed token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
      },
    });

    // In production, send email with reset link containing rawToken
    // For now, just log it (TODO: integrate with email service)
    console.log(`Password reset token for ${email}: ${rawToken}`);
    console.log(`Reset link: ${this.configService.get('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token=${rawToken}`);

    return successMessage;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Validate token format
    if (!token || token.length < 32) {
      throw new BadRequestException('Invalid reset token');
    }

    // Hash the received token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token record by token hash
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find user by user_id from token
    const user = await this.usersService.findById(resetToken.userId);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password with Argon2
    const passwordHash = await argon2.hash(password);

    // Update user's password
    await this.usersService.updatePassword(user.id, passwordHash);

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Invalidate all other unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
        id: { not: resetToken.id },
      },
      data: { used: true },
    });

    return { message: 'Your password has been reset successfully.' };
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    const { email, password, name, role } = createAdminDto;

    // Check if user exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create admin user
    const user = await this.usersService.create({
      email,
      name,
      passwordHash,
      roleCode: role,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.roleCode,
      createdAt: user.createdAt,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword);

    // Update password
    await this.usersService.updatePassword(userId, passwordHash);

    return { message: 'Password changed successfully' };
  }

  private saveLicenseFile(
    file: Express.Multer.File,
    userEmail: string,
  ): string {
    const uploadDir = this.configService.get<string>(
      'LICENSE_STORAGE_PATH',
      './uploads/licenses',
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `license_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return relative URL
    return `/uploads/licenses/${filename}`;
  }

  private async generateTokens(
    userId: string,
    email: string,
    roleCode: string,
  ) {
    const payload = { sub: userId, email, role: roleCode };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'refresh-secret',
        expiresIn:
          (this.configService.get<string>('jwt.refreshExpiration') as
            StringValue | undefined) || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family: 'default',
        expiresAt,
        absoluteLimitAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });
  }
}

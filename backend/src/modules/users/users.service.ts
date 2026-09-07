import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roleCode: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        merchantProfile: {
          select: {
            id: true,
            licenseStatus: true,
            businessLicenseUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      role: user.roleCode,
      avatar: user.avatarUrl || undefined,
      merchantId: user.merchantProfile?.id || null,
      licenseStatus: user.merchantProfile?.licenseStatus || null,
      license_status: user.merchantProfile?.licenseStatus || null,
      licenseUrl: user.merchantProfile?.businessLicenseUrl || null,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        merchantProfile: {
          select: {
            id: true,
            licenseStatus: true,
            businessLicenseUrl: true,
          },
        },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        merchantProfile: {
          select: {
            id: true,
            licenseStatus: true,
            businessLicenseUrl: true,
          },
        },
      },
    });

    return {
      ...updatedUser,
      role: updatedUser.roleCode,
      avatar: updatedUser.avatarUrl || undefined,
      merchantId: updatedUser.merchantProfile?.id || null,
      licenseStatus: updatedUser.merchantProfile?.licenseStatus || null,
      license_status: updatedUser.merchantProfile?.licenseStatus || null,
      licenseUrl: updatedUser.merchantProfile?.businessLicenseUrl || null,
    };
  }

  async updatePassword(id: string, passwordHash: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }
}

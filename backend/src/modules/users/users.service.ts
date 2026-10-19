import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SHOP_SELECT = {
  name: true,
  slug: true,
  address: true,
  phone: true,
  isApproved: true,
} as const;

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
        shop: { select: SHOP_SELECT },
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
      // Address only exists on the shop row; the shop phone wins for merchants
      address: user.shop?.address ?? null,
      phone: user.phone ?? user.shop?.phone ?? null,
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

    const { name, avatarUrl, phone, address } = updateUserDto;
    const data: Prisma.UserUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (phone !== undefined) data.phone = phone.trim() ? phone.trim() : null;

    // Merchants also keep their contact details on the shop row
    const shopData: Prisma.ShopUpdateManyMutationInput = {};
    if (address !== undefined) {
      shopData.address = address.trim() ? address.trim() : null;
    }
    if (phone !== undefined) {
      shopData.phone = phone.trim() ? phone.trim() : null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data,
        include: {
          merchantProfile: {
            select: {
              id: true,
              licenseStatus: true,
              businessLicenseUrl: true,
            },
          },
          shop: { select: SHOP_SELECT },
        },
      });

      // No-op for buyers, who have no shop row
      if (Object.keys(shopData).length > 0) {
        await tx.shop.updateMany({ where: { userId: id }, data: shopData });
      }

      return {
        ...updatedUser,
        role: updatedUser.roleCode,
        avatar: updatedUser.avatarUrl || undefined,
        merchantId: updatedUser.merchantProfile?.id || null,
        licenseStatus: updatedUser.merchantProfile?.licenseStatus || null,
        license_status: updatedUser.merchantProfile?.licenseStatus || null,
        licenseUrl: updatedUser.merchantProfile?.businessLicenseUrl || null,
        address: updatedUser.shop?.address ?? null,
        phone: updatedUser.phone ?? updatedUser.shop?.phone ?? null,
      };
    });
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

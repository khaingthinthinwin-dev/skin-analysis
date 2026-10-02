import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateMasterDataDto } from './dto';

export const MASTER_DATA_TYPES = [
  'user-roles',
  'order-statuses',
  'discount-types',
  'categories',
] as const;

export type MasterDataType = (typeof MASTER_DATA_TYPES)[number];

type AuditEntry = {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
};

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  assertType(type: string): MasterDataType {
    if (!(MASTER_DATA_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Unknown master data type: ${type}`);
    }
    return type as MasterDataType;
  }

  async list(type: string) {
    const masterType = this.assertType(type);

    switch (masterType) {
      case 'user-roles':
        return this.prisma.userRole.findMany({ orderBy: { id: 'asc' } });
      case 'order-statuses':
        return this.prisma.orderStatus.findMany({
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        });
      case 'discount-types':
        return this.prisma.discountType.findMany({ orderBy: { id: 'asc' } });
      case 'categories':
        return this.prisma.category.findMany({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { parent: { select: { id: true, name: true } } },
        });
      default:
        throw new BadRequestException(`Unknown master data type: ${type}`);
    }
  }

  async create(type: string, dto: CreateMasterDataDto, adminId: string) {
    const masterType = this.assertType(type);

    if (masterType !== 'categories') {
      throw new BadRequestException(
        `Creating ${masterType} master data is not supported`,
      );
    }

    const name = dto.name.trim();
    const slug = dto.slug?.trim() || this.slugify(name);

    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const created = await tx.category.create({
          data: {
            name,
            slug,
          },
        });

        await this.writeAudit(tx, {
          userId: adminId,
          action: 'MASTER_DATA_CREATED',
          entityType: 'Category',
          entityId: created.id,
          newValue: created,
        });

        return created;
      });

      return category;
    } catch (error) {
      throw this.translateError(
        error,
        `Category slug "${slug}" already exists`,
      );
    }
  }

  private async writeAudit(
    tx: Prisma.TransactionClient,
    entry: AuditEntry,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue as Prisma.InputJsonValue | undefined,
        newValue: entry.newValue as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private translateError(error: unknown, conflictMessage: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(conflictMessage);
    }
    if (error instanceof Error) return error;
    return new ConflictException(conflictMessage);
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'category'
    );
  }
}

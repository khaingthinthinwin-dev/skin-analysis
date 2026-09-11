import { PrismaService } from '../../shared/prisma/prisma.service';

export async function generateSku(
  prisma: PrismaService,
  _productName: string,
): Promise<string> {
  const lastProduct = await prisma.product.findFirst({
    where: {
      sku: {
        startsWith: 'SKU_',
      },
    },
    orderBy: {
      sku: 'desc',
    },
    select: {
      sku: true,
    },
  });

  let nextNumber = 1;

  if (lastProduct?.sku) {
    const parts = lastProduct.sku.split('_');
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `SKU_${String(nextNumber).padStart(3, '0')}`;
}

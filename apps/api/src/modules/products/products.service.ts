import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateProductInput, UpdateProductInput } from "./dto/product.input";

const PRODUCT_INCLUDE = {
  stockLevels: { include: { warehouse: true } },
  category: true,
  brand: true,
} as const;

function toProductModel<T extends { costPrice: unknown; sellPrice: unknown; stockLevels: Array<{ quantity: number }> }>(
  row: T,
) {
  const totalStock = row.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
  return { ...row, costPrice: Number(row.costPrice), sellPrice: Number(row.sellPrice), totalStock };
}

@Injectable()
export class ProductsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.product.findMany({ include: PRODUCT_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toProductModel);
  }

  async findById(id: string) {
    const row = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    return row ? toProductModel(row) : null;
  }

  async stockHistory(productId: string) {
    const rows = await this.prisma.stockLedgerEntry.findMany({
      where: { productId },
      include: { warehouse: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({ ...r, createdByName: r.createdBy.name }));
  }

  async create(input: CreateProductInput, organizationId: string) {
    const existing = await this.prisma.product.findFirst({ where: { sku: input.sku } });
    if (existing) throw new ConflictException("A product with this SKU already exists");
    const row = await this.prisma.product.create({
      data: { ...input, unitOfMeasure: input.unitOfMeasure ?? "unit", organizationId },
      include: PRODUCT_INCLUDE,
    });
    return toProductModel(row);
  }

  async update(id: string, input: UpdateProductInput) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product not found");
    const row = await this.prisma.product.update({ where: { id }, data: input, include: PRODUCT_INCLUDE });
    return toProductModel(row);
  }
}

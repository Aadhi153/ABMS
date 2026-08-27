import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateProductInput, StockAdjustmentInput, UpdateProductInput } from "./dto/product.input";

const PRODUCT_INCLUDE = { stockLevels: { include: { warehouse: true } } } as const;

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

  async lowStock() {
    const all = await this.findAll();
    return all.filter((p) => p.active && p.totalStock <= p.reorderThreshold);
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

  async recentAdjustments() {
    const rows = await this.prisma.stockLedgerEntry.findMany({
      where: { type: StockMovementType.ADJUSTMENT },
      include: { warehouse: true, createdBy: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((r) => ({ ...r, createdByName: r.createdBy.name, productName: r.product.name }));
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

  async adjustStock(input: StockAdjustmentInput, actorId: string, organizationId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundException("Product not found");
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundException("Warehouse not found");

    return this.prisma.$transaction(async (tx) => {
      const level = await tx.stockLevel.findUnique({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
      });
      const currentQty = level?.quantity ?? 0;
      const nextQty = currentQty + input.quantity;
      if (nextQty < 0) {
        throw new BadRequestException(
          `Adjustment would result in negative stock (${currentQty} + ${input.quantity} = ${nextQty})`,
        );
      }

      await tx.stockLevel.upsert({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.warehouseId } },
        create: { productId: input.productId, warehouseId: input.warehouseId, quantity: nextQty, organizationId },
        update: { quantity: nextQty },
      });

      const entry = await tx.stockLedgerEntry.create({
        data: {
          productId: input.productId,
          warehouseId: input.warehouseId,
          type: StockMovementType.ADJUSTMENT,
          quantity: input.quantity,
          reason: input.reason,
          createdById: actorId,
          organizationId,
        },
        include: { warehouse: true, createdBy: true },
      });

      return { ...entry, createdByName: entry.createdBy.name };
    });
  }
}

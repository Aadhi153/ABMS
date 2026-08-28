import { randomUUID } from "crypto";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { StockAdjustmentInput, StockMovementFilterInput, TransferStockInput } from "./dto/stock.input";

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
export class StockService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async lowStock() {
    const rows = await this.prisma.product.findMany({ include: PRODUCT_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toProductModel).filter((p) => p.active && p.totalStock <= p.reorderThreshold);
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

  async movements(filter?: StockMovementFilterInput) {
    const rows = await this.prisma.stockLedgerEntry.findMany({
      where: {
        productId: filter?.productId,
        warehouseId: filter?.warehouseId,
        type: filter?.type,
      },
      include: { warehouse: true, createdBy: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({ ...r, createdByName: r.createdBy.name, productName: r.product.name }));
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

  async transferStock(input: TransferStockInput, actorId: string, organizationId: string) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException("Source and destination warehouse must be different");
    }
    if (input.quantity <= 0) {
      throw new BadRequestException("Transfer quantity must be positive");
    }
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundException("Product not found");
    const [fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: input.fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: input.toWarehouseId } }),
    ]);
    if (!fromWarehouse) throw new NotFoundException("Source warehouse not found");
    if (!toWarehouse) throw new NotFoundException("Destination warehouse not found");

    const transferGroupId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const sourceLevel = await tx.stockLevel.findUnique({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.fromWarehouseId } },
      });
      const currentQty = sourceLevel?.quantity ?? 0;
      const nextQty = currentQty - input.quantity;
      if (nextQty < 0) {
        throw new BadRequestException(
          `Transfer would result in negative stock at source (${currentQty} - ${input.quantity} = ${nextQty})`,
        );
      }

      await tx.stockLevel.upsert({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.fromWarehouseId } },
        create: { productId: input.productId, warehouseId: input.fromWarehouseId, quantity: nextQty, organizationId },
        update: { quantity: nextQty },
      });
      await tx.stockLevel.upsert({
        where: { productId_warehouseId: { productId: input.productId, warehouseId: input.toWarehouseId } },
        create: { productId: input.productId, warehouseId: input.toWarehouseId, quantity: input.quantity, organizationId },
        update: { quantity: { increment: input.quantity } },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: input.productId,
          warehouseId: input.fromWarehouseId,
          type: StockMovementType.TRANSFER_OUT,
          quantity: -input.quantity,
          reason: input.reason,
          transferGroupId,
          createdById: actorId,
          organizationId,
        },
      });
      await tx.stockLedgerEntry.create({
        data: {
          productId: input.productId,
          warehouseId: input.toWarehouseId,
          type: StockMovementType.TRANSFER_IN,
          quantity: input.quantity,
          reason: input.reason,
          transferGroupId,
          createdById: actorId,
          organizationId,
        },
      });

      const actor = await tx.user.findUnique({ where: { id: actorId } });

      return {
        id: transferGroupId,
        productId: input.productId,
        productName: product.name,
        fromWarehouse,
        toWarehouse,
        quantity: input.quantity,
        reason: input.reason,
        createdByName: actor?.name ?? "",
        createdAt: new Date(),
      };
    });
  }

  async transfers() {
    const rows = await this.prisma.stockLedgerEntry.findMany({
      where: { transferGroupId: { not: null } },
      include: { warehouse: true, createdBy: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 400,
    });

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.transferGroupId) continue;
      const group = groups.get(row.transferGroupId) ?? [];
      group.push(row);
      groups.set(row.transferGroupId, group);
    }

    const transfers = [];
    for (const [transferGroupId, entries] of groups) {
      const out = entries.find((e) => e.type === StockMovementType.TRANSFER_OUT);
      const inEntry = entries.find((e) => e.type === StockMovementType.TRANSFER_IN);
      if (!out || !inEntry) continue;
      transfers.push({
        id: transferGroupId,
        productId: out.productId,
        productName: out.product.name,
        fromWarehouse: out.warehouse,
        toWarehouse: inEntry.warehouse,
        quantity: inEntry.quantity,
        reason: out.reason,
        createdByName: out.createdBy.name,
        createdAt: out.createdAt,
      });
    }

    return transfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 200);
  }
}

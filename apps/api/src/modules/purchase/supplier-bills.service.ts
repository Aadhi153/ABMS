import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LedgerEntryType, SupplierBillStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateSupplierBillInput } from "./dto/supplier-bill.input";

const BILL_INCLUDE = { supplier: true, purchaseOrder: true } as const;

function toModel<T extends { supplier: { name: string }; purchaseOrder: { poNumber: string } | null; amount: unknown }>(row: T) {
  return { ...row, supplierName: row.supplier.name, poNumber: row.purchaseOrder?.poNumber ?? null, amount: Number(row.amount) };
}

@Injectable()
export class SupplierBillsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.supplierBill.findMany({ include: BILL_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.supplierBill.findUnique({ where: { id }, include: BILL_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextBillNumber() {
    const count = await this.prisma.supplierBill.count();
    return `BILL-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateSupplierBillInput, organizationId: string) {
    const billNumber = await this.nextBillNumber();
    const supplier = await this.prisma.supplier.findUnique({ where: { id: input.supplierId } });
    const row = await this.prisma.supplierBill.create({
      data: {
        billNumber,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        amount: input.amount,
        dueDate: new Date(input.dueDate),
        status: SupplierBillStatus.UNPAID,
        organizationId,
      },
      include: BILL_INCLUDE,
    });
    await this.prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.PAYABLE,
        amount: input.amount,
        description: `Bill ${billNumber} — ${supplier?.name ?? "supplier"}`,
        relatedSupplierBillId: row.id,
        organizationId,
      },
    });
    return toModel(row);
  }

  async updateStatus(id: string, status: SupplierBillStatus) {
    const existing = await this.prisma.supplierBill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Supplier bill not found");
    const row = await this.prisma.supplierBill.update({ where: { id }, data: { status }, include: BILL_INCLUDE });
    return toModel(row);
  }
}

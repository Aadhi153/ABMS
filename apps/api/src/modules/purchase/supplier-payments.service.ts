import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { SupplierBillsService } from "./supplier-bills.service";
import type { RecordSupplierPaymentInput } from "./dto/supplier-payment.input";

const PAYMENT_INCLUDE = {
  bill: { include: { supplier: true } },
  requestedBy: true,
  approvedBy: true,
} as const;

function toModel<T extends {
  bill: { billNumber: string; supplierId: string; supplier: { name: string } };
  amount: unknown;
  requestedBy: { name: string };
  approvedBy: { name: string } | null;
}>(row: T) {
  return {
    ...row,
    billNumber: row.bill.billNumber,
    supplierId: row.bill.supplierId,
    supplierName: row.bill.supplier.name,
    amount: Number(row.amount),
    requestedByName: row.requestedBy.name,
    approvedByName: row.approvedBy?.name ?? null,
  };
}

@Injectable()
export class SupplierPaymentsService {
  constructor(
    @Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient,
    private readonly supplierBillsService: SupplierBillsService,
  ) {}

  async findAll() {
    const rows = await this.prisma.supplierPayment.findMany({ include: PAYMENT_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.supplierPayment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    return row ? toModel(row) : null;
  }

  async recordPayment(input: RecordSupplierPaymentInput, requestedById: string, organizationId: string) {
    const bill = await this.supplierBillsService.findById(input.billId);
    if (!bill) throw new NotFoundException("Supplier bill not found");
    if (bill.remaining <= 0) throw new BadRequestException("Bill is already fully paid or covered");

    const row = await this.prisma.supplierPayment.create({
      data: {
        billId: input.billId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        status: ApprovalStatus.PENDING,
        requestedById,
        organizationId,
      },
      include: PAYMENT_INCLUDE,
    });
    return toModel(row);
  }

  async approve(id: string, approvedById: string) {
    const existing = await this.prisma.supplierPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Supplier payment not found");
    if (existing.status !== ApprovalStatus.PENDING) throw new BadRequestException("Payment has already been resolved");

    const row = await this.prisma.supplierPayment.update({
      where: { id },
      data: { status: ApprovalStatus.APPROVED, approvedById, resolvedAt: new Date() },
      include: PAYMENT_INCLUDE,
    });
    await this.supplierBillsService.recomputeStatus(row.billId);
    return toModel(row);
  }

  async reject(id: string, approvedById: string) {
    const existing = await this.prisma.supplierPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Supplier payment not found");
    if (existing.status !== ApprovalStatus.PENDING) throw new BadRequestException("Payment has already been resolved");

    const row = await this.prisma.supplierPayment.update({
      where: { id },
      data: { status: ApprovalStatus.REJECTED, approvedById, resolvedAt: new Date() },
      include: PAYMENT_INCLUDE,
    });
    return toModel(row);
  }
}

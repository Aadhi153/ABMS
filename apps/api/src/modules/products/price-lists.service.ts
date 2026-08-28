import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreatePriceListInput, UpdatePriceListInput, UpsertPriceListItemInput } from "./dto/price-list.input";

const PRICE_LIST_INCLUDE = { items: { include: { product: true } } } as const;

function toModel<T extends { items: Array<{ price: unknown; product: { name: string } }> }>(row: T) {
  return {
    ...row,
    items: row.items.map((i) => ({ ...i, price: Number(i.price), productName: i.product.name })),
  };
}

@Injectable()
export class PriceListsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.priceList.findMany({ include: PRICE_LIST_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.priceList.findUnique({ where: { id }, include: PRICE_LIST_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async clearDefault() {
    await this.prisma.priceList.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  async create(input: CreatePriceListInput, organizationId: string) {
    if (input.isDefault) await this.clearDefault();
    const row = await this.prisma.priceList.create({ data: { ...input, organizationId }, include: PRICE_LIST_INCLUDE });
    return toModel(row);
  }

  async update(id: string, input: UpdatePriceListInput) {
    const existing = await this.prisma.priceList.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Price list not found");
    if (input.isDefault) await this.clearDefault();
    const row = await this.prisma.priceList.update({ where: { id }, data: input, include: PRICE_LIST_INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.priceList.findUnique({ where: { id }, include: PRICE_LIST_INCLUDE });
    if (!existing) throw new NotFoundException("Price list not found");
    await this.prisma.priceList.delete({ where: { id } });
    return toModel(existing);
  }

  async upsertItem(input: UpsertPriceListItemInput) {
    const priceList = await this.prisma.priceList.findUnique({ where: { id: input.priceListId } });
    if (!priceList) throw new NotFoundException("Price list not found");
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundException("Product not found");
    const item = await this.prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: input.priceListId, productId: input.productId } },
      create: { priceListId: input.priceListId, productId: input.productId, price: input.price },
      update: { price: input.price },
      include: { product: true },
    });
    return { ...item, price: Number(item.price), productName: item.product.name };
  }

  async removeItem(id: string) {
    const existing = await this.prisma.priceListItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Price list item not found");
    await this.prisma.priceListItem.delete({ where: { id } });
    return true;
  }
}

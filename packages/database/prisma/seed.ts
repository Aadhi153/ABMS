import bcrypt from "bcryptjs";
import { GlobalRole, StockMovementType, PurchaseOrderStatus, SupplierBillStatus, LedgerEntryType, PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

const DEMO_USERS: Array<{ role: GlobalRole; email: string; name: string }> = [
  { role: GlobalRole.SALES, email: "sales@example.com", name: "Sam Sales" },
  { role: GlobalRole.WAREHOUSE, email: "warehouse@example.com", name: "Wanda Warehouse" },
  { role: GlobalRole.ACCOUNTANT, email: "accountant@example.com", name: "Alex Accountant" },
  { role: GlobalRole.PURCHASE, email: "purchase@example.com", name: "Pat Purchase" },
];

interface ProductSeed {
  sku: string;
  name: string;
  category: string;
  brand: string;
  unitOfMeasure?: string;
  costPrice: number;
  sellPrice: number;
  reorderThreshold: number;
  stock: { main: number; north: number };
}

const CATEGORIES = ["Electronics", "Furniture", "Stationery"];
const BRANDS = ["Acme Office", "NorthStar Supply"];

const PRODUCTS: ProductSeed[] = [
  { sku: "ELEC-MOU-001", name: "Wireless Mouse", category: "Electronics", brand: "Acme Office", costPrice: 8, sellPrice: 19.99, reorderThreshold: 20, stock: { main: 60, north: 25 } },
  { sku: "ELEC-KEY-002", name: "Mechanical Keyboard", category: "Electronics", brand: "Acme Office", costPrice: 25, sellPrice: 59.99, reorderThreshold: 15, stock: { main: 30, north: 10 } },
  { sku: "ELEC-CAB-003", name: "USB-C Cable 2m", category: "Electronics", brand: "NorthStar Supply", costPrice: 2, sellPrice: 7.99, reorderThreshold: 50, stock: { main: 120, north: 80 } },
  { sku: "ELEC-MON-004", name: '27" Monitor', category: "Electronics", brand: "Acme Office", costPrice: 120, sellPrice: 249.99, reorderThreshold: 10, stock: { main: 3, north: 1 } },
  { sku: "ELEC-CAM-005", name: "Webcam HD", category: "Electronics", brand: "NorthStar Supply", costPrice: 18, sellPrice: 44.99, reorderThreshold: 12, stock: { main: 22, north: 6 } },
  { sku: "FURN-CHR-001", name: "Office Chair", category: "Furniture", brand: "Acme Office", costPrice: 60, sellPrice: 149.99, reorderThreshold: 8, stock: { main: 14, north: 5 } },
  { sku: "FURN-DSK-002", name: "Standing Desk", category: "Furniture", brand: "Acme Office", costPrice: 150, sellPrice: 349.99, reorderThreshold: 5, stock: { main: 1, north: 1 } },
  { sku: "FURN-LMP-003", name: "Desk Lamp", category: "Furniture", brand: "NorthStar Supply", costPrice: 12, sellPrice: 29.99, reorderThreshold: 15, stock: { main: 18, north: 9 } },
  { sku: "FURN-FTR-004", name: "Ergonomic Footrest", category: "Furniture", brand: "NorthStar Supply", costPrice: 15, sellPrice: 34.99, reorderThreshold: 10, stock: { main: 12, north: 4 } },
  { sku: "STAT-NBK-001", name: "Notebook Pack (12)", category: "Stationery", brand: "NorthStar Supply", costPrice: 3, sellPrice: 9.99, reorderThreshold: 30, stock: { main: 45, north: 20 } },
  { sku: "STAT-PEN-002", name: "Ballpoint Pen Box", category: "Stationery", brand: "NorthStar Supply", costPrice: 1.5, sellPrice: 4.99, reorderThreshold: 40, stock: { main: 70, north: 30 } },
  { sku: "STAT-MRK-003", name: "Whiteboard Marker Set", category: "Stationery", brand: "Acme Office", costPrice: 4, sellPrice: 12.99, reorderThreshold: 25, stock: { main: 33, north: 12 } },
];

async function main() {
  const orgName = process.env.SEED_ORG_NAME ?? "Demo Company";
  const org = await prisma.organization.upsert({
    where: { name: orgName },
    update: {},
    create: { name: orgName },
  });
  console.log(`Organization ready: ${orgName} (${org.id})`);

  const orgProfile = {
    companyName: orgName,
    logoUrl: "https://dummyimage.com/128x128/1e293b/f59e0b.png&text=ABMS",
    address: "221B Commerce Street, Suite 400, Austin, TX 78701",
    taxId: "US-TAX-88291034",
    defaultCurrency: "USD",
  };
  await prisma.orgSettings.upsert({
    where: { organizationId: org.id },
    update: orgProfile,
    create: { ...orgProfile, organizationId: org.id },
  });
  console.log(`OrgSettings ready: ${orgName}`);

  const WAREHOUSES = [
    { key: "main", name: "Main Warehouse", address: "500 Industrial Pkwy, Austin, TX 78744" },
    { key: "north", name: "North Distribution Center", address: "88 Commerce Loop, Dallas, TX 75201" },
  ];
  const warehouseByKey: Record<string, { id: string }> = {};
  for (const wh of WAREHOUSES) {
    const existing = await prisma.warehouse.findFirst({ where: { name: wh.name, organizationId: org.id } });
    const row = existing ?? (await prisma.warehouse.create({ data: { name: wh.name, address: wh.address, organizationId: org.id } }));
    warehouseByKey[wh.key] = row;
  }
  console.log(`Warehouses ready: ${WAREHOUSES.map((w) => w.name).join(", ")}`);

  const existingTaxRate = await prisma.taxRate.findFirst({ where: { name: "Standard Sales Tax", organizationId: org.id } });
  const standardTaxRate =
    existingTaxRate ??
    (await prisma.taxRate.create({ data: { name: "Standard Sales Tax", rate: 8.25, isDefault: true, organizationId: org.id } }));
  console.log("Tax rate ready: Standard Sales Tax (8.25%)");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      role: GlobalRole.ADMIN,
      passwordHash: adminPasswordHash,
      organizationId: org.id,
    },
  });
  console.log(`Admin user ready: ${adminEmail} / ${adminPassword}`);

  const demoPassword = "ChangeMe123!";
  const demoPasswordHash = await bcrypt.hash(demoPassword, 10);
  const usersByRole: Record<string, { id: string }> = { ADMIN: admin };
  for (const demo of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        email: demo.email,
        name: demo.name,
        role: demo.role,
        passwordHash: demoPasswordHash,
        organizationId: org.id,
      },
    });
    usersByRole[demo.role] = user;
    console.log(`Demo ${demo.role} user ready: ${demo.email} / ${demoPassword}`);
  }
  const salesUser = usersByRole.SALES;

  const categoryByName: Record<string, { id: string }> = {};
  for (const name of CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { name, organizationId: org.id } });
    categoryByName[name] = existing ?? (await prisma.category.create({ data: { name, organizationId: org.id } }));
  }
  console.log(`Categories ready: ${CATEGORIES.join(", ")}`);

  const brandByName: Record<string, { id: string }> = {};
  for (const name of BRANDS) {
    const existing = await prisma.brand.findFirst({ where: { name, organizationId: org.id } });
    brandByName[name] = existing ?? (await prisma.brand.create({ data: { name, organizationId: org.id } }));
  }
  console.log(`Brands ready: ${BRANDS.join(", ")}`);

  let productsCreated = 0;
  const productBySku: Record<string, { id: string }> = {};
  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: org.id, sku: p.sku } },
      update: {
        categoryId: categoryByName[p.category].id,
        brandId: brandByName[p.brand].id,
      },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: categoryByName[p.category].id,
        brandId: brandByName[p.brand].id,
        unitOfMeasure: p.unitOfMeasure ?? "unit",
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        reorderThreshold: p.reorderThreshold,
        organizationId: org.id,
      },
    });
    productsCreated += 1;
    productBySku[p.sku] = product;

    for (const [key, qty] of Object.entries(p.stock)) {
      if (qty <= 0) continue;
      const warehouse = warehouseByKey[key];
      const existingLevel = await prisma.stockLevel.findUnique({
        where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
      });
      if (existingLevel) continue;
      await prisma.stockLevel.create({
        data: { productId: product.id, warehouseId: warehouse.id, quantity: qty, organizationId: org.id },
      });
      await prisma.stockLedgerEntry.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          type: StockMovementType.ADJUSTMENT,
          quantity: qty,
          reason: "Initial stock (seed)",
          createdById: admin.id,
          organizationId: org.id,
        },
      });
    }
  }
  console.log(`Products ready: ${productsCreated} across ${new Set(PRODUCTS.map((p) => p.category)).size} categories`);

  const existingPriceList = await prisma.priceList.findFirst({ where: { name: "Wholesale Price List", organizationId: org.id } });
  const wholesalePriceList =
    existingPriceList ?? (await prisma.priceList.create({ data: { name: "Wholesale Price List", organizationId: org.id } }));
  const WHOLESALE_ITEMS = [
    { sku: "ELEC-MOU-001", price: 14.99 },
    { sku: "ELEC-KEY-002", price: 44.99 },
    { sku: "FURN-CHR-001", price: 119.99 },
  ];
  for (const item of WHOLESALE_ITEMS) {
    const product = productBySku[item.sku];
    await prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId: wholesalePriceList.id, productId: product.id } },
      update: {},
      create: { priceListId: wholesalePriceList.id, productId: product.id, price: item.price },
    });
  }
  console.log(`Price list ready: Wholesale Price List (${WHOLESALE_ITEMS.length} items)`);

  const existingPricingTier = await prisma.pricingTier.findFirst({ where: { name: "VIP Customers", organizationId: org.id } });
  if (!existingPricingTier) {
    await prisma.pricingTier.create({
      data: { name: "VIP Customers", description: "10% off list price", discountPercent: 10, organizationId: org.id },
    });
  }
  console.log("Pricing tier ready: VIP Customers (10%)");

  const existingDiscount = await prisma.discount.findFirst({ where: { name: "Clearance 15%", organizationId: org.id } });
  if (!existingDiscount) {
    await prisma.discount.create({
      data: { name: "Clearance 15%", type: "PERCENTAGE", value: 15, organizationId: org.id },
    });
  }
  console.log("Discount ready: Clearance 15%");

  const existingTaxGroup = await prisma.taxGroup.findFirst({ where: { name: "Standard Group", organizationId: org.id } });
  if (!existingTaxGroup) {
    await prisma.taxGroup.create({
      data: { name: "Standard Group", organizationId: org.id, taxRates: { connect: { id: standardTaxRate.id } } },
    });
  }
  console.log("Tax group ready: Standard Group");

  const COMPANIES = [
    { name: "Northwind Traders", industry: "Retail", website: "https://northwindtraders.example" },
    { name: "Globex Corporation", industry: "Manufacturing", website: "https://globex.example" },
    { name: "Initech Solutions", industry: "Software", website: "https://initech.example" },
  ];
  const companyByName: Record<string, { id: string }> = {};
  for (const c of COMPANIES) {
    const existing = await prisma.company.findFirst({ where: { name: c.name, organizationId: org.id } });
    companyByName[c.name] = existing ?? (await prisma.company.create({ data: { ...c, organizationId: org.id } }));
  }
  console.log(`Companies ready: ${COMPANIES.map((c) => c.name).join(", ")}`);

  const CONTACTS = [
    { name: "Alice Johnson", email: "alice@northwindtraders.example", phone: "555-0101", tags: ["decision-maker"], source: "Referral", company: "Northwind Traders" },
    { name: "Bob Martinez", email: "bob@globex.example", phone: "555-0102", tags: ["technical"], source: "Website", company: "Globex Corporation" },
    { name: "Carol Nguyen", email: "carol@initech.example", phone: "555-0103", tags: ["champion"], source: "Trade Show", company: "Initech Solutions" },
    { name: "David Lee", email: "david@northwindtraders.example", phone: "555-0104", tags: [], source: "Referral", company: "Northwind Traders" },
    { name: "Eve Parsons", email: "eve@example.com", phone: "555-0105", tags: ["cold-lead"], source: "Cold Outreach", company: null },
    { name: "Frank Ortiz", email: "frank@globex.example", phone: "555-0106", tags: [], source: "Website", company: "Globex Corporation" },
  ];
  const contactByName: Record<string, { id: string }> = {};
  for (const c of CONTACTS) {
    const existing = await prisma.contact.findFirst({ where: { name: c.name, organizationId: org.id } });
    contactByName[c.name] =
      existing ??
      (await prisma.contact.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          tags: c.tags,
          source: c.source,
          ownerId: salesUser.id,
          companyId: c.company ? companyByName[c.company].id : undefined,
          organizationId: org.id,
        },
      }));
  }
  console.log(`Contacts ready: ${CONTACTS.map((c) => c.name).join(", ")}`);

  const DEALS = [
    { title: "Northwind Q3 Restock", value: 15000, stage: "QUALIFIED" as const, probability: 40, contact: "Alice Johnson", company: "Northwind Traders" },
    { title: "Globex Office Refresh", value: 42000, stage: "PROPOSAL" as const, probability: 60, contact: "Bob Martinez", company: "Globex Corporation" },
    { title: "Initech Onboarding Kit", value: 8000, stage: "LEAD" as const, probability: 10, contact: "Carol Nguyen", company: "Initech Solutions" },
    { title: "Northwind Expansion Deal", value: 65000, stage: "WON" as const, probability: 100, contact: "David Lee", company: "Northwind Traders" },
    { title: "Globex Legacy Migration", value: 30000, stage: "LOST" as const, probability: 0, contact: "Frank Ortiz", company: "Globex Corporation" },
    { title: "Cold Outreach Pilot", value: 5000, stage: "LEAD" as const, probability: 10, contact: "Eve Parsons", company: null },
    { title: "Initech Renewal", value: 12000, stage: "WON" as const, probability: 100, contact: "Carol Nguyen", company: "Initech Solutions" },
  ];
  const dealByTitle: Record<string, { id: string }> = {};
  for (const d of DEALS) {
    const existing = await prisma.deal.findFirst({ where: { title: d.title, organizationId: org.id } });
    dealByTitle[d.title] =
      existing ??
      (await prisma.deal.create({
        data: {
          title: d.title,
          value: d.value,
          stage: d.stage,
          probability: d.probability,
          contactId: contactByName[d.contact].id,
          companyId: d.company ? companyByName[d.company].id : undefined,
          ownerId: salesUser.id,
          organizationId: org.id,
        },
      }));
  }
  console.log(`Deals ready: ${DEALS.length} across ${new Set(DEALS.map((d) => d.stage)).size} stages`);

  const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  const TASKS = [
    { title: "Follow up on Northwind proposal", dueDate: inDays(3), contact: "Alice Johnson", deal: "Northwind Q3 Restock" },
    { title: "Send Globex refreshed quote", dueDate: inDays(5), contact: null, deal: "Globex Office Refresh" },
    { title: "Schedule demo with Initech", dueDate: inDays(2), contact: "Carol Nguyen", deal: null },
    { title: "Check in with cold lead Eve", dueDate: inDays(7), contact: "Eve Parsons", deal: null },
  ];
  for (const t of TASKS) {
    const existing = await prisma.task.findFirst({ where: { title: t.title, organizationId: org.id } });
    if (existing) continue;
    await prisma.task.create({
      data: {
        title: t.title,
        dueDate: t.dueDate,
        assigneeId: salesUser.id,
        contactId: t.contact ? contactByName[t.contact].id : undefined,
        dealId: t.deal ? dealByTitle[t.deal].id : undefined,
        organizationId: org.id,
      },
    });
  }
  console.log(`Tasks ready: ${TASKS.length}`);

  const CUSTOMERS = [
    { name: "Northwind Traders", email: "orders@northwindtraders.example", phone: "555-0201", creditLimit: 25000, paymentTerms: "Net 30" },
    { name: "Globex Corporation", email: "ap@globex.example", phone: "555-0202", creditLimit: 50000, paymentTerms: "Net 45" },
    { name: "Initech Solutions", email: "billing@initech.example", phone: "555-0203", creditLimit: 15000, paymentTerms: "Net 15" },
    { name: "Umbrella Retail Group", email: "purchasing@umbrella.example", phone: "555-0204", creditLimit: 10000, paymentTerms: "Due on receipt" },
  ];
  const customerByName: Record<string, { id: string }> = {};
  for (const c of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name, organizationId: org.id } });
    customerByName[c.name] = existing ?? (await prisma.customer.create({ data: { ...c, organizationId: org.id } }));
  }
  console.log(`Customers ready: ${CUSTOMERS.map((c) => c.name).join(", ")}`);

  const SUPPLIERS = [
    { name: "Acme Wholesale Supply", email: "sales@acmewholesale.example", phone: "555-0301", paymentTerms: "Net 30" },
    { name: "Contoso Distribution", email: "orders@contoso.example", phone: "555-0302", paymentTerms: "Net 60" },
    { name: "Stark Industrial Parts", email: "accounts@starkindustrial.example", phone: "555-0303", paymentTerms: "Net 45" },
  ];
  const supplierByName: Record<string, { id: string }> = {};
  for (const s of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name, organizationId: org.id } });
    supplierByName[s.name] = existing ?? (await prisma.supplier.create({ data: { ...s, organizationId: org.id } }));
  }
  console.log(`Suppliers ready: ${SUPPLIERS.map((s) => s.name).join(", ")}`);

  const mainWarehouse = warehouseByKey.main;
  const defaultTaxRate = await prisma.taxRate.findFirst({ where: { isDefault: true, organizationId: org.id } });
  const taxRatePct = defaultTaxRate ? Number(defaultTaxRate.rate) : 0;

  async function seedOrder(opts: {
    orderNumber: string;
    customerName: string;
    status: "DRAFT" | "CONFIRMED";
    items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  }) {
    const existing = await prisma.salesOrder.findUnique({
      where: { organizationId_orderNumber: { organizationId: org.id, orderNumber: opts.orderNumber } },
    });
    if (existing) return existing;
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: opts.orderNumber,
        customerId: customerByName[opts.customerName].id,
        status: opts.status,
        createdById: salesUser.id,
        organizationId: org.id,
        items: {
          create: opts.items.map((i) => ({ productId: productBySku[i.sku].id, quantity: i.quantity, unitPrice: i.unitPrice })),
        },
      },
    });
    if (opts.status === "CONFIRMED") {
      for (const item of opts.items) {
        const product = productBySku[item.sku];
        await prisma.stockLevel.update({
          where: { productId_warehouseId: { productId: product.id, warehouseId: mainWarehouse.id } },
          data: { quantity: { decrement: item.quantity } },
        });
        await prisma.stockLedgerEntry.create({
          data: {
            productId: product.id,
            warehouseId: mainWarehouse.id,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            reason: `Sale ${opts.orderNumber}`,
            relatedSalesOrderId: order.id,
            createdById: salesUser.id,
            organizationId: org.id,
          },
        });
      }
    }
    return order;
  }

  const draftOrder = await seedOrder({
    orderNumber: "SO-0001",
    customerName: "Northwind Traders",
    status: "DRAFT",
    items: [{ sku: "FURN-CHR-001", quantity: 1, unitPrice: 149.99 }],
  });
  const paidOrder = await seedOrder({
    orderNumber: "SO-0002",
    customerName: "Globex Corporation",
    status: "CONFIRMED",
    items: [
      { sku: "ELEC-MOU-001", quantity: 2, unitPrice: 19.99 },
      { sku: "ELEC-CAB-003", quantity: 3, unitPrice: 7.99 },
    ],
  });
  const partialOrder = await seedOrder({
    orderNumber: "SO-0003",
    customerName: "Initech Solutions",
    status: "CONFIRMED",
    items: [
      { sku: "ELEC-KEY-002", quantity: 1, unitPrice: 59.99 },
      { sku: "STAT-PEN-002", quantity: 5, unitPrice: 4.99 },
    ],
  });
  const overdueOrder = await seedOrder({
    orderNumber: "SO-0004",
    customerName: "Umbrella Retail Group",
    status: "CONFIRMED",
    items: [
      { sku: "STAT-NBK-001", quantity: 2, unitPrice: 9.99 },
      { sku: "ELEC-CAM-005", quantity: 1, unitPrice: 44.99 },
    ],
  });
  console.log("Sales orders ready: SO-0001 (draft), SO-0002/0003/0004 (confirmed, stock deducted)");

  async function seedInvoice(opts: {
    invoiceNumber: string;
    order: { id: string; customerId: string };
    items: Array<{ quantity: number; unitPrice: number }>;
    dueInDays: number;
    payments: Array<{ amount: number; method: "CASH" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER" }>;
    status: "PAID" | "PARTIAL" | "UNPAID";
  }) {
    const existing = await prisma.invoice.findUnique({
      where: { organizationId_invoiceNumber: { organizationId: org.id, invoiceNumber: opts.invoiceNumber } },
    });
    if (existing) return existing;
    const subtotal = opts.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxAmount = subtotal * (taxRatePct / 100);
    const total = subtotal + taxAmount;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: opts.invoiceNumber,
        salesOrderId: opts.order.id,
        customerId: opts.order.customerId,
        status: opts.status,
        subtotal,
        taxAmount,
        total,
        dueDate: new Date(Date.now() + opts.dueInDays * 24 * 60 * 60 * 1000),
        organizationId: org.id,
      },
    });
    for (const p of opts.payments) {
      await prisma.payment.create({
        data: { invoiceId: invoice.id, amount: p.amount, method: p.method, organizationId: org.id },
      });
    }
    const customer = await prisma.customer.findUnique({ where: { id: opts.order.customerId } });
    await prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.RECEIVABLE,
        amount: total,
        description: `Invoice ${opts.invoiceNumber} — ${customer?.name ?? "customer"}`,
        relatedInvoiceId: invoice.id,
        organizationId: org.id,
      },
    });
    return invoice;
  }

  const paidOrderItems = [
    { quantity: 2, unitPrice: 19.99 },
    { quantity: 3, unitPrice: 7.99 },
  ];
  const paidSubtotal = paidOrderItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const paidTotal = paidSubtotal * (1 + taxRatePct / 100);
  await seedInvoice({
    invoiceNumber: "INV-0001",
    order: paidOrder,
    items: paidOrderItems,
    dueInDays: 30,
    status: "PAID",
    payments: [{ amount: paidTotal, method: "BANK_TRANSFER" }],
  });

  const partialOrderItems = [
    { quantity: 1, unitPrice: 59.99 },
    { quantity: 5, unitPrice: 4.99 },
  ];
  const partialSubtotal = partialOrderItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const partialTotal = partialSubtotal * (1 + taxRatePct / 100);
  await seedInvoice({
    invoiceNumber: "INV-0002",
    order: partialOrder,
    items: partialOrderItems,
    dueInDays: 15,
    status: "PARTIAL",
    payments: [{ amount: Math.round(partialTotal * 0.4 * 100) / 100, method: "CARD" }],
  });

  await seedInvoice({
    invoiceNumber: "INV-0003",
    order: overdueOrder,
    items: [
      { quantity: 2, unitPrice: 9.99 },
      { quantity: 1, unitPrice: 44.99 },
    ],
    dueInDays: -10,
    status: "UNPAID",
    payments: [],
  });
  console.log("Invoices ready: INV-0001 (paid), INV-0002 (partial), INV-0003 (overdue)");
  void draftOrder;

  const purchaseUser = usersByRole.PURCHASE;

  async function seedPurchaseOrder(opts: {
    poNumber: string;
    supplierName: string;
    status: "SENT" | "RECEIVED";
    items: Array<{ sku: string; quantity: number; unitCost: number }>;
  }) {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { organizationId_poNumber: { organizationId: org.id, poNumber: opts.poNumber } },
    });
    if (existing) return existing;
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: opts.poNumber,
        supplierId: supplierByName[opts.supplierName].id,
        status: PurchaseOrderStatus.SENT,
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: purchaseUser.id,
        organizationId: org.id,
        items: {
          create: opts.items.map((i) => ({ productId: productBySku[i.sku].id, quantity: i.quantity, unitCost: i.unitCost })),
        },
      },
      include: { items: true },
    });

    if (opts.status === "RECEIVED") {
      const grnNumber = "GRN-0001";
      const existingGrn = await prisma.goodsReceivedNote.findUnique({
        where: { organizationId_grnNumber: { organizationId: org.id, grnNumber } },
      });
      if (!existingGrn) {
        await prisma.goodsReceivedNote.create({
          data: {
            grnNumber,
            purchaseOrderId: po.id,
            warehouseId: mainWarehouse.id,
            receivedById: purchaseUser.id,
            organizationId: org.id,
            items: { create: po.items.map((i) => ({ purchaseOrderItemId: i.id, quantityReceived: i.quantity })) },
          },
        });
        for (const item of po.items) {
          await prisma.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: item.quantity } });
          await prisma.stockLevel.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: mainWarehouse.id } },
            create: { productId: item.productId, warehouseId: mainWarehouse.id, quantity: item.quantity, organizationId: org.id },
            update: { quantity: { increment: item.quantity } },
          });
          await prisma.stockLedgerEntry.create({
            data: {
              productId: item.productId,
              warehouseId: mainWarehouse.id,
              type: StockMovementType.PURCHASE,
              quantity: item.quantity,
              reason: `Receipt ${grnNumber} (${opts.poNumber})`,
              relatedPurchaseOrderId: po.id,
              createdById: purchaseUser.id,
              organizationId: org.id,
            },
          });
        }
        await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: PurchaseOrderStatus.RECEIVED } });
      }
    }
    return po;
  }

  const receivedPo = await seedPurchaseOrder({
    poNumber: "PO-0001",
    supplierName: "Acme Wholesale Supply",
    status: "RECEIVED",
    items: [
      { sku: "ELEC-MOU-001", quantity: 20, unitCost: 8 },
      { sku: "ELEC-CAB-003", quantity: 30, unitCost: 2 },
    ],
  });
  await seedPurchaseOrder({
    poNumber: "PO-0002",
    supplierName: "Contoso Distribution",
    status: "SENT",
    items: [{ sku: "FURN-DSK-002", quantity: 5, unitCost: 150 }],
  });
  console.log("Purchase orders ready: PO-0001 (received, stock added), PO-0002 (sent)");

  const existingBill = await prisma.supplierBill.findUnique({
    where: { organizationId_billNumber: { organizationId: org.id, billNumber: "BILL-0001" } },
  });
  if (!existingBill) {
    const amount = 20 * 8 + 30 * 2;
    const bill = await prisma.supplierBill.create({
      data: {
        billNumber: "BILL-0001",
        supplierId: supplierByName["Acme Wholesale Supply"].id,
        purchaseOrderId: receivedPo.id,
        amount,
        status: SupplierBillStatus.UNPAID,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        organizationId: org.id,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.PAYABLE,
        amount,
        description: `Bill BILL-0001 — Acme Wholesale Supply`,
        relatedSupplierBillId: bill.id,
        organizationId: org.id,
      },
    });
  }
  console.log("Supplier bills ready: BILL-0001 (unpaid)");

  const existingExpense = await prisma.expense.findFirst({ where: { category: "Office Rent", organizationId: org.id } });
  if (!existingExpense) {
    const expense = await prisma.expense.create({
      data: {
        category: "Office Rent",
        amount: 2400,
        date: new Date(),
        notes: "Monthly office lease",
        createdById: admin.id,
        organizationId: org.id,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.EXPENSE,
        amount: 2400,
        description: "Expense — Office Rent",
        relatedExpenseId: expense.id,
        organizationId: org.id,
      },
    });
  }
  console.log("Expenses ready: Office Rent ($2,400)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';

function splitCsvLine(line: string): string[] {
  return line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((s) => {
    const t = s.trim();
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
    return t;
  });
}

async function seed() {
  console.log('Seeding Retail OS backend database...');

  // 1. Create Demo Trader & Shop
  const demoPhone = '+2348031234567';
  let user = await prisma.user.findUnique({ where: { phone: demoPhone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'usr_9410294',
        phone: demoPhone,
        tier: 'trader',
        language: 'yo',
        biometricEnabled: true,
        biometricType: 'face',
      },
    });
  }

  let shop = await prisma.shop.findUnique({ where: { userId: user.id } });
  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        id: 'shp_819203',
        userId: user.id,
        name: 'Mama Chinedu Textiles',
        address: 'Shop 14, Balogun Market, Lagos',
        latitude: 6.4552,
        longitude: 3.3841,
        categories: ['Clothes', 'Shoes', 'Food', 'Bags'],
        tier: 'trader',
        defaultProfitMargin: 25,
        notificationsEnabled: true,
      },
    });
  }

  // 2. Create Sample Products
  const sampleProducts = [
    {
      id: 'prod_101',
      shopId: shop.id,
      name: 'Men Ankara Shirt (Size L)',
      category: 'Clothes',
      categoryIcon: '👕',
      sku: '8901030382901',
      barcode: '8901030382901',
      stock: 14,
      costPrice: '6000',
      sellingPrice: '8500',
      status: 'good',
    },
    {
      id: 'prod_102',
      shopId: shop.id,
      name: 'Nike Casual Sneakers (Size 43)',
      category: 'Shoes',
      categoryIcon: '👟',
      sku: '7613035312384',
      barcode: '7613035312384',
      stock: 2,
      costPrice: '14000',
      sellingPrice: '20000',
      status: 'low',
    },
    {
      id: 'prod_103',
      shopId: shop.id,
      name: 'Ankara Fabric 6 Yards',
      category: 'Clothes',
      categoryIcon: '👗',
      sku: '8901020304051',
      barcode: '8901020304051',
      stock: 18,
      costPrice: '10000',
      sellingPrice: '14500',
      status: 'good',
    },
    {
      id: 'prod_104',
      shopId: shop.id,
      name: 'Leather Slippers',
      category: 'Shoes',
      categoryIcon: '🩴',
      sku: '8901020304052',
      barcode: '8901020304052',
      stock: 8,
      costPrice: '4500',
      sellingPrice: '6500',
      status: 'good',
    },
    {
      id: 'prod_105',
      shopId: shop.id,
      name: 'Dangote Sugar 50kg Bag',
      category: 'Food',
      categoryIcon: '🍚',
      sku: '8901020304053',
      barcode: '8901020304053',
      stock: 0,
      costPrice: '72000',
      sellingPrice: '78000',
      status: 'sold_out',
    },
  ];

  for (const p of sampleProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }

  // 3. Create Sample Sales & Debts
  const sale1 = await prisma.sale.upsert({
    where: { id: 'sale_101' },
    update: {},
    create: {
      id: 'sale_101',
      shopId: shop.id,
      receiptNumber: '#RCP-408',
      itemCount: 2,
      itemsSummary: 'Ankara Fabric 6 Yards ×1, Leather Slippers ×1',
      subtotal: '21000',
      discountAmount: '6000',
      amount: '15000',
      profit: '4200',
      paymentMethod: 'Cash',
      paymentStatus: 'paid',
      cashGiven: '15000',
      change: '0',
      isCreditSale: false,
      amountPaid: '15000',
      amountOwed: '0',
      hasDebt: false,
      createdAt: new Date(),
      items: {
        create: [
          {
            name: 'Ankara Fabric 6 Yards',
            categoryIcon: '👗',
            quantity: 1,
            salePrice: '10000',
            costPrice: '7000',
            lineTotal: '10000',
            productId: 'prod_103',
          },
          {
            name: 'Leather Slippers',
            categoryIcon: '🩴',
            quantity: 1,
            salePrice: '5000',
            costPrice: '3800',
            lineTotal: '5000',
            productId: 'prod_104',
          },
        ],
      },
    },
  });

  const sale2 = await prisma.sale.upsert({
    where: { id: 'sale_102' },
    update: {},
    create: {
      id: 'sale_102',
      shopId: shop.id,
      receiptNumber: '#RCP-407',
      itemCount: 1,
      itemsSummary: 'Men Casual Sneakers ×1',
      subtotal: '25000',
      amount: '25000',
      profit: '7000',
      paymentMethod: 'Credit / Owings',
      paymentStatus: 'partial',
      isCreditSale: true,
      amountPaid: '10000',
      amountOwed: '15000',
      hasDebt: true,
      customerName: 'Mama Chinedu',
      customerPhone: '08031234567',
      dueDate: 'This Friday',
      debtNotes: 'Regular customer, neighbor in shop 14',
      createdAt: new Date(Date.now() - 3600000 * 2),
      items: {
        create: [
          {
            name: 'Nike Casual Sneakers (Size 43)',
            categoryIcon: '👟',
            quantity: 1,
            salePrice: '25000',
            costPrice: '18000',
            lineTotal: '25000',
            productId: 'prod_102',
          },
        ],
      },
      debtRepayments: {
        create: [
          {
            amount: '10000',
            method: 'Cash',
            note: 'Initial deposit',
            createdAt: new Date(Date.now() - 3600000 * 2),
          },
        ],
      },
    },
  });

  const sale3 = await prisma.sale.upsert({
    where: { id: 'sale_103' },
    update: {},
    create: {
      id: 'sale_103',
      shopId: shop.id,
      receiptNumber: '#RCP-398',
      itemCount: 2,
      itemsSummary: 'Ankara 6 Yards ×2',
      subtotal: '35000',
      amount: '35000',
      profit: '9000',
      paymentMethod: 'Credit / Owings',
      paymentStatus: 'partial',
      isCreditSale: true,
      amountPaid: '8000',
      amountOwed: '27000',
      hasDebt: true,
      customerName: 'Broda Segun',
      customerPhone: '08059876543',
      dueDate: 'End of Month',
      debtNotes: 'Promised salary day payment',
      createdAt: new Date(Date.now() - 86400000 * 2),
      items: {
        create: [
          {
            name: 'Ankara Fabric 6 Yards',
            categoryIcon: '👗',
            quantity: 2,
            salePrice: '17500',
            costPrice: '13000',
            lineTotal: '35000',
            productId: 'prod_103',
          },
        ],
      },
      debtRepayments: {
        create: [
          {
            amount: '8000',
            method: 'Bank Transfer',
            note: 'Transfer deposit',
            createdAt: new Date(Date.now() - 86400000 * 2),
          },
        ],
      },
    },
  });

  // 4. Sample Stock-In Purchase History
  await prisma.purchaseEntry.upsert({
    where: { id: 'pur_201' },
    update: {},
    create: {
      id: 'pur_201',
      shopId: shop.id,
      productId: 'prod_101',
      productName: 'Men Ankara Shirt (Size L)',
      categoryIcon: '👕',
      quantityAdded: 10,
      unitCost: '6000',
      totalCost: '60000',
      sellingPrice: '8500',
      timeLabel: 'Today, 10:15 AM',
      statusBadge: 'Just added',
    },
  });

  // 5. Import Master Catalog Products from CSV (if not already imported)
  const count = await prisma.catalogProduct.count();
  if (count === 0) {
    const csvPath = path.join(process.cwd(), 'src', 'lib', 'catalogueProducts.csv');
    if (fs.existsSync(csvPath)) {
      console.log('Importing global catalog products from CSV...');
      const csv = fs.readFileSync(csvPath, 'utf8');
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const header = splitCsvLine(lines.shift() || '');

      const rows = lines.map((ln) => {
        const cols = splitCsvLine(ln);
        const obj: Record<string, string> = {};
        for (let i = 0; i < header.length; i++) {
          obj[header[i]] = cols[i] ?? '';
        }
        return obj;
      });

      const batch = rows.slice(0, 500).map((r) => ({
        name: r.name || 'Product',
        description: r.pdesc || null,
        barcode: r.upc || null,
        externalCode: r.pcode || null,
        category: 'Food & Groceries',
        categoryIcon: '🛒',
        suggestedRetailPrice: r.price ? r.price : null,
        suggestedCostPrice: r.cost ? r.cost : null,
        source: 'imported_csv',
      }));

      await prisma.catalogProduct.createMany({
        data: batch,
        skipDuplicates: true,
      });
      console.log(`Imported ${batch.length} catalog items.`);
    }
  }

  console.log('Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

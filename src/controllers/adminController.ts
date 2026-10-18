import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import { AppError } from '../lib/AppError.js';
import { formatDateStr, formatTime } from '../lib/formatters.js';

// ============================================================================
// 1. PLATFORM OVERVIEW & LIVE ACTIVITY FEED
// ============================================================================

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      usersCount,
      shopsCount,
      productsCount,
      salesCount,
      todaySales,
      allSales,
      debtSales,
      catalogCount,
      offlineMutationsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.shop.count(),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.sale.count(),
      prisma.sale.findMany({
        where: { createdAt: { gte: startOfDay } },
        select: { amount: true, amountPaid: true, profit: true },
      }),
      prisma.sale.findMany({
        select: { amount: true, amountPaid: true, profit: true },
      }),
      prisma.sale.findMany({
        where: { amountOwed: { gt: 0 } },
        select: { amountOwed: true },
      }),
      prisma.catalogProduct.count(),
      prisma.processedMutation.count(),
    ]);

    const totalGMV = allSales.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalProfit = allSales.reduce((acc, curr) => acc + Number(curr.profit), 0);
    const todayGMV = todaySales.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const todayCollected = todaySales.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);
    const todayProfit = todaySales.reduce((acc, curr) => acc + Number(curr.profit), 0);
    const totalOutstandingDebt = debtSales.reduce((acc, curr) => acc + Number(curr.amountOwed), 0);

    return sendSuccess(req, res, {
      metrics: {
        usersCount,
        shopsCount,
        productsCount,
        salesCount,
        activeDebtorsCount: debtSales.length,
        catalogCount,
        offlineMutationsCount,
      },
      financials: {
        totalGMV,
        totalProfit,
        totalOutstandingDebt,
        today: {
          salesCount: todaySales.length,
          gmv: todayGMV,
          collected: todayCollected,
          profit: todayProfit,
        },
      },
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivityFeed(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

    const [recentSales, recentPurchases, recentRepayments, recentAudits, recentMutations, recentOtps] =
      await Promise.all([
        prisma.sale.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { shop: { select: { id: true, name: true } } },
        }),
        prisma.purchaseEntry.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { shop: { select: { id: true, name: true } } },
        }),
        prisma.debtRepayment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { sale: { select: { id: true, receiptNumber: true, customerName: true, shop: { select: { id: true, name: true } } } } },
        }),
        prisma.productAuditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { product: { select: { id: true, name: true, shop: { select: { id: true, name: true } } } } },
        }),
        prisma.processedMutation.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { shop: { select: { id: true, name: true } } },
        }),
        prisma.otpSession.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    const events: Array<{
      type: string;
      title: string;
      description: string;
      shopName?: string;
      timestamp: string;
      rawDate: Date;
      entityId?: string;
      meta?: any;
    }> = [];

    for (const s of recentSales) {
      events.push({
        type: 'SALE',
        title: `Sale ${s.receiptNumber} (${s.paymentMethod})`,
        description: `₦${Number(s.amount).toLocaleString('en-NG')} collected. Items: ${s.itemsSummary || 'Goods'}.`,
        shopName: s.shop.name,
        timestamp: formatDateStr(s.createdAt),
        rawDate: s.createdAt,
        entityId: s.id,
      });
    }

    for (const p of recentPurchases) {
      events.push({
        type: 'STOCK_IN',
        title: `Restocked ${p.productName} (+${p.quantityAdded})`,
        description: `Cost: ₦${Number(p.totalCost).toLocaleString('en-NG')} (Supplier: ${p.supplierName || 'Unknown'})`,
        shopName: p.shop.name,
        timestamp: formatDateStr(p.createdAt),
        rawDate: p.createdAt,
        entityId: p.id,
      });
    }

    for (const r of recentRepayments) {
      events.push({
        type: 'DEBT_REPAYMENT',
        title: `Debt Repayment on ${r.sale?.receiptNumber}`,
        description: `₦${Number(r.amount).toLocaleString('en-NG')} paid via ${r.method} by ${r.sale?.customerName || 'Customer'}`,
        shopName: r.sale?.shop.name,
        timestamp: formatDateStr(r.createdAt),
        rawDate: r.createdAt,
        entityId: r.id,
      });
    }

    for (const a of recentAudits) {
      events.push({
        type: 'STOCK_AUDIT',
        title: `Audit: ${a.product?.name}`,
        description: `${a.difference > 0 ? '+' : ''}${a.difference} pieces (${a.reasonLabel || a.reason}). Notes: ${a.notes || 'None'}`,
        shopName: a.product?.shop?.name,
        timestamp: formatDateStr(a.createdAt),
        rawDate: a.createdAt,
        entityId: a.id,
      });
    }

    for (const m of recentMutations) {
      events.push({
        type: 'OFFLINE_SYNC',
        title: `Offline Mutation Applied (${m.type})`,
        description: `Mutation ID: ${m.mutationId} -> Entity ${m.serverEntityId}`,
        shopName: m.shop.name,
        timestamp: formatDateStr(m.createdAt),
        rawDate: m.createdAt,
        entityId: m.mutationId,
      });
    }

    for (const o of recentOtps) {
      events.push({
        type: 'OTP_REQUEST',
        title: `OTP Code Generated for ${o.phone}`,
        description: `Code: [${o.code}] Channel: ${o.channel} Purpose: ${o.purpose} Verified: ${o.verified}`,
        timestamp: formatDateStr(o.createdAt),
        rawDate: o.createdAt,
        entityId: o.id,
      });
    }

    events.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    const paginatedEvents = events.slice(0, limit);

    return sendSuccess(req, res, {
      totalEvents: paginatedEvents.length,
      events: paginatedEvents,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 2. AUTH, OTP & USERS INSPECTOR
// ============================================================================

export async function listOtpSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '30', phone } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (phone) {
      where.phone = { contains: String(phone).trim() };
    }

    const [sessions, total] = await Promise.all([
      prisma.otpSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.otpSession.count({ where }),
    ]);

    const formatted = sessions.map((s) => ({
      id: s.id,
      phone: s.phone,
      code: s.code, // Readable by admin to test onboarding without SMS costs
      channel: s.channel,
      purpose: s.purpose,
      attempts: s.attempts,
      verified: s.verified,
      isExpired: s.expiresAt < new Date(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return sendSuccess(req, res, {
      sessions: formatted,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '30', search, tier } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.phone = { contains: String(search).trim() };
    }
    if (tier) {
      where.tier = tier as string;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: true,
          _count: { select: { refreshTokens: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      phone: u.phone,
      tier: u.tier,
      language: u.language,
      biometricEnabled: u.biometricEnabled,
      biometricType: u.biometricType,
      activeSessionsCount: u._count.refreshTokens,
      shop: u.shop
        ? {
            id: u.shop.id,
            name: u.shop.name,
            address: u.shop.address,
            tier: u.shop.tier,
          }
        : null,
      createdAt: u.createdAt.toISOString(),
    }));

    return sendSuccess(req, res, {
      users: formatted,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: id as string },
      include: {
        shop: {
          include: {
            _count: {
              select: {
                products: true,
                sales: true,
                purchaseEntries: true,
              },
            },
          },
        },
        refreshTokens: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User record not found', 'USER_NOT_FOUND');
    }

    return sendSuccess(req, res, { user });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 3. SHOPS & MERCHANTS MANAGEMENT
// ============================================================================

export async function listShops(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '30', search, tier } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (tier) {
      where.tier = tier as string;
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, phone: true } },
          _count: {
            select: {
              products: true,
              sales: true,
              purchaseEntries: true,
            },
          },
        },
      }),
      prisma.shop.count({ where }),
    ]);

    return sendSuccess(req, res, {
      shops,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getShopDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { id: id as string },
      include: {
        user: true,
        _count: {
          select: {
            products: true,
            sales: true,
            purchaseEntries: true,
            processedMutations: true,
          },
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        products: {
          where: { deletedAt: null },
          orderBy: { stock: 'asc' },
          take: 10,
        },
      },
    });

    if (!shop) {
      throw AppError.notFound('Shop not found', 'SHOP_NOT_FOUND');
    }

    // Lifetime revenue for this shop
    const shopSales = await prisma.sale.findMany({
      where: { shopId: shop.id },
      select: { amount: true, amountPaid: true, amountOwed: true, profit: true },
    });

    const lifetimeGMV = shopSales.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const lifetimeCollected = shopSales.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);
    const lifetimeProfit = shopSales.reduce((acc, curr) => acc + Number(curr.profit), 0);
    const outstandingDebt = shopSales.reduce((acc, curr) => acc + Number(curr.amountOwed), 0);

    return sendSuccess(req, res, {
      shop,
      financials: {
        lifetimeGMV,
        lifetimeCollected,
        lifetimeProfit,
        outstandingDebt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateShop(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, address, tier, defaultProfitMargin, notificationsEnabled, categories } = req.body;

    const shop = await prisma.shop.findUnique({ where: { id: id as string } });
    if (!shop) {
      throw AppError.notFound('Shop not found', 'SHOP_NOT_FOUND');
    }

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: name !== undefined ? name : undefined,
        address: address !== undefined ? address : undefined,
        tier: tier !== undefined ? tier : undefined,
        defaultProfitMargin: defaultProfitMargin !== undefined ? Number(defaultProfitMargin) : undefined,
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : undefined,
        categories: categories !== undefined ? categories : undefined,
      },
    });

    return sendSuccess(req, res, { shop: updated }, 'Shop updated successfully');
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 4. INVENTORY, AUDITS & STOCK-IN ENTRIES
// ============================================================================

export async function listAllProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', shopId, category, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };
    if (shopId) where.shopId = shopId as string;
    if (category) where.category = category as string;
    if (status) where.status = status as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return sendSuccess(req, res, {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', productId, reason } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (productId) where.productId = productId as string;
    if (reason) where.reason = reason as string;

    const [auditLogs, total] = await Promise.all([
      prisma.productAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              shop: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.productAuditLog.count({ where }),
    ]);

    return sendSuccess(req, res, {
      auditLogs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listStockInEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', shopId, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (shopId) where.shopId = shopId as string;
    if (search) {
      where.productName = { contains: String(search).trim(), mode: 'insensitive' };
    }

    const [entries, total] = await Promise.all([
      prisma.purchaseEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, stock: true } },
        },
      }),
      prisma.purchaseEntry.count({ where }),
    ]);

    return sendSuccess(req, res, {
      entries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 5. SALES, LINE ITEMS & RETURNS INSPECTOR
// ============================================================================

export async function listAllSales(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', shopId, paymentStatus, paymentMethod, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (shopId) where.shopId = shopId as string;
    if (paymentStatus) where.paymentStatus = paymentStatus as string;
    if (paymentMethod) where.paymentMethod = paymentMethod as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { receiptNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: { select: { id: true, name: true } },
          items: true,
          debtRepayments: true,
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return sendSuccess(req, res, {
      sales,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSaleDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: id as string },
      include: {
        shop: true,
        items: true,
        debtRepayments: { orderBy: { createdAt: 'desc' } },
        returns: { include: { items: true } },
      },
    });

    if (!sale) {
      throw AppError.notFound('Sale record not found', 'SALE_NOT_FOUND');
    }

    return sendSuccess(req, res, { sale });
  } catch (err) {
    next(err);
  }
}

export async function listAllReturns(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [returns, total] = await Promise.all([
      prisma.saleReturn.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          items: true,
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              shop: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.saleReturn.count(),
    ]);

    return sendSuccess(req, res, {
      returns,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 6. CUSTOMER DEBTS & REPAYMENTS LEDGER
// ============================================================================

export async function listAllDebts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', shopId, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { amountOwed: { gt: 0 } };
    if (shopId) where.shopId = shopId as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { receiptNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [debts, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: { select: { id: true, name: true } },
          debtRepayments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    const totalOutstanding = debts.reduce((acc, curr) => acc + Number(curr.amountOwed), 0);

    return sendSuccess(req, res, {
      totalOutstanding,
      debtorsCount: total,
      debts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listAllRepayments(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', shopId } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (shopId) {
      where.sale = { shopId: shopId as string };
    }

    const [repayments, total] = await Promise.all([
      prisma.debtRepayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              customerName: true,
              customerPhone: true,
              shop: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.debtRepayment.count({ where }),
    ]);

    return sendSuccess(req, res, {
      repayments,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 7. OFFLINE SYNC & IDEMPOTENCY INSPECTOR
// ============================================================================

export async function listProcessedMutations(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', shopId, type } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (shopId) where.shopId = shopId as string;
    if (type) where.type = type as string;

    const [mutations, total] = await Promise.all([
      prisma.processedMutation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: { select: { id: true, name: true } },
        },
      }),
      prisma.processedMutation.count({ where }),
    ]);

    return sendSuccess(req, res, {
      mutations,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listIdempotencyRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.key = { contains: String(search).trim() };
    }

    const [records, total] = await Promise.all([
      prisma.idempotencyRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.idempotencyRecord.count({ where }),
    ]);

    return sendSuccess(req, res, {
      records,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 8. MASTER FMCG CATALOG & SUBSCRIPTIONS
// ============================================================================

export async function listCatalogProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', search, barcode } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (barcode) where.barcode = barcode as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.catalogProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.catalogProduct.count({ where }),
    ]);

    return sendSuccess(req, res, {
      products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createCatalogProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name,
      description,
      category = 'Food & Groceries',
      categoryIcon = '🛒',
      barcode,
      externalCode,
      suggestedRetailPrice,
      suggestedCostPrice,
    } = req.body;

    if (!name) {
      throw AppError.badRequest('Catalog product name is required', 'MISSING_NAME');
    }

    const product = await prisma.catalogProduct.create({
      data: {
        name,
        description: description || null,
        category,
        categoryIcon,
        barcode: barcode || null,
        externalCode: externalCode || null,
        suggestedRetailPrice: suggestedRetailPrice ? Number(suggestedRetailPrice) : null,
        suggestedCostPrice: suggestedCostPrice ? Number(suggestedCostPrice) : null,
        source: 'admin_dashboard',
      },
    });

    return sendSuccess(req, res, { product }, 'Catalog product created successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function listSubscriptionUpgrades(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', limit = '50', status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as string;

    const [upgrades, total] = await Promise.all([
      prisma.subscriptionUpgrade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          shop: { select: { id: true, name: true, tier: true } },
        },
      }),
      prisma.subscriptionUpgrade.count({ where }),
    ]);

    return sendSuccess(req, res, {
      upgrades,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalRecords: total,
      },
    });
  } catch (err) {
    next(err);
  }
}

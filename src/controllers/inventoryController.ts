import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { sendSuccess } from '../lib/response.js';
import { formatDateStr, formatRelativeTime, formatTime } from '../lib/formatters.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const REASON_LABELS: Record<string, string> = {
  physical_count: 'Physical Count / Recount',
  damaged: 'Damaged / Broken',
  stolen_missing: 'Stolen / Missing Goods',
  gift_sample: 'Gift / Customer Sample',
  personal_use: 'Owner Personal Use',
  return_restock: 'Customer Return Restock',
  other: 'Other Adjustment',
};

export async function listInventoryProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;
    const {
      category,
      sortBy = 'default',
      search,
      status,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Filter criteria
    const whereClause: any = {
      shopId,
      deletedAt: null,
    };

    if (category && category !== 'All') {
      whereClause.category = category as string;
    }

    if (status && status !== 'all') {
      whereClause.status = status as string;
    }

    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'lowest_stock') {
      orderBy = { stock: 'asc' };
    } else if (sortBy === 'price_high') {
      orderBy = { sellingPrice: 'desc' };
    } else if (sortBy === 'name_asc') {
      orderBy = { name: 'asc' };
    }

    const [allShopProducts, filteredProducts, totalFiltered] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, deletedAt: null },
        select: { stock: true, sellingPrice: true, category: true },
      }),
      prisma.product.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // Inventory valuation summary across entire shop
    let totalInventoryWorth = 0;
    let runningLowCount = 0;
    let soldOutCount = 0;
    const categorySet = new Set<string>();

    for (const p of allShopProducts) {
      const stock = p.stock;
      const price = Number(p.sellingPrice);
      totalInventoryWorth += stock > 0 ? stock * price : 0;

      if (stock <= 0) {
        soldOutCount += 1;
      } else if (stock <= 5) {
        runningLowCount += 1;
      }

      if (p.category) {
        categorySet.add(p.category);
      }
    }

    const categories = ['All', ...Array.from(categorySet)];

    const products = filteredProducts.map((p) => {
      const cost = Number(p.costPrice);
      const sell = Number(p.sellingPrice);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        categoryIcon: p.categoryIcon || '📦',
        sku: p.sku || p.barcode || 'N/A',
        stock: p.stock,
        costPrice: cost,
        sellingPrice: sell,
        profitPerItem: Math.max(0, sell - cost),
        status: p.status,
        lastUpdated: formatRelativeTime(p.updatedAt),
      };
    });

    const totalPages = Math.ceil(totalFiltered / limitNum);

    return sendSuccess(req, res, {
      summary: {
        totalInventoryWorth,
        totalItemsCount: allShopProducts.length,
        runningLowCount,
        soldOutCount,
      },
      categories,
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords: totalFiltered,
        hasNextPage: pageNum < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shopId = req.shop!.id;

    const product = await prisma.product.findFirst({
      where: { id: id as string, shopId, deletedAt: null },
      include: {
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      throw AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
    }

    const costPrice = Number(product.costPrice);
    const sellingPrice = Number(product.sellingPrice);
    const profitPerItem = Math.max(0, sellingPrice - costPrice);
    const marginPercentage =
      sellingPrice > 0 ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1)) : 0;

    // Sales activity this week
    const oneWeekAgo = new Date(Date.now() - 7 * 86400 * 1000);
    const recentSaleItems = await prisma.saleItem.findMany({
      where: {
        productId: product.id,
        sale: { shopId, createdAt: { gte: oneWeekAgo } },
      },
      include: { sale: true },
      orderBy: { sale: { createdAt: 'desc' } },
    });

    const soldThisWeek = recentSaleItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const latestSoldItem = recentSaleItems[0];

    const salesActivity = {
      soldThisWeek,
      lastSoldTime: latestSoldItem ? `Today at ${formatTime(latestSoldItem.sale.createdAt)}` : 'Never sold yet',
      lastReceiptNumber: latestSoldItem ? latestSoldItem.sale.receiptNumber : null,
    };

    const auditLogs = product.auditLogs.map((log) => ({
      id: log.id,
      previousStock: log.previousStock,
      newStock: log.newStock,
      difference: log.difference,
      reason: log.reason,
      reasonLabel: log.reasonLabel || REASON_LABELS[log.reason] || log.reason,
      notes: log.notes || '',
      performedBy: log.performedBy,
      timestamp: formatDateStr(log.createdAt),
    }));

    return sendSuccess(req, res, {
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        categoryIcon: product.categoryIcon || '📦',
        sku: product.sku || product.barcode || 'N/A',
        stock: product.stock,
        costPrice,
        sellingPrice,
        profitPerItem,
        marginPercentage,
        status: product.status,
        createdAt: product.createdAt.toISOString(),
        lastUpdated: formatRelativeTime(product.updatedAt),
      },
      salesActivity,
      auditLogs,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProductDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shopId = req.shop!.id;
    const { name, category, categoryIcon } = req.body;

    const existing = await prisma.product.findFirst({
      where: { id: id as string, shopId, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
    }

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        category: category || existing.category,
        categoryIcon: categoryIcon !== undefined ? categoryIcon : existing.categoryIcon,
      },
    });

    return sendSuccess(
      req,
      res,
      {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        categoryIcon: updated.categoryIcon,
        updatedAt: updated.updatedAt.toISOString(),
      },
      'Product details updated',
    );
  } catch (err) {
    next(err);
  }
}

export async function updateProductPrice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shopId = req.shop!.id;
    const { sellingPrice } = req.body;

    if (sellingPrice === undefined || Number(sellingPrice) < 0) {
      throw AppError.badRequest('A valid non-negative sellingPrice is required', 'INVALID_PRICE');
    }

    const existing = await prisma.product.findFirst({
      where: { id: id as string, shopId, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
    }

    const previousPrice = Number(existing.sellingPrice);
    const newPrice = Number(sellingPrice);
    const costPrice = Number(existing.costPrice);

    await prisma.product.update({
      where: { id: existing.id },
      data: { sellingPrice: newPrice },
    });

    return sendSuccess(
      req,
      res,
      {
        id: existing.id,
        previousPrice,
        newPrice,
        costPrice,
        newProfitPerItem: Math.max(0, newPrice - costPrice),
      },
      'Price updated successfully',
    );
  } catch (err) {
    next(err);
  }
}

export async function auditProductStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shopId = req.shop!.id;
    const { newStock, reason = 'physical_count', notes } = req.body;

    if (newStock === undefined || isNaN(Number(newStock))) {
      throw AppError.badRequest('newStock count number is required', 'INVALID_STOCK_VALUE');
    }

    const existing = await prisma.product.findFirst({
      where: { id: id as string, shopId, deletedAt: null },
    });

    if (!existing) {
      throw AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
    }

    const targetStock = Number(newStock);
    const previousStock = existing.stock;
    const difference = targetStock - previousStock;
    const reasonLabel = REASON_LABELS[reason] || 'Stock Adjustment';
    const newStatus = targetStock > 5 ? 'good' : targetStock >= 1 ? 'low' : 'sold_out';

    const [updatedProduct, auditLog] = await prisma.$transaction([
      prisma.product.update({
        where: { id: existing.id },
        data: {
          stock: targetStock,
          status: newStatus,
        },
      }),
      prisma.productAuditLog.create({
        data: {
          productId: existing.id,
          previousStock,
          newStock: targetStock,
          difference,
          reason,
          reasonLabel,
          notes: notes || null,
          performedBy: req.user?.phone || req.shop!.name,
        },
      }),
    ]);

    return sendSuccess(
      req,
      res,
      {
        productId: updatedProduct.id,
        previousStock,
        newStock: targetStock,
        difference,
        reason,
        auditLogId: auditLog.id,
        timestamp: formatDateStr(auditLog.createdAt),
      },
      'Stock count reconciled',
    );
  } catch (err) {
    next(err);
  }
}

export async function getLowStockAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;

    const products = await prisma.product.findMany({
      where: {
        shopId,
        deletedAt: null,
        stock: { lte: 5 },
      },
      orderBy: { stock: 'asc' },
    });

    const soldOutItems: any[] = [];
    const runningLowItems: any[] = [];

    for (const p of products) {
      const item = {
        id: p.id,
        name: p.name,
        category: p.category,
        categoryIcon: p.categoryIcon || '📦',
        stock: p.stock,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
      };

      if (p.stock <= 0) {
        soldOutItems.push(item);
      } else {
        runningLowItems.push(item);
      }
    }

    return sendSuccess(req, res, {
      soldOutItems,
      runningLowItems,
    });
  } catch (err) {
    next(err);
  }
}

import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function getAnalyticsSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;
    const { period = 'Today' } = req.query;

    const now = new Date();
    let startDate = new Date();

    if (period === 'This Week') {
      startDate.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st day of month
    } else {
      // Default: Today
      startDate.setHours(0, 0, 0, 0);
    }

    const [salesInPeriod, allShopProducts] = await Promise.all([
      prisma.sale.findMany({
        where: {
          shopId,
          createdAt: { gte: startDate },
        },
        include: { items: true },
      }),
      prisma.product.findMany({
        where: { shopId, deletedAt: null },
      }),
    ]);

    let revenue = 0;
    let netProfit = 0;
    const productSalesMap = new Map<string, { id: string; name: string; categoryIcon: string; quantitySold: number; revenue: number }>();

    for (const sale of salesInPeriod) {
      revenue += Number(sale.amount);
      netProfit += Number(sale.profit);

      for (const item of sale.items) {
        const prodKey = item.productId || item.name;
        const current = productSalesMap.get(prodKey) || {
          id: item.productId || 'unlisted',
          name: item.name,
          categoryIcon: item.categoryIcon || '📦',
          quantitySold: 0,
          revenue: 0,
        };

        current.quantitySold += item.quantity;
        current.revenue += Number(item.lineTotal);
        productSalesMap.set(prodKey, current);
      }
    }

    const salesCount = salesInPeriod.length;
    const averageBasketSize = salesCount > 0 ? Math.round(revenue / salesCount) : 0;
    const profitMarginPercentage =
      revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(1)) : 0;

    // Inventory Valuation & Missing Cost Price warnings
    let inventoryValuation = 0;
    let unpricedProductsCount = 0;

    for (const prod of allShopProducts) {
      const stock = prod.stock;
      const sell = Number(prod.sellingPrice);
      const cost = Number(prod.costPrice);

      if (stock > 0) {
        inventoryValuation += stock * sell;
      }

      if (cost <= 0) {
        unpricedProductsCount += 1;
      }
    }

    // Determine Best Selling Product
    let bestSellingProduct: any = null;
    let maxQuantity = 0;

    for (const item of productSalesMap.values()) {
      if (item.quantitySold > maxQuantity) {
        maxQuantity = item.quantitySold;
        bestSellingProduct = item;
      }
    }

    if (!bestSellingProduct && allShopProducts.length > 0) {
      bestSellingProduct = {
        id: allShopProducts[0].id,
        name: allShopProducts[0].name,
        categoryIcon: allShopProducts[0].categoryIcon || '📦',
        quantitySold: 0,
        revenue: 0,
      };
    }

    return sendSuccess(req, res, {
      period: String(period),
      revenue,
      netProfit,
      profitMarginPercentage,
      salesCount,
      averageBasketSize,
      inventoryValuation,
      bestSellingProduct,
      warnings: {
        hasMissingCostPrices: unpricedProductsCount > 0,
        unpricedProductsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

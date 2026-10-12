import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function searchCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;
    const { q, barcode } = req.query;

    const searchTerm = q ? String(q).trim() : '';
    const barcodeTerm = barcode ? String(barcode).trim() : '';

    if (!searchTerm && !barcodeTerm) {
      return sendSuccess(req, res, {
        shopMatches: [],
        globalCatalogMatches: [],
      });
    }

    // 1. Search Shop's active products
    const shopWhere: any = {
      shopId,
      deletedAt: null,
    };

    if (barcodeTerm) {
      shopWhere.OR = [
        { barcode: barcodeTerm },
        { sku: barcodeTerm },
      ];
    } else if (searchTerm) {
      shopWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const shopProducts = await prisma.product.findMany({
      where: shopWhere,
      take: 20,
    });

    const shopMatches = shopProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryIcon: p.categoryIcon || '📦',
      currentStock: p.stock,
      costPrice: Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      isExistingShopItem: true,
    }));

    // 2. Search Global Master FMCG Catalog
    const globalWhere: any = {};
    if (barcodeTerm) {
      globalWhere.barcode = barcodeTerm;
    } else if (searchTerm) {
      globalWhere.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const globalProducts = await prisma.catalogProduct.findMany({
      where: globalWhere,
      take: 20,
    });

    const globalCatalogMatches = globalProducts.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category || 'Food & Groceries',
      categoryIcon: g.categoryIcon || '🛒',
      suggestedRetailPrice: g.suggestedRetailPrice ? Number(g.suggestedRetailPrice) : 0,
      barcode: g.barcode || 'N/A',
      isExistingShopItem: false,
    }));

    return sendSuccess(req, res, {
      shopMatches,
      globalCatalogMatches,
    });
  } catch (err) {
    next(err);
  }
}

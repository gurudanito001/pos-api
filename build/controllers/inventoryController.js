"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInventoryProducts = listInventoryProducts;
exports.getProductDetails = getProductDetails;
exports.updateProductDetails = updateProductDetails;
exports.updateProductPrice = updateProductPrice;
exports.auditProductStock = auditProductStock;
exports.getLowStockAlerts = getLowStockAlerts;
const prisma_js_1 = require("../lib/prisma.js");
const AppError_js_1 = require("../lib/AppError.js");
const response_js_1 = require("../lib/response.js");
const formatters_js_1 = require("../lib/formatters.js");
const REASON_LABELS = {
    physical_count: 'Physical Count / Recount',
    damaged: 'Damaged / Broken',
    stolen_missing: 'Stolen / Missing Goods',
    gift_sample: 'Gift / Customer Sample',
    personal_use: 'Owner Personal Use',
    return_restock: 'Customer Return Restock',
    other: 'Other Adjustment',
};
async function listInventoryProducts(req, res, next) {
    try {
        const shopId = req.shop.id;
        const { category, sortBy = 'default', search, status, page = '1', limit = '50', } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        // Filter criteria
        const whereClause = {
            shopId,
            deletedAt: null,
        };
        if (category && category !== 'All') {
            whereClause.category = category;
        }
        if (status && status !== 'all') {
            whereClause.status = status;
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
        let orderBy = { createdAt: 'desc' };
        if (sortBy === 'lowest_stock') {
            orderBy = { stock: 'asc' };
        }
        else if (sortBy === 'price_high') {
            orderBy = { sellingPrice: 'desc' };
        }
        else if (sortBy === 'name_asc') {
            orderBy = { name: 'asc' };
        }
        const [allShopProducts, filteredProducts, totalFiltered] = await Promise.all([
            prisma_js_1.prisma.product.findMany({
                where: { shopId, deletedAt: null },
                select: { stock: true, sellingPrice: true, category: true },
            }),
            prisma_js_1.prisma.product.findMany({
                where: whereClause,
                orderBy,
                skip,
                take: limitNum,
            }),
            prisma_js_1.prisma.product.count({ where: whereClause }),
        ]);
        // Inventory valuation summary across entire shop
        let totalInventoryWorth = 0;
        let runningLowCount = 0;
        let soldOutCount = 0;
        const categorySet = new Set();
        for (const p of allShopProducts) {
            const stock = p.stock;
            const price = Number(p.sellingPrice);
            totalInventoryWorth += stock > 0 ? stock * price : 0;
            if (stock <= 0) {
                soldOutCount += 1;
            }
            else if (stock <= 5) {
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
                lastUpdated: (0, formatters_js_1.formatRelativeTime)(p.updatedAt),
            };
        });
        const totalPages = Math.ceil(totalFiltered / limitNum);
        return (0, response_js_1.sendSuccess)(req, res, {
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
    }
    catch (err) {
        next(err);
    }
}
async function getProductDetails(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop.id;
        const product = await prisma_js_1.prisma.product.findFirst({
            where: { id: id, shopId, deletedAt: null },
            include: {
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });
        if (!product) {
            throw AppError_js_1.AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
        }
        const costPrice = Number(product.costPrice);
        const sellingPrice = Number(product.sellingPrice);
        const profitPerItem = Math.max(0, sellingPrice - costPrice);
        const marginPercentage = sellingPrice > 0 ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1)) : 0;
        // Sales activity this week
        const oneWeekAgo = new Date(Date.now() - 7 * 86400 * 1000);
        const recentSaleItems = await prisma_js_1.prisma.saleItem.findMany({
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
            lastSoldTime: latestSoldItem ? `Today at ${(0, formatters_js_1.formatTime)(latestSoldItem.sale.createdAt)}` : 'Never sold yet',
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
            timestamp: (0, formatters_js_1.formatDateStr)(log.createdAt),
        }));
        return (0, response_js_1.sendSuccess)(req, res, {
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
                lastUpdated: (0, formatters_js_1.formatRelativeTime)(product.updatedAt),
            },
            salesActivity,
            auditLogs,
        });
    }
    catch (err) {
        next(err);
    }
}
async function updateProductDetails(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop.id;
        const { name, category, categoryIcon } = req.body;
        const existing = await prisma_js_1.prisma.product.findFirst({
            where: { id: id, shopId, deletedAt: null },
        });
        if (!existing) {
            throw AppError_js_1.AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
        }
        const updated = await prisma_js_1.prisma.product.update({
            where: { id: existing.id },
            data: {
                name: name || existing.name,
                category: category || existing.category,
                categoryIcon: categoryIcon !== undefined ? categoryIcon : existing.categoryIcon,
            },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            id: updated.id,
            name: updated.name,
            category: updated.category,
            categoryIcon: updated.categoryIcon,
            updatedAt: updated.updatedAt.toISOString(),
        }, 'Product details updated');
    }
    catch (err) {
        next(err);
    }
}
async function updateProductPrice(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop.id;
        const { sellingPrice } = req.body;
        if (sellingPrice === undefined || Number(sellingPrice) < 0) {
            throw AppError_js_1.AppError.badRequest('A valid non-negative sellingPrice is required', 'INVALID_PRICE');
        }
        const existing = await prisma_js_1.prisma.product.findFirst({
            where: { id: id, shopId, deletedAt: null },
        });
        if (!existing) {
            throw AppError_js_1.AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
        }
        const previousPrice = Number(existing.sellingPrice);
        const newPrice = Number(sellingPrice);
        const costPrice = Number(existing.costPrice);
        await prisma_js_1.prisma.product.update({
            where: { id: existing.id },
            data: { sellingPrice: newPrice },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            id: existing.id,
            previousPrice,
            newPrice,
            costPrice,
            newProfitPerItem: Math.max(0, newPrice - costPrice),
        }, 'Price updated successfully');
    }
    catch (err) {
        next(err);
    }
}
async function auditProductStock(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop.id;
        const { newStock, reason = 'physical_count', notes } = req.body;
        if (newStock === undefined || isNaN(Number(newStock))) {
            throw AppError_js_1.AppError.badRequest('newStock count number is required', 'INVALID_STOCK_VALUE');
        }
        const existing = await prisma_js_1.prisma.product.findFirst({
            where: { id: id, shopId, deletedAt: null },
        });
        if (!existing) {
            throw AppError_js_1.AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
        }
        const targetStock = Number(newStock);
        const previousStock = existing.stock;
        const difference = targetStock - previousStock;
        const reasonLabel = REASON_LABELS[reason] || 'Stock Adjustment';
        const newStatus = targetStock > 5 ? 'good' : targetStock >= 1 ? 'low' : 'sold_out';
        const [updatedProduct, auditLog] = await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.product.update({
                where: { id: existing.id },
                data: {
                    stock: targetStock,
                    status: newStatus,
                },
            }),
            prisma_js_1.prisma.productAuditLog.create({
                data: {
                    productId: existing.id,
                    previousStock,
                    newStock: targetStock,
                    difference,
                    reason,
                    reasonLabel,
                    notes: notes || null,
                    performedBy: req.user?.phone || req.shop.name,
                },
            }),
        ]);
        return (0, response_js_1.sendSuccess)(req, res, {
            productId: updatedProduct.id,
            previousStock,
            newStock: targetStock,
            difference,
            reason,
            auditLogId: auditLog.id,
            timestamp: (0, formatters_js_1.formatDateStr)(auditLog.createdAt),
        }, 'Stock count reconciled');
    }
    catch (err) {
        next(err);
    }
}
async function getLowStockAlerts(req, res, next) {
    try {
        const shopId = req.shop.id;
        const products = await prisma_js_1.prisma.product.findMany({
            where: {
                shopId,
                deletedAt: null,
                stock: { lte: 5 },
            },
            orderBy: { stock: 'asc' },
        });
        const soldOutItems = [];
        const runningLowItems = [];
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
            }
            else {
                runningLowItems.push(item);
            }
        }
        return (0, response_js_1.sendSuccess)(req, res, {
            soldOutItems,
            runningLowItems,
        });
    }
    catch (err) {
        next(err);
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockInSummary = getStockInSummary;
exports.submitStockIn = submitStockIn;
exports.editPurchaseEntry = editPurchaseEntry;
const prisma_js_1 = require("../lib/prisma.js");
const AppError_js_1 = require("../lib/AppError.js");
const response_js_1 = require("../lib/response.js");
const formatters_js_1 = require("../lib/formatters.js");
async function getStockInSummary(req, res, next) {
    try {
        const shopId = req.shop.id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const [todayPurchases, allPurchases, recentPurchases] = await Promise.all([
            prisma_js_1.prisma.purchaseEntry.findMany({
                where: { shopId, createdAt: { gte: startOfDay, lte: endOfDay } },
            }),
            prisma_js_1.prisma.purchaseEntry.findMany({
                where: { shopId },
                select: { totalCost: true },
            }),
            prisma_js_1.prisma.purchaseEntry.findMany({
                where: { shopId },
                orderBy: { createdAt: 'desc' },
                take: 30,
            }),
        ]);
        const goodsBoughtToday = todayPurchases.reduce((acc, curr) => acc + Number(curr.totalCost), 0);
        const itemsAddedToday = todayPurchases.reduce((acc, curr) => acc + curr.quantityAdded, 0);
        const totalWorthAllGoodsBought = allPurchases.reduce((acc, curr) => acc + Number(curr.totalCost), 0);
        const formattedRecent = recentPurchases.map((p) => ({
            id: p.id,
            productId: p.productId,
            productName: p.productName,
            categoryIcon: p.categoryIcon || '📦',
            quantityAdded: p.quantityAdded,
            unitCost: Number(p.unitCost),
            totalCost: Number(p.totalCost),
            sellingPrice: Number(p.sellingPrice),
            timeLabel: (0, formatters_js_1.formatDateStr)(p.createdAt),
            statusBadge: p.statusBadge || 'Just added',
        }));
        return (0, response_js_1.sendSuccess)(req, res, {
            summary: {
                goodsBoughtToday,
                itemsAddedToday,
                totalWorthAllGoodsBought,
                dateLabel: 'GOODS BOUGHT TODAY',
            },
            recentPurchases: formattedRecent,
        });
    }
    catch (err) {
        next(err);
    }
}
async function submitStockIn(req, res, next) {
    try {
        const shopId = req.shop.id;
        const { productId, name, category = 'General', categoryIcon = '📦', barcode, quantity = 0, totalCost, unitCost, sellingPrice, supplierName, isRestock = false, } = req.body;
        if (!name && !productId) {
            throw AppError_js_1.AppError.badRequest('Product name or ID is required', 'MISSING_PRODUCT_NAME');
        }
        const qty = Number(quantity);
        const uCost = Number(unitCost || (qty > 0 && totalCost ? Number(totalCost) / qty : 0));
        const tCost = Number(totalCost || uCost * qty);
        const sPrice = Number(sellingPrice || 0);
        let product;
        let previousStock = 0;
        if (productId) {
            product = await prisma_js_1.prisma.product.findFirst({
                where: { id: productId, shopId },
            });
            if (!product) {
                throw AppError_js_1.AppError.notFound('Product not found in shop', 'PRODUCT_NOT_FOUND');
            }
            previousStock = product.stock;
            const newStock = previousStock + qty;
            const newStatus = newStock > 5 ? 'good' : newStock >= 1 ? 'low' : 'sold_out';
            product = await prisma_js_1.prisma.product.update({
                where: { id: product.id },
                data: {
                    stock: newStock,
                    costPrice: uCost > 0 ? uCost : product.costPrice,
                    sellingPrice: sPrice > 0 ? sPrice : product.sellingPrice,
                    status: newStatus,
                    name: name || product.name,
                    categoryIcon: categoryIcon || product.categoryIcon,
                },
            });
        }
        else {
            const newStock = qty;
            const status = newStock > 5 ? 'good' : newStock >= 1 ? 'low' : 'sold_out';
            product = await prisma_js_1.prisma.product.create({
                data: {
                    shopId,
                    name,
                    category,
                    categoryIcon,
                    barcode: barcode || null,
                    sku: barcode || null,
                    stock: newStock,
                    costPrice: uCost,
                    sellingPrice: sPrice,
                    status,
                },
            });
        }
        const purchaseEntry = await prisma_js_1.prisma.purchaseEntry.create({
            data: {
                shopId,
                productId: product.id,
                productName: product.name,
                categoryIcon: product.categoryIcon,
                quantityAdded: qty,
                unitCost: uCost,
                totalCost: tCost,
                sellingPrice: sPrice,
                supplierName: supplierName || null,
                timeLabel: 'Just now',
                statusBadge: 'Just added',
            },
        });
        await prisma_js_1.prisma.productAuditLog.create({
            data: {
                productId: product.id,
                previousStock,
                newStock: product.stock,
                difference: qty,
                reason: 'stock_in',
                reasonLabel: isRestock ? 'Stock Restock Intake' : 'New Goods Stock Intake',
                notes: supplierName ? `Purchased from ${supplierName}` : 'Stock-in recorded',
                performedBy: req.user?.phone || req.shop.name,
            },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            product: {
                id: product.id,
                name: product.name,
                category: product.category,
                categoryIcon: product.categoryIcon,
                stock: product.stock,
                costPrice: Number(product.costPrice),
                sellingPrice: Number(product.sellingPrice),
                status: product.status,
            },
            purchaseEntry: {
                id: purchaseEntry.id,
                quantityAdded: purchaseEntry.quantityAdded,
                unitCost: Number(purchaseEntry.unitCost),
                totalCost: Number(purchaseEntry.totalCost),
                timeLabel: 'Just now',
            },
            previousStock,
            newTotalStock: product.stock,
        }, 'Stock added successfully', 201);
    }
    catch (err) {
        next(err);
    }
}
async function editPurchaseEntry(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop.id;
        const { productName, quantityAdded, unitCost, totalCost, sellingPrice, } = req.body;
        const entry = await prisma_js_1.prisma.purchaseEntry.findFirst({
            where: { id: id, shopId },
            include: { product: true },
        });
        if (!entry) {
            throw AppError_js_1.AppError.notFound('Purchase entry not found', 'ENTRY_NOT_FOUND');
        }
        const newQty = Number(quantityAdded);
        const qtyDiff = newQty - entry.quantityAdded;
        const uCost = Number(unitCost);
        const tCost = Number(totalCost || uCost * newQty);
        const sPrice = Number(sellingPrice || entry.sellingPrice);
        // Reconcile physical product stock
        const updatedStock = entry.product.stock + qtyDiff;
        const newStatus = updatedStock > 5 ? 'good' : updatedStock >= 1 ? 'low' : 'sold_out';
        const [updatedEntry, updatedProduct] = await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.purchaseEntry.update({
                where: { id: entry.id },
                data: {
                    productName: productName || entry.productName,
                    quantityAdded: newQty,
                    unitCost: uCost,
                    totalCost: tCost,
                    sellingPrice: sPrice,
                },
            }),
            prisma_js_1.prisma.product.update({
                where: { id: entry.productId },
                data: {
                    stock: updatedStock,
                    status: newStatus,
                    costPrice: uCost,
                    sellingPrice: sPrice,
                },
            }),
            prisma_js_1.prisma.productAuditLog.create({
                data: {
                    productId: entry.productId,
                    previousStock: entry.product.stock,
                    newStock: updatedStock,
                    difference: qtyDiff,
                    reason: 'entry_correction',
                    reasonLabel: 'Purchase Entry Correction',
                    notes: `Adjusted quantity from ${entry.quantityAdded} to ${newQty}`,
                    performedBy: req.user?.phone || req.shop.name,
                },
            }),
        ]);
        return (0, response_js_1.sendSuccess)(req, res, {
            entryId: updatedEntry.id,
            adjustedQuantity: updatedEntry.quantityAdded,
            adjustedTotalCost: Number(updatedEntry.totalCost),
            currentProductStock: updatedProduct.stock,
        }, 'Stock purchase entry and inventory count adjusted');
    }
    catch (err) {
        next(err);
    }
}

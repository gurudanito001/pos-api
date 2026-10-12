"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = getDashboardSummary;
exports.listSales = listSales;
exports.createSale = createSale;
exports.getSaleById = getSaleById;
exports.processSaleReturn = processSaleReturn;
const prisma_js_1 = require("../lib/prisma.js");
const AppError_js_1 = require("../lib/AppError.js");
const response_js_1 = require("../lib/response.js");
const formatters_js_1 = require("../lib/formatters.js");
async function getDashboardSummary(req, res, next) {
    try {
        const shopId = req.shop.id;
        const dateParam = req.query.date;
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const todaySales = await prisma_js_1.prisma.sale.findMany({
            where: {
                shopId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });
        const todaySalesMade = todaySales.length;
        let todayMoneyCollected = 0;
        let todayProfit = 0;
        let cashRevenue = 0;
        let transferRevenue = 0;
        for (const s of todaySales) {
            const amtPaid = Number(s.amountPaid);
            const profitVal = Number(s.profit);
            const cashVal = Number(s.cashGiven);
            const changeVal = Number(s.change);
            const trfVal = Number(s.transferAmount);
            todayMoneyCollected += amtPaid;
            todayProfit += profitVal;
            if (cashVal > 0) {
                cashRevenue += Math.max(0, cashVal - changeVal);
            }
            if (trfVal > 0) {
                transferRevenue += trfVal;
            }
        }
        // Active customer debts across the entire shop
        const debtSales = await prisma_js_1.prisma.sale.findMany({
            where: {
                shopId,
                amountOwed: { gt: 0 },
            },
            select: {
                amountOwed: true,
            },
        });
        const totalOutstandingDebt = debtSales.reduce((acc, curr) => acc + Number(curr.amountOwed), 0);
        const activeDebtorsCount = debtSales.length;
        return (0, response_js_1.sendSuccess)(req, res, {
            dateLabel: 'TODAY SO FAR',
            todaySalesMade,
            todayMoneyCollected,
            todayProfit,
            customerDebts: {
                totalOutstandingDebt,
                activeDebtorsCount,
            },
            salesSummary: {
                cashRevenue,
                transferRevenue,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function listSales(req, res, next) {
    try {
        const shopId = req.shop.id;
        const { date, page = '1', limit = '20', paymentStatus } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const whereClause = { shopId };
        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            whereClause.createdAt = { gte: startOfDay, lte: endOfDay };
        }
        if (paymentStatus && paymentStatus !== 'all') {
            if (paymentStatus === 'debt') {
                whereClause.amountOwed = { gt: 0 };
            }
            else {
                whereClause.paymentStatus = paymentStatus;
            }
        }
        const [sales, totalRecords] = await Promise.all([
            prisma_js_1.prisma.sale.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: { items: true },
            }),
            prisma_js_1.prisma.sale.count({ where: whereClause }),
        ]);
        const formattedSales = sales.map((sale) => {
            const amt = Number(sale.amount);
            const amtPaid = Number(sale.amountPaid);
            const amtOwed = Number(sale.amountOwed);
            const profit = Number(sale.profit);
            return {
                id: sale.id,
                receiptNumber: sale.receiptNumber,
                time: (0, formatters_js_1.formatTime)(sale.createdAt),
                dateStr: (0, formatters_js_1.formatDateStr)(sale.createdAt),
                createdAt: sale.createdAt.toISOString(),
                amount: amt,
                itemCount: sale.itemCount,
                itemsSummary: sale.itemsSummary || sale.items.map((i) => `${i.name} ×${i.quantity}`).join(', '),
                paymentMethod: sale.paymentMethod,
                profit,
                paymentStatus: sale.paymentStatus,
                isCreditSale: sale.isCreditSale,
                amountPaid: amtPaid,
                amountOwed: amtOwed,
                customerName: sale.customerName || undefined,
                hasDebt: amtOwed > 0,
            };
        });
        const totalPages = Math.ceil(totalRecords / limitNum);
        return (0, response_js_1.sendSuccess)(req, res, {
            sales: formattedSales,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalRecords,
                hasNextPage: pageNum < totalPages,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
async function createSale(req, res, next) {
    try {
        const shopId = req.shop.id;
        const { items = [], itemCount, subtotal, discount, amount, profit, paymentMethod = 'Cash', cashGiven = 0, change = 0, transferAmount = 0, transferReference, isCreditSale = false, amountPaid, amountOwed, customerName, customerPhone, dueDate, debtNotes, } = req.body;
        if (!items || items.length === 0) {
            throw AppError_js_1.AppError.badRequest('At least one item is required to record a sale', 'EMPTY_SALE_ITEMS');
        }
        const receiptNumber = (0, formatters_js_1.generateReceiptNumber)();
        const finalAmount = Number(amount ?? subtotal);
        const calculatedAmountPaid = amountPaid !== undefined ? Number(amountPaid) : isCreditSale ? 0 : finalAmount;
        const calculatedAmountOwed = amountOwed !== undefined ? Number(amountOwed) : Math.max(0, finalAmount - calculatedAmountPaid);
        const hasDebt = calculatedAmountOwed > 0 || isCreditSale;
        let paymentStatus = 'paid';
        if (calculatedAmountOwed > 0) {
            paymentStatus = calculatedAmountPaid > 0 ? 'partial' : 'debt';
        }
        // Build line summary e.g. "Ankara Fabric 6 Yards ×1, Leather Slippers ×1"
        const summaryParts = [];
        for (const item of items) {
            summaryParts.push(`${item.name} ×${item.quantity}`);
            // If item exists in inventory, deduct physical stock
            // Tolerates negative inventory (Nigerian market fluid sales rule)
            if (item.productId) {
                const prod = await prisma_js_1.prisma.product.findUnique({
                    where: { id: item.productId },
                });
                if (prod) {
                    const newStock = prod.stock - item.quantity;
                    const newStatus = newStock > 5 ? 'good' : newStock >= 1 ? 'low' : 'sold_out';
                    await prisma_js_1.prisma.product.update({
                        where: { id: prod.id },
                        data: {
                            stock: newStock,
                            status: newStatus,
                        },
                    });
                }
            }
            else if (item.saveToInventory) {
                // Unlisted item sold on-the-fly with saveToInventory flag
                const initialStock = (item.totalStockInShop || item.quantity) - item.quantity;
                const status = initialStock > 5 ? 'good' : initialStock >= 1 ? 'low' : 'sold_out';
                const createdProd = await prisma_js_1.prisma.product.create({
                    data: {
                        shopId,
                        name: item.name,
                        category: 'General',
                        categoryIcon: item.categoryIcon || '📦',
                        stock: initialStock,
                        costPrice: item.costPrice || 0,
                        sellingPrice: item.salePrice || 0,
                        status,
                    },
                });
                item.productId = createdProd.id;
            }
        }
        const itemsSummary = summaryParts.join(', ');
        const calculatedProfit = Number(profit ?? 0);
        const receiptShareMessage = (0, formatters_js_1.buildReceiptShareMessage)(req.shop.name, req.shop.address, receiptNumber, finalAmount);
        const sale = await prisma_js_1.prisma.sale.create({
            data: {
                shopId,
                receiptNumber,
                itemCount: itemCount || items.reduce((acc, curr) => acc + (curr.quantity || 1), 0),
                itemsSummary,
                subtotal: Number(subtotal || finalAmount),
                discountType: discount?.type,
                discountValue: discount?.value,
                discountAmount: Number(discount?.discountAmount || 0),
                amount: finalAmount,
                profit: calculatedProfit,
                paymentMethod,
                paymentStatus,
                cashGiven: Number(cashGiven),
                change: Number(change),
                transferAmount: Number(transferAmount),
                transferReference: transferReference || null,
                isCreditSale,
                amountPaid: calculatedAmountPaid,
                amountOwed: calculatedAmountOwed,
                hasDebt,
                customerName: customerName || null,
                customerPhone: customerPhone || null,
                dueDate: dueDate || null,
                debtNotes: debtNotes || null,
                receiptShareMessage,
                items: {
                    create: items.map((i) => ({
                        productId: i.productId || null,
                        name: i.name,
                        categoryIcon: i.categoryIcon || '📦',
                        quantity: i.quantity,
                        salePrice: Number(i.salePrice),
                        costPrice: Number(i.costPrice || 0),
                        lineTotal: Number(i.lineTotal || i.salePrice * i.quantity),
                    })),
                },
            },
        });
        // If initial part payment was made on a credit sale, log debt repayment
        if (hasDebt && calculatedAmountPaid > 0) {
            await prisma_js_1.prisma.debtRepayment.create({
                data: {
                    saleId: sale.id,
                    amount: calculatedAmountPaid,
                    method: paymentMethod.includes('Transfer') ? 'Bank Transfer' : 'Cash',
                    note: 'Initial deposit',
                },
            });
        }
        return (0, response_js_1.sendSuccess)(req, res, {
            id: sale.id,
            receiptNumber: sale.receiptNumber,
            amount: finalAmount,
            profit: calculatedProfit,
            paymentMethod,
            paymentStatus,
            createdAt: sale.createdAt.toISOString(),
            time: (0, formatters_js_1.formatTime)(sale.createdAt),
            dateStr: (0, formatters_js_1.formatDateStr)(sale.createdAt),
            receiptShareMessage,
        }, 'Sale recorded successfully', 201);
    }
    catch (err) {
        next(err);
    }
}
async function getSaleById(req, res, next) {
    try {
        const { id } = req.params;
        const shopId = req.shop.id;
        const sale = await prisma_js_1.prisma.sale.findFirst({
            where: { id: id, shopId },
            include: {
                items: true,
                debtRepayments: { orderBy: { createdAt: 'desc' } },
                returns: { include: { items: true } },
            },
        });
        if (!sale) {
            throw AppError_js_1.AppError.notFound('Sale receipt not found', 'SALE_NOT_FOUND');
        }
        const formattedSale = {
            id: sale.id,
            receiptNumber: sale.receiptNumber,
            createdAt: sale.createdAt.toISOString(),
            dateStr: (0, formatters_js_1.formatDateStr)(sale.createdAt),
            time: (0, formatters_js_1.formatTime)(sale.createdAt),
            itemCount: sale.itemCount,
            itemsSummary: sale.itemsSummary,
            subtotal: Number(sale.subtotal),
            discount: Number(sale.discountAmount),
            amount: Number(sale.amount),
            profit: Number(sale.profit),
            paymentMethod: sale.paymentMethod,
            cashGiven: Number(sale.cashGiven),
            transferAmount: Number(sale.transferAmount),
            change: Number(sale.change),
            paymentStatus: sale.paymentStatus,
            isCreditSale: sale.isCreditSale,
            amountPaid: Number(sale.amountPaid),
            amountOwed: Number(sale.amountOwed),
            customerName: sale.customerName,
            customerPhone: sale.customerPhone,
            dueDate: sale.dueDate,
            debtNotes: sale.debtNotes,
            lastReminderSentAt: sale.lastReminderSentAt?.toISOString() || null,
            receiptShareMessage: sale.receiptShareMessage,
            items: sale.items.map((i) => ({
                id: i.id,
                productId: i.productId,
                name: i.name,
                categoryIcon: i.categoryIcon,
                quantity: i.quantity,
                salePrice: Number(i.salePrice),
                costPrice: Number(i.costPrice),
                lineTotal: Number(i.lineTotal),
                quantityRefunded: i.quantityRefunded,
            })),
            paymentHistory: sale.debtRepayments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                method: p.method,
                date: (0, formatters_js_1.formatDateStr)(p.createdAt),
                note: p.note,
            })),
        };
        return (0, response_js_1.sendSuccess)(req, res, { sale: formattedSale });
    }
    catch (err) {
        next(err);
    }
}
async function processSaleReturn(req, res, next) {
    try {
        const { saleId } = req.params;
        const shopId = req.shop.id;
        const { returnedItems = [], totalRefund, returnReason = 'Wrong Size / Fit', restockToInventory = true, } = req.body;
        const sale = await prisma_js_1.prisma.sale.findFirst({
            where: { id: saleId, shopId },
            include: { items: true },
        });
        if (!sale) {
            throw AppError_js_1.AppError.notFound('Sale receipt not found', 'SALE_NOT_FOUND');
        }
        // Validate returned quantities
        for (const item of returnedItems) {
            const soldItem = sale.items.find((i) => i.productId === item.productId || i.name === item.name);
            if (!soldItem) {
                throw AppError_js_1.AppError.unprocessable(`Item ${item.name} not found in this sale`, 'INVALID_RETURNED_ITEM');
            }
            const availableToReturn = soldItem.quantity - soldItem.quantityRefunded;
            if (item.quantity > availableToReturn) {
                throw AppError_js_1.AppError.unprocessable(`Cannot return ${item.quantity} of ${item.name}. Maximum refundable is ${availableToReturn}.`, 'RETURN_QTY_EXCEEDS_SOLD');
            }
        }
        const restockedProducts = [];
        // Process each return item
        for (const item of returnedItems) {
            const soldItem = sale.items.find((i) => i.productId === item.productId || i.name === item.name);
            await prisma_js_1.prisma.saleItem.update({
                where: { id: soldItem.id },
                data: {
                    quantityRefunded: soldItem.quantityRefunded + item.quantity,
                },
            });
            if (restockToInventory && item.productId) {
                const prod = await prisma_js_1.prisma.product.findUnique({ where: { id: item.productId } });
                if (prod) {
                    const updatedStock = prod.stock + item.quantity;
                    const status = updatedStock > 5 ? 'good' : updatedStock >= 1 ? 'low' : 'sold_out';
                    await prisma_js_1.prisma.product.update({
                        where: { id: prod.id },
                        data: { stock: updatedStock, status },
                    });
                    await prisma_js_1.prisma.productAuditLog.create({
                        data: {
                            productId: prod.id,
                            previousStock: prod.stock,
                            newStock: updatedStock,
                            difference: item.quantity,
                            reason: 'return_restock',
                            reasonLabel: 'Customer Return Restock',
                            notes: `Refund from sale ${sale.receiptNumber}: ${returnReason}`,
                            performedBy: req.user?.phone || 'Shop Owner',
                        },
                    });
                    restockedProducts.push({
                        productId: prod.id,
                        restockedQuantity: item.quantity,
                        newStockCount: updatedStock,
                    });
                }
            }
        }
        const refundAmountNum = Number(totalRefund);
        const adjustedSaleTotal = Math.max(0, Number(sale.amount) - refundAmountNum);
        const now = new Date();
        const timeStr = (0, formatters_js_1.formatTime)(now);
        const refundReceiptMessage = `${req.shop.name}\nReturn Receipt for ${sale.receiptNumber}\nRefund: ₦${refundAmountNum.toLocaleString('en-NG')}\nReason: ${returnReason}\nDate: Today, ${timeStr}`;
        const returnRecord = await prisma_js_1.prisma.saleReturn.create({
            data: {
                saleId: sale.id,
                totalRefund: refundAmountNum,
                returnReason,
                restockToInventory,
                refundReceiptMessage,
                items: {
                    create: returnedItems.map((r) => ({
                        productId: r.productId || null,
                        name: r.name,
                        quantity: r.quantity,
                        refundAmount: Number(r.refundAmount),
                    })),
                },
            },
        });
        await prisma_js_1.prisma.sale.update({
            where: { id: sale.id },
            data: {
                amount: adjustedSaleTotal,
                paymentStatus: adjustedSaleTotal === 0 ? 'returned' : 'partial',
            },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            saleId: sale.id,
            receiptNumber: sale.receiptNumber,
            totalRefund: refundAmountNum,
            adjustedSaleTotal,
            restockedProducts,
            refundReceiptMessage,
        }, 'Return processed and stock updated');
    }
    catch (err) {
        next(err);
    }
}

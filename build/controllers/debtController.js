"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDebtsLedger = getDebtsLedger;
exports.recordDebtRepayment = recordDebtRepayment;
exports.logReminderSent = logReminderSent;
const prisma_js_1 = require("../lib/prisma.js");
const AppError_js_1 = require("../lib/AppError.js");
const response_js_1 = require("../lib/response.js");
const formatters_js_1 = require("../lib/formatters.js");
async function getDebtsLedger(req, res, next) {
    try {
        const shopId = req.shop.id;
        const { search, status = 'outstanding' } = req.query;
        const whereClause = {
            shopId,
        };
        if (status === 'outstanding') {
            whereClause.amountOwed = { gt: 0 };
        }
        else if (status === 'settled') {
            whereClause.hasDebt = true;
            whereClause.amountOwed = { lte: 0 };
        }
        else {
            whereClause.hasDebt = true;
        }
        if (search) {
            const q = String(search).trim();
            whereClause.OR = [
                { customerName: { contains: q, mode: 'insensitive' } },
                { customerPhone: { contains: q, mode: 'insensitive' } },
                { receiptNumber: { contains: q, mode: 'insensitive' } },
            ];
        }
        const salesWithDebts = await prisma_js_1.prisma.sale.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                debtRepayments: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        let totalOutstandingDebt = 0;
        const debtors = salesWithDebts.map((sale) => {
            const owed = Number(sale.amountOwed);
            totalOutstandingDebt += owed;
            return {
                saleId: sale.id,
                receiptNumber: sale.receiptNumber,
                customerName: sale.customerName || 'Unnamed Customer',
                customerPhone: sale.customerPhone || 'N/A',
                itemsSummary: sale.itemsSummary || 'Goods',
                totalBill: Number(sale.amount),
                amountPaid: Number(sale.amountPaid),
                amountOwed: owed,
                dueDate: sale.dueDate || 'Unspecified',
                debtNotes: sale.debtNotes || null,
                createdAt: sale.createdAt.toISOString(),
                paymentHistory: sale.debtRepayments.map((p) => ({
                    id: p.id,
                    amount: Number(p.amount),
                    method: p.method,
                    date: (0, formatters_js_1.formatDateStr)(p.createdAt),
                    note: p.note || '',
                })),
            };
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            totalOutstandingDebt,
            debtorsCount: debtors.length,
            debtors,
        });
    }
    catch (err) {
        next(err);
    }
}
async function recordDebtRepayment(req, res, next) {
    try {
        const { saleId } = req.params;
        const shopId = req.shop.id;
        const { repaymentAmount, method = 'Cash', note } = req.body;
        if (!repaymentAmount || Number(repaymentAmount) <= 0) {
            throw AppError_js_1.AppError.badRequest('A valid positive repayment amount is required', 'INVALID_REPAYMENT_AMOUNT');
        }
        const amountNum = Number(repaymentAmount);
        const sale = await prisma_js_1.prisma.sale.findFirst({
            where: { id: saleId, shopId },
        });
        if (!sale) {
            throw AppError_js_1.AppError.notFound('Credit sale record not found', 'DEBT_RECORD_NOT_FOUND');
        }
        const previousOwed = Number(sale.amountOwed);
        if (previousOwed <= 0) {
            throw AppError_js_1.AppError.conflict('This debt has already been fully settled', 'DEBT_ALREADY_SETTLED');
        }
        if (amountNum > previousOwed) {
            throw AppError_js_1.AppError.unprocessable(`Repayment amount (₦${amountNum.toLocaleString('en-NG')}) exceeds outstanding balance (₦${previousOwed.toLocaleString('en-NG')})`, 'REPAYMENT_EXCEEDS_DEBT');
        }
        const remainingDebt = previousOwed - amountNum;
        const newAmountPaid = Number(sale.amountPaid) + amountNum;
        const newPaymentStatus = remainingDebt === 0 ? 'paid' : 'partial';
        const [updatedSale, paymentRecord] = await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.sale.update({
                where: { id: sale.id },
                data: {
                    amountPaid: newAmountPaid,
                    amountOwed: remainingDebt,
                    paymentStatus: newPaymentStatus,
                    hasDebt: remainingDebt > 0,
                },
            }),
            prisma_js_1.prisma.debtRepayment.create({
                data: {
                    saleId: sale.id,
                    amount: amountNum,
                    method,
                    note: note || null,
                },
            }),
        ]);
        return (0, response_js_1.sendSuccess)(req, res, {
            saleId: updatedSale.id,
            receiptNumber: updatedSale.receiptNumber,
            customerName: updatedSale.customerName,
            repaymentAmount: amountNum,
            previousOwed,
            remainingDebt,
            newPaymentStatus,
            paymentRecord: {
                id: paymentRecord.id,
                amount: amountNum,
                method: paymentRecord.method,
                date: (0, formatters_js_1.formatDateStr)(paymentRecord.createdAt),
                note: paymentRecord.note || '',
            },
        }, 'Repayment recorded successfully');
    }
    catch (err) {
        next(err);
    }
}
async function logReminderSent(req, res, next) {
    try {
        const { saleId } = req.params;
        const shopId = req.shop.id;
        const { channel = 'whatsapp' } = req.body;
        const sale = await prisma_js_1.prisma.sale.findFirst({
            where: { id: saleId, shopId },
        });
        if (!sale) {
            throw AppError_js_1.AppError.notFound('Credit sale record not found', 'DEBT_RECORD_NOT_FOUND');
        }
        const now = new Date();
        await prisma_js_1.prisma.sale.update({
            where: { id: sale.id },
            data: { lastReminderSentAt: now },
        });
        return (0, response_js_1.sendSuccess)(req, res, {
            lastReminderSentAt: now.toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
}

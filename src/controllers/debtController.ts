import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { sendSuccess } from '../lib/response.js';
import { formatDateStr } from '../lib/formatters.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function getDebtsLedger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;
    const { search, status = 'outstanding' } = req.query;

    const whereClause: any = {
      shopId,
    };

    if (status === 'outstanding') {
      whereClause.amountOwed = { gt: 0 };
    } else if (status === 'settled') {
      whereClause.hasDebt = true;
      whereClause.amountOwed = { lte: 0 };
    } else {
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

    const salesWithDebts = await prisma.sale.findMany({
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
          date: formatDateStr(p.createdAt),
          note: p.note || '',
        })),
      };
    });

    return sendSuccess(req, res, {
      totalOutstandingDebt,
      debtorsCount: debtors.length,
      debtors,
    });
  } catch (err) {
    next(err);
  }
}

export async function recordDebtRepayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { saleId } = req.params;
    const shopId = req.shop!.id;
    const { repaymentAmount, method = 'Cash', note } = req.body;

    if (!repaymentAmount || Number(repaymentAmount) <= 0) {
      throw AppError.badRequest('A valid positive repayment amount is required', 'INVALID_REPAYMENT_AMOUNT');
    }

    const amountNum = Number(repaymentAmount);

    const sale = await prisma.sale.findFirst({
      where: { id: saleId as string, shopId },
    });

    if (!sale) {
      throw AppError.notFound('Credit sale record not found', 'DEBT_RECORD_NOT_FOUND');
    }

    const previousOwed = Number(sale.amountOwed);

    if (previousOwed <= 0) {
      throw AppError.conflict('This debt has already been fully settled', 'DEBT_ALREADY_SETTLED');
    }

    if (amountNum > previousOwed) {
      throw AppError.unprocessable(
        `Repayment amount (₦${amountNum.toLocaleString('en-NG')}) exceeds outstanding balance (₦${previousOwed.toLocaleString('en-NG')})`,
        'REPAYMENT_EXCEEDS_DEBT',
      );
    }

    const remainingDebt = previousOwed - amountNum;
    const newAmountPaid = Number(sale.amountPaid) + amountNum;
    const newPaymentStatus = remainingDebt === 0 ? 'paid' : 'partial';

    const [updatedSale, paymentRecord] = await prisma.$transaction([
      prisma.sale.update({
        where: { id: sale.id },
        data: {
          amountPaid: newAmountPaid,
          amountOwed: remainingDebt,
          paymentStatus: newPaymentStatus,
          hasDebt: remainingDebt > 0,
        },
      }),
      prisma.debtRepayment.create({
        data: {
          saleId: sale.id,
          amount: amountNum,
          method,
          note: note || null,
        },
      }),
    ]);

    return sendSuccess(
      req,
      res,
      {
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
          date: formatDateStr(paymentRecord.createdAt),
          note: paymentRecord.note || '',
        },
      },
      'Repayment recorded successfully',
    );
  } catch (err) {
    next(err);
  }
}

export async function logReminderSent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { saleId } = req.params;
    const shopId = req.shop!.id;
    const { channel = 'whatsapp' } = req.body;

    const sale = await prisma.sale.findFirst({
      where: { id: saleId as string, shopId },
    });

    if (!sale) {
      throw AppError.notFound('Credit sale record not found', 'DEBT_RECORD_NOT_FOUND');
    }

    const now = new Date();
    await prisma.sale.update({
      where: { id: sale.id },
      data: { lastReminderSentAt: now },
    });

    return sendSuccess(req, res, {
      lastReminderSentAt: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';
import { generateReceiptNumber, buildReceiptShareMessage } from '../lib/formatters.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export async function processBatchSync(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const shopId = req.shop!.id;
    const { lastSyncedTimestamp, mutations = [] } = req.body;

    const processedMutations: Array<{ mutationId: string; status: string; serverEntityId: string }> = [];
    const conflicts: any[] = [];

    for (const mut of mutations) {
      const { mutationId, type, payload } = mut;

      // 1. Check idempotency for this mutation
      const existing = await prisma.processedMutation.findUnique({
        where: { mutationId },
      });

      if (existing) {
        processedMutations.push({
          mutationId,
          status: 'applied',
          serverEntityId: existing.serverEntityId,
        });
        continue;
      }

      let serverEntityId = `ent_${mutationId}`;

      try {
        if (type === 'CREATE_SALE') {
          const items = payload.items || [];
          const receiptNumber = generateReceiptNumber();
          const finalAmount = Number(payload.amount ?? payload.subtotal ?? 0);
          const amtPaid = payload.amountPaid !== undefined ? Number(payload.amountPaid) : payload.isCreditSale ? 0 : finalAmount;
          const amtOwed = payload.amountOwed !== undefined ? Number(payload.amountOwed) : Math.max(0, finalAmount - amtPaid);
          const hasDebt = amtOwed > 0 || Boolean(payload.isCreditSale);

          let paymentStatus = 'paid';
          if (amtOwed > 0) {
            paymentStatus = amtPaid > 0 ? 'partial' : 'debt';
          }

          // Deduct stocks
          for (const item of items) {
            if (item.productId) {
              const prod = await prisma.product.findUnique({ where: { id: item.productId } });
              if (prod) {
                const newStock = prod.stock - item.quantity;
                const status = newStock > 5 ? 'good' : newStock >= 1 ? 'low' : 'sold_out';
                await prisma.product.update({
                  where: { id: prod.id },
                  data: { stock: newStock, status },
                });
              }
            }
          }

          const receiptShareMessage = buildReceiptShareMessage(
            req.shop!.name,
            req.shop!.address,
            receiptNumber,
            finalAmount,
          );

          const sale = await prisma.sale.create({
            data: {
              shopId,
              receiptNumber,
              itemCount: payload.itemCount || items.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0),
              itemsSummary: items.map((i: any) => `${i.name} ×${i.quantity}`).join(', '),
              subtotal: Number(payload.subtotal || finalAmount),
              discountType: payload.discount?.type,
              discountValue: payload.discount?.value,
              discountAmount: Number(payload.discount?.discountAmount || 0),
              amount: finalAmount,
              profit: Number(payload.profit || 0),
              paymentMethod: payload.paymentMethod || 'Cash',
              paymentStatus,
              cashGiven: Number(payload.cashGiven || 0),
              change: Number(payload.change || 0),
              transferAmount: Number(payload.transferAmount || 0),
              transferReference: payload.transferReference || null,
              isCreditSale: Boolean(payload.isCreditSale),
              amountPaid: amtPaid,
              amountOwed: amtOwed,
              hasDebt,
              customerName: payload.customerName || null,
              customerPhone: payload.customerPhone || null,
              dueDate: payload.dueDate || null,
              debtNotes: payload.debtNotes || null,
              receiptShareMessage,
              createdOffline: true,
              createdAt: mut.createdAt ? new Date(mut.createdAt) : new Date(),
              items: {
                create: items.map((i: any) => ({
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

          if (hasDebt && amtPaid > 0) {
            await prisma.debtRepayment.create({
              data: {
                saleId: sale.id,
                amount: amtPaid,
                method: 'Cash',
                note: 'Initial offline deposit',
              },
            });
          }

          serverEntityId = sale.id;
        } else if (type === 'STOCK_IN') {
          const qty = Number(payload.quantity || 0);
          const uCost = Number(payload.unitCost || 0);
          const tCost = Number(payload.totalCost || uCost * qty);
          const sPrice = Number(payload.sellingPrice || 0);

          let prodId = payload.productId;
          if (prodId) {
            const existingProd = await prisma.product.findUnique({ where: { id: prodId } });
            if (existingProd) {
              const newStock = existingProd.stock + qty;
              await prisma.product.update({
                where: { id: existingProd.id },
                data: {
                  stock: newStock,
                  costPrice: uCost > 0 ? uCost : existingProd.costPrice,
                  sellingPrice: sPrice > 0 ? sPrice : existingProd.sellingPrice,
                  status: newStock > 5 ? 'good' : newStock >= 1 ? 'low' : 'sold_out',
                },
              });
            }
          } else {
            const created = await prisma.product.create({
              data: {
                shopId,
                name: payload.name || 'Stock In Item',
                category: payload.category || 'General',
                categoryIcon: payload.categoryIcon || '📦',
                stock: qty,
                costPrice: uCost,
                sellingPrice: sPrice,
                status: qty > 5 ? 'good' : 'low',
              },
            });
            prodId = created.id;
          }

          const entry = await prisma.purchaseEntry.create({
            data: {
              shopId,
              productId: prodId,
              productName: payload.name || 'Stock In Item',
              categoryIcon: payload.categoryIcon || '📦',
              quantityAdded: qty,
              unitCost: uCost,
              totalCost: tCost,
              sellingPrice: sPrice,
              supplierName: payload.supplierName || null,
              timeLabel: 'Offline sync',
              statusBadge: 'Just added',
              createdAt: mut.createdAt ? new Date(mut.createdAt) : new Date(),
            },
          });

          serverEntityId = entry.id;
        } else if (type === 'RECORD_DEBT_REPAYMENT') {
          const { saleId, repaymentAmount, method = 'Cash', note } = payload;
          const targetSale = await prisma.sale.findUnique({ where: { id: saleId } });

          if (targetSale) {
            const amtNum = Number(repaymentAmount);
            const remaining = Math.max(0, Number(targetSale.amountOwed) - amtNum);
            const newPaid = Number(targetSale.amountPaid) + amtNum;

            await prisma.sale.update({
              where: { id: targetSale.id },
              data: {
                amountPaid: newPaid,
                amountOwed: remaining,
                paymentStatus: remaining === 0 ? 'paid' : 'partial',
                hasDebt: remaining > 0,
              },
            });

            const repayment = await prisma.debtRepayment.create({
              data: {
                saleId: targetSale.id,
                amount: amtNum,
                method,
                note: note || 'Offline repayment',
                createdAt: mut.createdAt ? new Date(mut.createdAt) : new Date(),
              },
            });

            serverEntityId = repayment.id;
          }
        }

        await prisma.processedMutation.create({
          data: {
            shopId,
            mutationId,
            type,
            serverEntityId,
            status: 'applied',
          },
        });

        processedMutations.push({
          mutationId,
          status: 'applied',
          serverEntityId,
        });
      } catch (mutationErr: any) {
        console.error(`Error applying offline mutation ${mutationId}:`, mutationErr);
        conflicts.push({
          mutationId,
          type,
          error: mutationErr.message,
        });
      }
    }

    // Delta updates since last synced timestamp
    const sinceDate = lastSyncedTimestamp ? new Date(lastSyncedTimestamp) : new Date(0);

    const [updatedProducts, updatedSales] = await Promise.all([
      prisma.product.findMany({
        where: { shopId, updatedAt: { gte: sinceDate } },
      }),
      prisma.sale.findMany({
        where: { shopId, updatedAt: { gte: sinceDate } },
        include: { items: true },
      }),
    ]);

    return sendSuccess(req, res, {
      processedMutations,
      conflicts,
      deltaUpdates: {
        updatedProducts,
        updatedSales,
      },
      currentServerTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

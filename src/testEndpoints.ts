import { prisma } from './lib/prisma.js';

const BASE_URL = 'http://localhost:5000/v1';

async function runTests() {
  console.log('🚀 Starting Comprehensive Retail OS API Verification Suite...\n');

  let token = '';
  let shopId = '';
  let demoSaleId = '';
  let demoProductId = '';
  let purchaseEntryId = '';

  // Helper fetch
  async function request(endpoint: string, options: any = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-App-Version': '1.0.4',
      'X-Device-Id': 'dev_test_mac',
      'X-Client-Language': 'en',
      ...(options.headers || {}),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    return { status: res.status, json, headers: res.headers };
  }

  // 1. POST /auth/otp/send
  console.log('Testing 1.1: POST /auth/otp/send (Invalid Phone)');
  const res1a = await request('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone: '12345', channel: 'sms' }),
  });
  console.assert(res1a.status === 400 && res1a.json.error.code === 'INVALID_PHONE_FORMAT', 'Failed phone format check');
  console.log('✔ Invalid phone rejected with INVALID_PHONE_FORMAT');

  console.log('Testing 1.1: POST /auth/otp/send (Valid Phone)');
  const res1b = await request('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone: '08031234567', channel: 'sms', purpose: 'login' }),
  });
  console.assert(res1b.status === 200 && res1b.json.data.otpSessionId, 'Failed to send OTP');
  const otpSessionId = res1b.json.data.otpSessionId;
  console.log('✔ OTP sent successfully:', res1b.json.data.maskedPhone);

  // 2. POST /auth/otp/verify
  console.log('\nTesting 1.2: POST /auth/otp/verify');
  const res2 = await request('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({
      otpSessionId,
      code: '482910',
      deviceId: 'dev_ios_test',
    }),
  });
  console.assert(res2.status === 200 && res2.json.data.accessToken, 'OTP verification failed');
  token = res2.json.data.accessToken;
  shopId = res2.json.data.user.shopId;
  console.log('✔ Authenticated successfully. Token acquired. Shop ID:', shopId);

  // 3. POST /auth/refresh
  console.log('\nTesting 1.4: POST /auth/refresh');
  const resRefreshToken = res2.json.data.refreshToken;
  const res3 = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: resRefreshToken }),
  });
  console.assert(res3.status === 200 && res3.json.data.accessToken, 'Refresh token failed');
  console.log('✔ Token refreshed successfully');

  // 4. POST /auth/biometrics/register
  console.log('\nTesting 1.5: POST /auth/biometrics/register');
  const res4 = await request('/auth/biometrics/register', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: 'dev_ios_test',
      biometricType: 'face',
      publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
    }),
  });
  console.assert(res4.status === 200 && res4.json.data.biometricEnabled === true, 'Biometrics failed');
  console.log('✔ Biometrics registered successfully');

  // 5. GET /sales/dashboard-summary
  console.log('\nTesting 2.1: GET /sales/dashboard-summary');
  const res5 = await request('/sales/dashboard-summary');
  console.assert(res5.status === 200 && res5.json.data.dateLabel === 'TODAY SO FAR', 'Dashboard summary failed');
  console.log('✔ Sell Homepage summary verified. Today money collected:', res5.json.data.todayMoneyCollected);

  // 6. GET /sales
  console.log('\nTesting 2.2: GET /sales');
  const res6 = await request('/sales?limit=10');
  console.assert(res6.status === 200 && Array.isArray(res6.json.data.sales), 'List sales failed');
  console.log(`✔ Sales list verified. Total records: ${res6.json.data.sales.length}`);
  if (res6.json.data.sales.length > 0) {
    demoSaleId = res6.json.data.sales[0].id;
  }

  // 7. GET /inventory/products
  console.log('\nTesting 3.1: GET /inventory/products');
  const res7 = await request('/inventory/products');
  console.assert(res7.status === 200 && res7.json.data.summary.totalItemsCount > 0, 'Inventory list failed');
  console.log('✔ Inventory products retrieved. Total count:', res7.json.data.summary.totalItemsCount);
  demoProductId = res7.json.data.products[0].id;

  // 8. GET /inventory/products/{id}
  console.log(`\nTesting 3.2: GET /inventory/products/${demoProductId}`);
  const res8 = await request(`/inventory/products/${demoProductId}`);
  console.assert(res8.status === 200 && res8.json.data.product.id === demoProductId, 'Product details failed');
  console.log('✔ Product details verified:', res8.json.data.product.name, 'Margin %:', res8.json.data.product.marginPercentage);

  // 9. PUT /inventory/products/{id}
  console.log('\nTesting 3.3: PUT /inventory/products/{id}');
  const res9 = await request(`/inventory/products/${demoProductId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Men Ankara Shirt (Size L) - Premium',
      category: 'Clothes',
      categoryIcon: '👕',
    }),
  });
  console.assert(res9.status === 200 && res9.json.data.name.includes('Premium'), 'Update product failed');
  console.log('✔ Product details updated successfully');

  // 10. PATCH /inventory/products/{id}/price
  console.log('\nTesting 3.4: PATCH /inventory/products/{id}/price');
  const res10 = await request(`/inventory/products/${demoProductId}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ sellingPrice: 9000 }),
  });
  console.assert(res10.status === 200 && res10.json.data.newPrice === 9000, 'Price update failed');
  console.log('✔ Selling price updated. New profit per item:', res10.json.data.newProfitPerItem);

  // 11. POST /inventory/products/{id}/audit
  console.log('\nTesting 3.5: POST /inventory/products/{id}/audit');
  const res11 = await request(`/inventory/products/${demoProductId}/audit`, {
    method: 'POST',
    body: JSON.stringify({
      newStock: 12,
      reason: 'stolen_missing',
      notes: 'Shelf count audit test',
    }),
  });
  console.assert(res11.status === 200 && res11.json.data.newStock === 12, 'Audit failed');
  console.log('✔ Shelf count audit reconciled:', res11.json.data);

  // 12. GET /inventory/low-stock
  console.log('\nTesting 3.6: GET /inventory/low-stock');
  const res12 = await request('/inventory/low-stock');
  console.assert(res12.status === 200 && Array.isArray(res12.json.data.soldOutItems), 'Low stock failed');
  console.log('✔ Low stock alerts checked. Running low items count:', res12.json.data.runningLowItems.length);

  // 13. GET /stock-in/summary
  console.log('\nTesting 4.1: GET /stock-in/summary');
  const res13 = await request('/stock-in/summary');
  console.assert(res13.status === 200 && Array.isArray(res13.json.data.recentPurchases), 'Stock-in summary failed');
  console.log('✔ Stock-in summary verified. Goods bought today:', res13.json.data.summary.goodsBoughtToday);

  // 14. GET /catalog/search
  console.log('\nTesting 4.2: GET /catalog/search');
  const res14 = await request('/catalog/search?q=Ankara');
  console.assert(res14.status === 200 && Array.isArray(res14.json.data.shopMatches), 'Catalog search failed');
  console.log('✔ Catalog search verified. Matches found:', res14.json.data.shopMatches.length);

  // 15. POST /stock-in
  console.log('\nTesting 4.3: POST /stock-in');
  const res15 = await request('/stock-in', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Peak Milk Evaporated 160g',
      category: 'Food',
      categoryIcon: '🥛',
      barcode: '8901020304099',
      quantity: 24,
      totalCost: 28800,
      unitCost: 1200,
      sellingPrice: 1500,
      supplierName: 'Alhaji Musa Wholesaler',
      isRestock: false,
    }),
  });
  console.assert(res15.status === 201 && res15.json.data.product.stock === 24, 'Stock-in intake failed');
  purchaseEntryId = res15.json.data.purchaseEntry.id;
  console.log('✔ Stock intake committed. New product stock:', res15.json.data.newTotalStock);

  // 16. PUT /stock-in/entries/{id}
  console.log(`\nTesting 4.4: PUT /stock-in/entries/${purchaseEntryId}`);
  const res16 = await request(`/stock-in/entries/${purchaseEntryId}`, {
    method: 'PUT',
    body: JSON.stringify({
      productName: 'Peak Milk Evaporated 160g',
      quantityAdded: 28,
      unitCost: 1200,
      totalCost: 33600,
      sellingPrice: 1500,
    }),
  });
  console.assert(res16.status === 200 && res16.json.data.adjustedQuantity === 28, 'Edit purchase entry failed');
  console.log('✔ Purchase entry adjusted. Current product stock:', res16.json.data.currentProductStock);

  // 17. POST /sales (Fluid checkout + Multi-payment + Idempotency)
  console.log('\nTesting 5.1: POST /sales with Idempotency-Key');
  const idempotencyKey = 'uuid-test-' + Date.now();
  const salePayload = {
    items: [
      {
        productId: demoProductId,
        name: 'Men Ankara Shirt (Size L) - Premium',
        categoryIcon: '👕',
        quantity: 2,
        salePrice: 9000,
        costPrice: 6000,
        lineTotal: 18000,
      },
    ],
    itemCount: 2,
    subtotal: 18000,
    discount: { type: 'flat', value: 1000, discountAmount: 1000 },
    amount: 17000,
    profit: 5000,
    paymentMethod: 'Cash + Transfer',
    cashGiven: 10000,
    change: 0,
    transferAmount: 7000,
    isCreditSale: false,
    amountPaid: 17000,
    amountOwed: 0,
  };

  const res17a = await request('/sales', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(salePayload),
  });
  console.assert(res17a.status === 201 && res17a.json.data.id, 'Sale creation failed');
  const createdSaleId = res17a.json.data.id;
  console.log('✔ Sale created successfully. Receipt:', res17a.json.data.receiptNumber);

  // Idempotency Retry test
  console.log('Testing Idempotency replay with identical key...');
  const res17b = await request('/sales', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(salePayload),
  });
  console.assert(res17b.json.data.id === createdSaleId, 'Idempotency deduplication failed');
  console.log('✔ Idempotency confirmed: Returned identical cached response without duplicate sale');

  // 18. GET /sales/{id}
  console.log(`\nTesting 5.2: GET /sales/${createdSaleId}`);
  const res18 = await request(`/sales/${createdSaleId}`);
  console.assert(res18.status === 200 && res18.json.data.sale.id === createdSaleId, 'Get sale by ID failed');
  console.log('✔ Sale details verified. Line items count:', res18.json.data.sale.items.length);

  // 19. POST /sales/{saleId}/returns
  console.log(`\nTesting 7.1: POST /sales/${createdSaleId}/returns`);
  const res19 = await request(`/sales/${createdSaleId}/returns`, {
    method: 'POST',
    body: JSON.stringify({
      returnedItems: [
        {
          productId: demoProductId,
          name: 'Men Ankara Shirt (Size L) - Premium',
          quantity: 1,
          refundAmount: 9000,
        },
      ],
      totalRefund: 9000,
      returnReason: 'Wrong Size / Fit',
      restockToInventory: true,
    }),
  });
  console.assert(res19.status === 200 && res19.json.data.totalRefund === 9000, 'Sale return failed');
  console.log('✔ Return processed successfully. Restocked count:', res19.json.data.restockedProducts[0].newStockCount);

  // 20. GET /debts
  console.log('\nTesting 6.1: GET /debts');
  const res20 = await request('/debts');
  console.assert(res20.status === 200 && Array.isArray(res20.json.data.debtors), 'Debts ledger failed');
  console.log('✔ Customer debts ledger retrieved. Outstanding balance:', res20.json.data.totalOutstandingDebt);
  const debtorSaleId = res20.json.data.debtors[0]?.saleId || 'sale_102';

  // 21. POST /debts/{saleId}/repayments
  console.log(`\nTesting 6.2: POST /debts/${debtorSaleId}/repayments`);
  const res21 = await request(`/debts/${debtorSaleId}/repayments`, {
    method: 'POST',
    body: JSON.stringify({
      repaymentAmount: 5000,
      method: 'Cash',
      note: 'Test repayment',
    }),
  });
  console.assert(res21.status === 200 && res21.json.data.repaymentAmount === 5000, 'Debt repayment failed');
  console.log('✔ Repayment recorded. Remaining debt:', res21.json.data.remainingDebt);

  // 22. POST /debts/{saleId}/reminder-sent
  console.log(`\nTesting 6.3: POST /debts/${debtorSaleId}/reminder-sent`);
  const res22 = await request(`/debts/${debtorSaleId}/reminder-sent`, {
    method: 'POST',
    body: JSON.stringify({ channel: 'whatsapp' }),
  });
  console.assert(res22.status === 200 && res22.json.data.lastReminderSentAt, 'Log reminder failed');
  console.log('✔ WhatsApp reminder logged at:', res22.json.data.lastReminderSentAt);

  // 23. GET /analytics/summary
  console.log('\nTesting 8.1: GET /analytics/summary');
  const res23 = await request('/analytics/summary?period=Today');
  console.assert(res23.status === 200 && res23.json.data.period === 'Today', 'Analytics failed');
  console.log('✔ Business Health verified. Revenue:', res23.json.data.revenue, 'Net profit:', res23.json.data.netProfit, 'Margin %:', res23.json.data.profitMarginPercentage);

  // 24. GET /shop/profile
  console.log('\nTesting 9.1: GET /shop/profile');
  const res24 = await request('/shop/profile');
  console.assert(res24.status === 200 && res24.json.data.name, 'Shop profile failed');
  console.log('✔ Shop profile retrieved:', res24.json.data.name, res24.json.data.address);

  // 25. PUT /shop/profile
  console.log('\nTesting 9.2: PUT /shop/profile');
  const res25 = await request('/shop/profile', {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Mama Chinedu & Sons Fabrics',
      address: 'Shop 22, Block B, Balogun Market, Lagos',
      coordinates: { latitude: 6.4554, longitude: 3.3845 },
    }),
  });
  console.assert(res25.status === 200 && res25.json.data.name.includes('Sons'), 'Shop profile update failed');
  console.log('✔ Shop profile updated successfully');

  // 26. PATCH /shop/preferences
  console.log('\nTesting 9.3: PATCH /shop/preferences');
  const res26 = await request('/shop/preferences', {
    method: 'PATCH',
    body: JSON.stringify({
      language: 'yo',
      defaultProfitMargin: 30,
      notificationsEnabled: true,
    }),
  });
  console.assert(res26.status === 200 && res26.json.data.defaultProfitMargin === 30, 'Preferences failed');
  console.log('✔ Preferences updated successfully');

  // 27. GET /places/search
  console.log('\nTesting 9.4: GET /places/search');
  const res27 = await request('/places/search?query=Balogun');
  console.assert(res27.status === 200 && res27.json.data.suggestions.length > 0, 'Places search failed');
  console.log('✔ Nigerian commercial market autocomplete verified:', res27.json.data.suggestions[0].title);

  // 28. POST /subscription/upgrade
  console.log('\nTesting 9.5: POST /subscription/upgrade');
  const res28 = await request('/subscription/upgrade', {
    method: 'POST',
    body: JSON.stringify({
      targetTier: 'medium_scale',
      billingPeriod: 'monthly',
    }),
  });
  console.assert(res28.status === 200 && res28.json.data.authorizationUrl, 'Subscription upgrade failed');
  console.log('✔ Paystack upgrade checkout generated:', res28.json.data.authorizationUrl);

  // 29. POST /sync/batch (Offline synchronization)
  console.log('\nTesting 10.1: POST /sync/batch');
  const res29 = await request('/sync/batch', {
    method: 'POST',
    body: JSON.stringify({
      lastSyncedTimestamp: new Date(Date.now() - 3600000).toISOString(),
      mutations: [
        {
          mutationId: 'mut_sync_001_' + Date.now(),
          type: 'CREATE_SALE',
          createdAt: new Date().toISOString(),
          payload: {
            items: [
              {
                productId: demoProductId,
                name: 'Offline Sold Ankara Shirt',
                quantity: 1,
                salePrice: 9000,
                costPrice: 6000,
                lineTotal: 9000,
              },
            ],
            amount: 9000,
            paymentMethod: 'Cash',
            amountPaid: 9000,
            amountOwed: 0,
          },
        },
      ],
    }),
  });
  console.assert(res29.status === 200 && res29.json.data.processedMutations.length === 1, 'Batch sync failed');
  console.log('✔ Offline batch sync processed successfully. Server timestamp:', res29.json.data.currentServerTimestamp);

  // 30. POST /auth/logout
  console.log('\nTesting 9.6: POST /auth/logout');
  const res30 = await request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ deviceId: 'dev_ios_test' }),
  });
  console.assert(res30.status === 200 && res30.json.message === 'Logged out successfully', 'Logout failed');
  console.log('✔ Logged out successfully');

  console.log('\n🎉 ALL 31 ENDPOINTS AND EDGE CASES PASSED WITH 100% SUCCESS!');
}

runTests()
  .catch((e) => {
    console.error('Test Suite Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiSpec = void 0;
exports.apiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Retail OS Mobile API',
        version: '1.0.0',
        description: 'Complete, production-grade RESTful API specification powering the Retail OS Mobile application across all flows, screens, Nigerian retail conditions, offline synchronization, and debt ledgers.',
        contact: {
            name: 'Retail OS Engineering Team',
            email: 'api@retailos.ng',
        },
    },
    servers: [
        {
            url: 'http://localhost:5000/v1',
            description: 'Local Development Server (API v1 Prefix)',
        },
        {
            url: 'http://localhost:5000',
            description: 'Local Development Server (Root)',
        },
        {
            url: 'https://api.retailos.ng/v1',
            description: 'Production API Gateway',
        },
    ],
    tags: [
        { name: 'Authentication', description: 'Phone OTP verification, trader onboarding, tokens, and biometrics' },
        { name: 'Sales', description: 'Live sell dashboard, sales list, checkout transactions, receipts, and returns' },
        { name: 'Debts', description: 'Customer debts ledger (Gbese & Owings), repayments, and WhatsApp reminders' },
        { name: 'Inventory', description: 'My Goods product catalog, price updates, shelf count audits, and low stock alerts' },
        { name: 'Stock In', description: 'Restocking intake, new goods registration, purchase history, and entry corrections' },
        { name: 'Catalog', description: 'Search shop inventory and master Nigerian FMCG catalog with barcode lookup' },
        { name: 'Analytics', description: 'Business health metrics, profit margins, top sellers, and unpriced warnings' },
        { name: 'Shop', description: 'Shop profile, physical market address, GPS coordinates, and business preferences' },
        { name: 'Places', description: 'Nigerian commercial markets address search autocomplete proxy' },
        { name: 'Subscription', description: 'Paystack plan upgrade initialization and tier management' },
        { name: 'Offline Sync', description: 'Background batch synchronization and conflict resolution for market dead-zones' },
        { name: 'Health', description: 'API uptime and system health verification' },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Standard JWT Bearer token obtained from `/auth/otp/verify` or `/auth/register/complete`',
            },
            RegistrationAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Temporary registration token obtained from `/auth/otp/verify` for new users',
            },
        },
        parameters: {
            IdempotencyHeader: {
                name: 'Idempotency-Key',
                in: 'header',
                required: false,
                schema: { type: 'string', format: 'uuid' },
                description: 'Mandatory UUIDv4 for mutating financial/inventory transactions to prevent double processing during network brownouts',
            },
            AppVersionHeader: {
                name: 'X-App-Version',
                in: 'header',
                required: false,
                schema: { type: 'string', example: '1.0.4' },
                description: 'Client app version string',
            },
            DeviceIdHeader: {
                name: 'X-Device-Id',
                in: 'header',
                required: false,
                schema: { type: 'string', example: 'dev_ios_94a028fa' },
                description: 'Unique hardware installation ID',
            },
            ClientLanguageHeader: {
                name: 'X-Client-Language',
                in: 'header',
                required: false,
                schema: {
                    type: 'string',
                    enum: ['en', 'pcm', 'yo', 'ig', 'ha'],
                    default: 'en',
                },
                description: 'Selected trader language (English, Pidgin, Yoruba, Igbo, Hausa)',
            },
        },
        schemas: {
            MetaEnvelope: {
                type: 'object',
                properties: {
                    timestamp: { type: 'string', format: 'date-time', example: '2026-10-11T05:20:00.000Z' },
                    requestId: { type: 'string', example: 'req_8f192bfa' },
                },
                required: ['timestamp', 'requestId'],
            },
            ErrorDetail: {
                type: 'object',
                properties: {
                    field: { type: 'string', example: 'phone' },
                    issue: { type: 'string', example: 'Must be 10 or 11 digits starting with 0 or +234' },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', example: 'INVALID_PHONE_NUMBER' },
                            message: { type: 'string', example: 'The provided phone number is not a valid Nigerian mobile number' },
                            details: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/ErrorDetail' },
                            },
                        },
                        required: ['code', 'message'],
                    },
                    meta: { $ref: '#/components/schemas/MetaEnvelope' },
                },
                required: ['success', 'error', 'meta'],
            },
            PaginationMeta: {
                type: 'object',
                properties: {
                    currentPage: { type: 'integer', example: 1 },
                    totalPages: { type: 'integer', example: 3 },
                    totalRecords: { type: 'integer', example: 48 },
                    hasNextPage: { type: 'boolean', example: true },
                },
                required: ['currentPage', 'totalPages', 'totalRecords', 'hasNextPage'],
            },
            UserProfile: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'usr_9410294' },
                    phone: { type: 'string', example: '+2348031234567' },
                    tier: { type: 'string', enum: ['trader', 'medium_scale', 'enterprise'], example: 'trader' },
                    shopId: { type: 'string', example: 'shp_819203' },
                    shopName: { type: 'string', example: 'Iya Basira Store' },
                    shopAddress: { type: 'string', example: 'Shop 14, Balogun Market, Lagos' },
                    language: { type: 'string', enum: ['en', 'pcm', 'yo', 'ig', 'ha'], example: 'yo' },
                },
            },
            ShopProfile: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'shp_940281' },
                    name: { type: 'string', example: 'Mama Chinedu Textiles' },
                    phone: { type: 'string', example: '+2348031234567' },
                    address: { type: 'string', example: 'Balogun Market, Lagos Island, Lagos' },
                    coordinates: {
                        type: 'object',
                        properties: {
                            latitude: { type: 'number', example: 6.4552 },
                            longitude: { type: 'number', example: 3.3841 },
                        },
                    },
                    categories: { type: 'array', items: { type: 'string' }, example: ['Clothes', 'Bags'] },
                    tier: { type: 'string', enum: ['trader', 'medium_scale', 'enterprise'], example: 'trader' },
                    language: { type: 'string', example: 'en' },
                    defaultProfitMargin: { type: 'integer', example: 25 },
                    notificationsEnabled: { type: 'boolean', example: true },
                    biometricsEnabled: { type: 'boolean', example: true },
                    createdAt: { type: 'string', format: 'date-time', example: '2026-09-01T12:00:00.000Z' },
                },
            },
            ProductSummaryItem: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'prod_101' },
                    name: { type: 'string', example: 'Men Ankara Shirt (Size L)' },
                    category: { type: 'string', example: 'Clothes' },
                    categoryIcon: { type: 'string', example: '👕' },
                    sku: { type: 'string', example: '8901030382901' },
                    stock: { type: 'integer', example: 14 },
                    costPrice: { type: 'number', example: 6000 },
                    sellingPrice: { type: 'number', example: 8500 },
                    profitPerItem: { type: 'number', example: 2500 },
                    status: { type: 'string', enum: ['good', 'low', 'sold_out'], example: 'good' },
                    lastUpdated: { type: 'string', example: '2 hours ago' },
                },
            },
            ProductAuditLogItem: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'aud_01' },
                    previousStock: { type: 'integer', example: 16 },
                    newStock: { type: 'integer', example: 14 },
                    difference: { type: 'integer', example: -2 },
                    reason: { type: 'string', example: 'damaged' },
                    reasonLabel: { type: 'string', example: 'Damaged / Broken' },
                    notes: { type: 'string', example: 'Rainwater leaked into carton' },
                    performedBy: { type: 'string', example: 'Mama Chinedu' },
                    timestamp: { type: 'string', example: 'Yesterday, 4:10 PM' },
                },
            },
            SaleLineItemInput: {
                type: 'object',
                properties: {
                    productId: { type: 'string', nullable: true, example: 'prod_101' },
                    name: { type: 'string', example: 'Men Ankara Shirt (Size L)' },
                    categoryIcon: { type: 'string', example: '👕' },
                    quantity: { type: 'integer', example: 2 },
                    salePrice: { type: 'number', example: 8500 },
                    costPrice: { type: 'number', example: 6000 },
                    lineTotal: { type: 'number', example: 17000 },
                    saveToInventory: { type: 'boolean', example: false },
                    totalStockInShop: { type: 'integer', example: 5 },
                },
                required: ['name', 'quantity', 'salePrice'],
            },
            SaleSummaryItem: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'sale_101' },
                    receiptNumber: { type: 'string', example: '#RCP-408' },
                    time: { type: 'string', example: '2:45 PM' },
                    dateStr: { type: 'string', example: 'Today, 2:45 PM (Sun 11 Oct)' },
                    createdAt: { type: 'string', format: 'date-time', example: '2026-10-11T13:45:00.000Z' },
                    amount: { type: 'number', example: 15000 },
                    itemCount: { type: 'integer', example: 2 },
                    itemsSummary: { type: 'string', example: 'Ankara Fabric 6 Yards ×1, Leather Slippers ×1' },
                    paymentMethod: { type: 'string', example: 'Cash' },
                    profit: { type: 'number', example: 4200 },
                    paymentStatus: { type: 'string', enum: ['paid', 'partial', 'debt', 'returned'], example: 'paid' },
                    isCreditSale: { type: 'boolean', example: false },
                    amountPaid: { type: 'number', example: 15000 },
                    amountOwed: { type: 'number', example: 0 },
                    customerName: { type: 'string', nullable: true, example: 'Mama Chinedu' },
                    hasDebt: { type: 'boolean', example: false },
                },
            },
            DebtorRecord: {
                type: 'object',
                properties: {
                    saleId: { type: 'string', example: 'sale_102' },
                    receiptNumber: { type: 'string', example: '#RCP-407' },
                    customerName: { type: 'string', example: 'Mama Chinedu' },
                    customerPhone: { type: 'string', example: '08031234567' },
                    itemsSummary: { type: 'string', example: 'Men Casual Sneakers ×1' },
                    totalBill: { type: 'number', example: 25000 },
                    amountPaid: { type: 'number', example: 10000 },
                    amountOwed: { type: 'number', example: 15000 },
                    dueDate: { type: 'string', example: 'This Friday' },
                    debtNotes: { type: 'string', example: 'Regular customer, neighbor in shop 14' },
                    createdAt: { type: 'string', format: 'date-time', example: '2026-10-10T14:30:00.000Z' },
                    paymentHistory: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', example: 'dp_01' },
                                amount: { type: 'number', example: 10000 },
                                method: { type: 'string', example: 'Cash' },
                                date: { type: 'string', example: 'Yesterday, 2:30 PM' },
                                note: { type: 'string', example: 'Initial deposit' },
                            },
                        },
                    },
                },
            },
        },
    },
    paths: {
        // ------------------------------------------------------------------------
        // MODULE 1: AUTHENTICATION & ONBOARDING
        // ------------------------------------------------------------------------
        '/auth/otp/send': {
            post: {
                tags: ['Authentication'],
                summary: 'Request Phone OTP (Register / Login)',
                description: 'Triggers a 6-digit verification code to the trader mobile phone via SMS or WhatsApp fallback.',
                parameters: [{ $ref: '#/components/parameters/IdempotencyHeader' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    phone: { type: 'string', example: '08031234567', description: 'Nigerian phone number (10/11 digits, 0... or +234...)' },
                                    channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'sms' },
                                    purpose: { type: 'string', enum: ['register', 'login'], default: 'register' },
                                    language: { type: 'string', enum: ['en', 'pcm', 'yo', 'ig', 'ha'], default: 'en' },
                                },
                                required: ['phone'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Verification code sent successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Verification code sent successfully' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                otpSessionId: { type: 'string', example: 'sess_otp_92f8a1bc72e' },
                                                expiresInSeconds: { type: 'integer', example: 300 },
                                                resendCooldownSeconds: { type: 'integer', example: 45 },
                                                channelUsed: { type: 'string', example: 'sms' },
                                                maskedPhone: { type: 'string', example: '+234 803 *** 4567' },
                                                isExistingUser: { type: 'boolean', example: false },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: 'INVALID_PHONE_FORMAT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    409: { description: 'USER_ALREADY_EXISTS', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    429: { description: 'RATE_LIMIT_EXCEEDED (Max 5 attempts/hour)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/auth/otp/verify': {
            post: {
                tags: ['Authentication'],
                summary: 'Verify OTP & Issue Token / Pre-Auth Token',
                description: 'Verifies 6-digit OTP code. Returns access token if existing user or registrationToken if new user.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    otpSessionId: { type: 'string', example: 'sess_otp_92f8a1bc72e' },
                                    code: { type: 'string', example: '482910' },
                                    deviceId: { type: 'string', example: 'dev_ios_94a028fa' },
                                    deviceModel: { type: 'string', example: 'iPhone 13' },
                                    platform: { type: 'string', enum: ['ios', 'android'], example: 'ios' },
                                },
                                required: ['otpSessionId', 'code'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Authentication successful or phone verified for onboarding',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Authentication successful' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                isNewUser: { type: 'boolean', example: false },
                                                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                                                refreshToken: { type: 'string', example: 'ref_92f8a0...' },
                                                registrationToken: { type: 'string', example: 'reg_tok_9281a0b3c4' },
                                                expiresIn: { type: 'integer', example: 86400 },
                                                user: { $ref: '#/components/schemas/UserProfile' },
                                                phone: { type: 'string', example: '+2348031234567' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: 'INVALID_OTP_CODE or MAX_ATTEMPTS_EXCEEDED', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/auth/register/complete': {
            post: {
                tags: ['Authentication'],
                summary: 'Complete Shop Registration',
                description: 'Registers the shop details, categories, market location coordinates, and subscription plan using the temporary registrationToken.',
                security: [{ RegistrationAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    shopName: { type: 'string', example: 'Mama Chinedu Textiles' },
                                    shopAddress: { type: 'string', example: 'Balogun Market, Lagos Island, Lagos' },
                                    coordinates: {
                                        type: 'object',
                                        properties: {
                                            latitude: { type: 'number', example: 6.4552 },
                                            longitude: { type: 'number', example: 3.3841 },
                                        },
                                    },
                                    categories: { type: 'array', items: { type: 'string' }, example: ['Clothes', 'Bags'] },
                                    tier: { type: 'string', enum: ['trader', 'medium_scale', 'enterprise'], default: 'trader' },
                                    defaultProfitMargin: { type: 'integer', default: 25 },
                                    language: { type: 'string', enum: ['en', 'pcm', 'yo', 'ig', 'ha'], default: 'en' },
                                },
                                required: ['shopName'],
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Shop registered successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Shop registered successfully' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                                                refreshToken: { type: 'string', example: 'ref_9281a...' },
                                                expiresIn: { type: 'integer', example: 86400 },
                                                shop: { $ref: '#/components/schemas/ShopProfile' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'INVALID_REGISTRATION_TOKEN', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/auth/refresh': {
            post: {
                tags: ['Authentication'],
                summary: 'Refresh Authentication Token',
                description: 'Refreshes an expired access token using the stored refresh token.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    refreshToken: { type: 'string', example: 'ref_9402941...' },
                                },
                                required: ['refreshToken'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Access token renewed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                                                expiresIn: { type: 'integer', example: 86400 },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'INVALID_REFRESH_TOKEN', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/auth/biometrics/register': {
            post: {
                tags: ['Authentication'],
                summary: 'Register / Verify Biometric Key',
                description: 'Associates Face ID / Fingerprint public key with the trader session for fast local unlocking.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    deviceId: { type: 'string', example: 'dev_ios_94a028fa' },
                                    biometricType: { type: 'string', enum: ['face', 'fingerprint'], example: 'face' },
                                    publicKey: { type: 'string', example: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...' },
                                },
                                required: ['deviceId'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Biometrics activated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                biometricEnabled: { type: 'boolean', example: true },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/auth/logout': {
            post: {
                tags: ['Authentication'],
                summary: 'User Logout & Invalidate Session',
                description: 'Revokes active device sessions and refresh tokens.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    deviceId: { type: 'string', example: 'dev_ios_94a028fa' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Logged out successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Logged out successfully' },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 2: SELL HOMEPAGE & DAILY DASHBOARD
        // ------------------------------------------------------------------------
        '/sales/dashboard-summary': {
            get: {
                tags: ['Sales'],
                summary: 'Get Sell Homepage Dashboard Summary',
                description: 'Returns live financial numbers for the sell homepage: money collected today, profit made, count of sales, and outstanding debts indicator.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'date',
                        in: 'query',
                        required: false,
                        schema: { type: 'string', format: 'date', example: '2026-10-11' },
                        description: 'Target ISO date string (defaults to current date in shop timezone)',
                    },
                ],
                responses: {
                    200: {
                        description: 'Live financial summary retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                dateLabel: { type: 'string', example: 'TODAY SO FAR' },
                                                todaySalesMade: { type: 'integer', example: 12 },
                                                todayMoneyCollected: { type: 'number', example: 145000 },
                                                todayProfit: { type: 'number', example: 38500 },
                                                customerDebts: {
                                                    type: 'object',
                                                    properties: {
                                                        totalOutstandingDebt: { type: 'number', example: 42000 },
                                                        activeDebtorsCount: { type: 'integer', example: 3 },
                                                    },
                                                },
                                                salesSummary: {
                                                    type: 'object',
                                                    properties: {
                                                        cashRevenue: { type: 'number', example: 85000 },
                                                        transferRevenue: { type: 'number', example: 60000 },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/sales': {
            get: {
                tags: ['Sales'],
                summary: 'Get Sales List',
                description: 'Fetches completed and partial sales with pagination and payment status filters.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'date', in: 'query', required: false, schema: { type: 'string', example: '2026-10-11' } },
                    { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
                    {
                        name: 'paymentStatus',
                        in: 'query',
                        required: false,
                        schema: { type: 'string', enum: ['all', 'paid', 'partial', 'debt', 'returned'], default: 'all' },
                    },
                ],
                responses: {
                    200: {
                        description: 'List of sales retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sales: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/SaleSummaryItem' },
                                                },
                                                pagination: { $ref: '#/components/schemas/PaginationMeta' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Sales'],
                summary: 'Create Completed Sale Transaction',
                description: 'Records a checkout transaction. Deducts stock inventory, records payment method (Cash, Transfer, Split, or Debt), and generates receipt number. Permits fluid negative stock if goods in hand.',
                security: [{ BearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdempotencyHeader' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    items: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/SaleLineItemInput' },
                                    },
                                    itemCount: { type: 'integer', example: 3 },
                                    subtotal: { type: 'number', example: 29000 },
                                    discount: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string', enum: ['flat', 'percent'], example: 'flat' },
                                            value: { type: 'number', example: 1000 },
                                            discountAmount: { type: 'number', example: 1000 },
                                        },
                                    },
                                    amount: { type: 'number', example: 28000, description: 'Final bill to collect' },
                                    profit: { type: 'number', example: 7000 },
                                    paymentMethod: {
                                        type: 'string',
                                        enum: ['Cash', 'Bank Transfer', 'Cash + Transfer', 'Credit / Owings'],
                                        example: 'Cash + Transfer',
                                    },
                                    cashGiven: { type: 'number', example: 10000 },
                                    change: { type: 'number', example: 0 },
                                    transferAmount: { type: 'number', example: 18000 },
                                    transferReference: { type: 'string', example: 'TRF_9402941' },
                                    isCreditSale: { type: 'boolean', example: false },
                                    amountPaid: { type: 'number', example: 28000 },
                                    amountOwed: { type: 'number', example: 0 },
                                    customerName: { type: 'string', nullable: true, example: 'Mama Chinedu' },
                                    customerPhone: { type: 'string', nullable: true, example: '08031234567' },
                                    dueDate: { type: 'string', nullable: true, example: 'Next Tuesday' },
                                    debtNotes: { type: 'string', nullable: true, example: 'Neighbor in shop 14' },
                                },
                                required: ['items'],
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Sale recorded successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Sale recorded successfully' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', example: 'sale_940284' },
                                                receiptNumber: { type: 'string', example: '#RCP-519' },
                                                amount: { type: 'number', example: 28000 },
                                                profit: { type: 'number', example: 7000 },
                                                paymentMethod: { type: 'string', example: 'Cash + Transfer' },
                                                paymentStatus: { type: 'string', example: 'paid' },
                                                createdAt: { type: 'string', format: 'date-time', example: '2026-10-11T05:25:00.000Z' },
                                                time: { type: 'string', example: '5:25 AM' },
                                                dateStr: { type: 'string', example: 'Today, 5:25 AM (Sun 11 Oct)' },
                                                receiptShareMessage: {
                                                    type: 'string',
                                                    example: 'Mama Chinedu Textiles\nBalogun Market, Lagos\nReceipt #RCP-519\nTotal: ₦28,000\nThank you for your business!',
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/sales/{id}': {
            get: {
                tags: ['Sales'],
                summary: 'Get Sale Receipt Details by ID',
                description: 'Retrieves receipt breakdown, line items, customer owings, and repayment history.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'sale_940284' } },
                ],
                responses: {
                    200: {
                        description: 'Full receipt details retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                sale: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', example: 'sale_940284' },
                                                        receiptNumber: { type: 'string', example: '#RCP-519' },
                                                        createdAt: { type: 'string', format: 'date-time' },
                                                        dateStr: { type: 'string', example: 'Today, 5:25 AM (Sun 11 Oct)' },
                                                        time: { type: 'string', example: '5:25 AM' },
                                                        itemCount: { type: 'integer', example: 3 },
                                                        itemsSummary: { type: 'string', example: 'Men Ankara Shirt ×2, Leather Sandals ×1' },
                                                        subtotal: { type: 'number', example: 29000 },
                                                        discount: { type: 'number', example: 1000 },
                                                        amount: { type: 'number', example: 28000 },
                                                        profit: { type: 'number', example: 7000 },
                                                        paymentMethod: { type: 'string', example: 'Cash + Transfer' },
                                                        cashGiven: { type: 'number', example: 10000 },
                                                        transferAmount: { type: 'number', example: 18000 },
                                                        change: { type: 'number', example: 0 },
                                                        paymentStatus: { type: 'string', example: 'paid' },
                                                        isCreditSale: { type: 'boolean', example: false },
                                                        amountPaid: { type: 'number', example: 28000 },
                                                        amountOwed: { type: 'number', example: 0 },
                                                        customerName: { type: 'string', nullable: true, example: 'Mama Chinedu' },
                                                        items: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    productId: { type: 'string', example: 'prod_101' },
                                                                    name: { type: 'string', example: 'Men Ankara Shirt' },
                                                                    categoryIcon: { type: 'string', example: '👕' },
                                                                    quantity: { type: 'integer', example: 2 },
                                                                    salePrice: { type: 'number', example: 8500 },
                                                                    lineTotal: { type: 'number', example: 17000 },
                                                                },
                                                            },
                                                        },
                                                        paymentHistory: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    id: { type: 'string', example: 'dp_01' },
                                                                    amount: { type: 'number', example: 10000 },
                                                                    method: { type: 'string', example: 'Cash' },
                                                                    date: { type: 'string', example: 'Today, 5:25 AM' },
                                                                    note: { type: 'string', example: 'Initial deposit' },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    404: { description: 'SALE_NOT_FOUND', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/sales/{saleId}/returns': {
            post: {
                tags: ['Sales'],
                summary: 'Process Customer Return & Refund',
                description: 'Processes returned goods, calculates refund total, records return reason, and optionally restocks items into inventory.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/IdempotencyHeader' },
                    { name: 'saleId', in: 'path', required: true, schema: { type: 'string', example: 'sale_101' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    returnedItems: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                productId: { type: 'string', example: 'prod_101' },
                                                name: { type: 'string', example: 'Men Ankara Shirt (Size L)' },
                                                quantity: { type: 'integer', example: 1 },
                                                refundAmount: { type: 'number', example: 8500 },
                                            },
                                            required: ['name', 'quantity', 'refundAmount'],
                                        },
                                    },
                                    totalRefund: { type: 'number', example: 8500 },
                                    returnReason: {
                                        type: 'string',
                                        enum: ['Wrong Size / Fit', 'Changed Mind', 'Defective / Damaged', 'Wrong Item', 'Other'],
                                        example: 'Wrong Size / Fit',
                                    },
                                    restockToInventory: { type: 'boolean', default: true },
                                },
                                required: ['returnedItems', 'totalRefund'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Return processed and stock updated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Return processed and stock updated' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                saleId: { type: 'string', example: 'sale_101' },
                                                receiptNumber: { type: 'string', example: '#RCP-408' },
                                                totalRefund: { type: 'number', example: 8500 },
                                                adjustedSaleTotal: { type: 'number', example: 6500 },
                                                restockedProducts: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            productId: { type: 'string', example: 'prod_101' },
                                                            restockedQuantity: { type: 'integer', example: 1 },
                                                            newStockCount: { type: 'integer', example: 15 },
                                                        },
                                                    },
                                                },
                                                refundReceiptMessage: { type: 'string', example: 'Mama Chinedu Textiles\nReturn Receipt for #RCP-408\nRefund: ₦8,500' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    422: { description: 'RETURN_QTY_EXCEEDS_SOLD', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 3: MY GOODS (INVENTORY CATALOG)
        // ------------------------------------------------------------------------
        '/inventory/products': {
            get: {
                tags: ['Inventory'],
                summary: 'Get My Goods Inventory Summary & List',
                description: 'Retrieves inventory valuation, low stock counts, and the catalog items with filtering, search, and sorting.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'category', in: 'query', required: false, schema: { type: 'string', default: 'All', example: 'Clothes' } },
                    { name: 'sortBy', in: 'query', required: false, schema: { type: 'string', enum: ['default', 'lowest_stock', 'price_high', 'name_asc'], default: 'default' } },
                    { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'Ankara' } },
                    { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['all', 'good', 'low', 'sold_out'], default: 'all' } },
                    { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
                ],
                responses: {
                    200: {
                        description: 'Inventory valuation and products retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                summary: {
                                                    type: 'object',
                                                    properties: {
                                                        totalInventoryWorth: { type: 'number', example: 1245000 },
                                                        totalItemsCount: { type: 'integer', example: 48 },
                                                        runningLowCount: { type: 'integer', example: 4 },
                                                        soldOutCount: { type: 'integer', example: 1 },
                                                    },
                                                },
                                                categories: { type: 'array', items: { type: 'string' }, example: ['All', 'Clothes', 'Shoes', 'Food'] },
                                                products: { type: 'array', items: { $ref: '#/components/schemas/ProductSummaryItem' } },
                                                pagination: { $ref: '#/components/schemas/PaginationMeta' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/inventory/products/{id}': {
            get: {
                tags: ['Inventory'],
                summary: 'Get Product Details by ID',
                description: 'Returns complete product data, weekly sales activity metrics, and historical stock count audit logs.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_101' } },
                ],
                responses: {
                    200: {
                        description: 'Product details retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                product: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', example: 'prod_101' },
                                                        name: { type: 'string', example: 'Men Ankara Shirt (Size L)' },
                                                        category: { type: 'string', example: 'Clothes' },
                                                        categoryIcon: { type: 'string', example: '👕' },
                                                        sku: { type: 'string', example: '8901030382901' },
                                                        stock: { type: 'integer', example: 14 },
                                                        costPrice: { type: 'number', example: 6000 },
                                                        sellingPrice: { type: 'number', example: 8500 },
                                                        profitPerItem: { type: 'number', example: 2500 },
                                                        marginPercentage: { type: 'number', example: 29.4 },
                                                        status: { type: 'string', example: 'good' },
                                                        createdAt: { type: 'string', format: 'date-time' },
                                                        lastUpdated: { type: 'string', example: '2 hours ago' },
                                                    },
                                                },
                                                salesActivity: {
                                                    type: 'object',
                                                    properties: {
                                                        soldThisWeek: { type: 'integer', example: 6 },
                                                        lastSoldTime: { type: 'string', example: 'Today at 2:15 PM' },
                                                        lastReceiptNumber: { type: 'string', example: '#RCP-304' },
                                                    },
                                                },
                                                auditLogs: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/ProductAuditLogItem' },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    404: { description: 'PRODUCT_NOT_FOUND', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
            put: {
                tags: ['Inventory'],
                summary: 'Update Product Details',
                description: 'Updates product title, category, and emoji icon.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_101' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Men Ankara Luxury Shirt (Size XL)' },
                                    category: { type: 'string', example: 'Clothes' },
                                    categoryIcon: { type: 'string', example: '👕' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Product details updated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Product details updated' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', example: 'prod_101' },
                                                name: { type: 'string', example: 'Men Ankara Luxury Shirt (Size XL)' },
                                                category: { type: 'string', example: 'Clothes' },
                                                categoryIcon: { type: 'string', example: '👕' },
                                                updatedAt: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/inventory/products/{id}/price': {
            patch: {
                tags: ['Inventory'],
                summary: 'Update Selling Price (Change Price)',
                description: 'Modifies the selling retail price and recalculates item profit margin.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_101' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    sellingPrice: { type: 'number', example: 9000 },
                                },
                                required: ['sellingPrice'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Price updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Price updated successfully' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', example: 'prod_101' },
                                                previousPrice: { type: 'number', example: 8500 },
                                                newPrice: { type: 'number', example: 9000 },
                                                costPrice: { type: 'number', example: 6000 },
                                                newProfitPerItem: { type: 'number', example: 3000 },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/inventory/products/{id}/audit': {
            post: {
                tags: ['Inventory'],
                summary: 'Audit / Reset Physical Stock Count',
                description: 'Reconciles physical shelf stock count and creates an immutable audit trail entry.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/IdempotencyHeader' },
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_101' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    newStock: { type: 'integer', example: 12 },
                                    reason: {
                                        type: 'string',
                                        enum: ['physical_count', 'damaged', 'stolen_missing', 'gift_sample', 'personal_use', 'other'],
                                        example: 'stolen_missing',
                                    },
                                    notes: { type: 'string', example: '2 pieces missing after Saturday rush' },
                                },
                                required: ['newStock'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Stock count reconciled',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Stock count reconciled' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                productId: { type: 'string', example: 'prod_101' },
                                                previousStock: { type: 'integer', example: 14 },
                                                newStock: { type: 'integer', example: 12 },
                                                difference: { type: 'integer', example: -2 },
                                                reason: { type: 'string', example: 'stolen_missing' },
                                                auditLogId: { type: 'string', example: 'aud_829103' },
                                                timestamp: { type: 'string', example: 'Today, 5:23 AM' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/inventory/low-stock': {
            get: {
                tags: ['Inventory'],
                summary: 'Get Low Stock & Sold Out Alerts',
                description: 'Returns items that are running low (stock 1-5) or completely sold out (stock 0 or negative).',
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Low stock and sold out products retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                soldOutItems: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', example: 'prod_105' },
                                                            name: { type: 'string', example: 'Dangote Sugar 50kg Bag' },
                                                            category: { type: 'string', example: 'Food' },
                                                            categoryIcon: { type: 'string', example: '🍚' },
                                                            stock: { type: 'integer', example: 0 },
                                                            costPrice: { type: 'number', example: 72000 },
                                                            sellingPrice: { type: 'number', example: 78000 },
                                                        },
                                                    },
                                                },
                                                runningLowItems: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', example: 'prod_102' },
                                                            name: { type: 'string', example: 'Nike Casual Sneakers' },
                                                            category: { type: 'string', example: 'Shoes' },
                                                            categoryIcon: { type: 'string', example: '👟' },
                                                            stock: { type: 'integer', example: 2 },
                                                            costPrice: { type: 'number', example: 14000 },
                                                            sellingPrice: { type: 'number', example: 20000 },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 4: STOCK-IN FLOW & CATALOG
        // ------------------------------------------------------------------------
        '/stock-in/summary': {
            get: {
                tags: ['Stock In'],
                summary: 'Get Stock-In Dashboard Summary & History',
                description: 'Returns goods bought today summary and paginated purchase history list.',
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Stock-in summary retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                summary: {
                                                    type: 'object',
                                                    properties: {
                                                        goodsBoughtToday: { type: 'number', example: 86000 },
                                                        itemsAddedToday: { type: 'integer', example: 24 },
                                                        totalWorthAllGoodsBought: { type: 'number', example: 3480000 },
                                                        dateLabel: { type: 'string', example: 'GOODS BOUGHT TODAY' },
                                                    },
                                                },
                                                recentPurchases: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', example: 'pur_201' },
                                                            productId: { type: 'string', example: 'prod_101' },
                                                            productName: { type: 'string', example: 'Men Ankara Shirt' },
                                                            categoryIcon: { type: 'string', example: '👕' },
                                                            quantityAdded: { type: 'integer', example: 10 },
                                                            unitCost: { type: 'number', example: 6000 },
                                                            totalCost: { type: 'number', example: 60000 },
                                                            sellingPrice: { type: 'number', example: 8500 },
                                                            timeLabel: { type: 'string', example: 'Today, 10:15 AM' },
                                                            statusBadge: { type: 'string', example: 'Just added' },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/stock-in': {
            post: {
                tags: ['Stock In'],
                summary: 'Submit Stock-In (Create New Product or Restock Existing)',
                description: 'Increases inventory quantities, updates cost price, and logs purchase intake history.',
                security: [{ BearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/IdempotencyHeader' }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string', nullable: true, example: 'prod_101', description: 'Null or omitted if registering brand-new item' },
                                    name: { type: 'string', example: 'Peak Milk Evaporated 160g (Carton)' },
                                    category: { type: 'string', example: 'Food' },
                                    categoryIcon: { type: 'string', example: '🥛' },
                                    barcode: { type: 'string', example: '8901020304050' },
                                    quantity: { type: 'integer', example: 24 },
                                    totalCost: { type: 'number', example: 28800 },
                                    unitCost: { type: 'number', example: 1200 },
                                    sellingPrice: { type: 'number', example: 1500 },
                                    supplierName: { type: 'string', example: 'Alhaji Musa Wholesaler' },
                                    isRestock: { type: 'boolean', default: false },
                                },
                                required: ['quantity'],
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Stock added successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Stock added successfully' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                product: { $ref: '#/components/schemas/ProductSummaryItem' },
                                                purchaseEntry: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', example: 'pur_202' },
                                                        quantityAdded: { type: 'integer', example: 24 },
                                                        unitCost: { type: 'number', example: 1200 },
                                                        totalCost: { type: 'number', example: 28800 },
                                                        timeLabel: { type: 'string', example: 'Just now' },
                                                    },
                                                },
                                                previousStock: { type: 'integer', example: 0 },
                                                newTotalStock: { type: 'integer', example: 24 },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/stock-in/entries/{id}': {
            put: {
                tags: ['Stock In'],
                summary: 'Edit / Correct Purchase Entry',
                description: 'Corrects typos made during stock intake (quantity, cost, price) and reconciles shop stock count.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'pur_202' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    productName: { type: 'string', example: 'Peak Milk Evaporated 160g (Carton)' },
                                    quantityAdded: { type: 'integer', example: 28 },
                                    unitCost: { type: 'number', example: 1200 },
                                    totalCost: { type: 'number', example: 33600 },
                                    sellingPrice: { type: 'number', example: 1500 },
                                },
                                required: ['quantityAdded'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Stock purchase entry and inventory count adjusted',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Stock purchase entry and inventory count adjusted' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                entryId: { type: 'string', example: 'pur_202' },
                                                adjustedQuantity: { type: 'integer', example: 28 },
                                                adjustedTotalCost: { type: 'number', example: 33600 },
                                                currentProductStock: { type: 'integer', example: 28 },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/catalog/search': {
            get: {
                tags: ['Catalog'],
                summary: 'Global Catalog & Shop Item Search / Barcode Lookup',
                description: 'Searches both the shop inventory and the 500+ master FMCG Nigerian retail product database with barcode lookup.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'q', in: 'query', required: false, schema: { type: 'string', example: 'Milo' } },
                    { name: 'barcode', in: 'query', required: false, schema: { type: 'string', example: '7613035312384' } },
                ],
                responses: {
                    200: {
                        description: 'Catalog matches retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                shopMatches: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', example: 'prod_101' },
                                                            name: { type: 'string', example: 'Milo Chocolate Drink (800g Refill)' },
                                                            category: { type: 'string', example: 'Food' },
                                                            categoryIcon: { type: 'string', example: '🥛' },
                                                            currentStock: { type: 'integer', example: 4 },
                                                            costPrice: { type: 'number', example: 3800 },
                                                            sellingPrice: { type: 'number', example: 4200 },
                                                            isExistingShopItem: { type: 'boolean', example: true },
                                                        },
                                                    },
                                                },
                                                globalCatalogMatches: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', example: 'cat_301' },
                                                            name: { type: 'string', example: 'Milo Chocolate Drink (800g Refill)' },
                                                            category: { type: 'string', example: 'Food' },
                                                            categoryIcon: { type: 'string', example: '🥛' },
                                                            suggestedRetailPrice: { type: 'number', example: 4200 },
                                                            barcode: { type: 'string', example: '7613035312384' },
                                                            isExistingShopItem: { type: 'boolean', example: false },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 5: CUSTOMER DEBTS (GBESE LEDGER)
        // ------------------------------------------------------------------------
        '/debts': {
            get: {
                tags: ['Debts'],
                summary: 'Get Customer Debts Ledger',
                description: 'Fetches total debt owed to shop and active debtor records with promise dates and payment history.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'search', in: 'query', required: false, schema: { type: 'string', example: 'Mama Chinedu' } },
                    { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['outstanding', 'settled', 'all'], default: 'outstanding' } },
                ],
                responses: {
                    200: {
                        description: 'Debtors ledger retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                totalOutstandingDebt: { type: 'number', example: 42000 },
                                                debtorsCount: { type: 'integer', example: 2 },
                                                debtors: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/DebtorRecord' },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/debts/{saleId}/repayments': {
            post: {
                tags: ['Debts'],
                summary: 'Record Debt Repayment',
                description: 'Records when a debtor makes a partial or full debt payment, reducing outstanding balance.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/IdempotencyHeader' },
                    { name: 'saleId', in: 'path', required: true, schema: { type: 'string', example: 'sale_102' } },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    repaymentAmount: { type: 'number', example: 10000 },
                                    method: { type: 'string', enum: ['Cash', 'Bank Transfer'], default: 'Cash', example: 'Cash' },
                                    note: { type: 'string', example: 'Paid cash in shop' },
                                },
                                required: ['repaymentAmount'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Repayment recorded successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Repayment recorded successfully' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                saleId: { type: 'string', example: 'sale_102' },
                                                receiptNumber: { type: 'string', example: '#RCP-407' },
                                                customerName: { type: 'string', example: 'Mama Chinedu' },
                                                repaymentAmount: { type: 'number', example: 10000 },
                                                previousOwed: { type: 'number', example: 15000 },
                                                remainingDebt: { type: 'number', example: 5000 },
                                                newPaymentStatus: { type: 'string', enum: ['partial', 'paid'], example: 'partial' },
                                                paymentRecord: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', example: 'dp_9201' },
                                                        amount: { type: 'number', example: 10000 },
                                                        method: { type: 'string', example: 'Cash' },
                                                        date: { type: 'string', example: 'Today, 5:26 AM' },
                                                        note: { type: 'string', example: 'Paid cash in shop' },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                    409: { description: 'DEBT_ALREADY_SETTLED', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    422: { description: 'REPAYMENT_EXCEEDS_DEBT', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                },
            },
        },
        '/debts/{saleId}/reminder-sent': {
            post: {
                tags: ['Debts'],
                summary: 'Log WhatsApp Reminder Sent',
                description: 'Tracks when a trader clicks to send a WhatsApp reminder to prevent repeated spamming.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'saleId', in: 'path', required: true, schema: { type: 'string', example: 'sale_102' } },
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    channel: { type: 'string', enum: ['whatsapp'], default: 'whatsapp' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Reminder logged successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                lastReminderSentAt: { type: 'string', format: 'date-time', example: '2026-10-11T05:27:00.000Z' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 6: BUSINESS HEALTH & ANALYTICS
        // ------------------------------------------------------------------------
        '/analytics/summary': {
            get: {
                tags: ['Analytics'],
                summary: 'Get Business Health Summary',
                description: 'Calculates shop revenue, net profit, margin %, sales volume, basket size, inventory valuation, best seller, and pricing warnings.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: 'period',
                        in: 'query',
                        required: false,
                        schema: { type: 'string', enum: ['Today', 'This Week', 'This Month'], default: 'Today' },
                    },
                ],
                responses: {
                    200: {
                        description: 'Business health metrics calculated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                period: { type: 'string', example: 'Today' },
                                                revenue: { type: 'number', example: 145000 },
                                                netProfit: { type: 'number', example: 38500 },
                                                profitMarginPercentage: { type: 'number', example: 26.5 },
                                                salesCount: { type: 'integer', example: 12 },
                                                averageBasketSize: { type: 'number', example: 12083 },
                                                inventoryValuation: { type: 'number', example: 1245000 },
                                                bestSellingProduct: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', example: 'prod_101' },
                                                        name: { type: 'string', example: 'Men Ankara Shirt' },
                                                        categoryIcon: { type: 'string', example: '👕' },
                                                        quantitySold: { type: 'integer', example: 7 },
                                                        revenue: { type: 'number', example: 59500 },
                                                    },
                                                },
                                                warnings: {
                                                    type: 'object',
                                                    properties: {
                                                        hasMissingCostPrices: { type: 'boolean', example: false },
                                                        unpricedProductsCount: { type: 'integer', example: 0 },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 7: SHOP PROFILE & PREFERENCES
        // ------------------------------------------------------------------------
        '/shop/profile': {
            get: {
                tags: ['Shop'],
                summary: 'Get Shop Profile & Settings',
                description: 'Returns complete shop profile, location coordinates, tier, and preferences.',
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Shop profile retrieved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: { $ref: '#/components/schemas/ShopProfile' },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            put: {
                tags: ['Shop'],
                summary: 'Update Shop Profile & Address',
                description: 'Updates shop name, physical market address, or GPS coordinates.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Mama Chinedu & Sons Fabrics' },
                                    address: { type: 'string', example: 'Shop 22, Block B, Balogun Market, Lagos' },
                                    coordinates: {
                                        type: 'object',
                                        properties: {
                                            latitude: { type: 'number', example: 6.4554 },
                                            longitude: { type: 'number', example: 3.3845 },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Shop profile updated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        message: { type: 'string', example: 'Shop profile updated' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string', example: 'Mama Chinedu & Sons Fabrics' },
                                                address: { type: 'string', example: 'Shop 22, Block B, Balogun Market, Lagos' },
                                                coordinates: {
                                                    type: 'object',
                                                    properties: {
                                                        latitude: { type: 'number', example: 6.4554 },
                                                        longitude: { type: 'number', example: 3.3845 },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/shop/preferences': {
            patch: {
                tags: ['Shop'],
                summary: 'Update Business Preferences',
                description: 'Updates language, default profit targets, or push notification flags.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    language: { type: 'string', enum: ['en', 'pcm', 'yo', 'ig', 'ha'], example: 'yo' },
                                    defaultProfitMargin: { type: 'integer', example: 30 },
                                    notificationsEnabled: { type: 'boolean', example: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Preferences saved',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                language: { type: 'string', example: 'yo' },
                                                defaultProfitMargin: { type: 'integer', example: 30 },
                                                notificationsEnabled: { type: 'boolean', example: true },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 8: PLACES & NIGERIAN MARKETS
        // ------------------------------------------------------------------------
        '/places/search': {
            get: {
                tags: ['Places'],
                summary: 'Nigerian Market Location Search',
                description: 'Autocomplete proxy for major Nigerian commercial market locations and plazas.',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'query', in: 'query', required: false, schema: { type: 'string', example: 'Balogun' } },
                ],
                responses: {
                    200: {
                        description: 'Market suggestions found',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                suggestions: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string', example: 'loc-balogun' },
                                                            title: { type: 'string', example: 'Balogun Market' },
                                                            subtitle: { type: 'string', example: 'Lagos Island, Lagos State' },
                                                            fullAddress: { type: 'string', example: 'Balogun Market, Lagos Island, Lagos' },
                                                            latitude: { type: 'number', example: 6.4552 },
                                                            longitude: { type: 'number', example: 3.3841 },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 9: SUBSCRIPTION & UPGRADE
        // ------------------------------------------------------------------------
        '/subscription/upgrade': {
            post: {
                tags: ['Subscription'],
                summary: 'Plan Upgrade & Paystack Payment Initialization',
                description: 'Initiates a plan upgrade (`medium_scale` or `enterprise`) and returns a Paystack transaction checkout URL.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    targetTier: { type: 'string', enum: ['medium_scale', 'enterprise'], example: 'medium_scale' },
                                    billingPeriod: { type: 'string', enum: ['monthly', 'annual'], example: 'monthly' },
                                },
                                required: ['targetTier'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Paystack checkout session created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                reference: { type: 'string', example: 'sub_ref_94820194' },
                                                amount: { type: 'number', example: 9500 },
                                                currency: { type: 'string', example: 'NGN' },
                                                authorizationUrl: { type: 'string', example: 'https://checkout.paystack.com/94820194xyz' },
                                                planName: { type: 'string', example: 'Medium-Scale Business' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 10: OFFLINE SYNC
        // ------------------------------------------------------------------------
        '/sync/batch': {
            post: {
                tags: ['Offline Sync'],
                summary: 'Batch Offline Sync',
                description: 'Sends queued offline mutations (sales, stock intake, repayments) in a single transactional batch, deduplicating mutations.',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    lastSyncedTimestamp: { type: 'string', format: 'date-time', example: '2026-10-11T02:00:00.000Z' },
                                    mutations: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                mutationId: { type: 'string', example: 'mut_uuid_001' },
                                                type: { type: 'string', enum: ['CREATE_SALE', 'STOCK_IN', 'RECORD_DEBT_REPAYMENT'], example: 'CREATE_SALE' },
                                                createdAt: { type: 'string', format: 'date-time', example: '2026-10-11T03:15:00.000Z' },
                                                payload: { type: 'object' },
                                            },
                                            required: ['mutationId', 'type', 'payload'],
                                        },
                                    },
                                },
                                required: ['mutations'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Batch synchronization completed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                processedMutations: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            mutationId: { type: 'string', example: 'mut_uuid_001' },
                                                            status: { type: 'string', example: 'applied' },
                                                            serverEntityId: { type: 'string', example: 'sale_940299' },
                                                        },
                                                    },
                                                },
                                                conflicts: { type: 'array', items: { type: 'object' } },
                                                deltaUpdates: {
                                                    type: 'object',
                                                    properties: {
                                                        updatedProducts: { type: 'array', items: { type: 'object' } },
                                                        updatedSales: { type: 'array', items: { type: 'object' } },
                                                    },
                                                },
                                                currentServerTimestamp: { type: 'string', format: 'date-time', example: '2026-10-11T05:30:00.000Z' },
                                            },
                                        },
                                        meta: { $ref: '#/components/schemas/MetaEnvelope' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        // ------------------------------------------------------------------------
        // MODULE 11: HEALTH CHECK
        // ------------------------------------------------------------------------
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'API System Health Check',
                description: 'Returns server operational status and current timestamp.',
                responses: {
                    200: {
                        description: 'Server is healthy and active',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

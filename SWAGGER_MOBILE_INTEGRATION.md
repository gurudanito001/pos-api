# Prompt for Mobile / Frontend LLM: OpenAPI & Swagger Integration

> **Instructions for the LLM:**
> You are working on the **Retail OS Mobile** application (React Native / Expo / TypeScript).
> Follow the steps below to integrate the backend OpenAPI / Swagger specification into this mobile codebase, generate end-to-end TypeScript types, and configure a type-safe HTTP client.

---

## 1. Backend API & Specification Endpoints

The backend (`pos_api`) serves the live OpenAPI 3.0 specification at:
- **Production (Render):** `https://<YOUR_BACKEND_RENDER_URL>/docs.json`
- **Local Dev (iOS Simulator):** `http://localhost:5000/docs.json`
- **Local Dev (Android Emulator):** `http://10.0.2.2:5000/docs.json`
- **Interactive UI (Web):** `http://localhost:5000/docs`

---

## 2. Step 1: Install `openapi-typescript`

Run the following command in the root of the mobile project to install the type generator:

```bash
npm install -D openapi-typescript
```

---

## 3. Step 2: Add Generation Script to `package.json`

Add the `api:types` script inside the `"scripts"` section of `package.json`:

```json
{
  "scripts": {
    "api:types": "openapi-typescript http://localhost:5000/docs.json -o src/types/api.d.ts",
    "api:types:prod": "openapi-typescript https://<YOUR_BACKEND_RENDER_URL>/docs.json -o src/types/api.d.ts"
  }
}
```

*(If the local backend server is running on `http://localhost:5000`, run `npm run api:types`. Alternatively, download the JSON using `curl -o swagger.json http://localhost:5000/docs.json` and generate with `npx openapi-typescript swagger.json -o src/types/api.d.ts`)*.

---

## 4. Step 3: Run the Type Generator

Execute the command to generate the complete TypeScript schema definitions:

```bash
npm run api:types
```

This creates `src/types/api.d.ts` containing all backend models, query parameters, request bodies, and response envelopes.

---

## 5. Step 4: Create Reusable Model & Payload Aliases

Create or update `src/types/models.ts` to export convenient aliases from the generated OpenAPI schema:

```typescript
import type { components, paths } from './api';

// ==========================================
// 1. DATA MODELS & ENVELOPES
// ==========================================
export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; issue?: string }>;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
};

// ==========================================
// 2. DOMAIN SCHEMAS
// ==========================================
export type UserProfile = components['schemas']['UserProfile'];
export type ShopProfile = components['schemas']['ShopProfile'];
export type Product = components['schemas']['ProductSummaryItem'];
export type ProductAuditLog = components['schemas']['ProductAuditLogItem'];
export type SaleSummary = components['schemas']['SaleSummaryItem'];
export type Debtor = components['schemas']['DebtorRecord'];
export type PaginationMeta = components['schemas']['PaginationMeta'];

// ==========================================
// 3. REQUEST & RESPONSE TYPES
// ==========================================

// Auth
export type OtpSendInput = paths['/auth/otp/send']['post']['requestBody']['content']['application/json'];
export type OtpSendResponse = paths['/auth/otp/send']['post']['responses']['200']['content']['application/json'];

export type OtpVerifyInput = paths['/auth/otp/verify']['post']['requestBody']['content']['application/json'];
export type OtpVerifyResponse = paths['/auth/otp/verify']['post']['responses']['200']['content']['application/json'];

export type CompleteRegistrationInput = paths['/auth/register/complete']['post']['requestBody']['content']['application/json'];
export type CompleteRegistrationResponse = paths['/auth/register/complete']['post']['responses']['201']['content']['application/json'];

// Sales
export type DashboardSummaryResponse = paths['/sales/dashboard-summary']['get']['responses']['200']['content']['application/json'];
export type CreateSaleInput = paths['/sales']['post']['requestBody']['content']['application/json'];
export type CreateSaleResponse = paths['/sales']['post']['responses']['201']['content']['application/json'];
export type SaleDetailsResponse = paths['/sales/{id}']['get']['responses']['200']['content']['application/json'];
export type ProcessReturnInput = paths['/sales/{saleId}/returns']['post']['requestBody']['content']['application/json'];

// Debts
export type DebtsLedgerResponse = paths['/debts']['get']['responses']['200']['content']['application/json'];
export type RecordRepaymentInput = paths['/debts/{saleId}/repayments']['post']['requestBody']['content']['application/json'];
export type RecordRepaymentResponse = paths['/debts/{saleId}/repayments']['post']['responses']['200']['content']['application/json'];

// Inventory & Catalog
export type InventoryListResponse = paths['/inventory/products']['get']['responses']['200']['content']['application/json'];
export type ProductDetailsResponse = paths['/inventory/products/{id}']['get']['responses']['200']['content']['application/json'];
export type StockAuditInput = paths['/inventory/products/{id}/audit']['post']['requestBody']['content']['application/json'];
export type LowStockAlertsResponse = paths['/inventory/low-stock']['get']['responses']['200']['content']['application/json'];
export type CatalogSearchResponse = paths['/catalog/search']['get']['responses']['200']['content']['application/json'];

// Stock-In
export type StockInSummaryResponse = paths['/stock-in/summary']['get']['responses']['200']['content']['application/json'];
export type StockInInput = paths['/stock-in']['post']['requestBody']['content']['application/json'];

// Analytics
export type BusinessHealthResponse = paths['/analytics/summary']['get']['responses']['200']['content']['application/json'];
```

---

## 6. Step 5: Configure the Axios / Fetch Client

Ensure the mobile app's API client attaches the standard headers (`Idempotency-Key`, `Authorization`, `X-Client-Language`):

```typescript
import axios from 'axios';
import * as Crypto from 'expo-crypto'; // or uuid

// Configure baseURL depending on platform and environment
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Version': '1.0.4',
  },
});

// Interceptor: Attach JWT Token and Idempotency Key for mutations
apiClient.interceptors.request.use(async (config) => {
  // 1. Attach JWT Auth token if available
  const token = await getStoredAuthToken(); // Your SecureStore token getter
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Attach Idempotency-Key on POST/PUT mutations if not already set
  if (config.method === 'post' || config.method === 'put') {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = Crypto.randomUUID();
    }
  }

  return config;
});
```

---

## 7. Step 6: Example API Service Implementation

Use the typed models in your services for compile-time safety:

```typescript
import { apiClient } from './client';
import type {
  CreateSaleInput,
  CreateSaleResponse,
  DashboardSummaryResponse,
  InventoryListResponse,
  DebtsLedgerResponse,
  RecordRepaymentInput,
  RecordRepaymentResponse,
} from '@/types/models';

export const SalesService = {
  async getDashboardSummary(date?: string): Promise<DashboardSummaryResponse['data']> {
    const res = await apiClient.get<DashboardSummaryResponse>('/sales/dashboard-summary', {
      params: { date },
    });
    return res.data.data;
  },

  async createSale(payload: CreateSaleInput): Promise<CreateSaleResponse['data']> {
    const res = await apiClient.post<CreateSaleResponse>('/sales', payload);
    return res.data.data;
  },
};

export const InventoryService = {
  async getProducts(params?: { category?: string; search?: string; status?: string; page?: number }): Promise<InventoryListResponse['data']> {
    const res = await apiClient.get<InventoryListResponse>('/inventory/products', { params });
    return res.data.data;
  },
};

export const DebtsService = {
  async getDebts(status = 'outstanding'): Promise<DebtsLedgerResponse['data']> {
    const res = await apiClient.get<DebtsLedgerResponse>('/debts', { params: { status } });
    return res.data.data;
  },

  async recordRepayment(saleId: string, payload: RecordRepaymentInput): Promise<RecordRepaymentResponse['data']> {
    const res = await apiClient.post<RecordRepaymentResponse>(`/debts/${saleId}/repayments`, payload);
    return res.data.data;
  },
};
```

---

## 8. Summary of Tasks for the LLM

1. [ ] Install `openapi-typescript` as a dev dependency.
2. [ ] Add `"api:types"` script pointing to `/docs.json`.
3. [ ] Generate `src/types/api.d.ts`.
4. [ ] Create `src/types/models.ts` with domain and request/response aliases.
5. [ ] Ensure API requests pass headers: `Authorization`, `Idempotency-Key` (UUIDv4 for sales, payments, audits).
6. [ ] Replace any `any` types in existing screens (`sell.tsx`, `payment.tsx`, `my-goods.tsx`, `debts.tsx`) with the generated types.

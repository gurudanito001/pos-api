import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { getRequestId } from '../lib/response.js';

const ROUTE_SCREEN_MAP: Record<string, string> = {
  'GET /health': 'System -> Connectivity & Health Check',
  'POST /auth/otp/send': 'Auth Screen -> Request OTP Code',
  'POST /auth/otp/verify': 'OTP Verification Screen -> Verify OTP & Login/Register',
  'POST /auth/register/complete': 'Shop Onboarding Screen -> Complete Shop Registration',
  'POST /auth/refresh': 'Background Session -> Refresh Access Token',
  'POST /auth/biometrics/register': 'Security / Biometrics Setup -> Register Device Biometrics',
  'POST /auth/logout': 'Settings / More Screen -> Logout Device Session',
  'GET /sales/dashboard-summary': 'Sell Home Screen -> Today Dashboard Summary',
  'GET /sales': 'Sales History / Sell Screen -> List Sales History',
  'POST /sales': 'Checkout / Sell Screen -> Complete & Record Sale',
  'GET /sales/:id': 'Receipt / Sale Detail Screen -> View Sale Receipt Details',
  'POST /sales/:saleId/returns': 'Sale Return Modal -> Process Customer Return',
  'GET /debts': 'Customer Debts / Credit Book Screen -> List Debtors & Balances',
  'POST /debts/:saleId/repayments': 'Debt Repayment Modal -> Record Customer Debt Repayment',
  'POST /debts/:saleId/reminder-sent': 'Customer Debts Screen -> Log WhatsApp/SMS Reminder Sent',
  'GET /inventory/products': 'Inventory / Stock Screen (or POS Catalog) -> List Shop Products',
  'GET /inventory/products/:id': 'Product Detail Screen -> View Product Details & Stock History',
  'PUT /inventory/products/:id': 'Edit Product Modal -> Update Product Name/Category',
  'PATCH /inventory/products/:id/price': 'Quick Price Update Modal -> Update Product Selling Price',
  'POST /inventory/products/:id/audit': 'Shelf Count / Audit Modal -> Reconcile Physical Stock Count',
  'GET /inventory/low-stock': 'Low Stock Alerts Screen -> List Sold Out & Running Low Items',
  'GET /stock-in/summary': 'Buy / Stock-In Screen -> Recent Purchases & Today Intake Summary',
  'POST /stock-in': 'Add Stock / Buy Screen -> Submit New Stock Intake',
  'PUT /stock-in/entries/:id': 'Edit Purchase Entry Modal -> Adjust Past Stock-In Record',
  'GET /catalog/search': 'Add Stock / Search Bar -> Search Shop & Global Master Catalog',
  'GET /analytics/summary': 'Business Health / Reports Screen -> View Financial & Sales Analytics',
  'GET /shop/profile': 'More / Shop Profile Screen -> View Shop & Merchant Profile',
  'PUT /shop/profile': 'Edit Shop Profile Screen -> Update Shop Name, Address & GPS',
  'PATCH /shop/preferences': 'Settings / Preferences Screen -> Update Language, Margin & Alerts',
  'GET /places/search': 'Shop Address Input -> Search Nigerian Markets & Locations',
  'POST /subscription/upgrade': 'Subscription / Plan Upgrade Screen -> Initialize Paystack Checkout',
  'POST /sync/batch': 'Offline Sync Engine -> Push Queued Mutations & Pull Server Changes',
  'GET /admin/overview': 'Admin Dashboard -> Platform Overview Metrics',
  'GET /admin/activity-feed': 'Admin Dashboard -> Live Platform Activity Feed',
  'GET /admin/otp-sessions': 'Admin Dashboard -> List OTP Sessions',
  'GET /admin/users': 'Admin Dashboard -> List All Users',
  'GET /admin/users/:id': 'Admin Dashboard -> View User Details',
  'GET /admin/shops': 'Admin Dashboard -> List All Shops',
  'GET /admin/shops/:id': 'Admin Dashboard -> View Shop Details',
  'PATCH /admin/shops/:id': 'Admin Dashboard -> Update Shop Tier/Settings',
  'GET /admin/inventory/products': 'Admin Dashboard -> List All Shop Products',
  'GET /admin/inventory/audit-logs': 'Admin Dashboard -> List Stock Audit Logs',
  'GET /admin/stock-in/entries': 'Admin Dashboard -> List Stock-In Entries',
  'GET /admin/sales': 'Admin Dashboard -> List All Sales',
  'GET /admin/sales/:id': 'Admin Dashboard -> View Sale Details',
  'GET /admin/returns': 'Admin Dashboard -> List Customer Returns',
  'GET /admin/debts': 'Admin Dashboard -> List All Customer Debts',
  'GET /admin/debts/repayments': 'Admin Dashboard -> List Debt Repayments',
  'GET /admin/sync/mutations': 'Admin Dashboard -> List Offline Sync Mutations',
  'GET /admin/sync/idempotency-records': 'Admin Dashboard -> List Idempotency Records',
  'GET /admin/catalog': 'Admin Dashboard -> List Global Catalog Products',
  'POST /admin/catalog': 'Admin Dashboard -> Create Global Catalog Product',
  'GET /admin/subscriptions': 'Admin Dashboard -> List Subscription Upgrades',
};

function matchKnownRoutePattern(method: string, cleanPath: string): { pattern: string; extractedParams: Record<string, string> } | null {
  const upperMethod = method.toUpperCase();
  for (const key of Object.keys(ROUTE_SCREEN_MAP)) {
    const [routeMethod, routePattern] = key.split(' ');
    if (routeMethod !== upperMethod || !routePattern) continue;

    const paramNames: string[] = [];
    const regexSource =
      '^' +
      routePattern.replace(/:([a-zA-Z0-9_]+)/g, (_match, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      }) +
      '$';

    const regex = new RegExp(regexSource);
    const match = cleanPath.match(regex);
    if (match) {
      const extractedParams: Record<string, string> = {};
      paramNames.forEach((name, idx) => {
        extractedParams[name] = decodeURIComponent(match[idx + 1] || '');
      });
      return { pattern: routePattern, extractedParams };
    }
  }
  return null;
}

function resolveRouteAndParams(
  req: Request,
  snapshotBaseUrl: string,
  snapshotRoutePath: string,
  snapshotParams: Record<string, any>,
): { pattern: string; params: Record<string, any> } {
  const cleanUrlPath = ((req.originalUrl || req.url).split('?')[0] || '/').replace(/\/+$/, '').replace(/^\/v1(?=\/|$)/, '') || '/';

  // 1. Try using Express baseUrl + route.path when baseUrl was preserved
  const rawBase = (snapshotBaseUrl || req.baseUrl || '').replace(/^\/v1(?=\/|$)/, '');
  const rawRoute = snapshotRoutePath || (req.route?.path ? String(req.route.path) : '');

  if (rawBase && rawRoute) {
    const pattern = `${rawBase}${rawRoute === '/' ? '' : rawRoute}` || '/';
    const params = Object.keys(snapshotParams).length > 0 ? snapshotParams : req.params || {};
    return { pattern, params };
  }

  // 2. Fallback: Match against known route patterns (handles error-handler router unwinding)
  const matched = matchKnownRoutePattern(req.method, cleanUrlPath);
  if (matched) {
    const mergedParams = {
      ...matched.extractedParams,
      ...(Object.keys(snapshotParams).length > 0 ? snapshotParams : req.params || {}),
    };
    return { pattern: matched.pattern, params: mergedParams };
  }

  return {
    pattern: cleanUrlPath,
    params: Object.keys(snapshotParams).length > 0 ? snapshotParams : req.params || {},
  };
}

function resolveScreenContext(req: Request, normalizedPattern: string): string {
  const explicitScreen =
    (req.headers['x-screen-name'] as string) ||
    (req.headers['x-screen'] as string) ||
    (req.headers['x-route-name'] as string);

  const key = `${req.method.toUpperCase()} ${normalizedPattern}`;
  const mappedScreen =
    ROUTE_SCREEN_MAP[key] ||
    (normalizedPattern.startsWith('/admin')
      ? `Admin Dashboard -> ${req.method.toUpperCase()} ${normalizedPattern}`
      : `API Route -> ${key}`);

  if (explicitScreen) {
    return `${explicitScreen} (${mappedScreen})`;
  }
  return mappedScreen;
}

function summarizeData(data: unknown): string {
  if (data === null || data === undefined) return 'null';
  if (Array.isArray(data)) return `Array(${data.length} items)`;
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: Array(${v.length})`;
      if (v !== null && typeof v === 'object') return `${k}: {...}`;
      return `${k}: ${JSON.stringify(v)}`;
    });
    return `{ ${entries.join(', ')} }`;
  }
  return String(data);
}

function formatJsonBlock(value: unknown, indent = 2): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}

export function requestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const startTime = process.hrtime.bigint();
  const startedAt = new Date();
  const requestId = getRequestId(req);

  // Capture response payload & active route context before Express unwinds sub-routers
  let capturedResponseBody: unknown = undefined;
  let snapshotBaseUrl = '';
  let snapshotRoutePath = '';
  let snapshotParams: Record<string, any> = {};

  const captureRouteContext = () => {
    if (req.baseUrl) snapshotBaseUrl = req.baseUrl;
    if (req.route?.path) snapshotRoutePath = String(req.route.path);
    if (req.params && Object.keys(req.params).length > 0) {
      snapshotParams = { ...req.params };
    }
  };

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    captureRouteContext();
    capturedResponseBody = body;
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body?: any) => {
    captureRouteContext();
    if (capturedResponseBody === undefined && body !== undefined) {
      if (typeof body === 'string') {
        try {
          capturedResponseBody = JSON.parse(body);
        } catch {
          capturedResponseBody = body;
        }
      } else {
        capturedResponseBody = body;
      }
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    const statusCode = res.statusCode;

    const { pattern: normalizedPattern, params: resolvedParams } = resolveRouteAndParams(
      req,
      snapshotBaseUrl,
      snapshotRoutePath,
      snapshotParams,
    );
    const screenContext = resolveScreenContext(req, normalizedPattern);

    const statusBadge =
      statusCode >= 500
        ? `❌ ${statusCode} SERVER ERROR`
        : statusCode >= 400
          ? `⚠️ ${statusCode} CLIENT ERROR`
          : `✅ ${statusCode} OK`;

    const authHeader = req.headers.authorization;
    const authType = authHeader
      ? authHeader.startsWith('Bearer ')
        ? `Bearer (${authHeader.slice(7, 19)}...)`
        : 'Custom Authorization'
      : req.headers['x-admin-key']
        ? 'Admin Key'
        : 'None (Public)';

    const actorInfo = req.user
      ? {
          type: 'Authenticated Merchant',
          userId: req.user.id,
          phone: req.user.phone,
          tier: req.user.tier,
          language: req.user.language,
          shopId: req.shop?.id ?? null,
          shopName: req.shop?.name ?? null,
        }
      : req.registration
        ? {
            type: 'Onboarding Registration Session',
            phone: req.registration.phone,
          }
        : req.headers['x-admin-key']
          ? { type: 'Admin Operator' }
          : { type: 'Unauthenticated / Guest Client' };

    const clientMetadata: Record<string, unknown> = {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      auth: authType,
    };

    const trackedHeaders = [
      'x-screen-name',
      'x-screen',
      'x-route-name',
      'x-app-version',
      'x-device-id',
      'x-client-language',
      'x-platform',
      'idempotency-key',
      'x-idempotency-key',
    ];

    for (const h of trackedHeaders) {
      if (req.headers[h] !== undefined) {
        clientMetadata[h] = req.headers[h];
      }
    }

    if ((res as any).idempotencyHit) {
      clientMetadata.idempotencyCache = 'HIT (Served cached response)';
    }

    const hasParams = resolvedParams && Object.keys(resolvedParams).length > 0;
    const hasQuery = req.query && Object.keys(req.query).length > 0;
    const hasBody =
      req.body !== undefined &&
      req.body !== null &&
      (typeof req.body !== 'object' || Object.keys(req.body).length > 0);

    const parsedRes =
      capturedResponseBody && typeof capturedResponseBody === 'object'
        ? (capturedResponseBody as Record<string, any>)
        : null;

    const responseSummary = parsedRes
      ? parsedRes.success === true
        ? `success=true | message="${parsedRes.message ?? ''}" | data=${summarizeData(parsedRes.data)}`
        : parsedRes.success === false
          ? `success=false | code="${parsedRes.error?.code ?? 'UNKNOWN'}" | message="${parsedRes.error?.message ?? ''}"`
          : summarizeData(parsedRes)
      : typeof capturedResponseBody === 'string'
        ? `Text (${capturedResponseBody.length} chars)`
        : 'Empty Response';

    const divider = '═'.repeat(88);
    const subDivider = '─'.repeat(88);

    const lines: string[] = [
      `\n╔${divider}╗`,
      `║ 📡 [ROUTE TRACE] ${req.method.toUpperCase()} ${req.originalUrl}  -->  ${statusBadge} (${durationMs.toFixed(2)} ms)`,
      `╠${divider}╣`,
      `║ 📱 Screen / Action : ${screenContext}`,
      `║ 🛣️  Route Pattern   : ${req.method.toUpperCase()} ${normalizedPattern}`,
      `║ 🆔 Request ID      : ${requestId}`,
      `║ 🕒 Timestamp       : ${startedAt.toISOString()}`,
      `║ 👤 Actor / Shop    : ${formatJsonBlock(actorInfo, 0)}`,
      `║ 📲 Client Metadata : ${formatJsonBlock(clientMetadata, 0)}`,
      `╠${subDivider}╣`,
      `║ 📥 REQUEST PAYLOAD`,
      `║   • Params : ${hasParams ? formatJsonBlock(resolvedParams, 0) : '(none)'}`,
      `║   • Query  : ${hasQuery ? formatJsonBlock(req.query, 0) : '(none)'}`,
    ];

    if (hasBody) {
      const bodyStr = formatJsonBlock(req.body, 2)
        .split('\n')
        .map((line, idx) => (idx === 0 ? `║   • Body   : ${line}` : `║              ${line}`))
        .join('\n');
      lines.push(bodyStr);
    } else {
      lines.push('║   • Body   : (empty)');
    }

    lines.push(`╠${subDivider}╣`);
    lines.push(`║ 📤 RESPONSE PAYLOAD (${statusBadge} in ${durationMs.toFixed(2)} ms)`);
    lines.push(`║   • Summary: ${responseSummary}`);

    if (capturedResponseBody !== undefined) {
      const resBodyStr = formatJsonBlock(capturedResponseBody, 2)
        .split('\n')
        .map((line, idx) => (idx === 0 ? `║   • Body   : ${line}` : `║              ${line}`))
        .join('\n');
      lines.push(resBodyStr);
    } else {
      lines.push('║   • Body   : (none)');
    }

    lines.push(`╚${divider}╝`);

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  });

  next();
}

export default requestLogger;

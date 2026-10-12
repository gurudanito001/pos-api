"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const health_js_1 = __importDefault(require("./routes/health.js"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const sales_js_1 = __importDefault(require("./routes/sales.js"));
const debts_js_1 = __importDefault(require("./routes/debts.js"));
const inventory_js_1 = __importDefault(require("./routes/inventory.js"));
const stockIn_js_1 = __importDefault(require("./routes/stockIn.js"));
const catalog_js_1 = __importDefault(require("./routes/catalog.js"));
const analytics_js_1 = __importDefault(require("./routes/analytics.js"));
const shop_js_1 = __importDefault(require("./routes/shop.js"));
const places_js_1 = __importDefault(require("./routes/places.js"));
const subscriptions_js_1 = __importDefault(require("./routes/subscriptions.js"));
const sync_js_1 = __importDefault(require("./routes/sync.js"));
const notFound_js_1 = __importDefault(require("./middleware/notFound.js"));
const errorHandler_js_1 = __importDefault(require("./middleware/errorHandler.js"));
const openapi_js_1 = require("./lib/openapi.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Global middleware (allow Swagger UI scripts and assets)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)());
app.use((0, express_1.json)());
// Request ID & custom headers middleware
app.use((req, res, next) => {
    const reqId = req.headers['x-request-id'] || 'req_' + Math.random().toString(36).substring(2, 10);
    req.requestId = reqId;
    res.setHeader('X-Request-Id', reqId);
    next();
});
// Swagger JSON Spec Handlers (supports multiple URL patterns for mobile & frontend clients)
const serveDocsJson = (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(openapi_js_1.apiSpec);
};
app.get('/docs.json', serveDocsJson);
app.get('/api-docs.json', serveDocsJson);
app.get('/v1/docs.json', serveDocsJson);
app.get('/v1/api-docs.json', serveDocsJson);
// Interactive Swagger UI
const swaggerUiMiddleware = swagger_ui_express_1.default.setup(openapi_js_1.apiSpec, {
    explorer: true,
    customSiteTitle: 'Retail OS Mobile API Documentation',
});
app.use('/docs', swagger_ui_express_1.default.serve, swaggerUiMiddleware);
app.use('/api-docs', swagger_ui_express_1.default.serve, swaggerUiMiddleware);
app.use('/v1/docs', swagger_ui_express_1.default.serve, swaggerUiMiddleware);
app.use('/v1/api-docs', swagger_ui_express_1.default.serve, swaggerUiMiddleware);
// Create API router
const apiRouter = express_1.default.Router();
apiRouter.use('/health', health_js_1.default);
apiRouter.use('/auth', auth_js_1.default);
apiRouter.use('/sales', sales_js_1.default);
apiRouter.use('/debts', debts_js_1.default);
apiRouter.use('/inventory', inventory_js_1.default);
apiRouter.use('/stock-in', stockIn_js_1.default);
apiRouter.use('/catalog', catalog_js_1.default);
apiRouter.use('/analytics', analytics_js_1.default);
apiRouter.use('/shop', shop_js_1.default);
apiRouter.use('/places', places_js_1.default);
apiRouter.use('/subscription', subscriptions_js_1.default);
apiRouter.use('/sync', sync_js_1.default);
// Mount router under both '/v1' and root '/'
app.use('/v1', apiRouter);
app.use('/', apiRouter);
// 404
app.use(notFound_js_1.default);
// Error handler
app.use(errorHandler_js_1.default);
const port = process.env.PORT ?? 5000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Retail OS API server listening on http://localhost:${port}`);
        // eslint-disable-next-line no-console
        console.log(`Swagger Docs available at http://localhost:${port}/docs and http://localhost:${port}/docs.json`);
    });
}
exports.default = app;

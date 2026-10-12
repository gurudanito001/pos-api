import express, { json } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import salesRouter from './routes/sales.js';
import debtsRouter from './routes/debts.js';
import inventoryRouter from './routes/inventory.js';
import stockInRouter from './routes/stockIn.js';
import catalogRouter from './routes/catalog.js';
import analyticsRouter from './routes/analytics.js';
import shopRouter from './routes/shop.js';
import placesRouter from './routes/places.js';
import subscriptionsRouter from './routes/subscriptions.js';
import syncRouter from './routes/sync.js';

import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { apiSpec } from './lib/openapi.js';

dotenv.config();

const app = express();

// Global middleware (allow Swagger UI scripts and assets)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(cors());
app.use(json());

// Request ID & custom headers middleware
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || 'req_' + Math.random().toString(36).substring(2, 10);
  (req as any).requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Swagger JSON Spec Handlers (supports multiple URL patterns for mobile & frontend clients)
const serveDocsJson = (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(apiSpec);
};

app.get('/docs.json', serveDocsJson);
app.get('/api-docs.json', serveDocsJson);
app.get('/v1/docs.json', serveDocsJson);
app.get('/v1/api-docs.json', serveDocsJson);

// Interactive Swagger UI
const swaggerUiMiddleware = swaggerUi.setup(apiSpec, {
  explorer: true,
  customSiteTitle: 'Retail OS Mobile API Documentation',
});

app.use('/docs', swaggerUi.serve, swaggerUiMiddleware);
app.use('/api-docs', swaggerUi.serve, swaggerUiMiddleware);
app.use('/v1/docs', swaggerUi.serve, swaggerUiMiddleware);
app.use('/v1/api-docs', swaggerUi.serve, swaggerUiMiddleware);

// Create API router
const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/debts', debtsRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/stock-in', stockInRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/shop', shopRouter);
apiRouter.use('/places', placesRouter);
apiRouter.use('/subscription', subscriptionsRouter);
apiRouter.use('/sync', syncRouter);

// Mount router under both '/v1' and root '/'
app.use('/v1', apiRouter);
app.use('/', apiRouter);

// 404
app.use(notFound);

// Error handler
app.use(errorHandler);

const port = process.env.PORT ?? 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Retail OS API server listening on http://localhost:${port}`);
    // eslint-disable-next-line no-console
    console.log(`Swagger Docs available at http://localhost:${port}/docs and http://localhost:${port}/docs.json`);
  });
}

export default app;

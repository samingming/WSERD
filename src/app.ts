// src/app.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import debugRouter from './routes/debug';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import booksRouter from './routes/books';
import categoriesRouter from './routes/categories';
import authorsRouter from './routes/authors';
import reviewRouter from './routes/reviews';
import ordersRouter from './routes/orders';
import statsRouter from './routes/stats';
import { globalRateLimit, authRateLimit } from './middlewares/rateLimit';
import { metricsHandler, metricsMiddleware } from './middlewares/metrics';
import { setupSwagger } from './docs/swagger';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms'),
);
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);
app.use(globalRateLimit);
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    statusCode: 200,
    message: 'Health check OK',
    data: {
      version: '1.0.0',
      time: new Date().toISOString(),
    },
  });
});
app.use('/auth', authRateLimit, authRouter);
app.use('/debug', debugRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);
app.use('/books', booksRouter);
app.use('/categories', categoriesRouter);
app.use('/authors', authorsRouter);
app.use('/', reviewRouter);
app.use('/orders', ordersRouter);
app.use('/stats', statsRouter);
setupSwagger(app);
export default app;

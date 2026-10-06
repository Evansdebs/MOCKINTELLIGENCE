import * as functions from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api';
import dotenv from 'dotenv';

dotenv.config();
if (!getApps().length) initializeApp();

export const db = getFirestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

app.use('/api', apiRoutes);

// Catch all wrapper
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export const api = functions.https.onRequest(app);
export default app;

if (require.main === module) {
  const port = process.env.PORT || 5001;
  app.listen(port, () => {
    console.log(`Firebase Backend emulator running on port ${port}`);
  });
}

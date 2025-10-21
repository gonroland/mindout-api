import 'dotenv/config';
import express from 'express';
import { pool } from './services/db.js';
import { requireBasic } from './routes/mw-basic.js';

import studiesRouter from './routes/studies.js';
import patientsRouter from './routes/patients.js';
import visitsRouter from './routes/visits.js';

const app = express();
app.use(express.json());

// Health libre (sin autenticación)
app.get('/api/health', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: rows[0]?.ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rutas protegidas
app.use('/api/studies', requireBasic, studiesRouter);
app.use('/api/patients', requireBasic, patientsRouter);
app.use('/api/visits',  requireBasic, visitsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en puerto ${PORT}`));

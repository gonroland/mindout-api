// routes/studies.js
import { Router } from 'express';
import { pool } from '../services/db.js';
const router = Router();

// Crear estudio
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name requerido' });
    await pool.query('INSERT INTO studies(name) VALUES (?)', [name]);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.code || e.message });
  }
});

// Listar estudios
router.get('/', async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM studies ORDER BY name');
  res.json(rows);
});

export default router;


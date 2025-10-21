// routes/visits.js
import { Router } from 'express';
import dayjs from 'dayjs';
import { pool } from '../services/db.js';

const router = Router();

/**
 * Listado semanal imprimible
 * /api/visits?weekStart=YYYY-MM-DD
 * Si no viene, toma el lunes de esta semana.
 */
router.get('/', async (req, res) => {
  const input = req.query.weekStart;
  const weekStart = input && /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? dayjs(input).startOf('day')
    : dayjs().startOf('week').add(1, 'day'); // lunes (si locale es domingo inicio)
  const weekEnd = weekStart.add(6, 'day');

  const [rows] = await pool.query(
    `SELECT v.id, v.scheduled_date, v.attended, v.notes,
            p.id AS patient_id, p.external_id, p.full_name,
            s.id AS study_id, s.name AS study_name
     FROM visits v
     JOIN patients p ON p.id = v.patient_id
     JOIN studies s  ON s.id = p.study_id
     WHERE v.scheduled_date BETWEEN ? AND ?
     ORDER BY v.scheduled_date, s.name, p.external_id`,
     [weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD')]
  );
  res.json({
    weekStart: weekStart.format('YYYY-MM-DD'),
    weekEnd: weekEnd.format('YYYY-MM-DD'),
    items: rows
  });
});

/**
 * Marcar asistencia (tildar/ destildar)
 * body: { attended: true|false, notes? }
 */
router.patch('/:visitId/attendance', async (req, res) => {
  const id = Number(req.params.visitId);
  const { attended, notes } = req.body;
  if (typeof attended !== 'boolean') {
    return res.status(400).json({ error: 'attended debe ser boolean' });
  }
  const attendance_at = attended ? new Date() : null;
  await pool.query(
    `UPDATE visits SET attended = ?, attendance_at = ?, notes = ?
     WHERE id = ?`,
    [attended ? 1 : 0, attendance_at, notes || null, id]
  );
  res.json({ ok: true });
});

export default router;

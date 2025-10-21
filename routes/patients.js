// routes/patients.js
import { Router } from 'express';
import dayjs from 'dayjs';
import { pool } from '../services/db.js';
import { regenerateFutureVisits } from '../services/visits.js';

const router = Router();

/**
 * Crear paciente + generar visitas iniciales
 * body: { studyId, externalId, fullName, startDate, visitIntervalDays }
 */
router.post('/', async (req, res) => {
  try {
    const { studyId, externalId, fullName, startDate, visitIntervalDays = 30 } = req.body;
    if (!studyId || !externalId || !fullName || !startDate) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const [r] = await pool.query(
      `INSERT INTO patients(study_id, external_id, full_name, start_date, visit_interval_days)
       VALUES (?, ?, ?, ?, ?)`,
      [studyId, externalId, fullName, startDate, visitIntervalDays]
    );
    const patientId = r.insertId;

    // Generar 12 visitas (1 año si intervalo=30)
    await regenerateFutureVisits(patientId, startDate, visitIntervalDays, 12);

    res.status(201).json({ ok: true, id: patientId });
  } catch (e) {
    res.status(500).json({ error: e.code || e.message });
  }
});

/**
 * Listar pacientes (opcional filtro por estudio o búsqueda)
 * /api/patients?studyId=1&q=juan
 */
router.get('/', async (req, res) => {
  const { studyId, q } = req.query;
  const params = [];
  let sql = `SELECT p.id, p.external_id, p.full_name, p.start_date, p.visit_interval_days,
                    s.id AS study_id, s.name AS study_name
             FROM patients p JOIN studies s ON s.id = p.study_id WHERE 1=1`;
  if (studyId) { sql += ` AND p.study_id = ?`; params.push(studyId); }
  if (q) { sql += ` AND (p.full_name LIKE ? OR p.external_id LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  sql += ` ORDER BY s.name, p.full_name`;
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

/**
 * Cambiar intervalo de visitas de un paciente y regenerar futuras
 * body: { visitIntervalDays, from="today"|"start"|"YYYY-MM-DD", count? }
 */
router.patch('/:id/interval', async (req, res) => {
  try {
    const patientId = Number(req.params.id);
    const { visitIntervalDays, from = 'today', count = 12 } = req.body;
    if (!visitIntervalDays || visitIntervalDays < 1) {
      return res.status(400).json({ error: 'visitIntervalDays inválido' });
    }

    const [[p]] = await pool.query(
      `SELECT start_date FROM patients WHERE id = ?`, [patientId]
    );
    if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });

    let fromDate = dayjs().format('YYYY-MM-DD');
    if (from === 'start') fromDate = dayjs(p.start_date).format('YYYY-MM-DD');
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) fromDate = from;

    await pool.query(
      `UPDATE patients SET visit_interval_days = ? WHERE id = ?`,
      [visitIntervalDays, patientId]
    );

    await regenerateFutureVisits(patientId, fromDate, visitIntervalDays, count);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.code || e.message });
  }
});

export default router;

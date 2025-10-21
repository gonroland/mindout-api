// services/visits.js
import dayjs from 'dayjs';
import { pool } from './db.js';

/**
 * Regenera visitas futuras (no atendidas) para un paciente.
 * - Borra futuras no atendidas desde "fromDate" (incluida).
 * - Inserta N visitas hacia adelante, cada "intervalDays".
 */
export async function regenerateFutureVisits(patientId, fromDate, intervalDays, count = 12) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Borrar futuras no atendidas
    await conn.query(
      `DELETE FROM visits
       WHERE patient_id = ? AND scheduled_date >= ? AND attended = 0`,
      [patientId, fromDate]
    );

    // Insertar nuevas visitas
    const inserts = [];
    let current = dayjs(fromDate);
    for (let i = 1; i <= count; i++) {
      current = current.add(intervalDays, 'day');
      inserts.push([patientId, current.format('YYYY-MM-DD')]);
    }
    if (inserts.length) {
      await conn.query(
        `INSERT INTO visits (patient_id, scheduled_date) VALUES ?`,
        [inserts]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

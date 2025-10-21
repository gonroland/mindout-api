import bcrypt from 'bcryptjs';
import { pool } from '../services/db.js';

export async function requireBasic(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Basic ')) {
      return res.status(401)
        .set('WWW-Authenticate', 'Basic realm="Mindout"')
        .json({ error: 'Autenticación requerida' });
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep === -1) return res.status(401).json({ error: 'Credenciales inválidas' });

    const username = decoded.slice(0, sep);
    const password = decoded.slice(sep + 1);

    const [rows] = await pool.query(
      'SELECT id, password_hash, role FROM users WHERE username=?',
      [username]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    req.user = { id: u.id, username, role: u.role };
    next();
  } catch (e) {
    console.error('Error autenticando:', e);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

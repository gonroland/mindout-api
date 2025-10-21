import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../services/db.js';

const [username, password, role] = process.argv.slice(2);
if (!username || !password) {
  console.log('Uso: node tools/create-user.js <username> <password> [role]');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
await pool.query(
  'INSERT INTO users(username, password_hash, role) VALUES (?,?,?)',
  [username, hash, role || 'admin']
);

console.log('Usuario creado:', username);
process.exit(0);

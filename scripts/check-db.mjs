import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'apps', 'web', 'prisma', 'dev.db');

try {
  const db = new Database(dbPath, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', JSON.stringify(tables.map(t => t.name)));

  const users = db.prepare('SELECT id, email, name, onboarded FROM User LIMIT 5').all();
  console.log('Users:', JSON.stringify(users, null, 2));

  const owners = db.prepare('SELECT id, userId, name, email FROM Owner LIMIT 5').all();
  console.log('Owners:', JSON.stringify(owners, null, 2));

  db.close();
} catch (e) {
  console.error('Error:', e.message);
}
